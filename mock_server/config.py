"""Mock Server Configuration"""

import os
from dataclasses import dataclass, field


@dataclass
class Settings:
    """Mock Server settings"""

    # Server settings
    HOST: str = field(default_factory=lambda: os.getenv("MOCK_HOST", "0.0.0.0"))
    PORT: int = field(default_factory=lambda: int(os.getenv("MOCK_PORT", "8001")))

    # Mock data settings
    DEFAULT_PROJECT_ID: int = 1
    DEFAULT_COMMITS_COUNT: int = 50
    DEFAULT_MR_COUNT: int = 20
    DEFAULT_MEMBERS_COUNT: int = 10
    DEFAULT_BUGS_COUNT: int = 30
    DEFAULT_TASKS_COUNT: int = 40

    # CORS settings
    CORS_ORIGINS: list[str] = field(default_factory=lambda: ["*"])


settings = Settings()
