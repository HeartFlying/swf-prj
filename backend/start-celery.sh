#!/bin/bash
#
# Celery Worker Startup Script
#
# This script starts the Celery worker with configurable options
# via environment variables. It's designed for both local development
# and Docker deployment.
#
# Environment Variables:
#   LOG_LEVEL           - Logging level (default: info)
#   CELERY_CONCURRENCY  - Number of worker processes (default: 2)
#   CELERY_QUEUES       - Comma-separated list of queues (default: celery)
#
# Usage:
#   ./start-celery.sh
#   LOG_LEVEL=debug CELERY_CONCURRENCY=4 ./start-celery.sh
#

set -e

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Configuration with default values
LOG_LEVEL="${LOG_LEVEL:-info}"
CELERY_CONCURRENCY="${CELERY_CONCURRENCY:-2}"
CELERY_QUEUES="${CELERY_QUEUES:-celery}"

# Celery app module
CELERY_APP="app.celery:celery"

# Colors for output (disable if not terminal)
if [[ -t 1 ]]; then
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    BLUE='\033[0;34m'
    NC='\033[0m' # No Color
else
    RED=''
    GREEN=''
    YELLOW=''
    BLUE=''
    NC=''
fi

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Cleanup function for graceful shutdown
cleanup() {
    log_info "Received shutdown signal, stopping Celery worker..."
    exit 0
}

# Set up signal handlers
trap cleanup SIGTERM SIGINT

# Validate environment
validate_environment() {
    log_info "Validating environment..."

    # Check if we're in the right directory or can find the Celery app
    if [[ ! -d "$SCRIPT_DIR/app" ]]; then
        log_error "Cannot find 'app' directory. Please run from project root."
        exit 1
    fi

    # Check if celery is available
    if ! command -v celery >/dev/null 2>&1; then
        log_error "Celery command not found. Please install Celery: pip install celery"
        exit 1
    fi

    log_success "Environment validation passed"
}

# Print configuration
print_config() {
    log_info "Starting Celery Worker with configuration:"
    echo "  - Celery App: $CELERY_APP"
    echo "  - Log Level: $LOG_LEVEL"
    echo "  - Concurrency: $CELERY_CONCURRENCY"
    echo "  - Queues: $CELERY_QUEUES"
    echo "  - Working Directory: $SCRIPT_DIR"
}

# Start Celery worker
start_worker() {
    log_info "Starting Celery worker..."

    # Change to project directory
    cd "$SCRIPT_DIR"

    # Build the celery command (note: 'worker' command is passed separately)
    local celery_args=(
        "-A" "$CELERY_APP"
        "--loglevel=$LOG_LEVEL"
        "--concurrency=$CELERY_CONCURRENCY"
        "--queues=$CELERY_QUEUES"
        "--hostname=worker@%h"
        "--without-gossip"
        "--without-mingle"
        "--without-heartbeat"
    )

    # Add Docker-specific optimizations if running in container
    if [[ -f "/.dockerenv" ]] || grep -q docker /proc/1/cgroup 2>/dev/null; then
        log_info "Detected Docker environment, applying optimizations..."
        celery_args+=(
            "--pool=prefork"
            "--max-tasks-per-child=1000"
        )
    fi

    log_info "Executing: celery worker with args: ${celery_args[*]}"

    # Start the worker
    exec celery worker "${celery_args[@]}"
}

# Main function
main() {
    log_info "========================================"
    log_info "Celery Worker Startup Script"
    log_info "========================================"

    validate_environment
    print_config
    start_worker
}

# Run main function
main "$@"
