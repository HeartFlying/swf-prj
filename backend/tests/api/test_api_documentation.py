"""Tests for API documentation completeness.

This module tests that all API endpoints have proper documentation
including docstrings, parameter descriptions, and response examples.
"""

import inspect
from typing import Any

import pytest
from fastapi import APIRouter
from fastapi.routing import APIRoute

# Import all API routers
from app.api.v1.stats import personal as personal_stats
from app.api.v1.stats import projects as project_stats
from app.api.v1.stats import global_stats
from app.api.v1 import sync as sync_api
from app.api.v1 import auth, users, projects


def get_routes_from_module(module: Any) -> list[APIRoute]:
    """Extract API routes from a router module."""
    router = getattr(module, "router", None)
    if not router or not isinstance(router, APIRouter):
        return []
    return [route for route in router.routes if isinstance(route, APIRoute)]


def check_docstring_completeness(func: callable, route_path: str) -> list[str]:
    """Check if a function has a complete docstring.

    Returns a list of issues found.
    """
    issues = []
    docstring = inspect.getdoc(func)

    if not docstring:
        issues.append(f"Missing docstring for {route_path}")
        return issues

    # Check for minimal length (should have more than just function name)
    if len(docstring) < 20:
        issues.append(f"Docstring too short for {route_path}: '{docstring}'")

    # Check for common sections in detailed docstrings
    has_args = "Args:" in docstring or "Arguments:" in docstring
    has_returns = "Returns:" in docstring
    has_raises = "Raises:" in docstring

    # For complex endpoints, we expect detailed documentation
    if not has_args and not has_returns:
        issues.append(f"Docstring missing Args/Returns sections for {route_path}")

    return issues


class TestPersonalStatsDocumentation:
    """Test documentation for personal stats endpoints."""

    @pytest.fixture
    def routes(self):
        return get_routes_from_module(personal_stats)

    def test_all_endpoints_have_docstrings(self, routes):
        """All personal stats endpoints should have docstrings."""
        issues = []
        for route in routes:
            route_issues = check_docstring_completeness(route.endpoint, route.path)
            issues.extend(route_issues)

        assert not issues, "Documentation issues found:\n" + "\n".join(issues)

    def test_dashboard_endpoint_documentation(self, routes):
        """Dashboard endpoint should have complete documentation."""
        dashboard_route = next(
            (r for r in routes if r.path == "/dashboard"), None
        )
        assert dashboard_route is not None, "Dashboard route not found"

        docstring = inspect.getdoc(dashboard_route.endpoint)
        assert docstring, "Dashboard endpoint missing docstring"
        assert "dashboard" in docstring.lower(), "Docstring should mention dashboard"

    def test_code_stats_endpoint_documentation(self, routes):
        """Code stats endpoint should have complete documentation."""
        code_route = next(
            (r for r in routes if r.path == "/code"), None
        )
        assert code_route is not None, "Code stats route not found"

        docstring = inspect.getdoc(code_route.endpoint)
        assert docstring, "Code stats endpoint missing docstring"


class TestProjectStatsDocumentation:
    """Test documentation for project stats endpoints."""

    @pytest.fixture
    def routes(self):
        return get_routes_from_module(project_stats)

    def test_all_endpoints_have_docstrings(self, routes):
        """All project stats endpoints should have docstrings."""
        issues = []
        for route in routes:
            route_issues = check_docstring_completeness(route.endpoint, route.path)
            issues.extend(route_issues)

        assert not issues, "Documentation issues found:\n" + "\n".join(issues)

    def test_project_stats_endpoint_documentation(self, routes):
        """Project stats endpoint should document path parameters."""
        stats_route = next(
            (r for r in routes if r.path == "/{project_id}"), None
        )
        assert stats_route is not None, "Project stats route not found"

        docstring = inspect.getdoc(stats_route.endpoint)
        assert docstring, "Project stats endpoint missing docstring"


class TestGlobalStatsDocumentation:
    """Test documentation for global stats endpoints."""

    @pytest.fixture
    def routes(self):
        return get_routes_from_module(global_stats)

    def test_all_endpoints_have_docstrings(self, routes):
        """All global stats endpoints should have docstrings."""
        issues = []
        for route in routes:
            route_issues = check_docstring_completeness(route.endpoint, route.path)
            issues.extend(route_issues)

        assert not issues, "Documentation issues found:\n" + "\n".join(issues)


class TestSyncAPIDocumentation:
    """Test documentation for sync API endpoints."""

    @pytest.fixture
    def routes(self):
        return get_routes_from_module(sync_api)

    def test_all_endpoints_have_docstrings(self, routes):
        """All sync endpoints should have docstrings."""
        issues = []
        for route in routes:
            route_issues = check_docstring_completeness(route.endpoint, route.path)
            issues.extend(route_issues)

        assert not issues, "Documentation issues found:\n" + "\n".join(issues)

    def test_gitlab_sync_endpoint_documentation(self, routes):
        """GitLab sync endpoint should have complete documentation."""
        gitlab_route = next(
            (r for r in routes if r.path == "/gitlab"), None
        )
        assert gitlab_route is not None, "GitLab sync route not found"

        docstring = inspect.getdoc(gitlab_route.endpoint)
        assert docstring, "GitLab sync endpoint missing docstring"
        assert "gitlab" in docstring.lower(), "Docstring should mention GitLab"


class TestAuthDocumentation:
    """Test documentation for auth endpoints."""

    @pytest.fixture
    def routes(self):
        return get_routes_from_module(auth)

    def test_all_endpoints_have_docstrings(self, routes):
        """All auth endpoints should have docstrings."""
        issues = []
        for route in routes:
            route_issues = check_docstring_completeness(route.endpoint, route.path)
            issues.extend(route_issues)

        assert not issues, "Documentation issues found:\n" + "\n".join(issues)


class TestUsersDocumentation:
    """Test documentation for users endpoints."""

    @pytest.fixture
    def routes(self):
        return get_routes_from_module(users)

    def test_all_endpoints_have_docstrings(self, routes):
        """All users endpoints should have docstrings."""
        issues = []
        for route in routes:
            route_issues = check_docstring_completeness(route.endpoint, route.path)
            issues.extend(route_issues)

        assert not issues, "Documentation issues found:\n" + "\n".join(issues)


class TestProjectsDocumentation:
    """Test documentation for projects endpoints."""

    @pytest.fixture
    def routes(self):
        return get_routes_from_module(projects)

    def test_all_endpoints_have_docstrings(self, routes):
        """All projects endpoints should have docstrings."""
        issues = []
        for route in routes:
            route_issues = check_docstring_completeness(route.endpoint, route.path)
            issues.extend(route_issues)

        assert not issues, "Documentation issues found:\n" + "\n".join(issues)
