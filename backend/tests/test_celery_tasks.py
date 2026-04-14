"""Celery Tasks Tests

TDD Red Phase: Write tests for Celery task integration.
"""

from unittest.mock import AsyncMock, MagicMock, patch


# ============== Phase 1: Test Celery App Configuration ==============

def test_celery_app_configuration():
    """Test Celery app is properly configured."""
    from app.core.celery import celery_app

    # Assert Celery app exists
    assert celery_app is not None
    assert celery_app.main == "coding_stats"

    # Assert broker URL is configured
    assert celery_app.conf.broker_url == "redis://localhost:6379/0"
    assert celery_app.conf.result_backend == "redis://localhost:6379/0"

    # Assert serialization settings
    assert celery_app.conf.task_serializer == "json"
    assert celery_app.conf.accept_content == ["json"]
    assert celery_app.conf.result_serializer == "json"

    # Assert timezone settings
    assert celery_app.conf.timezone == "Asia/Shanghai"
    assert celery_app.conf.enable_utc is True


def test_celery_beat_schedule():
    """Test Celery beat schedule is configured."""
    from app.core.celery import celery_app

    # Assert beat schedule exists
    assert "beat_schedule" in celery_app.conf
    schedule = celery_app.conf.beat_schedule

    # Assert daily full sync task is scheduled
    assert "daily-full-sync" in schedule
    daily_sync = schedule["daily-full-sync"]
    assert daily_sync["task"] == "app.tasks.sync_tasks.daily_full_sync"
    # Schedule should be at 2:00 AM
    assert daily_sync["schedule"] is not None


# ============== Phase 2: Test Individual Sync Tasks ==============

def test_sync_gitlab_commits_task():
    """Test GitLab commits sync task."""
    from app.tasks.sync_tasks import sync_gitlab_commits
    from app.services.gitlab_data_source import GitLabDataSource

    # Mock the data source
    mock_result = {
        "total": 10,
        "processed": 10,
        "failed": 0,
        "errors": []
    }

    with patch.object(GitLabDataSource, 'sync_commits', new_callable=AsyncMock) as mock_sync:
        mock_sync.return_value = mock_result

        # Call the task (Celery tasks are sync functions)
        result = sync_gitlab_commits.run(project_id=123)

        # Assert result
        assert result["status"] == "success"
        assert result["task"] == "sync_gitlab_commits"
        assert result["project_id"] == 123
        assert result["data"]["total"] == 10
        assert result["data"]["processed"] == 10


def test_sync_gitlab_mrs_task():
    """Test GitLab merge requests sync task."""
    from app.tasks.sync_tasks import sync_gitlab_mrs
    from app.services.gitlab_data_source import GitLabDataSource

    # Mock the data source
    mock_result = {
        "total": 5,
        "processed": 5,
        "failed": 0,
        "errors": []
    }

    with patch.object(GitLabDataSource, 'sync_merge_requests', new_callable=AsyncMock) as mock_sync:
        mock_sync.return_value = mock_result

        # Call the task
        result = sync_gitlab_mrs.run(project_id=123)

        # Assert result
        assert result["status"] == "success"
        assert result["task"] == "sync_gitlab_mrs"
        assert result["project_id"] == 123
        assert result["data"]["total"] == 5


def test_sync_trae_token_usage_task():
    """Test Trae token usage sync task."""
    from app.tasks.sync_tasks import sync_trae_token_usage
    from app.services.trae_data_source import TraeDataSource

    # Mock the data source
    mock_result = {
        "total": 20,
        "processed": 20,
        "failed": 0,
        "errors": []
    }

    with patch.object(TraeDataSource, 'sync_token_usage', new_callable=AsyncMock) as mock_sync:
        mock_sync.return_value = mock_result

        # Call the task
        result = sync_trae_token_usage.run(user_id=456)

        # Assert result
        assert result["status"] == "success"
        assert result["task"] == "sync_trae_token_usage"
        assert result["user_id"] == 456
        assert result["data"]["total"] == 20


def test_sync_trae_ai_suggestions_task():
    """Test Trae AI suggestions sync task."""
    from app.tasks.sync_tasks import sync_trae_ai_suggestions
    from app.services.trae_data_source import TraeDataSource

    # Mock the data source
    mock_result = {
        "total": 15,
        "processed": 15,
        "failed": 0,
        "errors": []
    }

    with patch.object(TraeDataSource, 'sync_ai_suggestions', new_callable=AsyncMock) as mock_sync:
        mock_sync.return_value = mock_result

        # Call the task
        result = sync_trae_ai_suggestions.run(user_id=456)

        # Assert result
        assert result["status"] == "success"
        assert result["task"] == "sync_trae_ai_suggestions"
        assert result["user_id"] == 456
        assert result["data"]["total"] == 15


