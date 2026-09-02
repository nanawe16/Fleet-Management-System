import { supabase } from "../lib/supabase";

// DB uses start_date/end_date; the app uses camelCase startDate/endDate.
// Translated here so Trips.jsx / TripForm.jsx / TripTable.jsx (and its
// double-booking conflict check, which runs on the app-shape objects
// this returns) need no changes.
const toAppShape = (row) => ({
  id: row.id,
  // Names remain part of the app shape for existing tables/search, while
  // IDs are the source of truth for all new and edited records.
  vehicle: row.vehicle_record?.plate_number || row.vehicle || "",
  vehicleId: row.vehicle_id || "",
  driver: row.driver_record?.name || row.driver || "",
  driverId: row.driver_id || "",
  destination: row.destination,
  startDate: row.start_date,
  endDate: row.end_date,
  status: row.status,
});

const toDbShape = (trip) => ({
  vehicle: trip.vehicle,
  vehicle_id: trip.vehicleId || null,
  driver: trip.driver,
  driver_id: trip.driverId || null,
  destination: trip.destination,
  start_date: trip.startDate,
  end_date: trip.endDate,
  status: trip.status,
});

/**
 * Fetch all trips.
 * Returns: { data: Trip[], usingMockData: boolean }
 */
export const getTrips = async () => {
  const { data, error } = await supabase
    .from("trips")
    .select("*, vehicle_record:vehicles!trips_vehicle_id_fkey(id, plate_number), driver_record:drivers!trips_driver_id_fkey(id, name)")
    .order("start_date", { ascending: false });

  if (error) {
    console.error("Error fetching trips:", error);
    return { data: [], usingMockData: true };
  }

  return { data: data.map(toAppShape), usingMockData: false };
};

export const createTrip = async (trip) => {
  const { data, error } = await supabase
    .from("trips")
    .insert(toDbShape(trip))
    .select()
    .single();

  if (error) throw error;
  return toAppShape(data);
};

export const updateTrip = async (id, trip) => {
  const { data, error } = await supabase
    .from("trips")
    .update(toDbShape(trip))
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return toAppShape(data);
};

export const deleteTrip = async (id) => {
  const { error } = await supabase.from("trips").delete().eq("id", id);
  if (error) throw error;
};