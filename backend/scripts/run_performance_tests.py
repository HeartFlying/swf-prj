#!/usr/bin/env python3
"""Script to run performance optimization tests.

This script runs the performance tests and generates a report.
"""

import subprocess
import sys


def main():
    """Run performance tests."""
    print("=" * 60)
    print("Running Performance Optimization Tests")
    print("=" * 60)

    # Run the tests
    result = subprocess.run(
        [
            sys.executable,
            "-m",
            "pytest",
            "tests/test_performance_optimization.py",
            "-v",
            "--tb=short",
        ],
        capture_output=True,
        text=True,
    )

    print(result.stdout)
    if result.stderr:
        print("STDERR:", result.stderr)

    print("=" * 60)
    print(f"Tests completed with return code: {result.returncode}")
    print("=" * 60)

    return result.returncode


if __name__ == "__main__":
    sys.exit(main())
