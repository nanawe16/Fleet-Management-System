-- 043_transport_request_task_and_location.sql
--
-- transport_requests was missing two more columns that requestService.js's
-- toDbShape() has been sending all along: task and start_location.
-- Confirmed against a full information_schema.columns dump — after this,
-- every key toDbShape() sends now has a matching column:
--   department, department_id, requester, passenger_count, passenger_list,
--   task, start_location, destination, request_date  <- all present.

alter table transport_requests
  add column if not exists task text,
  add column if not exists start_location text;