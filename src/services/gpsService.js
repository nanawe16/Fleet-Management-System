import { supabase } from "../lib/supabase";

// Used only if vehicle_locations is empty/unreachable (e.g. before the
// first cron run, or a connectivity issue) — the real, shared positions
// come from the database now, computed server-side by
// simulate_vehicle_positions() every minute.
const FALLBACK_ROUTES = {
  "OSU-001": {
    label: "Shashamane \u2192 Adama",
    path: [{ lat: 7.2, lng: 38.6 }, { lat: 7.85, lng: 39.0 }, { lat: 8.54, lng: 39.27 }],
  },
  "OSU-002": {
    label: "Adama \u2192 Addis Ababa",
    path: [{ lat: 8.54, lng: 39.27 }, { lat: 8.8, lng: 39.0 }, { lat: 9.03, lng: 38.74 }],
  },
  "OSU-003": {
    label: "Shashamane \u2192 Jimma",
    path: [{ lat: 7.2, lng: 38.6 }, { lat: 7.4, lng: 38.2 }, { lat: 7.67, lng: 36.83 }],
  },
};

const lerp = (a, b, t) => a + (b - a) * t;
const interpolatePath = (path, t) => {
  const segments = path.length - 1;
  const scaled = t * segments;
  const i = Math.min(Math.floor(scaled), segments - 1);
  const localT = scaled - i;
  return { lat: lerp(path[i].lat, path[i + 1].lat, localT), lng: lerp(path[i].lng, path[i + 1].lng, localT) };
};
const getSimulatedT = (periodMs) => {
  const elapsed = Date.now() % (periodMs * 2);
  return elapsed <= periodMs ? elapsed / periodMs : 2 - elapsed / periodMs;
};

const getFallbackPositions = () =>
  Object.entries(FALLBACK_ROUTES).map(([plateNumber, route], idx) => {
    const t = getSimulatedT(90000 + idx * 15000);
    const position = interpolatePath(route.path, t);
    return {
      plateNumber,
      routeLabel: route.label,
      lat: position.lat,
      lng: position.lng,
      speed: 35 + Math.round(Math.abs(Math.sin(Date.now() / 4000 + idx)) * 40),
      direction: t < 1 ? "outbound" : "returning",
      source: "simulated",
      updatedAt: new Date().toISOString(),
    };
  });

/**
 * Fetch current vehicle positions from the shared vehicle_locations
 * table (kept fresh server-side by a scheduled Postgres function).
 * Falls back to a locally-simulated position (flagged) if the table
 * is empty or unreachable.
 * Returns: { data: VehiclePosition[], usingSimulatedData: boolean }
 */
export const getVehiclePositions = async () => {
  const { data, error } = await supabase
    .from("vehicle_locations")
    .select("route_label, lat, lng, speed, direction, heading, source, updated_at, vehicles(plate_number)");

  if (error || !data || data.length === 0) {
    if (error) console.error("Error fetching vehicle locations:", error);
    return { data: getFallbackPositions(), usingSimulatedData: true };
  }

  return {
    data: data.map((row) => ({
      plateNumber: row.vehicles?.plate_number ?? "Unknown",
      routeLabel: row.route_label,
      lat: Number(row.lat),
      lng: Number(row.lng),
      speed: Number(row.speed),
      direction: row.direction,
      heading: row.heading != null ? Number(row.heading) : null,
      // 'device' once a real GPS unit is registered and reporting for
      // this vehicle; 'simulated' otherwise (the demo cron job) — see
      // 041_gps_device_infrastructure.sql.
      source: row.source || "simulated",
      updatedAt: row.updated_at,
    })),
    usingSimulatedData: false,
  };
};