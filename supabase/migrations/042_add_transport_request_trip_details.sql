-- Store the operational details required for group transport requests.
-- The fields remain nullable for existing historical requests; the client
-- requires them for all newly submitted or edited requests.

alter table public.transport_requests
  add column if not exists passenger_count integer,
  add column if not exists passenger_list text,
  add column if not exists task text,
  add column if not exists start_location text;

alter table public.transport_requests
  drop constraint if exists transport_requests_passenger_count_check;

alter table public.transport_requests
  add constraint transport_requests_passenger_count_check
  check (passenger_count is null or passenger_count > 0);

comment on column public.transport_requests.passenger_count is 'Total number of travellers on the request.';
comment on column public.transport_requests.passenger_list is 'Passenger names and contact details, one entry per line.';
comment on column public.transport_requests.task is 'Task or business purpose of the trip.';
comment on column public.transport_requests.start_location is 'Trip origin / pickup location.';
