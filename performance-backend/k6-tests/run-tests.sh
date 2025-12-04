#!/bin/bash
# Bash script to run k6 performance tests
# Usage: ./run-tests.sh [test-name] [base-url] [auth-token]

set -e

TEST_NAME=${1:-smoke}
BASE_URL=${2:-http://localhost:5167}
AUTH_TOKEN=${3:-}

echo "========================================"
echo "k6 Performance Testing - Phase 6"
echo "========================================"
echo ""

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
    echo "ERROR: k6 is not installed!"
    echo "Install k6 using: brew install k6 (macOS) or see https://k6.io/docs/getting-started/installation/"
    exit 1
fi

echo "k6 Version: $(k6 version)"
echo ""

# Set environment variables
export BASE_URL=$BASE_URL
if [ -n "$AUTH_TOKEN" ]; then
    export AUTH_TOKEN=$AUTH_TOKEN
    echo "Using provided AUTH_TOKEN"
else
    echo "WARNING: No AUTH_TOKEN provided. Tests may fail authentication."
    echo "Set AUTH_TOKEN environment variable or pass as parameter."
fi
echo "BASE_URL: $BASE_URL"
echo ""

# Determine test file
case $TEST_NAME in
    smoke)
        TEST_FILE="tests/smoke.js"
        ;;
    metrics)
        TEST_FILE="tests/performance-metrics.js"
        ;;
    crud)
        TEST_FILE="tests/performance-crud.js"
        ;;
    training)
        TEST_FILE="tests/training.js"
        ;;
    mixed)
        TEST_FILE="tests/mixed-load.js"
        ;;
    *)
        echo "ERROR: Unknown test name: $TEST_NAME"
        echo "Available tests: smoke, metrics, crud, training, mixed"
        exit 1
        ;;
esac

if [ ! -f "$TEST_FILE" ]; then
    echo "ERROR: Test file not found: $TEST_FILE"
    exit 1
fi

echo "Running test: $TEST_FILE"
echo "========================================"
echo ""

# Run the test
k6 run "$TEST_FILE"

echo ""
echo "========================================"
echo "Test completed!"
echo "========================================"

