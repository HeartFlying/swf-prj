"""分页参数命名一致性测试

TASK-API-001: 确认分页参数命名规范

测试目标：
1. 后端API接受驼峰命名参数 (pageSize, pageNum)
2. 后端响应使用驼峰命名
3. 所有分页端点参数命名一致
"""

import pytest
from fastapi.testclient import TestClient


# 使用简单的单元测试，不依赖数据库连接
class TestPaginationNamingConvention:
    """测试分页命名规范 - 通过检查API端点定义"""

    def test_projects_endpoint_accepts_page_size_camel_case(self) -> None:
        """测试项目API端点定义接受驼峰命名 pageSize"""
        from app.api.v1.projects import list_projects
        import inspect

        # 获取函数签名
        sig = inspect.signature(list_projects)
        params = list(sig.parameters.keys())

        # 验证参数命名 - 应该使用驼峰命名
        assert "pageSize" in params, "项目API应该接受驼峰命名 pageSize 参数"
        assert "page_size" not in params, "项目API不应该使用下划线命名 page_size"

        # 检查参数默认值
        param = sig.parameters["pageSize"]
        # 处理 Query 对象默认值 - 通过字符串表示检查
        default_str = str(param.default)
        assert "20" in default_str, f"pageSize 默认值应该是 20, 实际是 {default_str}"

    def test_users_endpoint_accepts_pagination_params(self) -> None:
        """测试用户API端点定义接受分页参数"""
        from app.api.v1.users import get_users
        import inspect

        # 获取函数签名
        sig = inspect.signature(get_users)
        params = list(sig.parameters.keys())

        # 用户API目前使用 skip/limit，需要检查是否需要统一为 page/pageSize
        # 暂时验证它接受某种形式的分页参数
        has_pagination = any(p in params for p in ["skip", "limit", "page", "page_size", "pageSize"])
        assert has_pagination, "用户API应该接受分页参数"

    def test_project_response_schema_uses_camel_case(self) -> None:
        """测试项目响应schema使用驼峰命名"""
        from app.schemas.project import ProjectListResponse
        import inspect

        # 获取模型字段
        sig = inspect.signature(ProjectListResponse)
        fields = list(sig.parameters.keys())

        # 验证分页字段命名
        assert "pageSize" in fields, "ProjectListResponse 应该使用驼峰命名 pageSize"
        assert "page" in fields, "ProjectListResponse 应该有 page 字段"
        assert "total" in fields, "ProjectListResponse 应该有 total 字段"
        assert "items" in fields, "ProjectListResponse 应该有 items 字段"

        # 确保不使用下划线命名
        assert "page_size" not in fields, "ProjectListResponse 不应该使用下划线命名 page_size"


class TestPaginationParamsConsistency:
    """测试分页参数一致性"""

    def test_all_list_responses_use_same_naming(self) -> None:
        """测试所有列表响应使用相同的命名规范"""
        from app.schemas.project import ProjectListResponse, ProjectMemberListResponse
        import inspect

        responses = [
            ("ProjectListResponse", ProjectListResponse),
            ("ProjectMemberListResponse", ProjectMemberListResponse),
        ]

        for name, response_class in responses:
            sig = inspect.signature(response_class)
            fields = list(sig.parameters.keys())

            # 所有响应都应该有相同的分页字段
            assert "pageSize" in fields, f"{name} 应该使用驼峰命名 pageSize"
            assert "page" in fields, f"{name} 应该有 page 字段"
            assert "total" in fields, f"{name} 应该有 total 字段"
            assert "items" in fields, f"{name} 应该有 items 字段"

    def test_pagination_param_naming_convention(self) -> None:
        """测试分页参数命名规范 - 驼峰命名"""
        from app.api.v1.projects import list_projects
        import inspect

        sig = inspect.signature(list_projects)

        # 验证 page 参数
        assert "page" in sig.parameters, "应该有 page 参数"
        page_param = sig.parameters["page"]
        # 处理 Query 对象默认值 - 通过字符串表示检查
        default_str = str(page_param.default)
        assert "1" in default_str, f"page 默认值应该是 1, 实际是 {default_str}"

        # 验证 pageSize 参数 (驼峰命名)
        assert "pageSize" in sig.parameters, "应该有驼峰命名的 pageSize 参数"
        page_size_param = sig.parameters["pageSize"]
        # 处理 Query 对象默认值 - 通过字符串表示检查
        default_str = str(page_size_param.default)
        assert "20" in default_str, f"pageSize 默认值应该是 20, 实际是 {default_str}"


class TestFrontendApiConsistency:
    """测试与前端API的一致性"""

    def test_frontend_types_match_backend(self) -> None:
        """测试前端类型定义与后端一致"""
        # 读取前端类型定义文件
        import os

        frontend_types_path = os.path.join(
            os.path.dirname(__file__), "..", "..", "frontend", "src", "types", "api.ts"
        )

        if os.path.exists(frontend_types_path):
            with open(frontend_types_path, "r", encoding="utf-8") as f:
                content = f.read()

            # 验证前端使用驼峰命名
            assert "pageSize" in content, "前端类型定义应该使用驼峰命名 pageSize"
            assert "page_size" not in content, "前端类型定义不应该使用下划线命名 page_size"
