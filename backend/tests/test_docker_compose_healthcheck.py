"""
测试 docker-compose.yml 健康检查配置

任务ID: P0-1-2, P0-1-4, P0-1-5, P0-1-6, P0-1-8
目标: 验证 Docker Compose 配置正确性
"""

import pytest
import yaml
from pathlib import Path


class TestDockerComposeHealthcheck:
    """测试 Docker Compose 健康检查配置"""

    @pytest.fixture(scope="class")
    def docker_compose(self):
        """加载 docker-compose.yml 文件"""
        # 从 backend/tests/ 向上两级到项目根目录
        compose_path = Path(__file__).parent.parent.parent / "docker-compose.yml"
        with open(compose_path, "r", encoding="utf-8") as f:
            return yaml.safe_load(f)

    def test_celery_service_exists(self, docker_compose):
        """验证 celery 服务存在"""
        services = docker_compose.get("services", {})
        assert "celery" in services, "celery 服务必须在 docker-compose.yml 中定义"

    def test_celery_has_healthcheck(self, docker_compose):
        """验证 celery 服务有健康检查配置"""
        celery = docker_compose["services"]["celery"]
        assert "healthcheck" in celery, "celery 服务必须配置 healthcheck"

    def test_celery_healthcheck_test_command(self, docker_compose):
        """验证 celery 健康检查命令正确"""
        healthcheck = docker_compose["services"]["celery"]["healthcheck"]
        test_cmd = healthcheck.get("test", [])

        assert len(test_cmd) >= 2, "test 命令必须包含 CMD-SHELL 和命令内容"
        assert test_cmd[0] == "CMD-SHELL", "test 必须使用 CMD-SHELL 类型"

        command = test_cmd[1] if len(test_cmd) > 1 else ""
        # 验证命令包含关键组件
        assert "celery" in command, "命令必须包含 celery"
        assert "inspect ping" in command, "命令必须使用 inspect ping 检查 worker"
        assert "destination" in command, "命令必须指定 destination"
        assert "exit 1" in command, "命令失败时必须返回 exit 1"

    def test_celery_healthcheck_timing(self, docker_compose):
        """验证 celery 健康检查时间配置合理"""
        healthcheck = docker_compose["services"]["celery"]["healthcheck"]

        # 验证 interval
        interval = healthcheck.get("interval")
        assert interval is not None, "必须配置 interval"
        assert interval == "30s", f"interval 应为 30s, 实际为 {interval}"

        # 验证 timeout
        timeout = healthcheck.get("timeout")
        assert timeout is not None, "必须配置 timeout"
        assert timeout == "10s", f"timeout 应为 10s, 实际为 {timeout}"

        # 验证 retries
        retries = healthcheck.get("retries")
        assert retries is not None, "必须配置 retries"
        assert retries == 3, f"retries 应为 3, 实际为 {retries}"

        # 验证 start_period
        start_period = healthcheck.get("start_period")
        assert start_period is not None, "必须配置 start_period"
        assert start_period == "30s", f"start_period 应为 30s, 实际为 {start_period}"

    def test_celery_healthcheck_hostname_escape(self, docker_compose):
        """验证 celery 健康检查命令中 $$HOSTNAME 正确转义"""
        healthcheck = docker_compose["services"]["celery"]["healthcheck"]
        command = healthcheck["test"][1]

        # 验证使用 $$ 转义 $HOSTNAME
        assert "$$HOSTNAME" in command, "命令必须使用 $$HOSTNAME 来转义 $HOSTNAME"

    def test_celery_beat_has_healthcheck(self, docker_compose):
        """验证 celery-beat 服务也有健康检查配置"""
        services = docker_compose.get("services", {})
        if "celery-beat" in services:
            celery_beat = services["celery-beat"]
            assert "healthcheck" in celery_beat, "celery-beat 服务也应该配置 healthcheck"

    def test_postgres_healthcheck_unchanged(self, docker_compose):
        """验证 postgres 健康检查配置未被意外修改"""
        postgres = docker_compose["services"]["postgres"]
        assert "healthcheck" in postgres, "postgres 健康检查必须保留"

        healthcheck = postgres["healthcheck"]
        assert healthcheck.get("test") == ["CMD-SHELL", "pg_isready -U postgres"]
        assert healthcheck.get("interval") == "5s"

    def test_redis_healthcheck_unchanged(self, docker_compose):
        """验证 redis 健康检查配置未被意外修改"""
        redis = docker_compose["services"]["redis"]
        assert "healthcheck" in redis, "redis 健康检查必须保留"

        healthcheck = redis["healthcheck"]
        assert healthcheck.get("test") == ["CMD", "redis-cli", "ping"]
        assert healthcheck.get("interval") == "5s"


