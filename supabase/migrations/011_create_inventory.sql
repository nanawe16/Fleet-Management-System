create table public.spare_parts (
    id uuid primary key default gen_random_uuid(),

    part_name text not null,
    category text not null,
    quantity numeric(10,2) not null default 0,
    unit text not null default 'unit',
    reorder_level numeric(10,2) not null default 0,
    unit_cost numeric(12,2) not null,
    supplier text not null,

    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create table public.inventory_transactions (
    id uuid primary key default gen_random_uuid(),

    part_id uuid not null references public.spare_parts(id) on delete cascade,
    type text not null check (type in ('in', 'out')),
    quantity numeric(10,2) not null check (quantity > 0),
    note text,
    created_by uuid references public.profiles(id),

    created_at timestamptz default now()
);

alter table public.spare_parts enable row level security;
alter table public.inventory_transactions enable row level security;

create policy "Authenticated users can read spare parts"
on public.spare_parts
for select
to authenticated
using (true);

create policy "Authenticated users can read inventory transactions"
on public.inventory_transactions
for select
to authenticated
using (true);

-- Matches the Sidebar's existing role restriction on the Inventory page
create policy "Admins, transport managers, and mechanics can insert spare parts"
on public.spare_parts
for insert
to authenticated
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'transport_manager', 'mechanic')
  )
);

create policy "Admins, transport managers, and mechanics can update spare parts"
on public.spare_parts
for update
to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'transport_manager', 'mechanic')
  )
)
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'transport_manager', 'mechanic')
  )
);

create policy "Admins, transport managers, and mechanics can delete spare parts"
on public.spare_parts
for delete
to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'transport_manager', 'mechanic')
  )
);

-- Transactions are only ever created through record_inventory_transaction()
-- below (never inserted directly), so the only policy needed here is read.
-- The function itself checks permissions before doing anything.

-- Atomically logs a stock movement AND updates the part's quantity in
-- one transaction, so the two can never get out of sync (e.g. a logged
-- transaction with no matching quantity change, if a second separate
-- update call had failed partway through).
create or replace function public.record_inventory_transaction(
  p_part_id uuid,
  p_type text,
  p_quantity numeric,
  p_note text default null
)
returns public.spare_parts
language plpgsql
security definer
as $$
declare
  v_current_qty numeric;
  v_result public.spare_parts;
begin
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'transport_manager', 'mechanic')
  ) then
    raise exception 'Not authorized to record inventory transactions.';
  end if;

  if p_type not in ('in', 'out') then
    raise exception 'Transaction type must be ''in'' or ''out''.';
  end if;

  select quantity into v_current_qty from public.spare_parts where id = p_part_id for update;

  if v_current_qty is null then
    raise exception 'Spare part not found.';
  end if;

  if p_type = 'out' and p_quantity > v_current_qty then
    raise exception 'Only % in stock.', v_current_qty;
  end if;

  insert into public.inventory_transactions (part_id, type, quantity, note, created_by)
  values (p_part_id, p_type, p_quantity, p_note, auth.uid());

  update public.spare_parts
  set quantity = quantity + (case when p_type = 'in' then p_quantity else -p_quantity end),
      updated_at = now()
  where id = p_part_id
  returning * into v_result;

  return v_result;
end;
$$;

-- Seed with your existing mock spare parts
insert into public.spare_parts (part_name, category, quantity, unit, reorder_level, unit_cost, supplier) values
  ('Brake Pads (Front)', 'Brakes', 12, 'set', 5, 1800, 'Addis Auto Parts'),
  ('Engine Oil (5L)', 'Fluids', 3, 'can', 6, 2200, 'Total Ethiopia'),
  ('Tire (185/65R15)', 'Tires', 8, 'unit', 4, 4500, 'Ethio Tire Supply'),
  ('Air Filter', 'Filters', 2, 'unit', 5, 650, 'Addis Auto Parts');