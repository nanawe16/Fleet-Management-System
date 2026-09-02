-- Prepares the system for real GPS hardware, which OSU doesn't have yet
-- but plans to buy. GPS Tracking currently runs entirely on
-- simulate_vehicle_positions() (015_create_vehicle_locations.sql), a
-- cron job faking movement for 3 demo vehicles every minute. This adds
-- the real ingestion path alongside it, designed so the two can never
-- collide: once a vehicle has an active registered device, the
-- simulation automatically stops touching that vehicle and defers to
-- real incoming data — nothing to manually switch over later.

create extension if not exists pgcrypto with schema extensions;

-- ===== Distinguish real vs simulated positions =====
alter table public.vehicle_locations
  add column if not exists source text not null default 'simulated',
  add column if not exists heading numeric(5,1);

alter table public.vehicle_locations
  add constraint vehicle_locations_source_check check (source in ('simulated', 'device'));

-- ===== Device registration =====
-- One row per vehicle (a vehicle_id can only have one device record;
-- regenerating a key updates it in place rather than creating a
-- second one — matches "each vehicle gets one tracker"). Only the
-- HASH of the device's key is ever stored, never the raw value —
-- same reasoning as never storing a real password in plaintext. The
-- raw key is generated and returned exactly once, at provisioning
-- time, by provision_gps_device() below; there is no way to retrieve
-- it again afterward, only to regenerate a new one.
create table public.gps_devices (
    id uuid primary key default gen_random_uuid(),
    vehicle_id uuid not null unique references public.vehicles(id) on delete cascade,
    device_key_hash text not null,
    label text,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    last_seen_at timestamptz
);

alter table public.gps_devices enable row level security;

create policy "Fleet managers can manage gps devices"
on public.gps_devices for all to authenticated
using (public.current_user_role() in ('admin', 'transport_manager'))
with check (public.current_user_role() in ('admin', 'transport_manager'));

-- ===== Provisioning =====
-- Generates a new raw key server-side, stores only its SHA-256 hash,
-- and returns the raw key ONCE — the only time it's ever available in
-- plaintext. Calling this again for a vehicle that already has a
-- device (e.g. the physical unit was replaced, or the key needs
-- rotating) regenerates it in place rather than erroring.
create or replace function public.provision_gps_device(p_vehicle_id uuid, p_label text default null)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_raw_key text;
  v_hash text;
begin
  if public.current_user_role() not in ('admin', 'transport_manager') then
    raise exception 'Only Admin or Transport Manager can provision GPS devices';
  end if;

  v_raw_key := encode(extensions.gen_random_bytes(24), 'base64');
  v_hash := encode(extensions.digest(v_raw_key, 'sha256'), 'hex');

  insert into public.gps_devices (vehicle_id, device_key_hash, label, is_active, created_at, last_seen_at)
  values (p_vehicle_id, v_hash, p_label, true, now(), null)
  on conflict (vehicle_id) do update
  set device_key_hash = excluded.device_key_hash,
      label = coalesce(excluded.label, public.gps_devices.label),
      is_active = true,
      created_at = now(),
      last_seen_at = null;

  return v_raw_key;
end;
$$;

create or replace function public.deactivate_gps_device(p_vehicle_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_user_role() not in ('admin', 'transport_manager') then
    raise exception 'Only Admin or Transport Manager can deactivate GPS devices';
  end if;

  update public.gps_devices set is_active = false where vehicle_id = p_vehicle_id;
end;
$$;

-- ===== Simulation backs off automatically for real devices =====
-- Same function as 015, redefined with one addition: skip any vehicle
-- that has an active registered device. Everything else about it —
-- the routes, the ping-pong timing, the cron schedule — is unchanged.
create or replace function public.simulate_vehicle_positions()
returns void
language plpgsql
security definer
as $$
declare
  v_now bigint := extract(epoch from now())::bigint;

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

    -- This vehicle has a real, active GPS device registered — defer
    -- to whatever gps-ingest is writing for it instead of overwriting
    -- with fake movement.
    if exists (select 1 from public.gps_devices where vehicle_id = v_vehicle_id and is_active) then
      continue;
    end if;

    v_period := (r->>'period')::int;

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

    insert into public.vehicle_locations (vehicle_id, route_label, lat, lng, speed, direction, source, updated_at)
    values (
      v_vehicle_id,
      r->>'label',
      v_lat,
      v_lng,
      35 + (abs(sin(v_now::numeric / 240)) * 40)::numeric(5,1),
      v_direction,
      'simulated',
      now()
    )
    on conflict (vehicle_id) do update
    set route_label = excluded.route_label,
        lat = excluded.lat,
        lng = excluded.lng,
        speed = excluded.speed,
        direction = excluded.direction,
        source = 'simulated',
        updated_at = excluded.updated_at;
  end loop;
end;
$$;

-- Verification, once you've registered a real device for a vehicle
-- (see the gps-ingest Edge Function for how a device actually posts a
-- position):
-- * select * from public.gps_devices; -- confirm is_active = true
-- * wait ~1 minute, then: select vehicle_id, source, updated_at from
--   public.vehicle_locations where vehicle_id = '<that vehicle>';
--   -- source should stay 'device' and stop flipping back to
--   -- 'simulated' on each cron tick, as long as the device keeps
--   -- posting.