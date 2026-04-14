"""Database seed data for Coding Agent Stats Platform.

Provides initial data for development and testing environments.
"""

from datetime import date, datetime, timedelta
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.models import (
    AISuggestion,
    BugRecord,
    CodeCommit,
    DataSource,
    Project,
    ProjectMember,
    Role,
    StatsSnapshot,
    SyncTask,
    TokenUsage,
    User,
    UserAccount,
)


async def seed_roles(session: AsyncSession) -> dict[str, int]:
    """Seed default roles.

    Returns:
        Dictionary mapping role names to their IDs.
    """
    roles_data = [
        {
            "name": "admin",
            "description": "系统管理员 - 所有权限",
            "permissions": [
                "stats:global:view",
                "stats:project:view",
                "stats:personal:view",
                "config:manage",
                "sync:trigger",
                "user:manage",
                "role:manage",
            ],
        },
        {
            "name": "project_manager",
            "description": "项目经理 - 项目管理权限",
            "permissions": [
                "stats:global:view",
                "stats:project:view",
                "stats:personal:view",
                "config:manage",
            ],
        },
        {
            "name": "developer",
            "description": "研发人员 - 个人数据查看权限",
            "permissions": ["stats:personal:view", "stats:project:view"],
        },
        {
            "name": "tester",
            "description": "测试人员 - Bug相关权限",
            "permissions": ["stats:personal:view", "stats:project:view"],
        },
    ]

    role_ids = {}

    for role_data in roles_data:
        # Check if role already exists
        result = await session.execute(
            select(Role).where(Role.name == role_data["name"])
        )
        existing = result.scalar_one_or_none()

        if existing:
            role_ids[role_data["name"]] = existing.id
        else:
            role = Role(**role_data)
            session.add(role)
            await session.flush()
            role_ids[role_data["name"]] = role.id

    await session.commit()
    return role_ids


async def seed_users(session: AsyncSession, role_ids: dict[str, int]) -> dict[str, int]:
    """Seed test users.

    Args:
        session: Database session.
        role_ids: Dictionary of role names to IDs.

    Returns:
        Dictionary mapping usernames to their IDs.
    """
    users_data = [
        {
            "username": "admin",
            "email": "admin@example.com",
            "password_hash": "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qGZvKG6G",  # password123
            "department": "研发中心",
            "role_id": role_ids.get("admin"),
        },
        {
            "username": "zhangsan",
            "email": "zhangsan@example.com",
            "password_hash": "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qGZvKG6G",  # password123
            "department": "研发一部",
            "role_id": role_ids.get("developer"),
        },
        {
            "username": "lisi",
            "email": "lisi@example.com",
            "password_hash": "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qGZvKG6G",  # password123
            "department": "研发一部",
            "role_id": role_ids.get("developer"),
        },
        {
            "username": "wangwu",
            "email": "wangwu@example.com",
            "password_hash": "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qGZvKG6G",  # password123
            "department": "研发二部",
            "role_id": role_ids.get("developer"),
        },
        {
            "username": "zhaoliu",
            "email": "zhaoliu@example.com",
            "password_hash": "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qGZvKG6G",  # password123
            "department": "测试部",
            "role_id": role_ids.get("tester"),
        },
        {
            "username": "pm_zhang",
            "email": "pm.zhang@example.com",
            "password_hash": "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qGZvKG6G",  # password123
            "department": "产品部",
            "role_id": role_ids.get("project_manager"),
        },
    ]

    user_ids = {}

    for user_data in users_data:
        result = await session.execute(
            select(User).where(User.username == user_data["username"])
        )
        existing = result.scalar_one_or_none()

        if existing:
            user_ids[user_data["username"]] = existing.id
        else:
            user = User(**user_data)
            session.add(user)
            await session.flush()
            user_ids[user_data["username"]] = user.id

    await session.commit()
    return user_ids


