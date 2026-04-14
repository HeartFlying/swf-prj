"""Sync Tasks Module

Celery tasks for data synchronization from external sources.
All tasks support retry mechanism and error handling.
"""

import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, timezone

from celery.exceptions import MaxRetriesExceededError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.celery import celery_app
from app.db.base import AsyncSessionLocal
from app.db.models import Project, User
from app.services.gitlab_data_source import GitLabDataSource
from app.services.sync_task_service import SyncTaskService
from app.services.trae_data_source import TraeDataSource
from app.services.zendao_data_source import ZenTaoDataSource

logger = logging.getLogger(__name__)

# Thread pool executor for running async code in sync context
_executor = ThreadPoolExecutor(max_workers=10)


# ============== Database Session Helper ==============

async def get_db_session() -> AsyncSession:
    """Get a database session for tasks."""
    async with AsyncSessionLocal() as session:
        return session


def run_async_sync(coro):
    """Run async coroutine in sync context, handling both sync and async callers.

    This function safely runs async coroutines from sync contexts (like Celery tasks).
    It handles both cases:
    1. Called from sync context: uses asyncio.run()
    2. Called from async context: uses the global thread pool executor to avoid
       nested event loop issues without creating new executors per call

    Args:
        coro: The coroutine to run

    Returns:
        The result of the coroutine

    Note:
        Uses module-level _executor to avoid creating thread pools per call,
        which prevents connection pool exhaustion.
    """
    try:
        loop = asyncio.get_running_loop()
        # We're in an async context (e.g., pytest-asyncio test),
        # use the global executor to run the coroutine in a separate thread
        # with its own event loop to avoid nested loop issues
        future = _executor.submit(asyncio.run, coro)
        return future.result()
    except RuntimeError:
        # No event loop running (normal Celery context), we can safely use asyncio.run
        return asyncio.run(coro)


# ============== Sync Task Status Helper ==============

async def update_sync_task_status(
    task_id: int,
    status: str,
    records_processed: int = 0,
    records_failed: int = 0,
    error_message: str = None,
) -> None:
    """Update sync task status in database.

    Args:
        task_id: SyncTask ID
        status: pending/running/completed/failed/cancelled
        records_processed: Number of successfully processed records
        records_failed: Number of failed records
        error_message: Error message if failed
    """
    if task_id is None:
        return

    session = None
    try:
        async with AsyncSessionLocal() as session:
            try:
                service = SyncTaskService()

                if status == "running":
                    await service.start_task(session, task_id)
                elif status == "completed":
                    await service.complete_task(
                        session,
                        task_id,
                        records_processed=records_processed,
                        records_failed=records_failed,
                        error_message=error_message,
                    )
                elif status == "failed":
                    await service.fail_task(
                        session,
                        task_id,
                        error_message=error_message or "Task failed",
                    )
                else:
                    logger.warning(f"Unknown status '{status}' for task {task_id}")
                    return

                await session.commit()
                logger.debug(f"Updated task {task_id} status to {status}")
            except ValueError as e:
                # Task not found or invalid state transition
                logger.warning(f"Sync task {task_id} not found for status update: {e}")
                await session.rollback()
            except Exception as e:
                logger.exception(f"Failed to update sync task status: {e}")
                await session.rollback()
                # Don't raise - status update failure shouldn't fail the main task
    except Exception as e:
        # Handle session creation errors
        logger.exception(f"Failed to create session for status update: {e}")


# ============== GitLab Sync Tasks ==============

