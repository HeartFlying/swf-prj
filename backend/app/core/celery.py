"""Celery Configuration Module

Configures Celery app with Redis broker and beat schedule.
"""

from celery import Celery
from celery.schedules import crontab

# Create Celery app
celery_app = Celery("coding_stats")

# Configure Celery
celery_app.config_from_object({
    "broker_url": "redis://localhost:6379/0",
    "result_backend": "redis://localhost:6379/0",
    "task_serializer": "json",
    "accept_content": ["json"],
    "result_serializer": "json",
    "timezone": "Asia/Shanghai",
    "enable_utc": True,
    "task_track_started": True,
    "task_time_limit": 3600,  # 1 hour
    "worker_prefetch_multiplier": 1,
    "beat_schedule": {
        "daily-full-sync": {
            "task": "app.tasks.sync_tasks.daily_full_sync",
            "schedule": crontab(hour=2, minute=0),  # 每天凌晨2点
        },
        "hourly-gitlab-sync": {
            "task": "app.tasks.sync_tasks.sync_all_gitlab",
            "schedule": crontab(minute=0),  # 每小时
        },
        "hourly-trae-sync": {
            "task": "app.tasks.sync_tasks.sync_all_trae",
            "schedule": crontab(minute=30),  # 每小时30分
        },
        "hourly-zendao-sync": {
            "task": "app.tasks.sync_tasks.sync_all_zendao",
            "schedule": crontab(minute=45),  # 每小时45分
        },
    },
})

# Auto-discover tasks
celery_app.autodiscover_tasks(["app.tasks"])