async def seed_projects(session: AsyncSession, user_ids: dict[str, int]) -> dict[str, int]:
    """Seed test projects.

    Args:
        session: Database session.
        user_ids: Dictionary of usernames to IDs.

    Returns:
        Dictionary mapping project codes to their IDs.
    """
    projects_data = [
        {
            "name": "项目管理平台",
            "code": "PMP-2026",
            "description": "企业内部项目管理平台",
            "stage": "研发",
            "status": "active",
            "manager_id": user_ids.get("pm_zhang"),
            "gitlab_repo_id": 101,
            "gitlab_repo_url": "https://gitlab.example.com/pmp-2026",
            "zendao_project_id": 201,
            "zendao_project_key": "PMP",
            "start_date": date(2026, 1, 1),
        },
        {
            "name": "数据统计系统",
            "code": "SDS-2026",
            "description": "数据统计分析系统",
            "stage": "研发",
            "status": "active",
            "manager_id": user_ids.get("zhangsan"),
            "gitlab_repo_id": 102,
            "gitlab_repo_url": "https://gitlab.example.com/sds-2026",
            "zendao_project_id": 202,
            "zendao_project_key": "SDS",
            "start_date": date(2026, 2, 1),
        },
        {
            "name": "CRM系统",
            "code": "CRM-2026",
            "description": "客户关系管理系统",
            "stage": "需求",
            "status": "active",
            "manager_id": user_ids.get("wangwu"),
            "gitlab_repo_id": 103,
            "gitlab_repo_url": "https://gitlab.example.com/crm-2026",
            "zendao_project_id": 203,
            "zendao_project_key": "CRM",
            "start_date": date(2026, 3, 1),
        },
    ]

    project_ids = {}

    for project_data in projects_data:
        result = await session.execute(
            select(Project).where(Project.code == project_data["code"])
        )
        existing = result.scalar_one_or_none()

        if existing:
            project_ids[project_data["code"]] = existing.id
        else:
            project = Project(**project_data)
            session.add(project)
            await session.flush()
            project_ids[project_data["code"]] = project.id

    await session.commit()
    return project_ids


async def seed_project_members(
    session: AsyncSession,
    user_ids: dict[str, int],
    project_ids: dict[str, int],
) -> None:
    """Seed project members.

    Args:
        session: Database session.
        user_ids: Dictionary of usernames to IDs.
        project_ids: Dictionary of project codes to IDs.
    """
    members_data = [
        # PMP-2026 project
        {"project_id": project_ids["PMP-2026"], "user_id": user_ids["pm_zhang"], "role": "manager"},
        {"project_id": project_ids["PMP-2026"], "user_id": user_ids["zhangsan"], "role": "member"},
        {"project_id": project_ids["PMP-2026"], "user_id": user_ids["lisi"], "role": "member"},
        {"project_id": project_ids["PMP-2026"], "user_id": user_ids["zhaoliu"], "role": "member"},
        # SDS-2026 project
        {"project_id": project_ids["SDS-2026"], "user_id": user_ids["zhangsan"], "role": "manager"},
        {"project_id": project_ids["SDS-2026"], "user_id": user_ids["lisi"], "role": "member"},
        {"project_id": project_ids["SDS-2026"], "user_id": user_ids["wangwu"], "role": "member"},
        # CRM-2026 project
        {"project_id": project_ids["CRM-2026"], "user_id": user_ids["wangwu"], "role": "manager"},
        {"project_id": project_ids["CRM-2026"], "user_id": user_ids["zhaoliu"], "role": "member"},
    ]

    for member_data in members_data:
        # Check if membership already exists
        result = await session.execute(
            select(ProjectMember).where(
                ProjectMember.project_id == member_data["project_id"],
                ProjectMember.user_id == member_data["user_id"],
            )
        )
        existing = result.scalar_one_or_none()

        if not existing:
            member = ProjectMember(**member_data)
            session.add(member)

    await session.commit()


