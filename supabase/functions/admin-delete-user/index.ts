// @ts-nocheck
// This file runs on Deno (Supabase Edge Functions), not Node — your
// editor's TypeScript checker doesn't know about `Deno.serve` or
// `https://` imports and will flag both as errors. This line silences
// that; it has no effect on deployment or runtime.
//
// supabase/functions/gps-ingest/index.ts
//
// The endpoint a future GPS device (or, more realistically, its
// cellular gateway / fleet-tracking platform's webhook feature) calls
// to report a vehicle's position. Unlike every other Edge Function in
// this project, the caller here is NOT a logged-in app user — it's a
// physical device with no Supabase account at all — so this
// authenticates with a per-vehicle device key instead of a JWT.
//
// Request:
//   POST /functions/v1/gps-ingest
//   Header: X-Device-Key: <the raw key shown once at provisioning>
//   Body (JSON): { "latitude": number, "longitude": number,
//                  "speed"?: number, "heading"?: number }
//
// The device key is hashed here (SHA-256) and compared against
// gps_devices.device_key_hash — the raw key is never stored anywhere,
// including in this function; only its hash ever touches the
// database, same as 041_gps_device_infrastructure.sql's
// provision_gps_device().
//
// Deploy via the dashboard's Edge Functions editor (function name must
// be exactly "gps-ingest"), with "Enforce JWT Verification" turned OFF
// — not just for the usual CORS-preflight reason the other admin-*
// functions need that, but because a real device calling this
// directly (not from a browser) will never have a Supabase user JWT to
// present in the first place. This function's own device-key check is
// what actually protects it.
//
// NOTE ON REAL HARDWARE: this assumes whatever GPS device/gateway you
// end up buying can make an HTTPS POST with a JSON body and a custom
// header — true for most modern cellular/4G trackers with a "webhook"
// or "custom server" mode, and for fleet-tracking platforms (Traccar,
// Samsara, etc.) that support outbound webhooks. Some GPS hardware
// instead speaks a proprietary binary protocol over raw TCP/UDP and
// has no HTTP mode at all — if that's what gets purchased, a small
// translator service will be needed in front of this endpoint to
// convert the device's native protocol into calls shaped like the one
// above. That translator is outside what this documentation can
// specify in advance, since it depends entirely on which hardware is
// actually bought.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-device-key",
};

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const sha256Hex = async (text) => {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const deviceKey = req.headers.get("X-Device-Key");
    if (!deviceKey) return json({ error: "Missing X-Device-Key header" }, 401);

    const body = await req.json().catch(() => null);
    const { latitude, longitude, speed, heading } = body || {};

    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return json({ error: "latitude and longitude (numbers) are required" }, 400);
    }

    const keyHash = await sha256Hex(deviceKey);

    // Service-role client — this call has no authenticated Supabase
    // user context at all (the caller is a device, not a logged-in
    // person), so RLS can't apply here the way it does everywhere
    // else. The device-key check above and below is what stands in
    // for it.
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL"),
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    );

    const { data: device, error: deviceError } = await adminClient
      .from("gps_devices")
      .select("id, vehicle_id, is_active")
      .eq("device_key_hash", keyHash)
      .maybeSingle();

    if (deviceError) return json({ error: deviceError.message }, 500);
    if (!device || !device.is_active) return json({ error: "Invalid or inactive device key" }, 401);

    const { error: upsertError } = await adminClient.from("vehicle_locations").upsert(
      {
        vehicle_id: device.vehicle_id,
        lat: latitude,
        lng: longitude,
        speed: typeof speed === "number" ? speed : 0,
        heading: typeof heading === "number" ? heading : null,
        source: "device",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "vehicle_id" }
    );

    if (upsertError) return json({ error: upsertError.message }, 500);

    await adminClient.from("gps_devices").update({ last_seen_at: new Date().toISOString() }).eq("id", device.id);

    return json({ ok: true });
  } catch (err) {
    return json({ error: err.message || "Unexpected error" }, 500);
  }
});