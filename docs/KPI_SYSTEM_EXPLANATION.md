# KPI System Explanation

## Overview

The KPI (Key Performance Indicator) system has **three separate components** that work together:

1. **KPI Definition** - What you're measuring
2. **KPI Actuals** - The measured/actual values (what happened)
3. **KPI Targets** - The goals/targets (what you want to achieve)

---

## 1. KPI Definition (`kpis` table)

**What it is:** The definition of what you're measuring. It's like a template.

**Fields:**
- `kpi_code`: Unique identifier (e.g., `TICKET_RESOLUTION_TIME`)
- `kpi_name`: Human-readable name (e.g., "Ticket Resolution Time")
- `unit`: Unit of measurement (e.g., "Hours", "Percentage")
- `category`: Category (e.g., "Service Desk", "Security")
- `description`: What this KPI measures

**Does it have a value?** ❌ **NO** - It's just a definition, no actual value.

**How to create:**
- **Manual:** Use "Create KPI" button in admin web
- **Auto:** Created automatically during CSV import if it doesn't exist

**Example:**
```
KPI Code: TICKET_RESOLUTION_TIME
Name: Ticket Resolution Time
Unit: Hours
Category: Service Desk
Description: Average time to resolve support tickets
```

---

## 2. KPI Actuals (`kpi_actuals` table)

**What it is:** The **actual measured values** - what really happened.

**Fields:**
- `kpi_id`: Which KPI this value is for
- `user_id`: Which user this measurement is for (optional)
- `team_id`: Which team this measurement is for (optional)
- `measured_at`: When this value was measured
- `value`: The actual measured value (e.g., 18.5 hours)
- `source_type`: How it was recorded (Import, Manual, etc.)

**Does it have a value?** ✅ **YES** - This is the "Current Value" you see in reports.

**How to create:**
- **CSV Import:** Upload CSV file with actual values
- **Manual Entry:** (Not yet implemented in UI, but can be done via API)

**Example CSV:**
```csv
kpi_code,user_id,measured_at,value
TICKET_RESOLUTION_TIME,38,2025-01-15T10:00:00Z,18.5
```

This creates an **actual** record:
- KPI: Ticket Resolution Time
- User: 38
- Date: 2025-01-15
- **Value: 18.5 hours** ← This is the "Current Value" in reports

---

## 3. KPI Targets (`kpi_targets` table)

**What it is:** The **goal/target** you want to achieve.

**Fields:**
- `kpi_id`: Which KPI this target is for
- `user_id`: Target for specific user (optional)
- `team_id`: Target for specific team (optional)
- `period_start` / `period_end`: Time period for this target
- `target_value`: The goal value (e.g., 24 hours)
- `period_type`: Daily, Weekly, Monthly, Quarterly, Yearly

**Does it have a value?** ✅ **YES** - This is the "Target Value" you see in reports.

**How to create:**
- **Manual Only:** Use "Create Target" button in admin web
- **Cannot be imported:** Targets must be set manually

**Example:**
```
KPI: Ticket Resolution Time
Period: January 2025 (2025-01-01 to 2025-01-31)
Target Value: 24 hours
User: 38 (optional - can be organization-wide)
```

---

## How They Work Together

### In KPI Reports:

When you view KPI Reports, the system shows:

1. **Current Value** = Latest actual from `kpi_actuals` table
2. **Target Value** = Target from `kpi_targets` table
3. **Variance** = Current Value - Target Value

**Example:**
```
KPI: Ticket Resolution Time
Current Value: 18.5 hours (from actuals)
Target Value: 24 hours (from targets)
Variance: -5.5 hours (you're doing better than target!)
```

---

## Common Questions

### Q1: When I create a KPI manually, why can't I set a value?

**A:** Because KPIs are just **definitions**. They don't have values themselves. You need to:
1. Create the KPI definition (what you're measuring)
2. Import actuals (the measured values) OR create targets (the goals)

### Q2: When I import CSV, what am I importing?

**A:** You're importing **KPI Actuals** (measured values), not KPIs themselves.

The import process:
1. Reads CSV with actual values
2. Auto-creates KPI definition if it doesn't exist
3. Creates actual records with the measured values

### Q3: What's the difference between Current Value and Target Value?

**A:**
- **Current Value** = What actually happened (from `kpi_actuals`)
- **Target Value** = What you want to achieve (from `kpi_targets`)

### Q4: Can I set a target when creating a KPI?

**A:** No. KPIs and Targets are separate:
- Create KPI first (definition)
- Then create Target separately (goal)

### Q5: When a user updates their profile, does it affect KPIs?

**A:** ❌ **NO** - User profile updates do NOT affect KPI data.

- User ID in KPIs is just a **reference** to track which user the measurement is for
- KPIs are separate from user profiles
- Updating user name/email doesn't change KPI values

### Q6: How do I update KPI values?

**A:** 
- **Actuals:** Import new CSV with updated values (creates new actual records)
- **Targets:** Edit targets in "KPI Targets" page (if edit functionality is added)

---

## Workflow Examples

### Example 1: Setting up a new KPI

1. **Create KPI Definition:**
   - Go to "KPI Targets" → "Create KPI"
   - Enter: Code = `SYSTEM_UPTIME`, Name = "System Uptime", Unit = "Percentage"

2. **Import Actual Values:**
   - Go to "KPI Import"
   - Upload CSV with actual uptime values
   - Example: `SYSTEM_UPTIME,,2025-01-15,99.7`

3. **Create Target:**
   - Go to "KPI Targets" → "Create Target"
   - Select KPI: System Uptime
   - Set Target: 99.9% for January 2025

4. **View Report:**
   - Go to "KPI Reports"
   - See: Current = 99.7%, Target = 99.9%, Variance = -0.2%

### Example 2: User-specific KPIs

1. **Create Target for User:**
   - Create target with User ID = 38
   - Target: 20 hours for Ticket Resolution Time

2. **Import Actuals for User:**
   - Import CSV with `user_id=38`
   - Actual: 18.5 hours

3. **View Report:**
   - Filter by User ID = 38
   - See: Current = 18.5h, Target = 20h, Variance = -1.5h (doing better!)

---

## Summary

| Component | What It Is | Has Value? | How Created |
|-----------|-----------|------------|-------------|
| **KPI Definition** | What you're measuring | ❌ No | Manual or Auto (import) |
| **KPI Actuals** | Measured values (what happened) | ✅ Yes (Current Value) | CSV Import |
| **KPI Targets** | Goals (what you want) | ✅ Yes (Target Value) | Manual Only |

**Remember:**
- KPI = Definition (template)
- Actual = Real measured value
- Target = Goal you want to achieve

