-- 044_fuel_records_account_number.sql
--
-- FuelForm.jsx now has an "Account Number" field ("Enter the account to
-- be charged"), but fuel_records never got a matching column, causing:
--   PGRST204 — Could not find the 'account_number' column of
--   'fuel_records' in the schema cache

alter table fuel_records
  add column if not exists account_number text;