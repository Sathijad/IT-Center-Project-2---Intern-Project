# Phase 2 - Leave & Attendance Management - Release Notes

## Version 2.0.0

### Release Date
TBD

### Overview
Phase 2 introduces comprehensive leave and attendance management capabilities for IT Center staff, building on the authentication foundation from Phase 1.

### New Features

#### Leave Management
- **Leave Policies**: Configurable leave types (Annual, Casual, Sick, Personal)
- **Leave Requests**: Employees can apply for leave with date range and reason
- **Leave Balances**: Automatic tracking of available leave days per policy
- **Admin Approval**: Admins can approve/reject leave requests
- **Leave History**: View past and pending leave requests

#### Attendance Management
- **Clock In/Out**: Employees can record work hours with GPS location
- **Attendance Logs**: View detailed attendance records with timestamps
- **Geofencing**: Optional location validation for clock-in/out
- **Duration Calculation**: Automatic calculation of work duration

#### Admin Features
- **Leave Request Management**: View and manage all employee leave requests
- **Attendance Reports**: Export attendance data for payroll processing
- **Leave Summary Reports**: HR summary reports by year/user

#### Integrations
- **Microsoft Graph**: Automatic calendar sync for approved leaves
- **AWS SES**: Email notifications for leave status changes (coming soon)

### Technical Details

#### Backend
- Node.js/Express Lambda functions
- AWS API Gateway for REST API
- PostgreSQL database (shared with Phase 1)
- AWS Cognito JWT authentication
- X-Ray tracing for observability

#### Frontend
- React admin portal with Tailwind CSS
- React Query for data fetching
- Form validation with react-hook-form + Zod
- WCAG 2.1 AA accessibility compliance

#### Mobile
- Flutter mobile app
- GPS location capture
- Offline support (coming soon)

### API Endpoints

#### Leave
- `GET /api/v1/leave/balance` - Get leave balances
- `GET /api/v1/leave/requests` - List leave requests
- `POST /api/v1/leave/requests` - Create leave request
- `PATCH /api/v1/leave/requests/{id}` - Update leave status

#### Attendance
- `GET /api/v1/attendance` - Get attendance logs
- `POST /api/v1/attendance/clock-in` - Record clock-in
- `POST /api/v1/attendance/clock-out` - Record clock-out

#### Reports
- `GET /api/v1/reports/leave-summary` - HR leave summary

### Database Changes

New tables:
- `leave_policies`
- `leave_requests`
- `leave_balances`
- `attendance_logs`
- `leave_audit`

See `docs/ERD.md` for full schema details.

### Breaking Changes

None - Phase 2 is additive to Phase 1.

### Migration Guide

1. Run database migrations:
   ```bash
   cd auth-backend
   mvn flyway:migrate
   ```

2. Deploy Lambda functions:
   ```bash
   cd leave-attendance-backend
   sam deploy --config-env dev
   ```

3. Update frontend configuration:
   - Set `VITE_API_BASE_URL` to Lambda API Gateway URL
   - Update Cognito configuration if needed

### Known Issues

- Calendar sync requires Microsoft Graph app registration
- Geofencing coordinates need to be configured per environment
- Mobile app requires location permissions

### Performance

- API p95 latency: < 300ms (target)
- Error rate: < 1% (target)
- Test coverage: ≥ 90%

### Security

- JWT authentication via AWS Cognito
- Role-based access control (ADMIN, EMPLOYEE)
- Input validation with Zod schemas
- SQL injection prevention via parameterized queries
- Audit logging for all leave actions

### Documentation

- API Documentation: `docs/openapi/leave-attendance.yaml`
- Runbook: `docs/PHASE2_RUNBOOK.md`
- ERD: `docs/ERD.md`

### Support

For issues or questions:
- Email: support@itcenter.com
- Documentation: See `docs/` directory
- Runbook: `docs/PHASE2_RUNBOOK.md`

### Next Steps

- Email notifications via AWS SES
- Mobile app offline support
- Advanced reporting and analytics
- Integration with payroll systems