async def seed_user_accounts(
    session: AsyncSession,
    user_ids: dict[str, int],
) -> None:
    """Seed user platform accounts.

    Args:
        session: Database session.
        user_ids: Dictionary of usernames to IDs.
    """
    accounts_data = [
        {"user_id": user_ids["zhangsan"], "platform": "gitlab", "account_id": "zhangsan.gitlab", "account_name": "张三", "is_default": True},
        {"user_id": user_ids["zhangsan"], "platform": "trae", "account_id": "zhangsan.trae", "account_name": "张三", "is_default": True},
        {"user_id": user_ids["lisi"], "platform": "gitlab", "account_id": "lisi.gitlab", "account_name": "李四", "is_default": True},
        {"user_id": user_ids["lisi"], "platform": "trae", "account_id": "lisi.trae", "account_name": "李四", "is_default": True},
        {"user_id": user_ids["wangwu"], "platform": "gitlab", "account_id": "wangwu.gitlab", "account_name": "王五", "is_default": True},
        {"user_id": user_ids["wangwu"], "platform": "trae", "account_id": "wangwu.trae", "account_name": "王五", "is_default": True},
    ]

    for account_data in accounts_data:
        result = await session.execute(
            select(UserAccount).where(
                UserAccount.user_id == account_data["user_id"],
                UserAccount.platform == account_data["platform"],
            )
        )
        existing = result.scalar_one_or_none()

        if not existing:
            account = UserAccount(**account_data)
            session.add(account)

    await session.commit()


async def seed_code_commits(
    session: AsyncSession,
    user_ids: dict[str, int],
    project_ids: dict[str, int],
) -> None:
    """Seed sample code commits.

    Args:
        session: Database session.
        user_ids: Dictionary of usernames to IDs.
        project_ids: Dictionary of project codes to IDs.
    """
    commits_data = [
        {
            "user_id": user_ids["zhangsan"],
            "project_id": project_ids["PMP-2026"],
            "commit_hash": "abc123def456789",
            "additions": 150,
            "deletions": 30,
            "language": "python",
            "file_count": 5,
            "commit_message": "Add user authentication module",
            "commit_time": datetime.now() - timedelta(days=5),
            "is_ai_generated": True,
            "branch_name": "feature/auth",
        },
        {
            "user_id": user_ids["zhangsan"],
            "project_id": project_ids["PMP-2026"],
            "commit_hash": "def789abc123456",
            "additions": 200,
            "deletions": 50,
            "language": "typescript",
            "file_count": 8,
            "commit_message": "Implement dashboard UI",
            "commit_time": datetime.now() - timedelta(days=3),
            "is_ai_generated": False,
            "branch_name": "feature/dashboard",
        },
        {
            "user_id": user_ids["lisi"],
            "project_id": project_ids["PMP-2026"],
            "commit_hash": "ghi789jkl012345",
            "additions": 80,
            "deletions": 20,
            "language": "python",
            "file_count": 3,
            "commit_message": "Fix bug in data processing",
            "commit_time": datetime.now() - timedelta(days=2),
            "is_ai_generated": True,
            "branch_name": "bugfix/data-processing",
        },
        {
            "user_id": user_ids["wangwu"],
            "project_id": project_ids["SDS-2026"],
            "commit_hash": "jkl012mno345678",
            "additions": 300,
            "deletions": 100,
            "language": "python",
            "file_count": 10,
            "commit_message": "Add statistical analysis module",
            "commit_time": datetime.now() - timedelta(days=4),
            "is_ai_generated": False,
            "branch_name": "feature/stats",
        },
    ]

    for commit_data in commits_data:
        result = await session.execute(
            select(CodeCommit).where(CodeCommit.commit_hash == commit_data["commit_hash"])
        )
        existing = result.scalar_one_or_none()

        if not existing:
            commit = CodeCommit(**commit_data)
            session.add(commit)

    await session.commit()