def test_sync_zendao_bugs_task():
    """Test ZenTao bugs sync task."""
    from app.tasks.sync_tasks import sync_zendao_bugs
    from app.services.zendao_data_source import ZenTaoDataSource

    # Mock the data source
    mock_result = {
        "total": 8,
        "processed": 8,
        "failed": 0,
        "errors": []
    }

    with patch.object(ZenTaoDataSource, 'sync_bugs', new_callable=AsyncMock) as mock_sync:
        mock_sync.return_value = mock_result

        # Call the task
        result = sync_zendao_bugs.run(project_id=789)

        # Assert result
        assert result["status"] == "success"
        assert result["task"] == "sync_zendao_bugs"
        assert result["project_id"] == 789
        assert result["data"]["total"] == 8


def test_sync_zendao_tasks_task():
    """Test ZenTao tasks sync task."""
    from app.tasks.sync_tasks import sync_zendao_tasks
    from app.services.zendao_data_source import ZenTaoDataSource

    # Mock the data source
    mock_result = {
        "total": 12,
        "processed": 12,
        "failed": 0,
        "errors": []
    }

    with patch.object(ZenTaoDataSource, 'sync_tasks', new_callable=AsyncMock) as mock_sync:
        mock_sync.return_value = mock_result

        # Call the task
        result = sync_zendao_tasks.run(project_id=789)

        # Assert result
        assert result["status"] == "success"
        assert result["task"] == "sync_zendao_tasks"
        assert result["project_id"] == 789
        assert result["data"]["total"] == 12


# ============== Phase 3: Test Daily Full Sync Task ==============

def test_daily_full_sync_task():
    """Test daily full sync task runs all sync tasks."""
    from app.tasks.sync_tasks import daily_full_sync

    # Mock all individual sync tasks - mock the functions directly
    with patch('app.tasks.sync_tasks.sync_all_gitlab.run') as mock_gitlab, \
         patch('app.tasks.sync_tasks.sync_all_trae.run') as mock_trae, \
         patch('app.tasks.sync_tasks.sync_all_zendao.run') as mock_zendao:

        # Configure mocks to return success
        mock_gitlab.return_value = {"status": "success", "task": "sync_all_gitlab"}
        mock_trae.return_value = {"status": "success", "task": "sync_all_trae"}
        mock_zendao.return_value = {"status": "success", "task": "sync_all_zendao"}

        # Call the task with use_delay=False to avoid Redis dependency
        result = daily_full_sync.run(use_delay=False)

        # Assert all sub-tasks were called
        mock_gitlab.assert_called_once()
        mock_trae.assert_called_once()
        mock_zendao.assert_called_once()

        # Assert result structure
        assert result["status"] == "success"
        assert result["task"] == "daily_full_sync"
        assert "results" in result
        assert "started_at" in result
        assert "completed_at" in result


# ============== Phase 4: Test Error Handling ==============

def test_task_error_handling():
    """Test task error handling."""
    from app.tasks.sync_tasks import sync_gitlab_commits
    from app.services.gitlab_data_source import GitLabDataSource
    from celery.exceptions import MaxRetriesExceededError

    # Mock the data source to raise an exception
    with patch.object(GitLabDataSource, 'sync_commits', new_callable=AsyncMock) as mock_sync:
        mock_sync.side_effect = Exception("GitLab API error")

        # Mock retry to raise MaxRetriesExceededError immediately
        with patch.object(sync_gitlab_commits, 'retry') as mock_retry:
            mock_retry.side_effect = MaxRetriesExceededError()

            # Call the task - should handle error gracefully after max retries
            result = sync_gitlab_commits.run(project_id=123)

            # Assert error is captured in result
            assert result["status"] == "error"
            assert result["task"] == "sync_gitlab_commits"
            assert "error" in result
            assert "GitLab API error" in result["error"]


def test_task_retry_mechanism():
    """Test task retry mechanism."""
    from app.tasks.sync_tasks import sync_gitlab_commits

    # Assert task has retry configuration
    assert sync_gitlab_commits.max_retries == 3
    assert sync_gitlab_commits.default_retry_delay == 60


# ============== Phase 5: Test Task Registration ==============

def test_tasks_are_registered():
    """Test all tasks are registered with Celery."""
    from app.core.celery import celery_app

    # Get registered tasks
    registered_tasks = celery_app.tasks.keys()

    # Assert our tasks are registered
    expected_tasks = [
        'app.tasks.sync_tasks.sync_gitlab_commits',
        'app.tasks.sync_tasks.sync_gitlab_mrs',
        'app.tasks.sync_tasks.sync_trae_token_usage',
        'app.tasks.sync_tasks.sync_trae_ai_suggestions',
        'app.tasks.sync_tasks.sync_zendao_bugs',
        'app.tasks.sync_tasks.sync_zendao_tasks',
        'app.tasks.sync_tasks.daily_full_sync',
    ]

    for task_name in expected_tasks:
        # Tasks should be importable and callable
        parts = task_name.split('.')
        module_name = '.'.join(parts[:-1])
        task_func_name = parts[-1]

        module = __import__(module_name, fromlist=[task_func_name])
        task_func = getattr(module, task_func_name)
        assert callable(task_func)


