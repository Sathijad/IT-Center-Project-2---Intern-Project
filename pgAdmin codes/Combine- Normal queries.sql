select * from app_users;

select * from roles;

select * from user_roles;

select * from login_audit;

select * from flyway_schema_history;



select * from users;

select * from attendance_logs;

select * from leave_requests;

select * from leave_audit;

select * from leave_balances;

select * from leave_policies;




select * from blackout_windows;

select * from booking_audit;

select * from bookings;

select * from rooms;




select * from import_jobs;

select * from recurrences;

select * from schedules;

select * from task_notes;

select * from tasks;









SELECT id, email, cognito_sub, is_active
FROM app_users
ORDER BY id;



SELECT schemaname, tablename
FROM pg_catalog.pg_tables
WHERE tablename = 'flyway_schema_history';




DELETE FROM app_users;
DELETE FROM user_roles;