@celery_app.task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    retry_backoff=True,
    retry_backoff_max=600,
)
def sync_gitlab_commits(self, project_id: int = None, task_id: int = None) -> dict:
    """Sync GitLab commits for a project.

    Args:
        project_id: Project ID to sync commits for
        task_id: Optional sync task ID for status tracking

    Returns:
        Sync result summary
    """
    logger.info(f"Starting GitLab commits sync for project {project_id}, task_id={task_id}")

    async def _sync():
        async with AsyncSessionLocal() as session:
            try:
                # Update status to running
                await update_sync_task_status(task_id, "running")

                data_source = GitLabDataSource()
                result = await data_source.sync_commits(session, project_id)
                # Note: sync_commits already commits the session internally

                # Update status to completed
                records_processed = result.get("processed", 0) if isinstance(result, dict) else 0
                records_failed = result.get("failed", 0) if isinstance(result, dict) else 0
                await update_sync_task_status(
                    task_id,
                    "completed",
                    records_processed=records_processed,
                    records_failed=records_failed,
                )

                return {
                    "status": "success",
                    "task": "sync_gitlab_commits",
                    "project_id": project_id,
                    "data": result,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
            except Exception as e:
                await session.rollback()
                logger.exception(f"GitLab commits sync failed: {e}")

                # Update status to failed
                await update_sync_task_status(task_id, "failed", error_message=str(e))

                raise

    try:
        return run_async_sync(_sync())
    except Exception as exc:
        logger.error(f"Task failed: {exc}")
        try:
            self.retry(countdown=60 * (self.request.retries + 1))
        except MaxRetriesExceededError:
            # Max retries exceeded, return error result
            return {
                "status": "error",
                "task": "sync_gitlab_commits",
                "project_id": project_id,
                "error": str(exc),
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }


@celery_app.task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    retry_backoff=True,
)
def sync_gitlab_mrs(self, project_id: int = None, task_id: int = None) -> dict:
    """Sync GitLab merge requests for a project.

    Args:
        project_id: Project ID to sync MRs for
        task_id: Optional sync task ID for status tracking

    Returns:
        Sync result summary
    """
    logger.info(f"Starting GitLab MRs sync for project {project_id}, task_id={task_id}")

    async def _sync():
        async with AsyncSessionLocal() as session:
            try:
                # Update status to running
                await update_sync_task_status(task_id, "running")

                data_source = GitLabDataSource()
                result = await data_source.sync_merge_requests(session, project_id)
                # Note: sync_merge_requests already commits the session internally

                # Update status to completed
                records_processed = result.get("processed", 0) if isinstance(result, dict) else 0
                records_failed = result.get("failed", 0) if isinstance(result, dict) else 0
                await update_sync_task_status(
                    task_id,
                    "completed",
                    records_processed=records_processed,
                    records_failed=records_failed,
                )

                return {
                    "status": "success",
                    "task": "sync_gitlab_mrs",
                    "project_id": project_id,
                    "data": result,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
            except Exception as e:
                await session.rollback()
                logger.exception(f"GitLab MRs sync failed: {e}")

                # Update status to failed
                await update_sync_task_status(task_id, "failed", error_message=str(e))

                raise

    try:
        return run_async_sync(_sync())
    except Exception as exc:
        logger.error(f"Task failed: {exc}")
        try:
            self.retry(countdown=60 * (self.request.retries + 1))
        except MaxRetriesExceededError:
            # Max retries exceeded, return error result
            return {
                "status": "error",
                "task": "sync_gitlab_mrs",
                "project_id": project_id,
                "error": str(exc),
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }


# ============== Trae Sync Tasks ==============

@celery_app.task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    retry_backoff=True,
)
def sync_trae_token_usage(self, user_id: int = None, task_id: int = None) -> dict:
    """Sync Trae token usage for a user.

    Args:
        user_id: User ID to sync token usage for
        task_id: Optional sync task ID for status tracking

    Returns:
        Sync result summary
    """
    logger.info(f"Starting Trae token usage sync for user {user_id}, task_id={task_id}")

    async def _sync():
        async with AsyncSessionLocal() as session:
            try:
                # Update status to running
                await update_sync_task_status(task_id, "running")

                data_source = TraeDataSource()
                start_date = date.today()
                end_date = date.today()
                result = await data_source.sync_token_usage(
                    session, user_id, start_date, end_date
                )
                # Note: sync_token_usage already commits the session internally

                # Update status to completed
                records_processed = result.get("processed", 0) if isinstance(result, dict) else 0
                records_failed = result.get("failed", 0) if isinstance(result, dict) else 0
                await update_sync_task_status(
                    task_id,
                    "completed",
                    records_processed=records_processed,
                    records_failed=records_failed,
                )

                return {
                    "status": "success",
                    "task": "sync_trae_token_usage",
                    "user_id": user_id,
                    "data": result,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
            except Exception as e:
                await session.rollback()
                logger.exception(f"Trae token usage sync failed: {e}")

                # Update status to failed
                await update_sync_task_status(task_id, "failed", error_message=str(e))

                raise

    try:
        return run_async_sync(_sync())
    except Exception as exc:
        logger.error(f"Task failed: {exc}")
        try:
            self.retry(countdown=60 * (self.request.retries + 1))
        except MaxRetriesExceededError:
            # Max retries exceeded, return error result
            return {
                "status": "error",
                "task": "sync_trae_token_usage",
                "user_id": user_id,
                "error": str(exc),
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }


@celery_app.task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    retry_backoff=True,
)
def sync_trae_ai_suggestions(self, user_id: int = None, task_id: int = None) -> dict:
    """Sync Trae AI suggestions for a user.

    Args:
        user_id: User ID to sync AI suggestions for
        task_id: Optional sync task ID for status tracking

    Returns:
        Sync result summary
    """
    logger.info(f"Starting Trae AI suggestions sync for user {user_id}, task_id={task_id}")

    async def _sync():
        async with AsyncSessionLocal() as session:
            try:
                # Update status to running
                await update_sync_task_status(task_id, "running")

                data_source = TraeDataSource()
                result = await data_source.sync_ai_suggestions(session, user_id)
                # Note: sync_ai_suggestions already commits the session internally

                # Update status to completed
                records_processed = result.get("processed", 0) if isinstance(result, dict) else 0
                records_failed = result.get("failed", 0) if isinstance(result, dict) else 0
                await update_sync_task_status(
                    task_id,
                    "completed",
                    records_processed=records_processed,
                    records_failed=records_failed,
                )

                return {
                    "status": "success",
                    "task": "sync_trae_ai_suggestions",
                    "user_id": user_id,
                    "data": result,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
            except Exception as e:
                await session.rollback()
                logger.exception(f"Trae AI suggestions sync failed: {e}")

                # Update status to failed
                await update_sync_task_status(task_id, "failed", error_message=str(e))

                raise

    try:
        return run_async_sync(_sync())
    except Exception as exc:
        logger.error(f"Task failed: {exc}")
        try:
            self.retry(countdown=60 * (self.request.retries + 1))
        except MaxRetriesExceededError:
            # Max retries exceeded, return error result
            return {
                "status": "error",
                "task": "sync_trae_ai_suggestions",
                "user_id": user_id,
                "error": str(exc),
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }


# ============== ZenTao Sync Tasks ==============

@celery_app.task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    retry_backoff=True,
)
def sync_zendao_bugs(self, project_id: int = None, task_id: int = None) -> dict:
    """Sync ZenTao bugs for a project.

    Args:
        project_id: Project ID to sync bugs for
        task_id: Optional sync task ID for status tracking

    Returns:
        Sync result summary
    """
    logger.info(f"Starting ZenTao bugs sync for project {project_id}, task_id={task_id}")

    async def _sync():
        async with AsyncSessionLocal() as session:
            try:
                # Update status to running
                await update_sync_task_status(task_id, "running")

                data_source = ZenTaoDataSource()
                result = await data_source.sync_bugs(session, project_id)
                # Note: sync_bugs already commits the session internally

                # Update status to completed
                records_processed = result.get("processed", 0) if isinstance(result, dict) else 0
                records_failed = result.get("failed", 0) if isinstance(result, dict) else 0
                await update_sync_task_status(
                    task_id,
                    "completed",
                    records_processed=records_processed,
                    records_failed=records_failed,
                )

                return {
                    "status": "success",
                    "task": "sync_zendao_bugs",
                    "project_id": project_id,
                    "data": result,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
            except Exception as e:
                await session.rollback()
                logger.exception(f"ZenTao bugs sync failed: {e}")

                # Update status to failed
                await update_sync_task_status(task_id, "failed", error_message=str(e))

                raise

    try:
        return run_async_sync(_sync())
    except Exception as exc:
        logger.error(f"Task failed: {exc}")
        try:
            self.retry(countdown=60 * (self.request.retries + 1))
        except MaxRetriesExceededError:
            # Max retries exceeded, return error result
            return {
                "status": "error",
                "task": "sync_zendao_bugs",
                "project_id": project_id,
                "error": str(exc),
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }


@celery_app.task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    retry_backoff=True,
)
def sync_zendao_tasks(self, project_id: int = None, task_id: int = None) -> dict:
    """Sync ZenTao tasks for a project.

    Args:
        project_id: Project ID to sync tasks for
        task_id: Optional sync task ID for status tracking

    Returns:
        Sync result summary
    """
    logger.info(f"Starting ZenTao tasks sync for project {project_id}, task_id={task_id}")

    async def _sync():
        async with AsyncSessionLocal() as session:
            try:
                # Update status to running
                await update_sync_task_status(task_id, "running")

                data_source = ZenTaoDataSource()
                result = await data_source.sync_tasks(session, project_id)
                # Note: sync_tasks already commits the session internally

                # Update status to completed
                records_processed = result.get("processed", 0) if isinstance(result, dict) else 0
                records_failed = result.get("failed", 0) if isinstance(result, dict) else 0
                await update_sync_task_status(
                    task_id,
                    "completed",
                    records_processed=records_processed,
                    records_failed=records_failed,
                )

                return {
                    "status": "success",
                    "task": "sync_zendao_tasks",
                    "project_id": project_id,
                    "data": result,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
            except Exception as e:
                await session.rollback()
                logger.exception(f"ZenTao tasks sync failed: {e}")

                # Update status to failed
                await update_sync_task_status(task_id, "failed", error_message=str(e))

                raise

    try:
        return run_async_sync(_sync())
    except Exception as exc:
        logger.error(f"Task failed: {exc}")
        try:
            self.retry(countdown=60 * (self.request.retries + 1))
        except MaxRetriesExceededError:
            # Max retries exceeded, return error result
            return {
                "status": "error",
                "task": "sync_zendao_tasks",
                "project_id": project_id,
                "error": str(exc),
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }


# ============== Bulk Sync Tasks ==============

@celery_app.task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    retry_backoff=True,
    time_limit=3600,  # 1 hour
)
def sync_all_gitlab(self, parent_task_id: int = None) -> dict:
    """Sync all GitLab projects.

    Args:
        parent_task_id: Optional parent sync task ID for tracking

    Returns:
        Combined sync results for all projects with child task info
    """
    logger.info(f"Starting full GitLab sync, parent_task_id={parent_task_id}")

    async def _sync():
        from sqlalchemy import select

        # Phase 1: Get all projects (separate session for read-only operation)
        async with AsyncSessionLocal() as session:
            stmt = select(Project).where(Project.gitlab_repo_id.isnot(None))
            result = await session.execute(stmt)
            projects = list(result.scalars().all())

        # Phase 2: Process each project with individual transactions
        # This ensures that failure of one project doesn't affect others
        service = SyncTaskService()
        results = []
        child_tasks = []

        for project in projects:
            child_task_info = {
                "task_id": None,
                "project_id": project.id,
                "status": "pending"
            }
            child_tasks.append(child_task_info)

            # Use separate session for each project to ensure isolation
            # Each project is processed in its own transaction
            async with AsyncSessionLocal() as project_session:
                child_task = None
                try:
                    # Phase 1: Create child task (part of single transaction)
                    child_task = await service.create_task(
                        project_session,
                        task_type="incremental_sync",
                        source_type="gitlab",
                        project_id=project.id,
                        created_by="sync_all_gitlab"
                    )
                    child_task_info["task_id"] = child_task.id

                    # Phase 2: Start the task (still in same transaction)
                    await service.start_task(project_session, child_task.id)
                    child_task_info["status"] = "running"

                    # Commit after task is started - this is the single commit point
                    # before external API calls
                    await project_session.commit()

                except Exception as e:
                    # Failed to create or start task - rollback and continue to next project
                    logger.exception(f"Failed to create/start task for project {project.id}: {e}")
                    await project_session.rollback()
                    child_task_info["status"] = "failed"
                    results.append({
                        "project_id": project.id,
                        "gitlab_repo_id": project.gitlab_repo_id,
                        "status": "error",
                        "error": f"Failed to create task: {str(e)}",
                        "child_task_id": child_task.id if child_task else None,
                    })
                    continue  # Skip to next project

            # Phase 3: Perform sync in a new session
            # This is separate because sync_all commits internally
            async with AsyncSessionLocal() as sync_session:
                try:
                    data_source = GitLabDataSource()
                    sync_result = await data_source.sync_all(sync_session, project.gitlab_repo_id)

                    # Calculate total records processed
                    commits = sync_result.get("commits", {})
                    mrs = sync_result.get("merge_requests", {})
                    total_processed = commits.get("processed", 0) + mrs.get("processed", 0)

                except Exception as e:
                    logger.exception(f"Failed to sync project {project.id}: {e}")
                    # Sync failed - need to mark task as failed in new session
                    async with AsyncSessionLocal() as fail_session:
                        try:
                            await service.fail_task(
                                fail_session,
                                child_task.id,
                                error_message=str(e)
                            )
                            await fail_session.commit()
                        except Exception as fail_error:
                            logger.warning(f"Failed to update child task status: {fail_error}")

                    child_task_info["status"] = "failed"
                    results.append({
                        "project_id": project.id,
                        "gitlab_repo_id": project.gitlab_repo_id,
                        "status": "error",
                        "error": str(e),
                        "child_task_id": child_task.id,
                    })
                    continue  # Skip to next project

            # Phase 4: Mark task as completed
            async with AsyncSessionLocal() as complete_session:
                try:
                    await service.complete_task(
                        complete_session,
                        child_task.id,
                        records_processed=total_processed
                    )
                    await complete_session.commit()

                    child_task_info["status"] = "completed"
                    results.append({
                        "project_id": project.id,
                        "gitlab_repo_id": project.gitlab_repo_id,
                        "status": "success",
                        "result": sync_result,
                        "child_task_id": child_task.id,
                    })

                except Exception as e:
                    logger.exception(f"Failed to complete task for project {project.id}: {e}")
                    await complete_session.rollback()

                    # Task completed but status update failed - log for manual review
                    child_task_info["status"] = "completed_with_warning"
                    results.append({
                        "project_id": project.id,
                        "gitlab_repo_id": project.gitlab_repo_id,
                        "status": "success",
                        "result": sync_result,
                        "child_task_id": child_task.id,
                        "warning": f"Sync succeeded but failed to update task status: {str(e)}",
                    })

        return results, child_tasks

    try:
        results, child_tasks = run_async_sync(_sync())

        # Determine overall status
        success_count = sum(1 for r in results if r["status"] == "success")
        error_count = len(results) - success_count

        if error_count == 0:
            overall_status = "success"
        elif success_count > 0:
            overall_status = "partial_success"
        else:
            overall_status = "error"

        return {
            "status": overall_status,
            "task": "sync_all_gitlab",
            "projects_count": len(results),
            "success_count": success_count,
            "error_count": error_count,
            "results": results,
            "child_tasks": child_tasks,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    except MaxRetriesExceededError:
        return {
            "status": "error",
            "task": "sync_all_gitlab",
            "error": "Max retries exceeded",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    except Exception as exc:
        logger.error(f"Full GitLab sync failed: {exc}")
        self.retry(countdown=300)


@celery_app.task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    retry_backoff=True,
    time_limit=3600,
)
def sync_all_trae(self, parent_task_id: int = None) -> dict:
    """Sync all Trae users.

    Args:
        parent_task_id: Optional parent SyncTask ID. If provided, creates child
                       SyncTasks for each user to track individual sync progress.

    Returns:
        Combined sync results for all users
    """
    logger.info(f"Starting full Trae sync, parent_task_id={parent_task_id}")

    async def _sync():
        from sqlalchemy import select

        # Phase 1: Get all active users (separate session for read-only operation)
        async with AsyncSessionLocal() as session:
            stmt = select(User).where(User.is_active.is_(True))
            result = await session.execute(stmt)
            users = list(result.scalars().all())

        # Phase 2: Process each user with individual transactions
        results = []
        for user in users:
            child_task_id = None

            # Use separate session for each user to ensure isolation
            async with AsyncSessionLocal() as user_session:
                try:
                    # Create child SyncTask if parent_task_id is provided
                    if parent_task_id is not None:
                        service = SyncTaskService()
                        child_task = await service.create_task(
                            user_session,
                            task_type="full_sync",
                            source_type="trae",
                            user_id=user.id,
                        )
                        child_task_id = child_task.id
                        await service.start_task(user_session, child_task_id)
                        await user_session.commit()

                    data_source = TraeDataSource()
                    start_date = date.today()
                    end_date = date.today()

                    # Sync token usage
                    token_result = await data_source.sync_token_usage(
                        user_session, user.id, start_date, end_date
                    )

                    # Sync AI suggestions
                    suggestion_result = await data_source.sync_ai_suggestions(user_session, user.id)

                    # Calculate total records processed
                    token_processed = token_result.get("processed", 0) if isinstance(token_result, dict) else 0
                    suggestion_processed = suggestion_result.get("processed", 0) if isinstance(suggestion_result, dict) else 0
                    total_processed = token_processed + suggestion_processed

                    # Complete child task if created
                    if parent_task_id is not None and child_task_id is not None:
                        service = SyncTaskService()
                        await service.complete_task(
                            user_session,
                            child_task_id,
                            records_processed=total_processed,
                            records_failed=0,
                        )
                        await user_session.commit()

                    results.append({
                        "user_id": user.id,
                        "status": "success",
                        "child_task_id": child_task_id,
                        "token_usage": token_result,
                        "ai_suggestions": suggestion_result,
                    })
                except Exception as e:
                    logger.exception(f"Failed to sync user {user.id}: {e}")

                    # Fail child task if created
                    if parent_task_id is not None and child_task_id is not None:
                        try:
                            service = SyncTaskService()
                            await service.fail_task(
                                user_session,
                                child_task_id,
                                error_message=str(e),
                            )
                            await user_session.commit()
                        except Exception as fail_error:
                            logger.warning(f"Failed to update child task status: {fail_error}")
                            await user_session.rollback()

                    results.append({
                        "user_id": user.id,
                        "status": "error",
                        "child_task_id": child_task_id,
                        "error": str(e),
                    })

        return results

    try:
        results = run_async_sync(_sync())
        return {
            "status": "success",
            "task": "sync_all_trae",
            "users_count": len(results),
            "results": results,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    except MaxRetriesExceededError:
        return {
            "status": "error",
            "task": "sync_all_trae",
            "error": "Max retries exceeded",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    except Exception as exc:
        logger.error(f"Full Trae sync failed: {exc}")
        self.retry(countdown=300)


@celery_app.task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    retry_backoff=True,
    time_limit=3600,
)
def sync_all_zendao(self, parent_task_id: int = None) -> dict:
    """Sync all ZenTao projects.

    Args:
        parent_task_id: Optional parent sync task ID for tracking

    Returns:
        Combined sync results for all projects
    """
    logger.info(f"Starting full ZenTao sync, parent_task_id={parent_task_id}")

    async def _sync():
        from sqlalchemy import select

        # Phase 1: Get all projects with ZenTao (separate session for read-only operation)
        async with AsyncSessionLocal() as session:
            stmt = select(Project).where(Project.zendao_project_id.isnot(None))
            result = await session.execute(stmt)
            projects = list(result.scalars().all())

        # Phase 2: Process each project with individual transactions
        results = []
        for project in projects:
            child_task_id = None

            # Use separate session for each project to ensure isolation
            async with AsyncSessionLocal() as project_session:
                try:
                    # Create child SyncTask for this project
                    service = SyncTaskService()
                    child_task = await service.create_task(
                        project_session,
                        task_type="full_sync",
                        source_type="zendao",
                        project_id=project.id,
                    )
                    child_task_id = child_task.id
                    await project_session.commit()

                    # Update status to running
                    await service.start_task(project_session, child_task_id)
                    await project_session.commit()

                    data_source = ZenTaoDataSource()

                    # Sync bugs
                    bugs_result = await data_source.sync_bugs(project_session, project.zendao_project_id)

                    # Sync tasks
                    tasks_result = await data_source.sync_tasks(project_session, project.zendao_project_id)

                    # Calculate total records processed
                    bugs_processed = bugs_result.get("processed", 0) if isinstance(bugs_result, dict) else 0
                    tasks_processed = tasks_result.get("processed", 0) if isinstance(tasks_result, dict) else 0
                    total_processed = bugs_processed + tasks_processed

                    # Update status to completed
                    await service.complete_task(
                        project_session,
                        child_task_id,
                        records_processed=total_processed,
                        records_failed=0,
                    )
                    await project_session.commit()

                    results.append({
                        "project_id": project.id,
                        "zendao_project_id": project.zendao_project_id,
                        "status": "success",
                        "bugs": bugs_result,
                        "tasks": tasks_result,
                        "child_task_id": child_task_id,
                    })
                except Exception as e:
                    logger.exception(f"Failed to sync project {project.id}: {e}")

                    # Update child task status to failed
                    if child_task_id:
                        try:
                            service = SyncTaskService()
                            await service.fail_task(
                                project_session,
                                child_task_id,
                                error_message=str(e),
                            )
                            await project_session.commit()
                        except Exception as task_error:
                            logger.warning(f"Failed to update child task status: {task_error}")
                            await project_session.rollback()

                    results.append({
                        "project_id": project.id,
                        "zendao_project_id": project.zendao_project_id,
                        "status": "error",
                        "error": str(e),
                        "child_task_id": child_task_id,
                    })

        return results

    try:
        results = run_async_sync(_sync())
        return {
            "status": "success",
            "task": "sync_all_zendao",
            "projects_count": len(results),
            "results": results,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    except MaxRetriesExceededError:
        return {
            "status": "error",
            "task": "sync_all_zendao",
            "error": "Max retries exceeded",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    except Exception as exc:
        logger.error(f"Full ZenTao sync failed: {exc}")
        self.retry(countdown=300)


# ============== Daily Full Sync Task ==============

@celery_app.task(
    bind=True,
    max_retries=3,
    default_retry_delay=300,
    retry_backoff=True,
    time_limit=7200,  # 2 hours
)
def daily_full_sync(self, use_delay: bool = True) -> dict:
    """Daily full sync task - runs all sync tasks.

    This is the main scheduled task that runs at 2:00 AM daily.
    It orchestrates all individual sync tasks.

    Args:
        use_delay: If True, use Celery delay() to queue tasks.
                  If False, run tasks directly (for testing).

    Returns:
        Combined results from all sync operations
    """
    logger.info("Starting daily full sync")
    started_at = datetime.now(timezone.utc)

    results = {
        "gitlab": None,
        "trae": None,
        "zendao": None,
    }

    # Run GitLab sync
    try:
        if use_delay:
            results["gitlab"] = sync_all_gitlab.delay().get(timeout=3600)
        else:
            results["gitlab"] = sync_all_gitlab.run()
    except Exception as e:
        logger.error(f"GitLab sync failed in daily sync: {e}")
        results["gitlab"] = {"status": "error", "error": str(e)}

    # Run Trae sync
    try:
        if use_delay:
            results["trae"] = sync_all_trae.delay().get(timeout=3600)
        else:
            results["trae"] = sync_all_trae.run()
    except Exception as e:
        logger.error(f"Trae sync failed in daily sync: {e}")
        results["trae"] = {"status": "error", "error": str(e)}

    # Run ZenTao sync
    try:
        if use_delay:
            results["zendao"] = sync_all_zendao.delay().get(timeout=3600)
        else:
            results["zendao"] = sync_all_zendao.run()
    except Exception as e:
        logger.error(f"ZenTao sync failed in daily sync: {e}")
        results["zendao"] = {"status": "error", "error": str(e)}

    completed_at = datetime.now(timezone.utc)
    duration = (completed_at - started_at).total_seconds()

    # Determine overall status
    all_success = all(
        r.get("status") == "success"
        for r in results.values()
        if r is not None
    )

    return {
        "status": "success" if all_success else "partial_error",
        "task": "daily_full_sync",
        "started_at": started_at.isoformat(),
        "completed_at": completed_at.isoformat(),
        "duration_seconds": duration,
        "results": results,
    }
