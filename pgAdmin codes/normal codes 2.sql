select * from app_users;

select * from roles;

select * from user_roles;

select * from login_audit;

select * from flyway_schema_history;




select * from attendance_logs;

select * from leave_requests;

select * from leave_audit;

select * from leave_balances;

select * from leave_policies;



DELETE FROM leave_balances
WHERE id = 9;