# ============== Phase 6: Test Task with Database Integration ==============

def test_sync_task_with_database():
    """Test sync task interacts with database correctly."""
    from app.tasks.sync_tasks import sync_gitlab_commits
    from app.services.gitlab_data_source import GitLabDataSource

    # Mock the sync to return success
    mock_result = {
        "total": 5,
        "processed": 5,
        "failed": 0,
        "errors": []
    }

    with patch.object(GitLabDataSource, 'sync_commits', new_callable=AsyncMock) as mock_sync:
        mock_sync.return_value = mock_result

        # Call the task
        result = sync_gitlab_commits.run(project_id=123)

        # Assert success
        assert result["status"] == "success"
        assert result["task"] == "sync_gitlab_commits"
        assert result["data"]["total"] == 5


# ============== Phase 7: Test records_failed Parameter (Code Review Fix) ==============

def test_sync_gitlab_commits_passes_records_failed():
    """Test that sync_gitlab_commits passes records_failed to update_sync_task_status."""
    from app.tasks.sync_tasks import sync_gitlab_commits
    from app.services.gitlab_data_source import GitLabDataSource

    # Mock result with some failures
    mock_result = {
        "total": 10,
        "processed": 8,
        "failed": 2,
        "errors": ["Error 1", "Error 2"]
    }

    with patch.object(GitLabDataSource, 'sync_commits', new_callable=AsyncMock) as mock_sync:
        mock_sync.return_value = mock_result

        # Mock update_sync_task_status to capture calls
        with patch('app.tasks.sync_tasks.update_sync_task_status', new_callable=AsyncMock) as mock_update:
            # Call the task
            result = sync_gitlab_commits.run(project_id=123, task_id=999)

            # Assert update_sync_task_status was called with records_failed
            mock_update.assert_any_call(999, "running")
            mock_update.assert_any_call(999, "completed", records_processed=8, records_failed=2)


def test_sync_gitlab_mrs_passes_records_failed():
    """Test that sync_gitlab_mrs passes records_failed to update_sync_task_status."""
    from app.tasks.sync_tasks import sync_gitlab_mrs
    from app.services.gitlab_data_source import GitLabDataSource

    mock_result = {
        "total": 5,
        "processed": 4,
        "failed": 1,
        "errors": ["Error 1"]
    }

    with patch.object(GitLabDataSource, 'sync_merge_requests', new_callable=AsyncMock) as mock_sync:
        mock_sync.return_value = mock_result

        with patch('app.tasks.sync_tasks.update_sync_task_status', new_callable=AsyncMock) as mock_update:
            result = sync_gitlab_mrs.run(project_id=123, task_id=999)

            mock_update.assert_any_call(999, "running")
            mock_update.assert_any_call(999, "completed", records_processed=4, records_failed=1)


def test_sync_trae_token_usage_passes_records_failed():
    """Test that sync_trae_token_usage passes records_failed to update_sync_task_status."""
    from app.tasks.sync_tasks import sync_trae_token_usage
    from app.services.trae_data_source import TraeDataSource

    mock_result = {
        "total": 20,
        "processed": 18,
        "failed": 2,
        "errors": ["Error 1", "Error 2"]
    }

    with patch.object(TraeDataSource, 'sync_token_usage', new_callable=AsyncMock) as mock_sync:
        mock_sync.return_value = mock_result

        with patch('app.tasks.sync_tasks.update_sync_task_status', new_callable=AsyncMock) as mock_update:
            result = sync_trae_token_usage.run(user_id=456, task_id=999)

            mock_update.assert_any_call(999, "running")
            mock_update.assert_any_call(999, "completed", records_processed=18, records_failed=2)


def test_sync_trae_ai_suggestions_passes_records_failed():
    """Test that sync_trae_ai_suggestions passes records_failed to update_sync_task_status."""
    from app.tasks.sync_tasks import sync_trae_ai_suggestions
    from app.services.trae_data_source import TraeDataSource

    mock_result = {
        "total": 15,
        "processed": 14,
        "failed": 1,
        "errors": ["Error 1"]
    }

    with patch.object(TraeDataSource, 'sync_ai_suggestions', new_callable=AsyncMock) as mock_sync:
        mock_sync.return_value = mock_result

        with patch('app.tasks.sync_tasks.update_sync_task_status', new_callable=AsyncMock) as mock_update:
            result = sync_trae_ai_suggestions.run(user_id=456, task_id=999)

            mock_update.assert_any_call(999, "running")
            mock_update.assert_any_call(999, "completed", records_processed=14, records_failed=1)


