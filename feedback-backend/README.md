# Phase 7 - Feedback & Issue Reporting Backend

Laravel 11.x API for feedback and issue reporting system.

## Requirements

- PHP 8.2+
- PostgreSQL 16+
- Composer
- AWS SDK for PHP (via Composer)

## Installation

1. Install dependencies:
```bash
composer install
```

2. Copy environment file:
```bash
cp .env.example .env
```

3. Generate application key:
```bash
php artisan key:generate
```

4. Configure database connection in `.env`:
```
DB_CONNECTION=pgsql
DB_HOST=itcenter-auth.cfeacycaqhdx.ap-southeast-2.rds.amazonaws.com
DB_PORT=5432
DB_DATABASE=itcenter_auth
DB_USERNAME=postgres
DB_PASSWORD=password
```

5. Run database migration:
Execute `database/migrations/20250101_phase7_feedback.sql` on your PostgreSQL database using pgAdmin or AWS Query Editor.

6. Configure AWS services in `.env`:
```
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_DEFAULT_REGION=ap-southeast-2
AWS_S3_BUCKET=your_bucket
```

## Running

Start the development server:
```bash
php artisan serve --port=8086
```

The API will be available at `http://localhost:8086`

## API Endpoints

### Public
- `GET /api/v1/healthz` - Health check

### Authenticated
- `POST /api/v1/feedback` - Create feedback
- `GET /api/v1/feedback` - List feedback (filtered by user role)
- `GET /api/v1/feedback/{id}` - Get feedback details
- `POST /api/v1/feedback/{id}/messages` - Add message to feedback

### Admin Only
- `PATCH /api/v1/feedback/{id}` - Update feedback (status, assignee, priority)
- `POST /api/v1/feedback/{id}/analyze` - Queue sentiment analysis
- `GET /api/v1/exports/feedback.csv` - Export feedback as CSV
- `POST /api/v1/integrations/teams/notify` - Queue Teams notification

## Authentication

All endpoints (except `/healthz`) require JWT Bearer token from AWS Cognito:
```
Authorization: Bearer <token>
```

## Queue Workers

Process background jobs:
```bash
php artisan queue:work sqs
```

Jobs:
- `AnalyzeSentimentJob` - AWS Comprehend sentiment analysis
- `SendTeamsNotificationJob` - Microsoft Teams notifications
- `SendEmailNotificationJob` - AWS SES email notifications

