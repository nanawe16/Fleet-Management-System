import { supabase } from "../lib/supabase";
import { getCurrentUser } from "./authService";

// DB uses service_type/record_date; the app uses camelCase
// serviceType/date. Translated here so Maintenance.jsx /
// MaintenanceForm.jsx / MaintenanceTable.jsx need no changes beyond the
// new vehicleId/mechanicId/reportedByDriverId fields.
const toAppShape = (row) => ({
  id: row.id,
  vehicle: row.vehicle_record?.plate_number || row.vehicle || "",
  vehicleId: row.vehicle_id || "",
  // mechanicId comes straight from profiles, not a joined "record" alias
  // like vehicle/driver, since there's no separate mechanics table —
  // mechanicName is only populated when the join succeeds (i.e. the
  // record has a mechanic assigned).
  mechanicId: row.mechanic_id || "",
  mechanicName: row.mechanic_profile?.full_name || "",
  // Only set on records a Driver reported (025) — no form field for
  // this, it's derived from the logged-in driver at create time, same
  // as transport_requests.requested_by.
  reportedByDriverId: row.reported_by_driver_id || "",
  reportedByDriverName: row.reporting_driver?.name || "",
  serviceType: row.service_type,
  description: row.description,
  cost: row.cost,
  date: row.record_date,
  status: row.status,
});

const toDbShape = (record) => ({
  vehicle: record.vehicle,
  vehicle_id: record.vehicleId || null,
  mechanic_id: record.mechanicId || null,
  service_type: record.serviceType,
  description: record.description,
  cost: record.cost,
  record_date: record.date,
  status: record.status,
  // reported_by_driver_id deliberately excluded here — it's never set
  // via a form field. createMaintenanceRecord sets it separately, only
  // when the logged-in user is a Driver, and it should never change on
  // update.
});

/**
 * Fetch all maintenance records.
 * Returns: { data: MaintenanceRecord[], usingMockData: boolean }
 */
export const getMaintenanceRecords = async () => {
  const { data, error } = await supabase
    .from("maintenance_records")
    .select(
      "*, vehicle_record:vehicles!maintenance_records_vehicle_id_fkey(id, plate_number), mechanic_profile:profiles!maintenance_records_mechanic_id_fkey(id, full_name), reporting_driver:drivers!reported_by_driver_id(id, name)"
    )
    .order("record_date", { ascending: false });

  if (error) {
    console.error("Error fetching maintenance records:", error);
    return { data: [], usingMockData: true };
  }

  return { data: data.map(toAppShape), usingMockData: false };
};

export const createMaintenanceRecord = async (record) => {
  const payload = toDbShape(record);

  // A Driver reporting a problem has no picker for this — attribute it
  // to their own driver record automatically, same reasoning as
  // requestService.js auto-setting requested_by. Admin/Transport
  // Manager scheduling maintenance leave this null (not a driver report).
  if (getCurrentUser()?.role === "driver") {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    const { data: driverRow, error: driverError } = await supabase
      .from("drivers")
      .select("id")
      .eq("profile_id", authData.user?.id)
      .single();
    if (driverError) throw driverError;

    payload.reported_by_driver_id = driverRow.id;
  }

  const { data, error } = await supabase
    .from("maintenance_records")
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return toAppShape(data);
};

export const updateMaintenanceRecord = async (id, record) => {
  const { data, error } = await supabase
    .from("maintenance_records")
    .update(toDbShape(record))
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return toAppShape(data);
};

export const deleteMaintenanceRecord = async (id) => {
  const { error } = await supabase.from("maintenance_records").delete().eq("id", id);
  if (error) throw error;
};