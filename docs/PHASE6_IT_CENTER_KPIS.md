# IT Center KPI Guidelines

## Overview
This document provides IT Center-specific KPI recommendations for the Performance & Training Module (Phase 6). These KPIs are tailored for IT service management, support operations, and infrastructure monitoring.

## Recommended IT Center KPIs

### 1. Service Desk Metrics

#### TICKET_RESOLUTION_TIME
- **Description**: Average time to resolve IT support tickets
- **Unit**: Hours
- **Target**: ≤ 24 hours (for standard tickets)
- **Period**: Monthly
- **Source**: Ticketing system (e.g., Jira, ServiceNow)

#### FIRST_RESPONSE_TIME
- **Description**: Average time to first response on IT tickets
- **Unit**: Minutes
- **Target**: ≤ 2 hours
- **Period**: Monthly
- **Source**: Ticketing system

#### TICKETS_RESOLVED
- **Description**: Total number of IT tickets resolved
- **Unit**: Count
- **Target**: ≥ 200 tickets/month (adjust based on team size)
- **Period**: Monthly
- **Source**: Ticketing system

#### TICKET_BACKLOG
- **Description**: Number of open tickets pending resolution
- **Unit**: Count
- **Target**: ≤ 50 tickets
- **Period**: Weekly
- **Source**: Ticketing system

### 2. System Availability & Performance

#### SYSTEM_UPTIME
- **Description**: Percentage of time critical systems are available
- **Unit**: Percentage
- **Target**: ≥ 99.5%
- **Period**: Monthly
- **Source**: Monitoring tools (e.g., Nagios, Datadog)

#### INFRASTRUCTURE_UTILIZATION
- **Description**: Average server/network resource utilization
- **Unit**: Percentage
- **Target**: 60-80% (optimal range)
- **Period**: Monthly
- **Source**: Infrastructure monitoring

#### MEAN_TIME_TO_RECOVERY
- **Description**: Average time to recover from system failures
- **Unit**: Minutes
- **Target**: ≤ 30 minutes
- **Period**: Monthly
- **Source**: Incident management system

### 3. Security Metrics

#### SECURITY_INCIDENTS
- **Description**: Number of security incidents reported
- **Unit**: Count
- **Target**: ≤ 5 incidents/month
- **Period**: Monthly
- **Source**: Security operations center

#### PATCH_COMPLIANCE
- **Description**: Percentage of systems with up-to-date security patches
- **Unit**: Percentage
- **Target**: ≥ 95%
- **Period**: Monthly
- **Source**: Patch management system

#### VULNERABILITY_REMEDIATION_TIME
- **Description**: Average time to remediate critical vulnerabilities
- **Unit**: Days
- **Target**: ≤ 7 days
- **Period**: Monthly
- **Source**: Vulnerability management system

### 4. Change Management

#### CHANGE_SUCCESS_RATE
- **Description**: Percentage of IT changes completed without incidents
- **Unit**: Percentage
- **Target**: ≥ 95%
- **Period**: Monthly
- **Source**: Change management system

#### CHANGE_IMPLEMENTATION_TIME
- **Description**: Average time to implement approved changes
- **Unit**: Days
- **Target**: ≤ 5 days
- **Period**: Monthly
- **Source**: Change management system

### 5. Customer Satisfaction

#### IT_SERVICE_SATISFACTION
- **Description**: Average customer satisfaction score for IT services
- **Unit**: Score (1-5 scale)
- **Target**: ≥ 4.0/5.0
- **Period**: Monthly
- **Source**: Customer surveys

#### SERVICE_REQUEST_FULFILLMENT_TIME
- **Description**: Average time to fulfill service requests (e.g., access requests, software installs)
- **Unit**: Hours
- **Target**: ≤ 48 hours
- **Period**: Monthly
- **Source**: Service catalog system

### 6. Training & Development

#### STAFF_TRAINING_COMPLETION
- **Description**: Percentage of IT staff who completed required training
- **Unit**: Percentage
- **Target**: ≥ 90%
- **Period**: Quarterly
- **Source**: Training management system

#### CERTIFICATION_RATE
- **Description**: Number of IT certifications obtained by staff
- **Unit**: Count
- **Target**: ≥ 5 certifications/quarter
- **Period**: Quarterly
- **Source**: HR/Training records

## CSV Import Format

### Example CSV for IT Center KPIs

```csv
kpi_code,user_id,measured_at,value
TICKET_RESOLUTION_TIME,38,2025-01-15T10:00:00Z,18.5
FIRST_RESPONSE_TIME,38,2025-01-15T10:00:00Z,90
TICKETS_RESOLVED,38,2025-01-15T10:00:00Z,245
SYSTEM_UPTIME,,2025-01-15T10:00:00Z,99.7
IT_SERVICE_SATISFACTION,,2025-01-15T10:00:00Z,4.2
```

### CSV Column Descriptions

- **kpi_code**: The KPI code (e.g., `TICKET_RESOLUTION_TIME`, `SYSTEM_UPTIME`)
- **user_id**: Optional. User ID if the KPI is user-specific (e.g., tickets resolved by a specific staff member)
- **measured_at**: ISO 8601 timestamp of when the measurement was taken
- **value**: The actual KPI value (decimal number)

## Creating KPIs in the System

Before importing actuals, you need to create the KPI definitions using the API:

### Example: Create TICKET_RESOLUTION_TIME KPI

```json
POST /api/v1/perf/kpis
{
  "kpiCode": "TICKET_RESOLUTION_TIME",
  "kpiName": "Ticket Resolution Time",
  "description": "Average time to resolve IT support tickets",
  "unit": "Hours",
  "category": "Service Desk"
}
```

### Example: Create KPI Target

```json
POST /api/v1/perf/targets
{
  "kpiId": "<kpi-id-from-above>",
  "periodType": "Monthly",
  "periodStart": "2025-01-01",
  "periodEnd": "2025-01-31",
  "targetValue": 24.0
}
```

## Best Practices

1. **Start with Core Metrics**: Begin with 5-7 essential KPIs (e.g., Ticket Resolution Time, System Uptime, Customer Satisfaction)

2. **Set Realistic Targets**: Base targets on historical data and industry benchmarks

3. **Regular Monitoring**: Review KPIs monthly and adjust targets quarterly

4. **User-Specific vs. Team KPIs**: 
   - User-specific: Individual performance (e.g., tickets resolved by a staff member)
   - Team/Organization: Overall IT Center performance (e.g., system uptime)

5. **Data Sources**: Ensure your data sources (ticketing systems, monitoring tools) can export data in CSV format

6. **Automation**: Consider automating KPI data collection where possible

## Integration with Existing Systems

The KPI system can integrate with:
- **Ticketing Systems**: Jira, ServiceNow, Zendesk
- **Monitoring Tools**: Nagios, Datadog, New Relic
- **Security Tools**: SIEM systems, vulnerability scanners
- **HR Systems**: Training completion, certification tracking

## Next Steps

1. Identify which KPIs are most relevant for your IT Center
2. Create KPI definitions using the API (`POST /api/v1/perf/kpis`)
3. Set targets for each KPI (`POST /api/v1/perf/targets`)
4. Export data from your systems in CSV format
5. Import actuals using the KPI Import page (`/performance/import`)
6. Monitor performance using the KPI Reports page (`/performance/reports`)

