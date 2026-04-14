"""Celery app entry point.

This module re-exports the Celery app from app.core.celery
for use with Celery CLI commands.
"""

from app.core.celery import celery_app as celery

__all__ = ["celery"]
