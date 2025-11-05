# CI/CD Pipeline Documentation

## Overview

The CI/CD pipeline for Phase 2 Leave & Attendance Management is defined in `.github/workflows/leave-attendance-ci-cd.yml`.

## Pipeline Stages

### 1. Build & Test
- **Triggers**: Push/PR to `main` or `develop` branches
- **Actions**:
  - Checkout code
  - Setup Node.js 20.x
  - Install dependencies
  - Run linter (non-blocking)
  - Run unit tests with coverage
  - Upload coverage to Codecov
  - SAST scan (Super-Linter)
  - SCA scan (Snyk)

### 2. Security Scan (ZAP)
- **Triggers**: Push to `develop` or `main` branches
- **Actions**:
  - ZAP baseline scan against DEV/STG API
  - Upload scan results as artifact

### 3. Deploy DEV
- **Triggers**: Push to `develop` branch
- **Prerequisites**: Build & Test must pass
- **Actions**:
  - SAM build
  - SAM deploy to DEV environment
  - Setup CloudWatch observability

### 4. Deploy STG
- **Triggers**: Push to `main` branch
- **Prerequisites**: Build & Test + Security Scan must pass
- **Actions**:
  - SAM build
  - SAM deploy to STG environment
  - Setup CloudWatch observability

### 5. Deploy PRD (Canary)
- **Triggers**: Push to `main` branch
- **Prerequisites**: Build & Test + Security Scan must pass
- **Actions**:
  - SAM build
  - SAM deploy to PRD with 10% canary
  - Wait for 2-hour validation period
  - Setup CloudWatch observability

## Required Secrets

Configure the following secrets in GitHub repository settings:

- `AWS_ACCESS_KEY_ID` - AWS access key for deployments
- `AWS_SECRET_ACCESS_KEY` - AWS secret key
- `SNYK_TOKEN` - Snyk API token (optional, for SCA scanning)

## Environment Variables

- `AWS_REGION`: `ap-southeast-2`
- `NODE_VERSION`: `20.x`

## Manual Deployment

For manual deployments or rollbacks:

```bash
cd leave-attendance-backend

# Deploy to DEV
sam deploy --config-env dev

# Deploy to STG
sam deploy --config-env stg

# Deploy to PRD
sam deploy --config-env prd
```

## Monitoring

After deployment, check:
- CloudWatch Dashboard: `leave-attendance-{env}`
- CloudWatch Alarms: Error rate, latency, throttles
- GitHub Actions logs for deployment status

