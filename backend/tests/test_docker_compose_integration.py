"""
Docker Compose 集成测试

任务ID: P0-1-10
目标: 验证完整服务栈配置正确，服务间通信正常
"""

import pytest
import yaml
from pathlib import Path


class TestDockerComposeIntegration:
    """测试 Docker Compose 完整服务栈配置"""

    @pytest.fixture(scope="class")
    def docker_compose(self):
        """加载 docker-compose.yml 文件"""
        compose_path = Path(__file__).parent.parent.parent / "docker-compose.yml"
        with open(compose_path, "r", encoding="utf-8") as f:
            return yaml.safe_load(f)

    def test_docker_compose_version(self, docker_compose):
        """验证 docker-compose 版本"""
        version = docker_compose.get("version")
        assert version == "3.8", f"docker-compose 版本应为 3.8, 实际为 {version}"

    def test_all_required_services_exist(self, docker_compose):
        """验证所有必需的服务都存在"""
        services = docker_compose.get("services", {})
        required_services = [
            "postgres",
            "redis",
            "backend",
            "celery",
            "celery-beat"
        ]

        for service in required_services:
            assert service in services, f"必需服务 {service} 必须在 docker-compose.yml 中定义"

    def test_volumes_defined(self, docker_compose):
        """验证数据卷定义"""
        volumes = docker_compose.get("volumes", {})
        assert "postgres_data" in volumes, "必须定义 postgres_data 卷"
        assert "redis_data" in volumes, "必须定义 redis_data 卷"

    def test_postgres_service_configuration(self, docker_compose):
        """验证 postgres 服务配置完整"""
        postgres = docker_compose["services"]["postgres"]

        assert postgres.get("image") == "postgres:15-alpine"
        assert postgres.get("container_name") == "coding-agent-postgres"
        assert postgres.get("restart") == "unless-stopped"

        env = postgres.get("environment", {})
        assert env.get("POSTGRES_USER") == "postgres"
        assert env.get("POSTGRES_PASSWORD") == "postgres"
        assert env.get("POSTGRES_DB") == "coding_agent_stats"

        ports = postgres.get("ports", [])
        assert "5432:5432" in ports

    def test_redis_service_configuration(self, docker_compose):
        """验证 redis 服务配置完整"""
        redis = docker_compose["services"]["redis"]

        assert redis.get("image") == "redis:7-alpine"
        assert redis.get("container_name") == "coding-agent-redis"
        assert redis.get("restart") == "unless-stopped"

        ports = redis.get("ports", [])
        assert "6379:6379" in ports

    def test_backend_service_configuration(self, docker_compose):
        """验证 backend 服务配置完整"""
        backend = docker_compose["services"]["backend"]

        assert backend.get("container_name") == "coding-agent-backend"
        assert backend.get("restart") == "unless-stopped"

        build = backend.get("build", {})
        assert build.get("context") == "./backend"
        assert build.get("dockerfile") == "Dockerfile"

        env = backend.get("environment", [])
        env_dict = {k: v for k, v in [e.split("=") for e in env]}

        assert "DATABASE_URL" in env_dict
        assert "REDIS_URL" in env_dict
        assert "DEBUG" in env_dict

        ports = backend.get("ports", [])
        assert "8000:8000" in ports

    def test_celery_service_configuration(self, docker_compose):
        """验证 celery 服务配置完整"""
        celery = docker_compose["services"]["celery"]

        assert celery.get("container_name") == "coding-agent-celery"
        assert celery.get("restart") == "unless-stopped"

        build = celery.get("build", {})
        assert build.get("context") == "./backend"
        assert build.get("dockerfile") == "Dockerfile"

        command = celery.get("command", "")
        assert "celery" in command
        assert "worker" in command

    def test_celery_beat_service_configuration(self, docker_compose):
        """验证 celery-beat 服务配置完整"""
        celery_beat = docker_compose["services"]["celery-beat"]

        assert celery_beat.get("container_name") == "coding-agent-celery-beat"
        assert celery_beat.get("restart") == "unless-stopped"

        build = celery_beat.get("build", {})
        assert build.get("context") == "./backend"
        assert build.get("dockerfile") == "Dockerfile"

        command = celery_beat.get("command", "")
        assert "celery" in command
        assert "beat" in command

    def test_service_dependencies_order(self, docker_compose):
        """验证服务依赖顺序正确"""
        services = docker_compose["services"]

        # backend 依赖 postgres 和 redis
        backend_deps = services["backend"].get("depends_on", {})
        assert "postgres" in backend_deps
        assert "redis" in backend_deps

        # celery 依赖 postgres 和 redis
        celery_deps = services["celery"].get("depends_on", {})
        assert "postgres" in celery_deps
        assert "redis" in celery_deps

        # celery-beat 依赖 postgres 和 redis
        celery_beat_deps = services["celery-beat"].get("depends_on", {})
        assert "postgres" in celery_beat_deps
        assert "redis" in celery_beat_deps

    def test_database_urls_use_service_names(self, docker_compose):
        """验证数据库 URL 使用服务名作为主机名"""
        services = docker_compose["services"]

        for service_name in ["backend", "celery", "celery-beat"]:
            service = services[service_name]
            env_list = service.get("environment", [])
            env_dict = {}
            for item in env_list:
                if "=" in item:
                    key, value = item.split("=", 1)
                    env_dict[key] = value

            # 验证使用服务名而不是 localhost
            db_url = env_dict.get("DATABASE_URL", "")
            assert "postgres:" in db_url, \
                f"{service_name} 的 DATABASE_URL 必须使用 postgres 服务名"

            redis_url = env_dict.get("REDIS_URL", "")
            assert "redis:" in redis_url, \
                f"{service_name} 的 REDIS_URL 必须使用 redis 服务名"

    def test_no_port_conflicts(self, docker_compose):
        """验证没有端口冲突"""
        services = docker_compose["services"]
        host_ports = []

        for service_name, service_config in services.items():
            ports = service_config.get("ports", [])
            for port_mapping in ports:
                if ":" in port_mapping:
                    host_port = port_mapping.split(":")[0]
                    if host_port in host_ports:
                        pytest.fail(f"端口冲突: {host_port} 被多个服务使用")
                    host_ports.append(host_port)

    def test_healthcheck_scripts_exist(self):
        """验证健康检查脚本文件存在"""
        script_path = Path(__file__).parent.parent / "scripts" / "check_celery_health.sh"
        assert script_path.exists(), f"健康检查脚本必须存在: {script_path}"

    def test_yaml_syntax_valid(self):
        """验证 YAML 语法有效"""
        compose_path = Path(__file__).parent.parent.parent / "docker-compose.yml"
        try:
            with open(compose_path, "r", encoding="utf-8") as f:
                content = yaml.safe_load(f)
            assert content is not None, "YAML 文件不能为空"
            assert "services" in content, "YAML 必须包含 services 部分"
        except yaml.YAMLError as e:
            pytest.fail(f"YAML 语法错误: {e}")