async def seed_token_usage(
    session: AsyncSession,
    user_ids: dict[str, int],
    project_ids: dict[str, int],
) -> None:
    """Seed sample token usage records.

    Args:
        session: Database session.
        user_ids: Dictionary of usernames to IDs.
        project_ids: Dictionary of project codes to IDs.
    """
    today = date.today()

    token_data = [
        {
            "user_id": user_ids["zhangsan"],
            "project_id": project_ids["PMP-2026"],
            "platform": "trae",
            "token_count": 50000,
            "api_calls": 100,
            "usage_date": today - timedelta(days=5),
            "model": "claude-3-sonnet",
            "cost": Decimal("0.50"),
        },
        {
            "user_id": user_ids["zhangsan"],
            "project_id": project_ids["PMP-2026"],
            "platform": "trae",
            "token_count": 30000,
            "api_calls": 60,
            "usage_date": today - timedelta(days=4),
            "model": "claude-3-sonnet",
            "cost": Decimal("0.30"),
        },
        {
            "user_id": user_ids["lisi"],
            "project_id": project_ids["PMP-2026"],
            "platform": "trae",
            "token_count": 45000,
            "api_calls": 90,
            "usage_date": today - timedelta(days=5),
            "model": "claude-3-haiku",
            "cost": Decimal("0.25"),
        },
        {
            "user_id": user_ids["wangwu"],
            "project_id": project_ids["SDS-2026"],
            "platform": "trae",
            "token_count": 60000,
            "api_calls": 120,
            "usage_date": today - timedelta(days=3),
            "model": "claude-3-opus",
            "cost": Decimal("1.20"),
        },
    ]

    for token_record in token_data:
        result = await session.execute(
            select(TokenUsage).where(
                TokenUsage.user_id == token_record["user_id"],
                TokenUsage.platform == token_record["platform"],
                TokenUsage.usage_date == token_record["usage_date"],
            )
        )
        existing = result.scalar_one_or_none()

        if not existing:
            usage = TokenUsage(**token_record)
            session.add(usage)

    await session.commit()


async def seed_bug_records(
    session: AsyncSession,
    user_ids: dict[str, int],
    project_ids: dict[str, int],
) -> None:
    """Seed sample bug records.

    Args:
        session: Database session.
        user_ids: Dictionary of usernames to IDs.
        project_ids: Dictionary of project codes to IDs.
    """
    bugs_data = [
        {
            "project_id": project_ids["PMP-2026"],
            "assignee_id": user_ids["zhangsan"],
            "reporter_id": user_ids["zhaoliu"],
            "zendao_bug_id": 1001,
            "title": "登录页面无法显示",
            "description": "用户反馈登录页面白屏，无法显示登录表单",
            "severity": "critical",
            "priority": "urgent",
            "status": "resolved",
            "type": "bug",
            "module": "用户认证",
            "resolved_at": datetime.now() - timedelta(days=2),
            "resolution": "修复了CSS加载问题",
        },
        {
            "project_id": project_ids["PMP-2026"],
            "assignee_id": user_ids["lisi"],
            "reporter_id": user_ids["zhaoliu"],
            "zendao_bug_id": 1002,
            "title": "数据统计图表显示不正确",
            "description": "Dashboard上的饼图数据显示有误",
            "severity": "major",
            "priority": "high",
            "status": "active",
            "type": "bug",
            "module": "数据可视化",
        },
        {
            "project_id": project_ids["SDS-2026"],
            "assignee_id": user_ids["wangwu"],
            "reporter_id": user_ids["zhaoliu"],
            "zendao_bug_id": 1003,
            "title": "导出功能超时",
            "description": "大数据量导出时请求超时",
            "severity": "normal",
            "priority": "medium",
            "status": "assigned",
            "type": "bug",
            "module": "数据导出",
        },
    ]

    for bug_data in bugs_data:
        result = await session.execute(
            select(BugRecord).where(BugRecord.zendao_bug_id == bug_data["zendao_bug_id"])
        )
        existing = result.scalar_one_or_none()

        if not existing:
            bug = BugRecord(**bug_data)
            session.add(bug)

    await session.commit()


