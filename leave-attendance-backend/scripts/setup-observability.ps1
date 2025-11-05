# PowerShell script to setup CloudWatch observability
# Usage: .\setup-observability.ps1 -Environment dev

param(
    [string]$Environment = "dev"
)

$Region = "ap-southeast-2"
$StackName = "leave-attendance-$Environment"

Write-Host "Setting up CloudWatch observability for $StackName..." -ForegroundColor Cyan

# Create CloudWatch Dashboard
Write-Host "Creating CloudWatch Dashboard..." -ForegroundColor Yellow
$dashboardBody = Get-Content -Path "cloudwatch-dashboard.json" -Raw

aws cloudwatch put-dashboard `
    --dashboard-name "leave-attendance-$Environment" `
    --dashboard-body $dashboardBody `
    --region $Region

Write-Host "✓ CloudWatch Dashboard created" -ForegroundColor Green

# Create CloudWatch Alarms
Write-Host "Creating CloudWatch Alarms..." -ForegroundColor Yellow

# Error Rate Alarm
aws cloudwatch put-metric-alarm `
    --alarm-name "leave-attendance-$Environment-high-error-rate" `
    --alarm-description "Alert when error rate exceeds 1%" `
    --metric-name Errors `
    --namespace AWS/Lambda `
    --statistic Sum `
    --period 300 `
    --evaluation-periods 2 `
    --threshold 10 `
    --comparison-operator GreaterThanThreshold `
    --dimensions "Name=FunctionName,Value=$StackName-LeaveAttendanceFunction" `
    --region $Region `
    --treat-missing-data notBreaching

# Latency Alarm
aws cloudwatch put-metric-alarm `
    --alarm-name "leave-attendance-$Environment-high-latency" `
    --alarm-description "Alert when p95 latency exceeds 300ms" `
    --metric-name Duration `
    --namespace AWS/Lambda `
    --statistic p95 `
    --period 300 `
    --evaluation-periods 2 `
    --threshold 300 `
    --comparison-operator GreaterThanThreshold `
    --dimensions "Name=FunctionName,Value=$StackName-LeaveAttendanceFunction" `
    --region $Region `
    --treat-missing-data notBreaching

# Throttle Alarm
aws cloudwatch put-metric-alarm `
    --alarm-name "leave-attendance-$Environment-throttles" `
    --alarm-description "Alert when function is being throttled" `
    --metric-name Throttles `
    --namespace AWS/Lambda `
    --statistic Sum `
    --period 300 `
    --evaluation-periods 1 `
    --threshold 1 `
    --comparison-operator GreaterThanThreshold `
    --dimensions "Name=FunctionName,Value=$StackName-LeaveAttendanceFunction" `
    --region $Region `
    --treat-missing-data notBreaching

Write-Host "✓ CloudWatch Alarms created" -ForegroundColor Green

# Create SNS Topic for alarms (optional)
Write-Host "Creating SNS topic for alarm notifications..." -ForegroundColor Yellow
aws sns create-topic `
    --name "leave-attendance-$Environment-alarms" `
    --region $Region 2>$null

Write-Host ""
Write-Host "Observability setup complete!" -ForegroundColor Green
Write-Host "Dashboard: https://console.aws.amazon.com/cloudwatch/home?region=$Region#dashboards:name=leave-attendance-$Environment" -ForegroundColor Cyan

