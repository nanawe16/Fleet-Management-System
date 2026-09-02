-- 022's guessed drop names for spare_parts write policies didn't match
-- the actual old policy names (missed "transport managers," in the
-- name), so the old full-write policies survived alongside the new
-- ones. Confirmed via pg_policies: Transport Manager currently still
-- has insert/update/delete on spare_parts, though the matrix gives
-- Transport Manager view-only ("V") on this module.

drop policy if exists "Admins, transport managers, and mechanics can insert spare parts" on public.spare_parts;
drop policy if exists "Admins, transport managers, and mechanics can update spare parts" on public.spare_parts;
drop policy if exists "Admins, transport managers, and mechanics can delete spare parts" on public.spare_parts;

-- Verify after running: Transport Manager test account should now be
-- able to select spare_parts but get denied on insert/update/delete.