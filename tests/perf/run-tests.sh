#!/bin/bash
# Bash script to run k6 performance tests for Phase 3 Booking API
# Usage: ./run-tests.sh [smoke|full] [api-url] [employee-token] [admin-token]

set -e

# Default values
TEST_TYPE=${1:-smoke}
API_URL=${2:-""}
EMPLOYEE_TOKEN=${3:-""}
ADMIN_TOKEN=${4:-""}

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
    echo "Error: k6 is not installed. Please install k6 first."
    echo "Installation: https://k6.io/docs/getting-started/installation/"
    exit 1
fi

# Determine test file
if [ "$TEST_TYPE" = "smoke" ]; then
    TEST_FILE="booking-k6-smoke.js"
else
    TEST_FILE="booking-k6.js"
fi

# Check if test file exists
if [ ! -f "$TEST_FILE" ]; then
    echo "Error: Test file $TEST_FILE not found"
    exit 1
fi

# Build k6 command
K6_CMD="k6 run $TEST_FILE"

# Add environment variables
if [ -n "$API_URL" ]; then
    K6_CMD="$K6_CMD --env API_BASE_URL=$API_URL"
else
    echo "Warning: API_BASE_URL not provided. Using default from test file."
fi

if [ -n "$EMPLOYEE_TOKEN" ]; then
    K6_CMD="$K6_CMD --env EMPLOYEE_TOKEN=$EMPLOYEE_TOKEN"
    if [ "$TEST_TYPE" = "smoke" ]; then
        K6_CMD="$K6_CMD --env AUTH_TOKEN=$EMPLOYEE_TOKEN"
    fi
fi

if [ -n "$ADMIN_TOKEN" ]; then
    K6_CMD="$K6_CMD --env ADMIN_TOKEN=$ADMIN_TOKEN"
fi

echo "========================================"
echo "Running k6 Performance Test"
echo "========================================"
echo "Test Type: $TEST_TYPE"
echo "Test File: $TEST_FILE"
if [ -n "$API_URL" ]; then
    echo "API URL: $API_URL"
fi
echo "========================================"
echo ""

# Run k6
eval $K6_CMD

echo ""
echo "========================================"
echo "Test completed!"
echo "========================================"

