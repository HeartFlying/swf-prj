#!/bin/bash
# Celery Health Check Script
# Usage: ./check_celery_health.sh [worker_name]
# Default worker name is derived from HOSTNAME environment variable

set -e

# Get worker name from argument or use default
WORKER_NAME="${1:-celery@$HOSTNAME}"

echo "Checking Celery worker health: $WORKER_NAME"

# Check if celery is responsive using inspect ping
if celery -A app.celery inspect ping --destination "$WORKER_NAME" > /dev/null 2>&1; then
    echo "Celery worker $WORKER_NAME is healthy"
    exit 0
else
    echo "Celery worker $WORKER_NAME is not responding"
    exit 1
fi