class TestDockerComposeDependsOn:
    """测试 Docker Compose depends_on 配置 (P0-1-4)"""

    @pytest.fixture(scope="class")
    def docker_compose(self):
        """加载 docker-compose.yml 文件"""
        compose_path = Path(__file__).parent.parent.parent / "docker-compose.yml"
        with open(compose_path, "r", encoding="utf-8") as f:
            return yaml.safe_load(f)

    def test_celery_depends_on_with_condition(self, docker_compose):
        """验证 celery 服务使用 condition: service_healthy"""
        celery = docker_compose["services"]["celery"]
        depends_on = celery.get("depends_on", {})

        assert "redis" in depends_on, "celery 必须依赖 redis"
        assert "postgres" in depends_on, "celery 必须依赖 postgres"

        # 验证使用 condition 格式
        assert isinstance(depends_on["redis"], dict), "redis 依赖必须使用字典格式"
        assert depends_on["redis"].get("condition") == "service_healthy", \
            "redis 依赖必须使用 condition: service_healthy"

        assert isinstance(depends_on["postgres"], dict), "postgres 依赖必须使用字典格式"
        assert depends_on["postgres"].get("condition") == "service_healthy", \
            "postgres 依赖必须使用 condition: service_healthy"

    def test_celery_beat_depends_on_with_condition(self, docker_compose):
        """验证 celery-beat 服务使用 condition: service_healthy"""
        celery_beat = docker_compose["services"]["celery-beat"]
        depends_on = celery_beat.get("depends_on", {})

        assert "redis" in depends_on, "celery-beat 必须依赖 redis"
        assert "postgres" in depends_on, "celery-beat 必须依赖 postgres"

        # 验证使用 condition 格式
        assert isinstance(depends_on["redis"], dict), "redis 依赖必须使用字典格式"
        assert depends_on["redis"].get("condition") == "service_healthy", \
            "redis 依赖必须使用 condition: service_healthy"

        assert isinstance(depends_on["postgres"], dict), "postgres 依赖必须使用字典格式"
        assert depends_on["postgres"].get("condition") == "service_healthy", \
            "postgres 依赖必须使用 condition: service_healthy"

    def test_backend_depends_on_with_condition(self, docker_compose):
        """验证 backend 服务使用 condition: service_healthy"""
        backend = docker_compose["services"]["backend"]
        depends_on = backend.get("depends_on", {})

        assert "redis" in depends_on, "backend 必须依赖 redis"
        assert "postgres" in depends_on, "backend 必须依赖 postgres"

        # 验证使用 condition 格式
        assert isinstance(depends_on["redis"], dict), "redis 依赖必须使用字典格式"
        assert depends_on["redis"].get("condition") == "service_healthy"

        assert isinstance(depends_on["postgres"], dict), "postgres 依赖必须使用字典格式"
        assert depends_on["postgres"].get("condition") == "service_healthy"


class TestDockerComposeNetwork:
    """测试 Docker Compose 网络配置 (P0-1-5)"""

    @pytest.fixture(scope="class")
    def docker_compose(self):
        """加载 docker-compose.yml 文件"""
        compose_path = Path(__file__).parent.parent.parent / "docker-compose.yml"
        with open(compose_path, "r", encoding="utf-8") as f:
            return yaml.safe_load(f)

    def test_networks_section_exists(self, docker_compose):
        """验证 networks 部分存在"""
        assert "networks" in docker_compose, "必须定义 networks 部分"

    def test_backend_network_defined(self, docker_compose):
        """验证 backend-network 网络定义"""
        networks = docker_compose.get("networks", {})
        assert "backend-network" in networks, "必须定义 backend-network"

        network_config = networks["backend-network"]
        assert network_config.get("driver") == "bridge", "网络驱动必须是 bridge"

    def test_all_services_use_network(self, docker_compose):
        """验证所有服务都连接到 backend-network"""
        services = docker_compose.get("services", {})
        network_name = "backend-network"

        for service_name, service_config in services.items():
            networks = service_config.get("networks", [])
            assert network_name in networks, \
                f"服务 {service_name} 必须连接到 {network_name}"


class TestDockerComposeRestartPolicy:
    """测试 Docker Compose 重启策略配置 (P0-1-6)"""

    @pytest.fixture(scope="class")
    def docker_compose(self):
        """加载 docker-compose.yml 文件"""
        compose_path = Path(__file__).parent.parent.parent / "docker-compose.yml"
        with open(compose_path, "r", encoding="utf-8") as f:
            return yaml.safe_load(f)

    def test_all_services_have_restart_policy(self, docker_compose):
        """验证所有服务都有 restart: unless-stopped 策略"""
        services = docker_compose.get("services", {})
        expected_restart = "unless-stopped"

        for service_name, service_config in services.items():
            restart = service_config.get("restart")
            assert restart == expected_restart, \
                f"服务 {service_name} 必须配置 restart: {expected_restart}, 实际为: {restart}"

    def test_postgres_restart_policy(self, docker_compose):
        """验证 postgres 重启策略"""
        postgres = docker_compose["services"]["postgres"]
        assert postgres.get("restart") == "unless-stopped"

    def test_redis_restart_policy(self, docker_compose):
        """验证 redis 重启策略"""
        redis = docker_compose["services"]["redis"]
        assert redis.get("restart") == "unless-stopped"

    def test_backend_restart_policy(self, docker_compose):
        """验证 backend 重启策略"""
        backend = docker_compose["services"]["backend"]
        assert backend.get("restart") == "unless-stopped"

    def test_celery_restart_policy(self, docker_compose):
        """验证 celery 重启策略"""
        celery = docker_compose["services"]["celery"]
        assert celery.get("restart") == "unless-stopped"

    def test_celery_beat_restart_policy(self, docker_compose):
        """验证 celery-beat 重启策略"""
        celery_beat = docker_compose["services"]["celery-beat"]
        assert celery_beat.get("restart") == "unless-stopped"
