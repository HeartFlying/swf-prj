"""E2E测试数据种子脚本.

为端到端测试生成完整的测试数据集，包含用户、项目、代码提交、Token使用、Bug记录等。
数据之间保持关联性，确保测试场景的真实性。
"""

import random
from datetime import date, datetime, timedelta
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.db.models import (
    AISuggestion,
    BugRecord,
    CodeCommit,
    DataSource,
    Project,
    ProjectMember,
    Role,
    StatsSnapshot,
    SyncLog,
    SyncTask,
    TokenUsage,
    User,
    UserAccount,
)


# 密码哈希: password123
PASSWORD_HASH = "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qGZvKG6G"

# 语言列表
LANGUAGES = ["python", "javascript", "typescript", "java", "go", "rust", "c", "cpp", "sql", "shell"]

# 提交消息模板
COMMIT_MESSAGES = [
    "Add {feature} module",
    "Fix bug in {module}",
    "Refactor {module} for better performance",
    "Update {feature} functionality",
    "Implement {feature} API",
    "Optimize {module} queries",
    "Add tests for {feature}",
    "Fix {module} security issue",
    "Update dependencies for {module}",
    "Merge {feature} branch",
]

# Bug标题模板
BUG_TITLES = [
    "登录页面无法显示",
    "数据统计图表显示不正确",
    "导出功能超时",
    "用户权限验证失败",
    "API响应速度过慢",
    "数据库连接池耗尽",
    "缓存刷新机制异常",
    "文件上传大小限制无效",
    "定时任务执行失败",
    "邮件发送服务异常",
]


async def seed_e2e_roles(session: AsyncSession) -> dict[str, int]:
    """为E2E测试创建角色.

    Returns:
        角色名称到ID的映射字典
    """
    roles_data = [
        {
            "name": "admin",
            "description": "系统管理员 - 所有权限",
            "permissions": ["*"],
        },
        {
            "name": "developer",
            "description": "研发人员 - 开发权限",
            "permissions": ["stats:personal:view", "stats:project:view", "code:commit"],
        },
        {
            "name": "tester",
            "description": "测试人员 - 测试权限",
            "permissions": ["stats:personal:view", "stats:project:view", "bug:manage"],
        },
        {
            "name": "pm",
            "description": "项目经理 - 项目管理权限",
            "permissions": ["stats:global:view", "stats:project:view", "project:manage"],
        },
        {
            "name": "user",
            "description": "普通用户 - 只读权限",
            "permissions": ["stats:personal:view"],
        },
    ]

    role_ids = {}
    for role_data in roles_data:
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


