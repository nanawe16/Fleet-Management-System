-- Clean slate: drop the old trigger, function, and table (safe to rerun
-- since there's no real data in profiles yet). Skip this block if you
-- already have real data in profiles and just want the reference copy.
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
drop table if exists public.profiles;

-- 1. Table
create table public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,

    full_name text not null,

    phone text,

    avatar_url text,

    role text not null default 'transport_manager',

    is_active boolean default true,

    created_at timestamptz default now(),

    updated_at timestamptz default now()
);

-- 2. Row Level Security
alter table public.profiles enable row level security;

create policy "Users can read their own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- 3. Auto-create a profile row whenever a new auth user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (
    id,
    full_name,
    role
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'transport_manager')
  );

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();