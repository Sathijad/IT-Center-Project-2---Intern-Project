#!/bin/bash
# Bash script to run Phase 4 k6 performance tests
# Usage: ./run-phase4-tests.sh -u "http://localhost:5000" -t "your-token"

set -e

BASE_URL="${BASE_URL:-http://localhost:5000}"
JWT_TOKEN="${JWT_TOKEN:-}"
TEST_USER_ID="${TEST_USER_ID:-1}"
TEST_ASSIGNEE_ID="${TEST_ASSIGNEE_ID:-2}"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -u|--url)
      BASE_URL="$2"
      shift 2
      ;;
    -t|--token)
      JWT_TOKEN="$2"
      shift 2
      ;;
    --user-id)
      TEST_USER_ID="$2"
      shift 2
      ;;
    --assignee-id)
      TEST_ASSIGNEE_ID="$2"
      shift 2
      ;;
    -h|--help)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  -u, --url URL          Base URL (default: http://localhost:5000)"
      echo "  -t, --token TOKEN      JWT authentication token (required)"
      echo "  --user-id ID           Test user ID (default: 1)"
      echo "  --assignee-id ID       Test assignee ID (default: 2)"
      echo "  -h, --help             Show this help message"
      echo ""
      echo "Environment variables:"
      echo "  BASE_URL               Base URL for API"
      echo "  JWT_TOKEN              JWT authentication token"
      echo "  TEST_USER_ID           Test user ID"
      echo "  TEST_ASSIGNEE_ID       Test assignee ID"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use -h or --help for usage information"
      exit 1
      ;;
  esac
done

echo "========================================"
echo "Phase 4 k6 Performance Test Runner"
echo "========================================"
echo ""

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
  echo "✗ k6 not found. Please install k6 first:"
  echo "  macOS: brew install k6"
  echo "  Linux: See https://k6.io/docs/getting-started/installation/"
  exit 1
fi

K6_VERSION=$(k6 version 2>&1 | head -n 1)
echo "✓ k6 found: $K6_VERSION"

# Validate JWT token
if [ -z "$JWT_TOKEN" ]; then
  echo "✗ JWT token is required!"
  echo ""
  echo "Usage:"
  echo "  $0 -u \"http://localhost:5000\" -t \"your-jwt-token\""
  echo ""
  echo "To get a JWT token:"
  echo "  1. Login to admin web portal"
  echo "  2. Open DevTools → Application → Local Storage"
  echo "  3. Copy the 'idToken' value"
  exit 1
fi

echo "Configuration:"
echo "  Base URL: $BASE_URL"
echo "  Test User ID: $TEST_USER_ID"
echo "  Test Assignee ID: $TEST_ASSIGNEE_ID"
echo "  JWT Token: ${JWT_TOKEN:0:20}..."
echo ""

# Check if test file exists
TEST_FILE="$(dirname "$0")/phase4.js"
if [ ! -f "$TEST_FILE" ]; then
  echo "✗ Test file not found: $TEST_FILE"
  exit 1
fi

echo "Starting k6 performance tests..."
echo ""

# Run k6 with environment variables
export BASE_URL
export JWT_TOKEN
export TEST_USER_ID
export TEST_ASSIGNEE_ID

if k6 run "$TEST_FILE"; then
  echo ""
  echo "========================================"
  echo "✓ Performance tests completed successfully!"
  echo "========================================"
  echo ""
  echo "Results saved to:"
  echo "  - phase4-perf-results.json"
  echo "  - phase4-summary.json"
  exit 0
else
  EXIT_CODE=$?
  echo ""
  echo "========================================"
  echo "✗ Performance tests failed (exit code: $EXIT_CODE)"
  echo "========================================"
  exit $EXIT_CODE
fi

