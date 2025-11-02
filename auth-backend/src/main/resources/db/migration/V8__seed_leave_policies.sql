-- IT Center Auth - Phase 2: Seed Leave Policies
-- Flyway migration V8__seed_leave_policies.sql

-- Insert default leave policies
INSERT INTO leave_policies (type, max_days, carry_forward, accrual_rate, accrual_period, min_notice_days, description) VALUES
    ('ANNUAL', 20, true, 1.67, 'MONTHLY', 7, 'Annual leave - 20 days per year, can carry forward up to 5 days'),
    ('CASUAL', 10, false, 0.83, 'MONTHLY', 1, 'Casual leave - 10 days per year, cannot carry forward'),
    ('SICK', 7, false, 0.58, 'MONTHLY', 0, 'Sick leave - 7 days per year, cannot carry forward')
ON CONFLICT (type) DO NOTHING;

