select * from app_users;

select * from roles;

select * from user_roles;

select * from login_audit;

select * from flyway_schema_history;




select * from blackout_windows;

select * from booking_audit;

select * from bookings;

select * from rooms;








SELECT schemaname, tablename
FROM pg_catalog.pg_tables
WHERE tablename = 'flyway_schema_history';