async def seed_e2e_users(session: AsyncSession, role_ids: dict[str, int]) -> dict[str, int]:
    """为E2E测试创建测试用户.

    Args:
        session: 数据库会话
        role_ids: 角色名称到ID的映射

    Returns:
        用户名到ID的映射字典
    """
    users_data = [
        # 核心测试用户 (permissions.spec.ts 需要)
        {
            "username": "admin",
            "email": "admin@example.com",
            "password_hash": PASSWORD_HASH,
            "department": "研发中心",
            "role_id": role_ids.get("admin"),
            "is_active": True,
        },
        {
            "username": "developer",
            "email": "developer@example.com",
            "password_hash": PASSWORD_HASH,
            "department": "研发一部",
            "role_id": role_ids.get("developer"),
            "is_active": True,
        },
        {
            "username": "tester",
            "email": "tester@example.com",
            "password_hash": PASSWORD_HASH,
            "department": "测试部",
            "role_id": role_ids.get("tester"),
            "is_active": True,
        },
        {
            "username": "pm",
            "email": "pm@example.com",
            "password_hash": PASSWORD_HASH,
            "department": "产品部",
            "role_id": role_ids.get("pm"),
            "is_active": True,
        },
        # 额外测试用户
        {
            "username": "zhangsan",
            "email": "zhangsan@example.com",
            "password_hash": PASSWORD_HASH,
            "department": "研发一部",
            "role_id": role_ids.get("developer"),
            "is_active": True,
        },
        {
            "username": "lisi",
            "email": "lisi@example.com",
            "password_hash": PASSWORD_HASH,
            "department": "研发一部",
            "role_id": role_ids.get("developer"),
            "is_active": True,
        },
        {
            "username": "wangwu",
            "email": "wangwu@example.com",
            "password_hash": PASSWORD_HASH,
            "department": "研发二部",
            "role_id": role_ids.get("developer"),
            "is_active": True,
        },
        {
            "username": "zhaoliu",
            "email": "zhaoliu@example.com",
            "password_hash": PASSWORD_HASH,
            "department": "测试部",
            "role_id": role_ids.get("tester"),
            "is_active": True,
        },
        {
            "username": "testuser",
            "email": "testuser@example.com",
            "password_hash": PASSWORD_HASH,
            "department": "测试部门",
            "role_id": role_ids.get("user"),
            "is_active": True,
        },
        {
            "username": "inactive_user",
            "email": "inactive@example.com",
            "password_hash": PASSWORD_HASH,
            "department": "研发部",
            "role_id": role_ids.get("user"),
            "is_active": False,
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


async def seed_e2e_projects(session: AsyncSession, user_ids: dict[str, int]) -> dict[str, int]:
    """为E2E测试创建项目.

    Args:
        session: 数据库会话
        user_ids: 用户名到ID的映射

    Returns:
        项目代码到ID的映射字典
    """
    projects_data = [
        {
            "name": "项目管理平台",
            "code": "PMP-2026",
            "description": "企业内部项目管理平台，支持多项目管理和数据统计",
            "stage": "研发",
            "status": "active",
            "manager_id": user_ids.get("pm"),
            "gitlab_repo_id": 101,
            "gitlab_repo_url": "https://gitlab.example.com/pmp-2026",
            "zendao_project_id": 201,
            "zendao_project_key": "PMP",
            "start_date": date(2026, 1, 1),
        },
        {
            "name": "数据统计系统",
            "code": "SDS-2026",
            "description": "开发者数据统计分析系统，提供代码提交、Token使用等统计",
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
            "name": "CRM客户关系管理",
            "code": "CRM-2026",
            "description": "客户关系管理系统，支持销售跟踪和客户数据分析",
            "stage": "需求",
            "status": "active",
            "manager_id": user_ids.get("wangwu"),
            "gitlab_repo_id": 103,
            "gitlab_repo_url": "https://gitlab.example.com/crm-2026",
            "zendao_project_id": 203,
            "zendao_project_key": "CRM",
            "start_date": date(2026, 3, 1),
        },
        {
            "name": "内部OA系统",
            "code": "OA-2026",
            "description": "企业内部办公自动化系统",
            "stage": "运维",
            "status": "active",
            "manager_id": user_ids.get("pm"),
            "gitlab_repo_id": 104,
            "gitlab_repo_url": "https://gitlab.example.com/oa-2026",
            "zendao_project_id": 204,
            "zendao_project_key": "OA",
            "start_date": date(2025, 6, 1),
        },
        {
            "name": "数据仓库平台",
            "code": "DWP-2026",
            "description": "企业数据仓库和BI分析平台",
            "stage": "设计",
            "status": "archived",
            "manager_id": user_ids.get("wangwu"),
            "gitlab_repo_id": 105,
            "gitlab_repo_url": "https://gitlab.example.com/dwp-2026",
            "zendao_project_id": 205,
            "zendao_project_key": "DWP",
            "start_date": date(2026, 1, 15),
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


async def seed_e2e_project_members(
    session: AsyncSession,
    user_ids: dict[str, int],
    project_ids: dict[str, int],
) -> None:
    """创建项目成员关系.

    Args:
        session: 数据库会话
        user_ids: 用户名到ID的映射
        project_ids: 项目代码到ID的映射
    """
    members_data = [
        # PMP-2026 项目
        {"project_id": project_ids["PMP-2026"], "user_id": user_ids["pm"], "role": "manager"},
        {"project_id": project_ids["PMP-2026"], "user_id": user_ids["zhangsan"], "role": "member"},
        {"project_id": project_ids["PMP-2026"], "user_id": user_ids["lisi"], "role": "member"},
        {"project_id": project_ids["PMP-2026"], "user_id": user_ids["zhaoliu"], "role": "member"},
        {"project_id": project_ids["PMP-2026"], "user_id": user_ids["developer"], "role": "member"},
        {"project_id": project_ids["PMP-2026"], "user_id": user_ids["tester"], "role": "member"},
        # SDS-2026 项目
        {"project_id": project_ids["SDS-2026"], "user_id": user_ids["zhangsan"], "role": "manager"},
        {"project_id": project_ids["SDS-2026"], "user_id": user_ids["lisi"], "role": "member"},
        {"project_id": project_ids["SDS-2026"], "user_id": user_ids["wangwu"], "role": "member"},
        {"project_id": project_ids["SDS-2026"], "user_id": user_ids["zhaoliu"], "role": "member"},
        {"project_id": project_ids["SDS-2026"], "user_id": user_ids["developer"], "role": "member"},
        # CRM-2026 项目
        {"project_id": project_ids["CRM-2026"], "user_id": user_ids["wangwu"], "role": "manager"},
        {"project_id": project_ids["CRM-2026"], "user_id": user_ids["zhaoliu"], "role": "member"},
        {"project_id": project_ids["CRM-2026"], "user_id": user_ids["pm"], "role": "member"},
        # OA-2026 项目
        {"project_id": project_ids["OA-2026"], "user_id": user_ids["pm"], "role": "manager"},
        {"project_id": project_ids["OA-2026"], "user_id": user_ids["zhangsan"], "role": "member"},
        {"project_id": project_ids["OA-2026"], "user_id": user_ids["lisi"], "role": "member"},
        # DWP-2026 项目 (已归档)
        {"project_id": project_ids["DWP-2026"], "user_id": user_ids["wangwu"], "role": "manager"},
        {"project_id": project_ids["DWP-2026"], "user_id": user_ids["zhangsan"], "role": "member"},
    ]

    for member_data in members_data:
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


async def seed_e2e_user_accounts(
    session: AsyncSession,
    user_ids: dict[str, int],
) -> None:
    """创建用户平台账号.

    Args:
        session: 数据库会话
        user_ids: 用户名到ID的映射
    """
    accounts_data = []
    platforms = ["gitlab", "trae"]

    for username, user_id in user_ids.items():
        if username in ["inactive_user"]:
            continue
        for platform in platforms:
            accounts_data.append({
                "user_id": user_id,
                "platform": platform,
                "account_id": f"{username}.{platform}",
                "account_name": username,
                "is_default": True,
            })

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


def generate_commit_hash() -> str:
    """生成模拟的commit hash."""
    return "".join(random.choices("0123456789abcdef", k=40))


def generate_commit_message() -> str:
    """生成随机的提交消息."""
    template = random.choice(COMMIT_MESSAGES)
    feature = random.choice(["user auth", "dashboard", "API", "database", "cache", "logging", "config"])
    module = random.choice(["auth", "stats", "projects", "users", "sync", "export"])
    return template.format(feature=feature, module=module)


async def seed_e2e_code_commits(
    session: AsyncSession,
    user_ids: dict[str, int],
    project_ids: dict[str, int],
) -> None:
    """创建代码提交记录.

    为每个用户在每个项目生成最近30天的代码提交记录.

    Args:
        session: 数据库会话
        user_ids: 用户名到ID的映射
        project_ids: 项目代码到ID的映射
    """
    end_date = datetime.now()
    start_date = end_date - timedelta(days=30)

    # 需要生成提交的用户和项目映射
    user_project_pairs = [
        ("zhangsan", ["PMP-2026", "SDS-2026", "OA-2026"]),
        ("lisi", ["PMP-2026", "SDS-2026", "OA-2026"]),
        ("wangwu", ["SDS-2026", "CRM-2026"]),
        ("zhaoliu", ["PMP-2026", "CRM-2026"]),
        ("developer", ["PMP-2026", "SDS-2026"]),
        ("tester", ["PMP-2026"]),
    ]

    commits_to_add = []
    for username, project_codes in user_project_pairs:
        user_id = user_ids.get(username)
        if not user_id:
            continue

        for project_code in project_codes:
            project_id = project_ids.get(project_code)
            if not project_id:
                continue

            # 每个用户在每个项目生成5-15条提交
            num_commits = random.randint(5, 15)
            for _ in range(num_commits):
                commit_time = start_date + timedelta(
                    seconds=random.randint(0, int((end_date - start_date).total_seconds()))
                )

                commits_to_add.append({
                    "user_id": user_id,
                    "project_id": project_id,
                    "commit_hash": generate_commit_hash(),
                    "additions": random.randint(10, 500),
                    "deletions": random.randint(0, 200),
                    "language": random.choice(LANGUAGES),
                    "file_count": random.randint(1, 10),
                    "commit_message": generate_commit_message(),
                    "commit_time": commit_time,
                    "is_ai_generated": random.random() < 0.6,  # 60%概率是AI生成
                    "branch_name": random.choice(["main", "develop", "feature/new-feature", "bugfix/fix-issue"]),
                })

    # 批量插入
    for commit_data in commits_to_add:
        commit = CodeCommit(**commit_data)
        session.add(commit)

    await session.commit()


async def seed_e2e_token_usage(
    session: AsyncSession,
    user_ids: dict[str, int],
    project_ids: dict[str, int],
) -> None:
    """创建Token使用记录.

    为每个用户生成最近30天的Token使用记录.

    Args:
        session: 数据库会话
        user_ids: 用户名到ID的映射
        project_ids: 项目代码到ID的映射
    """
    end_date = date.today()
    start_date = end_date - timedelta(days=30)

    models = ["claude-3-opus", "claude-3-sonnet", "claude-3-haiku", "gpt-4", "gpt-3.5-turbo"]

    # 需要生成Token记录的用户
    target_users = ["zhangsan", "lisi", "wangwu", "zhaoliu", "developer", "tester"]
    target_projects = ["PMP-2026", "SDS-2026", "CRM-2026", "OA-2026"]

    for username in target_users:
        user_id = user_ids.get(username)
        if not user_id:
            continue

        # 为每个日期生成记录
        current_date = start_date
        while current_date <= end_date:
            # 80%概率有记录
            if random.random() < 0.8:
                project_code = random.choice(target_projects)
                project_id = project_ids.get(project_code)

                token_count = random.randint(1000, 50000)
                cost = Decimal(str(token_count * 0.00001)).quantize(Decimal("0.0001"))

                token_data = {
                    "user_id": user_id,
                    "project_id": project_id,
                    "platform": "trae",
                    "token_count": token_count,
                    "api_calls": random.randint(10, 200),
                    "usage_date": current_date,
                    "model": random.choice(models),
                    "cost": cost,
                }

                # 检查是否已存在 (唯一约束: user_id, platform, usage_date)
                result = await session.execute(
                    select(TokenUsage).where(
                        TokenUsage.user_id == user_id,
                        TokenUsage.platform == "trae",
                        TokenUsage.usage_date == current_date,
                    )
                )
                existing = result.scalar_one_or_none()

                if not existing:
                    usage = TokenUsage(**token_data)
                    session.add(usage)

            current_date += timedelta(days=1)

    await session.commit()


async def seed_e2e_bug_records(
    session: AsyncSession,
    user_ids: dict[str, int],
    project_ids: dict[str, int],
) -> None:
    """创建Bug记录.

    Args:
        session: 数据库会话
        user_ids: 用户名到ID的映射
        project_ids: 项目代码到ID的映射
    """
    severities = ["critical", "major", "normal", "minor", "trivial"]
    priorities = ["urgent", "high", "medium", "low"]
    statuses = ["new", "assigned", "active", "resolved", "closed"]
    types = ["bug", "feature", "improvement"]

    # 每个项目生成5-10个Bug
    bug_id_counter = 1001
    for project_code, project_id in project_ids.items():
        if project_code == "DWP-2026":  # 跳过已归档项目
            continue

        num_bugs = random.randint(5, 10)
        for i in range(num_bugs):
            # 随机分配者和报告者
            assignee_candidates = ["zhangsan", "lisi", "wangwu", "developer"]
            reporter_candidates = ["zhaoliu", "tester", "pm"]

            assignee_id = user_ids.get(random.choice(assignee_candidates))
            reporter_id = user_ids.get(random.choice(reporter_candidates))

            status = random.choice(statuses)
            resolved_at = None
            if status in ["resolved", "closed"]:
                resolved_at = datetime.now() - timedelta(days=random.randint(1, 10))

            bug_data = {
                "project_id": project_id,
                "assignee_id": assignee_id,
                "reporter_id": reporter_id,
                "zendao_bug_id": bug_id_counter,
                "title": random.choice(BUG_TITLES),
                "description": f"这是一个测试Bug的描述，用于E2E测试。",
                "severity": random.choice(severities),
                "priority": random.choice(priorities),
                "status": status,
                "type": random.choice(types),
                "module": random.choice(["用户认证", "数据统计", "API接口", "前端页面", "数据库"]),
                "resolved_at": resolved_at,
                "resolution": "fixed" if resolved_at else None,
            }

            result = await session.execute(
                select(BugRecord).where(BugRecord.zendao_bug_id == bug_id_counter)
            )
            existing = result.scalar_one_or_none()

            if not existing:
                bug = BugRecord(**bug_data)
                session.add(bug)

            bug_id_counter += 1

    await session.commit()


async def seed_e2e_sync_tasks(
    session: AsyncSession,
    project_ids: dict[str, int],
) -> None:
    """创建同步任务和日志.

    Args:
        session: 数据库会话
        project_ids: 项目代码到ID的映射
    """
    task_types = ["full_sync", "incremental_sync", "config_sync"]
    source_types = ["gitlab", "zendao"]
    statuses = ["pending", "running", "completed", "failed"]

    # 创建10个同步任务
    tasks_data = []
    for i in range(10):
        task_type = random.choice(task_types)
        source_type = random.choice(source_types)
        project_id = random.choice(list(project_ids.values()))
        status = random.choice(statuses)

        started_at = None
        completed_at = None
        if status in ["running", "completed", "failed"]:
            started_at = datetime.now() - timedelta(hours=random.randint(1, 48))
        if status in ["completed", "failed"]:
            completed_at = started_at + timedelta(minutes=random.randint(5, 60))

        tasks_data.append({
            "task_type": task_type,
            "source_type": source_type,
            "project_id": project_id,
            "status": status,
            "started_at": started_at,
            "completed_at": completed_at,
            "records_processed": random.randint(50, 500) if status in ["completed", "running"] else 0,
            "records_failed": random.randint(0, 10) if status in ["completed", "failed"] else 0,
            "created_by": random.choice(["admin", "system", "zhangsan"]),
        })

    task_ids = []
    for task_data in tasks_data:
        task = SyncTask(**task_data)
        session.add(task)
        await session.flush()
        task_ids.append(task.id)

    await session.commit()

    # 为每个任务创建日志
    log_levels = ["info", "warning", "error"]
    log_messages = [
        "开始同步数据",
        "正在获取GitLab数据",
        "处理提交记录",
        "同步完成",
        "发现重复数据，已跳过",
        "API请求超时，正在重试",
        "同步失败: 连接被拒绝",
    ]

    for task_id in task_ids:
        num_logs = random.randint(3, 8)
        for i in range(num_logs):
            log_data = {
                "task_id": task_id,
                "level": random.choice(log_levels),
                "message": random.choice(log_messages),
                "details": {"step": i, "progress": f"{i * 100 // num_logs}%"},
            }
            log = SyncLog(**log_data)
            session.add(log)

    await session.commit()


async def seed_e2e_data_sources(
    session: AsyncSession,
    project_ids: dict[str, int],
) -> None:
    """创建数据源配置.

    Args:
        session: 数据库会话
        project_ids: 项目代码到ID的映射
    """
    for project_code, project_id in project_ids.items():
        if project_code == "DWP-2026":
            continue

        # 每个项目创建GitLab和禅道数据源
        sources_data = [
            {
                "project_id": project_id,
                "source_type": "gitlab",
                "source_name": f"{project_code} GitLab",
                "config": {
                    "repo_id": random.randint(100, 999),
                    "repo_url": f"https://gitlab.example.com/{project_code.lower()}",
                    "branch": "main",
                },
                "is_active": True,
                "sync_frequency": random.choice(["daily", "hourly"]),
                "last_sync_at": datetime.now() - timedelta(hours=random.randint(1, 24)),
            },
            {
                "project_id": project_id,
                "source_type": "zendao",
                "source_name": f"{project_code} ZenDao",
                "config": {
                    "project_id": random.randint(200, 299),
                    "project_key": project_code.split("-")[0],
                    "api_url": "https://zendao.example.com/api",
                },
                "is_active": True,
                "sync_frequency": random.choice(["daily", "hourly"]),
                "last_sync_at": datetime.now() - timedelta(hours=random.randint(1, 12)),
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


async def seed_e2e_stats_snapshots(
    session: AsyncSession,
    user_ids: dict[str, int],
    project_ids: dict[str, int],
) -> None:
    """创建统计快照.

    Args:
        session: 数据库会话
        user_ids: 用户名到ID的映射
        project_ids: 项目代码到ID的映射
    """
    today = date.today()

    # 全局快照
    global_snapshot = {
        "snapshot_type": "global",
        "snapshot_date": today,
        "metrics": {
            "total_users": len(user_ids),
            "total_projects": len(project_ids),
            "total_commits": random.randint(500, 1000),
            "total_tokens": random.randint(1000000, 5000000),
            "total_bugs": random.randint(20, 50),
            "ai_adoption_rate": round(random.uniform(0.5, 0.8), 2),
        },
    }

    result = await session.execute(
        select(StatsSnapshot).where(
            StatsSnapshot.snapshot_type == "global",
            StatsSnapshot.snapshot_date == today,
        )
    )
    if not result.scalar_one_or_none():
        snapshot = StatsSnapshot(**global_snapshot)
        session.add(snapshot)

    # 项目快照
    for project_code, project_id in project_ids.items():
        project_snapshot = {
            "snapshot_type": "project",
            "snapshot_date": today,
            "project_id": project_id,
            "metrics": {
                "total_commits": random.randint(50, 200),
                "total_additions": random.randint(5000, 20000),
                "total_deletions": random.randint(1000, 5000),
                "ai_commits": random.randint(20, 100),
                "ai_adoption_rate": round(random.uniform(0.4, 0.8), 2),
                "total_tokens": random.randint(100000, 500000),
                "open_bugs": random.randint(0, 10),
            },
        }

        result = await session.execute(
            select(StatsSnapshot).where(
                StatsSnapshot.snapshot_type == "project",
                StatsSnapshot.snapshot_date == today,
                StatsSnapshot.project_id == project_id,
            )
        )
        if not result.scalar_one_or_none():
            snapshot = StatsSnapshot(**project_snapshot)
            session.add(snapshot)

    # 个人快照
    target_users = ["zhangsan", "lisi", "wangwu", "zhaoliu", "developer", "tester"]
    for username in target_users:
        user_id = user_ids.get(username)
        if not user_id:
            continue

        personal_snapshot = {
            "snapshot_type": "personal",
            "snapshot_date": today,
            "user_id": user_id,
            "metrics": {
                "total_commits": random.randint(20, 100),
                "total_additions": random.randint(2000, 10000),
                "total_deletions": random.randint(500, 3000),
                "ai_commits": random.randint(10, 60),
                "ai_adoption_rate": round(random.uniform(0.3, 0.9), 2),
                "total_tokens": random.randint(50000, 300000),
                "bugs_resolved": random.randint(0, 10),
            },
        }

        result = await session.execute(
            select(StatsSnapshot).where(
                StatsSnapshot.snapshot_type == "personal",
                StatsSnapshot.snapshot_date == today,
                StatsSnapshot.user_id == user_id,
            )
        )
        if not result.scalar_one_or_none():
            snapshot = StatsSnapshot(**personal_snapshot)
            session.add(snapshot)

    await session.commit()


async def seed_e2e_database(session: AsyncSession) -> None:
    """为E2E测试生成完整的数据集.

    这是主要的入口函数，按依赖顺序创建所有测试数据.

    Args:
        session: 数据库会话
    """
    print("开始生成E2E测试数据...")

    # 1. 基础数据 (无依赖)
    print("1. 创建角色...")
    role_ids = await seed_e2e_roles(session)

    print("2. 创建用户...")
    user_ids = await seed_e2e_users(session, role_ids)

    print("3. 创建项目...")
    project_ids = await seed_e2e_projects(session, user_ids)

    # 2. 关系数据 (依赖用户和项目)
    print("4. 创建项目成员关系...")
    await seed_e2e_project_members(session, user_ids, project_ids)

    print("5. 创建用户平台账号...")
    await seed_e2e_user_accounts(session, user_ids)

    print("6. 创建数据源配置...")
    await seed_e2e_data_sources(session, project_ids)

    # 3. 业务数据 (依赖用户和项目)
    print("7. 创建代码提交记录...")
    await seed_e2e_code_commits(session, user_ids, project_ids)

    print("8. 创建Token使用记录...")
    await seed_e2e_token_usage(session, user_ids, project_ids)

    print("9. 创建Bug记录...")
    await seed_e2e_bug_records(session, user_ids, project_ids)

    # 4. 任务和日志
    print("10. 创建同步任务和日志...")
    await seed_e2e_sync_tasks(session, project_ids)

    # 5. 统计快照
    print("11. 创建统计快照...")
    await seed_e2e_stats_snapshots(session, user_ids, project_ids)

    print("E2E测试数据生成完成!")
    print(f"   - 角色: {len(role_ids)}")
    print(f"   - 用户: {len(user_ids)}")
    print(f"   - 项目: {len(project_ids)}")
