select * from app_users;

select * from roles;

select * from user_roles;

select * from login_audit;

select * from flyway_schema_history;





DELETE FROM leave_balances
WHERE id = 9;


DROP TABLE IF EXISTS
    attendance_logs,
    leave_requests,
    leave_audit,
    leave_balances,
    leave_policies
CASCADE;







SELECT schemaname, tablename
FROM pg_catalog.pg_tables
WHERE tablename = 'flyway_schema_history';







