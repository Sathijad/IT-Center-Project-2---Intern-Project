# Phase 7 Release Notes — Feedback & Issue Reporting

## Highlights
- **Laravel Feedback API:** New `feedback-backend` service with endpoints for creating, listing, managing feedback, adding messages, and admin triage workflows. Includes JWT auth, RBAC, S3 file uploads, AWS Comprehend sentiment analysis, Teams notifications, and CSV export.
- **React Admin Web UI:** Feedback list page with filtering, detail page with workflow history and analytics, submit feedback form, message threads, and admin triage capabilities.
- **Flutter Mobile App:** Feedback list screen, detail screen with messages, submit feedback form, and attachment support.
- **Database Schema:** Added `feedback`, `feedback_messages`, `feedback_attachments`, `feedback_audit`, `nlp_analysis` tables with UUID primary keys and relationships to `app_users`.
- **AWS Integrations:** S3 for file storage, Comprehend for sentiment/PII analysis, SQS for job queues, Teams webhook for notifications, SES for email alerts.

## Backward Compatibility
- Existing phases remain untouched (shared `itcenter_auth` DB).
- All feedback tables use UUID primary keys and BIGINT foreign keys to `app_users.id` (following Phase 4/6 pattern).
- JWT authentication uses same Cognito configuration as other phases.

## Deployment Notes

1. **Database Migration:**
   - Execute SQL migration `feedback-backend/database/migrations/20250101_phase7_feedback.sql` on RDS PostgreSQL database using pgAdmin or AWS Query Editor.

2. **Laravel Backend:**
   - Install dependencies: `composer install`
   - Configure `.env` with database connection and AWS credentials
   - Start server: `php artisan serve --port=8086`
   - Run queue worker: `php artisan queue:work sqs`

3. **React Admin Web:**
   - Update `VITE_FEEDBACK_API_BASE_URL` in `.env` (defaults to `http://localhost:8086`)
   - New routes: `/feedback`, `/feedback/submit`, `/feedback/:id`

4. **Flutter Mobile:**
   - Feedback API base URL configured in `api_base.dart` (defaults to `http://localhost:8086` for local, `http://10.0.2.2:8086` for Android emulator)
   - New screens: Feedback list, detail, and submit

## API Endpoints

### Base URL: `/api/v1`

**Public:**
- `GET /healthz` - Health check

**Authenticated:**
- `POST /feedback` - Create feedback (EMPLOYEE/ADMIN)
- `GET /feedback` - List feedback (ADMIN: all, EMPLOYEE: own only)
- `GET /feedback/{id}` - Get feedback details
- `POST /feedback/{id}/messages` - Add message/comment

**Admin Only:**
- `PATCH /feedback/{id}` - Update feedback (status, assignee, priority, labels)
- `POST /feedback/{id}/analyze` - Queue sentiment analysis
- `GET /exports/feedback.csv` - Export feedback as CSV
- `POST /integrations/teams/notify` - Queue Teams notification

## Database Tables

1. **feedback** - Main feedback/issue records
2. **feedback_messages** - Comments/thread messages
3. **feedback_attachments** - File attachments (S3 references)
4. **feedback_audit** - Workflow history tracking
5. **nlp_analysis** - AWS Comprehend sentiment/PII results

All tables use UUID primary keys and reference `app_users.id` via BIGINT foreign keys.

## AWS Services Configuration

- **S3:** Configure `AWS_S3_BUCKET` for file storage
- **Comprehend:** Configure `AWS_COMPREHEND_REGION` for sentiment analysis
- **SQS:** Configure queue names for background jobs
- **Teams:** Configure `TEAMS_WEBHOOK_URL` for notifications
- **SES:** Configure AWS credentials for email notifications

## Known Issues / Next Steps

- File uploads require S3 presigned URL generation (currently stubbed)
- Teams bot API integration not fully implemented (webhook only)
- Mobile app file picker integration pending
- Queue workers need to be deployed and monitored
- Sentiment analysis results should be displayed in admin UI analytics

## Testing

- Manual testing via Postman/Swagger recommended
- Skip automated tests per requirements (PHPUnit, k6, ZAP, Selenium)

