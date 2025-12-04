# KPI Import - Understanding the "value" Column

## What is the "value" Column?

The **`value`** column in your CSV import is the **actual measured/recorded value** for that KPI at that specific point in time.

This value becomes the **"Current Value"** you see in KPI Reports.

---

## CSV Format

```csv
kpi_code,user_id,measured_at,value
```

### Columns Explained:

1. **`kpi_code`**: Which KPI you're recording (e.g., `TICKET_RESOLUTION_TIME`)
2. **`user_id`**: Which user this measurement is for (optional - leave empty for team/organization-wide)
3. **`measured_at`**: When this value was measured (date/time)
4. **`value`**: ⭐ **The actual measured number** - This is what you're asking about!

---

## Examples from Sample CSV

### Example 1: Ticket Resolution Time
```csv
TICKET_RESOLUTION_TIME,38,2025-01-15T10:00:00Z,18.5
```
- **KPI**: Ticket Resolution Time
- **User**: 38
- **Date**: January 15, 2025
- **Value**: `18.5` = **18.5 hours** (the actual time it took to resolve tickets)
- **Meaning**: User 38's tickets took an average of 18.5 hours to resolve on that date

### Example 2: System Uptime
```csv
SYSTEM_UPTIME,,2025-01-15T10:00:00Z,99.7
```
- **KPI**: System Uptime
- **User**: (empty = organization-wide)
- **Date**: January 15, 2025
- **Value**: `99.7` = **99.7%** (the actual uptime percentage)
- **Meaning**: Systems were up 99.7% of the time on that date

### Example 3: Tickets Resolved
```csv
TICKETS_RESOLVED,38,2025-01-15T10:00:00Z,245
```
- **KPI**: Tickets Resolved
- **User**: 38
- **Date**: January 15, 2025
- **Value**: `245` = **245 tickets** (the actual count)
- **Meaning**: User 38 resolved 245 tickets on that date

### Example 4: Security Incidents
```csv
SECURITY_INCIDENTS,,2025-01-15T10:00:00Z,3
```
- **KPI**: Security Incidents
- **User**: (empty = organization-wide)
- **Date**: January 15, 2025
- **Value**: `3` = **3 incidents** (the actual count)
- **Meaning**: There were 3 security incidents on that date

---

## How to Determine the Value

The value depends on **what the KPI measures**:

### Time-based KPIs (Hours, Minutes, Days)
- **Value** = The actual time measured
- Example: `TICKET_RESOLUTION_TIME` → value = `18.5` (hours)

### Percentage KPIs
- **Value** = The actual percentage (0-100)
- Example: `SYSTEM_UPTIME` → value = `99.7` (means 99.7%)

### Count KPIs
- **Value** = The actual number/count
- Example: `TICKETS_RESOLVED` → value = `245` (tickets)

### Score/Rating KPIs
- **Value** = The actual score (usually 1-5 or 1-10)
- Example: `IT_SERVICE_SATISFACTION` → value = `4.2` (out of 5)

---

## Where Does This Value Come From?

The value should come from your **actual measurement systems**:

### For Service Desk KPIs:
- **Source**: Ticketing system (Jira, ServiceNow, etc.)
- **How to get value**: Export report from ticketing system
- **Example**: Average resolution time from last month = 18.5 hours

### For System Availability KPIs:
- **Source**: Monitoring tools (Nagios, Datadog, etc.)
- **How to get value**: Check monitoring dashboard
- **Example**: System uptime for last month = 99.7%

### For Security KPIs:
- **Source**: Security operations center, patch management system
- **How to get value**: Export from security tools
- **Example**: Number of security incidents = 3

### For Manual KPIs:
- **Source**: Manual tracking, spreadsheets
- **How to get value**: Calculate from your records
- **Example**: Count tickets resolved = 245

---

## Complete Example: Creating Your CSV

Let's say you want to import data for **January 2025**:

### Step 1: Gather Your Data

From your systems, you collect:
- Ticket Resolution Time: **18.5 hours** (average)
- System Uptime: **99.7%**
- Tickets Resolved: **245 tickets**
- Security Incidents: **3 incidents**

### Step 2: Create CSV

```csv
kpi_code,user_id,measured_at,value
TICKET_RESOLUTION_TIME,38,2025-01-15T10:00:00Z,18.5
SYSTEM_UPTIME,,2025-01-15T10:00:00Z,99.7
TICKETS_RESOLVED,38,2025-01-15T10:00:00Z,245
SECURITY_INCIDENTS,,2025-01-15T10:00:00Z,3
```

### Step 3: Import

When you import this CSV:
- The `value` column (18.5, 99.7, 245, 3) becomes the **"Current Value"** in KPI Reports
- These are the **actual measured values** from your systems

---

## Important Notes

### ✅ DO:
- Use **actual measured values** from your systems
- Match the **unit** of the KPI (hours, percentage, count, etc.)
- Use **decimal numbers** for precise measurements (18.5, 99.7)
- Use **whole numbers** for counts (245, 3)

### ❌ DON'T:
- Don't use **target values** here (targets are set separately)
- Don't use **percentages with % sign** (use 99.7, not "99.7%")
- Don't use **text descriptions** (use numbers only)
- Don't use **formatted numbers** (use 18.5, not "18.5 hours")

---

## Value vs Target

### Value (in CSV Import) = Current/Actual Value
- What **actually happened**
- From your measurement systems
- Imported via CSV
- Shows as **"Current Value"** in reports

### Target (created manually) = Goal Value
- What you **want to achieve**
- Set manually in "KPI Targets"
- Shows as **"Target Value"** in reports

### Example:
```
Current Value (from import): 18.5 hours
Target Value (from targets): 24 hours
Variance: -5.5 hours (doing better than target!)
```

---

## Summary

**The `value` column = The actual measured number from your systems**

- For time KPIs: actual time (e.g., 18.5 hours)
- For percentage KPIs: actual percentage (e.g., 99.7)
- For count KPIs: actual count (e.g., 245)
- For score KPIs: actual score (e.g., 4.2)

This value becomes the **"Current Value"** you see in KPI Reports!