async def seed_ai_suggestions(
    session: AsyncSession,
    user_ids: dict[str, int],
    project_ids: dict[str, int],
) -> None:
    """Seed sample AI suggestions.

    Args:
        session: Database session.
        user_ids: Dictionary of usernames to IDs.
        project_ids: Dictionary of project codes to IDs.
    """
    suggestions_data = [
        {
            "user_id": user_ids["zhangsan"],
            "project_id": project_ids["PMP-2026"],
            "platform": "trae",
            "suggestion_type": "code_completion",
            "content": "建议使用async/await优化数据库查询",
            "language": "python",
            "file_path": "app/db/base.py",
            "line_number": 25,
            "token_cost": 150,
            "is_accepted": True,
            "accepted_at": datetime.now() - timedelta(days=5),
        },
        {
            "user_id": user_ids["zhangsan"],
            "project_id": project_ids["PMP-2026"],
            "platform": "trae",
            "suggestion_type": "refactoring",
            "content": "建议将重复代码提取为独立函数",
            "language": "typescript",
            "file_path": "src/components/Dashboard.tsx",
            "line_number": 45,
            "token_cost": 200,
            "is_accepted": False,
        },
        {
            "user_id": user_ids["lisi"],
            "project_id": project_ids["PMP-2026"],
            "platform": "trae",
            "suggestion_type": "bug_fix",
            "content": "修复空指针异常，添加null检查",
            "language": "python",
            "file_path": "app/services/stats.py",
            "line_number": 78,
            "token_cost": 100,
            "is_accepted": True,
            "accepted_at": datetime.now() - timedelta(days=2),
        },
    ]

    for suggestion_data in suggestions_data:
        suggestion = AISuggestion(**suggestion_data)
        session.add(suggestion)

    await session.commit()


async def seed_data_sources(
    session: AsyncSession,
    project_ids: dict[str, int],
) -> None:
    """Seed sample data sources.

    Args:
        session: Database session.
        project_ids: Dictionary of project codes to IDs.
    """
    sources_data = [
        {
            "project_id": project_ids["PMP-2026"],
            "source_type": "gitlab",
            "source_name": "PMP GitLab",
            "config": {
                "repo_id": 101,
                "repo_url": "https://gitlab.example.com/pmp-2026",
                "branch": "main",
            },
            "is_active": True,
            "sync_frequency": "daily",
            "last_sync_at": datetime.now() - timedelta(hours=2),
        },
        {
            "project_id": project_ids["PMP-2026"],
            "source_type": "zendao",
            "source_name": "PMP ZenDao",
            "config": {
                "project_id": 201,
                "project_key": "PMP",
                "api_url": "https://zendao.example.com/api",
            },
            "is_active": True,
            "sync_frequency": "hourly",
            "last_sync_at": datetime.now() - timedelta(hours=1),
        },
        {
            "project_id": project_ids["SDS-2026"],
            "source_type": "gitlab",
            "source_name": "SDS GitLab",
            "config": {
                "repo_id": 102,
                "repo_url": "https://gitlab.example.com/sds-2026",
                "branch": "main",
            },
            "is_active": True,
            "sync_frequency": "daily",
            "last_sync_at": datetime.now() - timedelta(hours=3),
        },
    ]

    for source_data in sources_data:
        result = await session.execute(
            select(DataSource).where(
                DataSource.project_id == source_data["project_id"],
                DataSource.source_type == source_data["source_type"],
            )
        )
        existing = result.scalar_one_or_none()

        if not existing:
            source = DataSource(**source_data)
            session.add(source)

    await session.commit()


async def seed_sync_tasks(
    session: AsyncSession,
    project_ids: dict[str, int],
) -> None:
    """Seed sample sync tasks.

    Args:
        session: Database session.
        project_ids: Dictionary of project codes to IDs.
    """
    tasks_data = [
        {
            "task_type": "full_sync",
            "source_type": "gitlab",
            "project_id": project_ids["PMP-2026"],
            "status": "completed",
            "started_at": datetime.now() - timedelta(hours=3),
            "completed_at": datetime.now() - timedelta(hours=2),
            "records_processed": 150,
            "records_failed": 0,
            "created_by": "admin",
        },
        {
            "task_type": "incremental_sync",
            "source_type": "zendao",
            "project_id": project_ids["PMP-2026"],
            "status": "completed",
            "started_at": datetime.now() - timedelta(hours=2),
            "completed_at": datetime.now() - timedelta(hours=1, minutes=50),
            "records_processed": 25,
            "records_failed": 2,
            "created_by": "system",
        },
        {
            "task_type": "full_sync",
            "source_type": "gitlab",
            "project_id": project_ids["SDS-2026"],
            "status": "running",
            "started_at": datetime.now() - timedelta(minutes=30),
            "records_processed": 75,
            "records_failed": 0,
            "created_by": "admin",
        },
    ]

    for task_data in tasks_data:
        task = SyncTask(**task_data)
        session.add(task)

    await session.commit()