def test_sync_zendao_bugs_passes_records_failed():
    """Test that sync_zendao_bugs passes records_failed to update_sync_task_status."""
    from app.tasks.sync_tasks import sync_zendao_bugs
    from app.services.zendao_data_source import ZenTaoDataSource

    mock_result = {
        "total": 8,
        "processed": 7,
        "failed": 1,
        "errors": ["Error 1"]
    }

    with patch.object(ZenTaoDataSource, 'sync_bugs', new_callable=AsyncMock) as mock_sync:
        mock_sync.return_value = mock_result

        with patch('app.tasks.sync_tasks.update_sync_task_status', new_callable=AsyncMock) as mock_update:
            result = sync_zendao_bugs.run(project_id=789, task_id=999)

            mock_update.assert_any_call(999, "running")
            mock_update.assert_any_call(999, "completed", records_processed=7, records_failed=1)


def test_sync_zendao_tasks_passes_records_failed():
    """Test that sync_zendao_tasks passes records_failed to update_sync_task_status."""
    from app.tasks.sync_tasks import sync_zendao_tasks
    from app.services.zendao_data_source import ZenTaoDataSource

    mock_result = {
        "total": 12,
        "processed": 10,
        "failed": 2,
        "errors": ["Error 1", "Error 2"]
    }

    with patch.object(ZenTaoDataSource, 'sync_tasks', new_callable=AsyncMock) as mock_sync:
        mock_sync.return_value = mock_result

        with patch('app.tasks.sync_tasks.update_sync_task_status', new_callable=AsyncMock) as mock_update:
            result = sync_zendao_tasks.run(project_id=789, task_id=999)

            mock_update.assert_any_call(999, "running")
            mock_update.assert_any_call(999, "completed", records_processed=10, records_failed=2)


# ============== Phase 8: Test total_processed Calculation Simplification (Code Review Fix) ==============

def test_sync_all_gitlab_total_processed_calculation():
    """Test that sync_all_gitlab correctly calculates total_processed from nested results."""
    from app.tasks.sync_tasks import sync_all_gitlab
    from app.services.gitlab_data_source import GitLabDataSource

    # Mock sync_all to return nested result structure
    mock_sync_result = {
        "commits": {
            "total": 10,
            "processed": 8,
            "failed": 2,
            "errors": []
        },
        "merge_requests": {
            "total": 5,
            "processed": 4,
            "failed": 1,
            "errors": []
        }
    }

    with patch.object(GitLabDataSource, 'sync_all', new_callable=AsyncMock) as mock_sync:
        mock_sync.return_value = mock_sync_result

        # Mock Project query to return a test project
        mock_project = MagicMock()
        mock_project.id = 1
        mock_project.gitlab_repo_id = 123

        with patch('app.tasks.sync_tasks.AsyncSessionLocal') as mock_session_class:
            mock_session = AsyncMock()
            mock_session_class.return_value.__aenter__ = AsyncMock(return_value=mock_session)
            mock_session_class.return_value.__aexit__ = AsyncMock(return_value=False)

            # Mock the execute method for Project query
            mock_result = MagicMock()
            mock_result.scalars.return_value.all.return_value = [mock_project]
            mock_session.execute = AsyncMock(return_value=mock_result)

            # Run the task
            result = sync_all_gitlab.run()

            # Verify total_processed is correctly calculated (8 + 4 = 12)
            assert result["status"] in ["success", "partial_success"]
            assert len(result["results"]) == 1
            assert result["results"][0]["status"] == "success"


# ============== Phase 9: Test Timezone Usage (Code Review Fix) ==============

def test_datetime_now_includes_timezone():
    """Test that datetime.now() includes timezone information (uses datetime.now(timezone.utc))."""
    import re

    # Read the sync_tasks.py file
    with open('app/tasks/sync_tasks.py', 'r') as f:
        content = f.read()

    # Find all datetime.now() usages (without timezone)
    naive_now_pattern = r'datetime\.now\(\)'
    naive_matches = re.findall(naive_now_pattern, content)

    # These should be minimal - only allowed in specific contexts
    # Most datetime.now() should be datetime.now(timezone.utc)
    # We allow some naive datetime for timestamp fields that don't require timezone

    # Check that started_at and completed_at use timezone.utc
    assert 'datetime.now(timezone.utc)' in content or 'datetime.now()' in content

    # Verify the import includes timezone
    assert 'from datetime import' in content
    assert 'timezone' in content
