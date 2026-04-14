#!/usr/bin/env python3
"""E2E测试数据生成脚本.

用法:
    python scripts/seed_e2e_data.py
    python scripts/seed_e2e_data.py --clear
"""

import asyncio
import sys
from pathlib import Path

# 添加项目根目录到Python路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from sqlalchemy import text
from app.db.base import AsyncSessionLocal, engine
from app.db.e2e_seeds import seed_e2e_database


async def clear_existing_data(session) -> None:
    """清空现有数据（保留角色和用户基础信息）."""
    print("清空现有业务数据...")

    # 按依赖顺序删除数据
    tables = [
        "sync_logs",
        "sync_tasks",
        "stats_snapshots",
        "ai_suggestions",
        "bug_records",
        "token_usage",
        "code_commits",
        "user_accounts",
        "project_members",
        "data_sources",
        "projects",
    ]

    for table in tables:
        try:
            await session.execute(text(f"DELETE FROM {table}"))
            print(f"  - 已清空 {table}")
        except Exception as e:
            print(f"  - 清空 {table} 失败: {e}")

    await session.commit()
    print("数据清空完成")


async def main():
    """主函数."""
    import argparse

    parser = argparse.ArgumentParser(description="生成E2E测试数据")
    parser.add_argument(
        "--clear",
        action="store_true",
        help="先清空现有业务数据再生成",
    )
    parser.add_argument(
        "--clear-only",
        action="store_true",
        help="仅清空数据，不生成新数据",
    )
    args = parser.parse_args()

    print("=" * 60)
    print("E2E测试数据生成工具")
    print("=" * 60)

    async with AsyncSessionLocal() as session:
        try:
            if args.clear or args.clear_only:
                await clear_existing_data(session)

            if not args.clear_only:
                await seed_e2e_database(session)
                print("\n" + "=" * 60)
                print("数据生成成功!")
                print("=" * 60)
                print("\n测试账号:")
                print("  - admin / password123 (管理员)")
                print("  - developer / password123 (开发者)")
                print("  - tester / password123 (测试人员)")
                print("  - pm / password123 (项目经理)")
                print("  - zhangsan / password123 (研发)")
                print("  - lisi / password123 (研发)")
                print("  - wangwu / password123 (研发)")
                print("  - zhaoliu / password123 (测试)")
                print("  - testuser / password123 (普通用户)")

        except Exception as e:
            print(f"\n错误: {e}")
            await session.rollback()
            raise


if __name__ == "__main__":
    asyncio.run(main())
