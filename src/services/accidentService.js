import { supabase } from "../lib/supabase";

// DB uses incident_date/estimated_cost; the app uses camelCase
// date/estimatedCost. Translated here so Accidents.jsx /
// AccidentForm.jsx / AccidentTable.jsx need no changes beyond the new
// vehicleId/driverId fields.
const toAppShape = (row) => ({
  id: row.id,
  vehicle: row.vehicle_record?.plate_number || row.vehicle || "",
  vehicleId: row.vehicle_id || "",
  driver: row.driver_record?.name || row.driver || "",
  driverId: row.driver_id || "",
  date: row.incident_date,
  location: row.location,
  description: row.description,
  severity: row.severity,
  estimatedCost: row.estimated_cost,
  status: row.status,
});

const toDbShape = (report) => ({
  vehicle: report.vehicle,
  vehicle_id: report.vehicleId || null,
  driver: report.driver,
  driver_id: report.driverId || null,
  incident_date: report.date,
  location: report.location,
  description: report.description,
  severity: report.severity,
  estimated_cost: report.estimatedCost || null,
  status: report.status,
});

/**
 * Fetch all accident reports.
 * Returns: { data: AccidentReport[], usingMockData: boolean }
 */
export const getAccidentReports = async () => {
  const { data, error } = await supabase
    .from("accident_reports")
    .select("*, vehicle_record:vehicles!accident_reports_vehicle_id_fkey(id, plate_number), driver_record:drivers!accident_reports_driver_id_fkey(id, name)")
    .order("incident_date", { ascending: false });

  if (error) {
    console.error("Error fetching accident reports:", error);
    return { data: [], usingMockData: true };
  }

  return { data: data.map(toAppShape), usingMockData: false };
};

export const createAccidentReport = async (report) => {
  const { data, error } = await supabase
    .from("accident_reports")
    .insert(toDbShape(report))
    .select()
    .single();

  if (error) throw error;
  return toAppShape(data);
};

export const updateAccidentReport = async (id, report) => {
  const { data, error } = await supabase
    .from("accident_reports")
    .update(toDbShape(report))
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return toAppShape(data);
};

export const deleteAccidentReport = async (id) => {
  const { error } = await supabase.from("accident_reports").delete().eq("id", id);
  if (error) throw error;
};