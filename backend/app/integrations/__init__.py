"""Integrations Package

This package contains HTTP clients for external API integrations.
These clients call the Mock Server (or real APIs in production).
"""

from .gitlab.client import GitLabClient
from .zendao.client import ZenTaoClient
from .trae.client import TraeClient

__all__ = ["GitLabClient", "ZenTaoClient", "TraeClient"]
