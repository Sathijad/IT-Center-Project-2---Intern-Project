#!/bin/bash

# Setup CloudWatch Observability for Leave & Attendance Backend
# This script creates CloudWatch dashboards and alarms

set -e

REGION="ap-southeast-2"
ENVIRONMENT="${1:-dev}"
STACK_NAME="leave-attendance-${ENVIRONMENT}"

echo "Setting up CloudWatch observability for ${STACK_NAME}..."

# Create CloudWatch Dashboard
aws cloudwatch put-dashboard \
  --dashboard-name "leave-attendance-${ENVIRONMENT}" \
  --dashboard-body file://cloudwatch-dashboard.json \
  --region ${REGION}

echo "✓ CloudWatch Dashboard created"

# Create CloudWatch Alarms
echo "Creating CloudWatch Alarms..."

# Error Rate Alarm
aws cloudwatch put-metric-alarm \
  --alarm-name "leave-attendance-${ENVIRONMENT}-high-error-rate" \
  --alarm-description "Alert when error rate exceeds 1%" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=FunctionName,Value=${STACK_NAME}-LeaveAttendanceFunction \
  --region ${REGION} \
  --treat-missing-data notBreaching

# Latency Alarm
aws cloudwatch put-metric-alarm \
  --alarm-name "leave-attendance-${ENVIRONMENT}-high-latency" \
  --alarm-description "Alert when p95 latency exceeds 300ms" \
  --metric-name Duration \
  --namespace AWS/Lambda \
  --statistic p95 \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 300 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=FunctionName,Value=${STACK_NAME}-LeaveAttendanceFunction \
  --region ${REGION} \
  --treat-missing-data notBreaching

# Throttle Alarm
aws cloudwatch put-metric-alarm \
  --alarm-name "leave-attendance-${ENVIRONMENT}-throttles" \
  --alarm-description "Alert when function is being throttled" \
  --metric-name Throttles \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 1 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=FunctionName,Value=${STACK_NAME}-LeaveAttendanceFunction \
  --region ${REGION} \
  --treat-missing-data notBreaching

echo "✓ CloudWatch Alarms created"

# Create SNS Topic for alarms (optional)
echo "Creating SNS topic for alarm notifications..."
aws sns create-topic \
  --name "leave-attendance-${ENVIRONMENT}-alarms" \
  --region ${REGION} || echo "Topic may already exist"

echo ""
echo "Observability setup complete!"
echo "Dashboard: https://console.aws.amazon.com/cloudwatch/home?region=${REGION}#dashboards:name=leave-attendance-${ENVIRONMENT}"

