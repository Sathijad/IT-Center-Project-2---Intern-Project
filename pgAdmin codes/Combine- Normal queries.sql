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





select * from announcement_bodies;

select * from events;

select * from event_tags;

select * from publish_audit;

select * from tag_library;

select * from feature_flags;



SELECT id, email, cognito_sub, is_active
FROM app_users
ORDER BY id;



SELECT schemaname, tablename
FROM pg_catalog.pg_tables
WHERE tablename = 'flyway_schema_history';




DELETE FROM app_users;
DELETE FROM user_roles;



DELETE FROM tasks
WHERE task_id NOT IN (
  '336212ca-0c2b-444d-9d21-f1e66c464612',
  '39eb43f0-cec3-4393-a707-834bb4719c12',
  'd26a32c3-824a-45d2-82c6-0b62c017dfca',
  '865faade-bc25-45bc-86ce-04e91fb07eb1'
);


DELETE FROM schedules
WHERE schedule_id NOT IN (
  '0f38274a-8fef-45d4-a77b-932c937d72d7',
  '6d147075-0d41-40ee-9027-0de5b392fd7c',
  'b2a40864-6e80-43dc-8ce0-3130cde2bd19',
  'c0f28e55-83cd-4a7a-b610-8de5dd660aef',
  '96dec780-4333-4982-b892-09d19c51a646',
  '355e9c67-6bf4-4c0e-9297-090ab2cf4f97',
  '33239144-6fa5-408b-a082-59d5d30fefe2',
  '2be03435-936e-48f9-88cc-9ab41308deb0'
);


DELETE FROM recurrences
WHERE recurrence_id NOT IN (
  'e0589ca0-6c37-44a1-a6be-05b1890fea8b',
  '585d8b11-bd26-4160-b426-96c52f68022e',
  'bc968ce1-1bf9-478b-a8d3-3e2f3c825975'
);



SELECT *
FROM app_users
WHERE id = 3;


DELETE FROM app_users
WHERE id = 37;

