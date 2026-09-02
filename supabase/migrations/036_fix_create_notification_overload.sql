drop function if exists public.create_notification(text, text, text, text[], text);
-- 034 added create_notification(p_type, p_message, p_link, p_target_role,
-- p_dedup_key, p_recipient_user_id default null) via CREATE OR REPLACE —
-- but adding a parameter means Postgres treats it as a DIFFERENT
-- function (functions are identified by name + parameter types, not
-- name alone), not a replacement of the original 016 one. So the
-- database has carried two create_notification functions since 034:
--
--   create_notification(text, text, text, text[], text)                    -- 016, 5 args
--   create_notification(text, text, text, text[], text, uuid default null) -- 034, 6 args
--
-- The 016 request-creation trigger (on_transport_request_created ->
-- notify_new_transport_request) calls it with exactly 5 arguments.
-- Because the 034 function's 6th parameter has a default, it's ALSO a
-- valid match for a 5-argument call — so that call is now ambiguous
-- between the two, and Postgres rejects it with "is not unique" rather
-- than guessing. This fires on every single insert into
-- transport_requests, for every role, not just Requesters — it just
-- happened to surface first here.
--
-- Fix: drop the old 5-argument version. The 6-argument one (034)
-- already covers every 5-argument call site unchanged, since its extra
-- parameter defaults to null.

drop function if exists public.create_notification(text, text, text, text[], text);

-- Verify only one overload remains:
-- select oid::regprocedure from pg_proc where proname = 'create_notification';
-- should return exactly one row.