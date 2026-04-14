#!/bin/bash
#
# Test script for start-celery.sh
# TDD: Test First Approach
#

# Note: Don't use set -e here as we want to run all tests even if some fail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0

# Script path
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
START_CELERY_SCRIPT="$PROJECT_DIR/start-celery.sh"

# Helper functions
log_info() {
    echo -e "${YELLOW}[INFO]${NC} $1"
}

log_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((TESTS_PASSED++))
}

log_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((TESTS_FAILED++))
}

# Test 1: Check if start-celery.sh exists
test_script_exists() {
    log_info "Test 1: Checking if start-celery.sh exists..."
    if [[ -f "$START_CELERY_SCRIPT" ]]; then
        log_pass "start-celery.sh exists"
    else
        log_fail "start-celery.sh does not exist at $START_CELERY_SCRIPT"
    fi
}

# Test 2: Check if script has executable permissions
test_script_executable() {
    log_info "Test 2: Checking if start-celery.sh is executable..."
    if [[ -x "$START_CELERY_SCRIPT" ]]; then
        log_pass "start-celery.sh has executable permissions"
    else
        log_fail "start-celery.sh is not executable"
    fi
}

# Test 3: Check if script has proper shebang
test_script_shebang() {
    log_info "Test 3: Checking if script has proper shebang..."
    if [[ -f "$START_CELERY_SCRIPT" ]]; then
        first_line=$(head -n 1 "$START_CELERY_SCRIPT")
        if [[ "$first_line" == "#!/bin/bash" ]] || [[ "$first_line" == "#!/usr/bin/env bash" ]]; then
            log_pass "Script has proper bash shebang"
        else
            log_fail "Script missing proper shebang, found: $first_line"
        fi
    else
        log_fail "Cannot check shebang - script does not exist"
    fi
}

# Test 4: Check if script handles environment variables
test_env_variables() {
    log_info "Test 4: Checking if script references environment variables..."
    if [[ -f "$START_CELERY_SCRIPT" ]]; then
        if grep -q "LOG_LEVEL" "$START_CELERY_SCRIPT"; then
            log_pass "Script references LOG_LEVEL environment variable"
        else
            log_fail "Script missing LOG_LEVEL environment variable handling"
        fi

        if grep -q "CELERY_CONCURRENCY" "$START_CELERY_SCRIPT"; then
            log_pass "Script references CELERY_CONCURRENCY environment variable"
        else
            log_fail "Script missing CELERY_CONCURRENCY environment variable handling"
        fi

        if grep -q "CELERY_QUEUES" "$START_CELERY_SCRIPT"; then
            log_pass "Script references CELERY_QUEUES environment variable"
        else
            log_fail "Script missing CELERY_QUEUES environment variable handling"
        fi
    else
        log_fail "Cannot check environment variables - script does not exist"
    fi
}

# Test 5: Check if script has error handling
test_error_handling() {
    log_info "Test 5: Checking if script has error handling..."
    if [[ -f "$START_CELERY_SCRIPT" ]]; then
        if grep -q "set -e\|set -o errexit\|exit 1" "$START_CELERY_SCRIPT"; then
            log_pass "Script has error handling (set -e or exit commands)"
        else
            log_fail "Script missing error handling"
        fi
    else
        log_fail "Cannot check error handling - script does not exist"
    fi
}

# Test 6: Check if script has proper Celery command
test_celery_command() {
    log_info "Test 6: Checking if script contains Celery worker command..."
    if [[ -f "$START_CELERY_SCRIPT" ]]; then
        if grep -q "celery.*worker" "$START_CELERY_SCRIPT"; then
            log_pass "Script contains celery worker command"
        else
            log_fail "Script missing celery worker command"
        fi
    else
        log_fail "Cannot check Celery command - script does not exist"
    fi
}

# Test 7: Check if script has default values
test_default_values() {
    log_info "Test 7: Checking if script has default values for environment variables..."
    if [[ -f "$START_CELERY_SCRIPT" ]]; then
        if grep -qE ':-\s*info|: \${LOG_LEVEL:=info}' "$START_CELERY_SCRIPT"; then
            log_pass "Script has default value for LOG_LEVEL"
        else
            log_fail "Script missing default value for LOG_LEVEL"
        fi

        if grep -qE ':-\s*2|: \${CELERY_CONCURRENCY:=2}' "$START_CELERY_SCRIPT"; then
            log_pass "Script has default value for CELERY_CONCURRENCY"
        else
            log_fail "Script missing default value for CELERY_CONCURRENCY"
        fi

        if grep -qE ':-\s*celery|: \${CELERY_QUEUES:=celery}' "$START_CELERY_SCRIPT"; then
            log_pass "Script has default value for CELERY_QUEUES"
        else
            log_fail "Script missing default value for CELERY_QUEUES"
        fi
    else
        log_fail "Cannot check default values - script does not exist"
    fi
}

# Test 8: Check if script has logging output
test_logging() {
    log_info "Test 8: Checking if script has logging output..."
    if [[ -f "$START_CELERY_SCRIPT" ]]; then
        if grep -q "echo\|printf\|logger" "$START_CELERY_SCRIPT"; then
            log_pass "Script has logging output (echo/printf/logger)"
        else
            log_fail "Script missing logging output"
        fi
    else
        log_fail "Cannot check logging - script does not exist"
    fi
}

# Test 9: Check if script references correct Celery app
test_celery_app() {
    log_info "Test 9: Checking if script references correct Celery app..."
    if [[ -f "$START_CELERY_SCRIPT" ]]; then
        if grep -q "app.celery:celery\|app.celery" "$START_CELERY_SCRIPT"; then
            log_pass "Script references correct Celery app (app.celery)"
        else
            log_fail "Script should reference app.celery:celery"
        fi
    else
        log_fail "Cannot check Celery app reference - script does not exist"
    fi
}

# Test 10: Check bash syntax
test_bash_syntax() {
    log_info "Test 10: Checking bash syntax..."
    if [[ -f "$START_CELERY_SCRIPT" ]]; then
        if bash -n "$START_CELERY_SCRIPT" 2>/dev/null; then
            log_pass "Script has valid bash syntax"
        else
            log_fail "Script has bash syntax errors"
        fi
    else
        log_fail "Cannot check syntax - script does not exist"
    fi
}

# Run all tests
main() {
    echo "========================================"
    echo "Running tests for start-celery.sh"
    echo "========================================"
    echo ""

    test_script_exists
    test_script_executable
    test_script_shebang
    test_env_variables
    test_error_handling
    test_celery_command
    test_default_values
    test_logging
    test_celery_app
    test_bash_syntax

    echo ""
    echo "========================================"
    echo "Test Results:"
    echo "  Passed: $TESTS_PASSED"
    echo "  Failed: $TESTS_FAILED"
    echo "========================================"

    if [[ $TESTS_FAILED -eq 0 ]]; then
        echo -e "${GREEN}All tests passed!${NC}"
        exit 0
    else
        echo -e "${RED}Some tests failed!${NC}"
        exit 1
    fi
}

main "$@"
