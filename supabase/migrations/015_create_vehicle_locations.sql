-- One row per tracked vehicle, holding its current simulated position.
-- Written only by simulate_vehicle_positions() below — no direct client
-- writes, so every logged-in user sees the same shared positions.
create table public.vehicle_locations (
    vehicle_id uuid primary key references public.vehicles(id) on delete cascade,
    route_label text,
    lat numeric(10,6) not null,
    lng numeric(10,6) not null,
    speed numeric(5,1) not null default 0,
    direction text not null default 'outbound',
    updated_at timestamptz default now()
);

alter table public.vehicle_locations enable row level security;

create policy "Authenticated users can read vehicle locations"
on public.vehicle_locations
for select
to authenticated
using (true);

-- No insert/update/delete policies for regular users — writes only
-- happen through simulate_vehicle_positions(), which is SECURITY
-- DEFINER and bypasses RLS.

-- Simulates 3 vehicles driving back and forth along fixed routes
-- between real OSU-area destinations, matching your original demo
-- routes. Looks up vehicles by plate_number so it stays tied to
-- whatever vehicles actually exist — if a plate isn't found, that
-- route is silently skipped rather than erroring.
create or replace function public.simulate_vehicle_positions()
returns void
language plpgsql
security definer
as $$
declare
  v_now bigint := extract(epoch from now())::bigint;

  -- plate_number, route_label, waypoints (as a JSON array), period in seconds
  routes jsonb := '[
    {"plate": "OSU-001", "label": "Shashamane -> Adama",
     "path": [{"lat":7.2,"lng":38.6},{"lat":7.85,"lng":39.0},{"lat":8.54,"lng":39.27}],
     "period": 90},
    {"plate": "OSU-002", "label": "Adama -> Addis Ababa",
     "path": [{"lat":8.54,"lng":39.27},{"lat":8.8,"lng":39.0},{"lat":9.03,"lng":38.74}],
     "period": 105},
    {"plate": "OSU-003", "label": "Shashamane -> Jimma",
     "path": [{"lat":7.2,"lng":38.6},{"lat":7.4,"lng":38.2},{"lat":7.67,"lng":36.83}],
     "period": 120}
  ]';

  r jsonb;
  v_vehicle_id uuid;
  v_period int;
  v_t numeric;
  v_segments int;
  v_scaled numeric;
  v_i int;
  v_local_t numeric;
  v_from jsonb;
  v_to jsonb;
  v_lat numeric;
  v_lng numeric;
  v_direction text;
begin
  for r in select * from jsonb_array_elements(routes)
  loop
    select id into v_vehicle_id from public.vehicles where plate_number = r->>'plate';
    if v_vehicle_id is null then
      continue; -- that plate doesn't exist in this database, skip it
    end if;

    v_period := (r->>'period')::int;

    -- ping-pong t between 0 and 1 based on wall-clock time
    v_t := (v_now % (v_period * 2))::numeric / v_period;
    if v_t > 1 then
      v_t := 2 - v_t;
      v_direction := 'returning';
    else
      v_direction := 'outbound';
    end if;

    v_segments := jsonb_array_length(r->'path') - 1;
    v_scaled := v_t * v_segments;
    v_i := least(floor(v_scaled)::int, v_segments - 1);
    v_local_t := v_scaled - v_i;

    v_from := r->'path'->v_i;
    v_to := r->'path'->(v_i + 1);

    v_lat := (v_from->>'lat')::numeric + ((v_to->>'lat')::numeric - (v_from->>'lat')::numeric) * v_local_t;
    v_lng := (v_from->>'lng')::numeric + ((v_to->>'lng')::numeric - (v_from->>'lng')::numeric) * v_local_t;

    insert into public.vehicle_locations (vehicle_id, route_label, lat, lng, speed, direction, updated_at)
    values (
      v_vehicle_id,
      r->>'label',
      v_lat,
      v_lng,
      35 + (abs(sin(v_now::numeric / 240)) * 40)::numeric(5,1),
      v_direction,
      now()
    )
    on conflict (vehicle_id) do update
    set route_label = excluded.route_label,
        lat = excluded.lat,
        lng = excluded.lng,
        speed = excluded.speed,
        direction = excluded.direction,
        updated_at = excluded.updated_at;
  end loop;
end;
$$;

-- Enable pg_cron and schedule the simulation to run every minute.
-- If this errors with "permission denied" or similar, enable the
-- pg_cron extension manually first: Supabase dashboard -> Database ->
-- Extensions -> search "pg_cron" -> Enable, then rerun just the
-- cron.schedule(...) call below.
create extension if not exists pg_cron with schema extensions;

select cron.schedule(
  'simulate-vehicle-positions',
  '* * * * *',
  $$select public.simulate_vehicle_positions();$$
);

-- Run it once immediately so there's data right away instead of
-- waiting up to a minute for the first cron tick
select public.simulate_vehicle_positions();