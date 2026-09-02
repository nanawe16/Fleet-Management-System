import { supabase } from "../lib/supabase";

// DB uses record_date (avoiding "date" as a bare column name) and
// fuel_type; the app uses camelCase date/fuelType. Translated here so
// Fuel.jsx / FuelForm.jsx / FuelTable.jsx need no changes beyond the new
// vehicleId/driverId fields.
const toAppShape = (row) => ({
  id: row.id,
  // Names remain part of the app shape for existing tables/search, while
  // IDs are the source of truth for all new and edited records. Falls
  // back to the old free-text column for pre-020 rows that didn't
  // backfill (see 020's verify queries).
  vehicle: row.vehicle_record?.plate_number || row.vehicle || "",
  vehicleId: row.vehicle_id || "",
  driver: row.driver_record?.name || row.driver || "",
  driverId: row.driver_id || "",
  fuelType: row.fuel_type,
  liters: row.liters,
  cost: row.cost,
  date: row.record_date,
  status: row.status,
  rejectionReason: row.rejection_reason,
});

const toDbShape = (record) => ({
  vehicle: record.vehicle,
  vehicle_id: record.vehicleId || null,
  driver: record.driver,
  driver_id: record.driverId || null,
  fuel_type: record.fuelType,
  liters: record.liters,
  cost: record.cost,
  record_date: record.date,
});

/**
 * Fetch all fuel records.
 * Returns: { data: FuelRecord[], usingMockData: boolean }
 */
export const getFuelRecords = async () => {
  const { data, error } = await supabase
    .from("fuel_records")
    .select("*, vehicle_record:vehicles!fuel_records_vehicle_id_fkey(id, plate_number), driver_record:drivers!fuel_records_driver_id_fkey(id, name)")
    .order("record_date", { ascending: false });

  if (error) {
    console.error("Error fetching fuel records:", error);
    return { data: [], usingMockData: true };
  }

  return { data: data.map(toAppShape), usingMockData: false };
};

export const createFuelRecord = async (record) => {
  const { data, error } = await supabase
    .from("fuel_records")
    .insert(toDbShape(record))
    .select()
    .single();

  if (error) throw error;
  return toAppShape(data);
};

export const updateFuelRecord = async (id, record) => {
  const { data, error } = await supabase
    .from("fuel_records")
    .update(toDbShape(record))
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return toAppShape(data);
};

export const deleteFuelRecord = async (id) => {
  const { error } = await supabase.from("fuel_records").delete().eq("id", id);
  if (error) throw error;
};

/**
 * Finance verifies a pending fuel record. Kept as its own function
 * (rather than routed through updateFuelRecord) since verification is a
 * distinct workflow action with its own permission — mirrors
 * approveRequest/rejectRequest in requestService.js. Not yet wired to
 * any UI; Fuel.jsx doesn't call this yet.
 */
export const verifyFuelRecord = async (id) => {
  const { data, error } = await supabase
    .from("fuel_records")
    .update({ status: "Verified", rejection_reason: null })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return toAppShape(data);
};

export const rejectFuelRecord = async (id, reason = "") => {
  const { data, error } = await supabase
    .from("fuel_records")
    .update({ status: "Rejected", rejection_reason: reason || null })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return toAppShape(data);
};