async def seed_stats_snapshots(
    session: AsyncSession,
    user_ids: dict[str, int],
    project_ids: dict[str, int],
) -> None:
    """Seed sample stats snapshots.

    Args:
        session: Database session.
        user_ids: Dictionary of usernames to IDs.
        project_ids: Dictionary of project codes to IDs.
    """
    today = date.today()

    snapshots_data = [
        # Global snapshot
        {
            "snapshot_type": "global",
            "snapshot_date": today,
            "metrics": {
                "total_users": 6,
                "total_projects": 3,
                "total_commits": 150,
                "total_tokens": 500000,
                "total_bugs": 25,
                "ai_adoption_rate": 0.65,
            },
        },
        # Project snapshots
        {
            "snapshot_type": "project",
            "snapshot_date": today,
            "project_id": project_ids["PMP-2026"],
            "metrics": {
                "total_commits": 80,
                "total_additions": 5000,
                "total_deletions": 1000,
                "ai_commits": 50,
                "ai_adoption_rate": 0.625,
                "total_tokens": 300000,
                "open_bugs": 5,
            },
        },
        {
            "snapshot_type": "project",
            "snapshot_date": today,
            "project_id": project_ids["SDS-2026"],
            "metrics": {
                "total_commits": 50,
                "total_additions": 3000,
                "total_deletions": 800,
                "ai_commits": 30,
                "ai_adoption_rate": 0.60,
                "total_tokens": 150000,
                "open_bugs": 3,
            },
        },
        # Personal snapshots
        {
            "snapshot_type": "personal",
            "snapshot_date": today,
            "user_id": user_ids["zhangsan"],
            "metrics": {
                "total_commits": 40,
                "total_additions": 2500,
                "total_deletions": 500,
                "ai_commits": 30,
                "ai_adoption_rate": 0.75,
                "total_tokens": 200000,
                "bugs_resolved": 5,
            },
        },
        {
            "snapshot_type": "personal",
            "snapshot_date": today,
            "user_id": user_ids["lisi"],
            "metrics": {
                "total_commits": 30,
                "total_additions": 1500,
                "total_deletions": 300,
                "ai_commits": 20,
                "ai_adoption_rate": 0.67,
                "total_tokens": 100000,
                "bugs_resolved": 3,
            },
        },
    ]

    for snapshot_data in snapshots_data:
        result = await session.execute(
            select(StatsSnapshot).where(
                StatsSnapshot.snapshot_type == snapshot_data["snapshot_type"],
                StatsSnapshot.snapshot_date == snapshot_data["snapshot_date"],
                StatsSnapshot.project_id == snapshot_data.get("project_id"),
                StatsSnapshot.user_id == snapshot_data.get("user_id"),
            )
        )
        existing = result.scalar_one_or_none()

        if not existing:
            snapshot = StatsSnapshot(**snapshot_data)
            session.add(snapshot)

    await session.commit()


async def seed_database(session: AsyncSession) -> None:
    """Seed the database with initial data.

    This is the main entry point for database seeding.
    It seeds all tables in the correct order to respect foreign key constraints.

    Args:
        session: Database session.
    """
    # Seed in order of dependencies
    role_ids = await seed_roles(session)
    user_ids = await seed_users(session, role_ids)
    project_ids = await seed_projects(session, user_ids)

    # Seed dependent tables
    await seed_project_members(session, user_ids, project_ids)
    await seed_user_accounts(session, user_ids)
    await seed_code_commits(session, user_ids, project_ids)
    await seed_token_usage(session, user_ids, project_ids)
    await seed_bug_records(session, user_ids, project_ids)
    await seed_ai_suggestions(session, user_ids, project_ids)
    await seed_data_sources(session, project_ids)
    await seed_sync_tasks(session, project_ids)
    await seed_stats_snapshots(session, user_ids, project_ids)
