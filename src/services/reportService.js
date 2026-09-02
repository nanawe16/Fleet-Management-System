import { supabase } from "../lib/supabase";

const monthKey = (dateStr) => {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${d.getMonth()}`;
};
const monthLabel = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleString("en-US", { month: "short" });
};

/**
 * Summary cards for the top of the Reports page.
 * "Pending Requests" and "Maintenance Due" reflect current counts
 * (not date-range filtered); "Fuel Cost" is scoped to the current
 * calendar month, matching the original card's label.
 */
export const getSummary = async () => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];

  const [vehiclesRes, pendingRes, maintenanceDueRes, fuelThisMonthRes] = await Promise.all([
    supabase.from("vehicles").select("id", { count: "exact", head: true }),
    // "Pending" here means any request still awaiting a decision, i.e.
    // not yet at a terminal status (COMPLETED/REJECTED) and not yet
    // ALLOCATED/IN_PROGRESS (already actioned) — SUBMITTED,
    // DEPARTMENT_APPROVED, and TRANSPORT_APPROVED are the "awaiting
    // someone's decision" states post-Phase-4.
    supabase
      .from("transport_requests")
      .select("id", { count: "exact", head: true })
      .in("status", ["SUBMITTED", "DEPARTMENT_APPROVED", "TRANSPORT_APPROVED"]),
    supabase.from("maintenance_records").select("id", { count: "exact", head: true }).eq("status", "Scheduled"),
    supabase.from("fuel_records").select("cost").gte("record_date", monthStart),
  ]);

  const fuelCostThisMonth = (fuelThisMonthRes.data || []).reduce((sum, r) => sum + Number(r.cost), 0);

  return [
    { title: "Total Vehicles", value: vehiclesRes.count ?? 0, color: "#1976d2" },
    { title: "Pending Requests", value: pendingRes.count ?? 0, color: "#ed6c02" },
    { title: "Fuel Cost (This Month)", value: `ETB ${fuelCostThisMonth.toLocaleString()}`, color: "#2e7d32" },
    { title: "Maintenance Due", value: maintenanceDueRes.count ?? 0, color: "#d32f2f" },
  ];
};

/**
 * Fuel usage grouped by month within [startDate, endDate].
 * Returns [{ month, liters, cost }, ...] sorted chronologically.
 */
export const getFuelReport = async (startDate, endDate) => {
  const { data, error } = await supabase
    .from("fuel_records")
    .select("record_date, liters, cost")
    .gte("record_date", startDate)
    .lte("record_date", endDate)
    .order("record_date", { ascending: true });

  if (error) throw error;

  const grouped = {};
  (data || []).forEach((r) => {
    const key = monthKey(r.record_date);
    if (!grouped[key]) grouped[key] = { month: monthLabel(r.record_date), liters: 0, cost: 0, sortKey: key };
    grouped[key].liters += Number(r.liters);
    grouped[key].cost += Number(r.cost);
  });

  return Object.values(grouped)
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
    .map(({ month, liters, cost }) => ({ month, liters: Math.round(liters), cost: Math.round(cost) }));
};

/**
 * Maintenance records within [startDate, endDate], with Scheduled
 * records reclassified as Upcoming or Overdue based on today's date —
 * matches the display logic Maintenance.jsx already uses.
 * Returns [{ vehicle, type, dueDate, status }, ...]
 */
export const getMaintenanceReport = async (startDate, endDate) => {
  const { data, error } = await supabase
    .from("maintenance_records")
    .select("vehicle, service_type, record_date, status")
    .gte("record_date", startDate)
    .lte("record_date", endDate)
    .order("record_date", { ascending: true });

  if (error) throw error;

  const today = new Date().toISOString().split("T")[0];

  return (data || []).map((r) => ({
    vehicle: r.vehicle,
    type: r.service_type,
    dueDate: r.record_date,
    status:
      r.status === "Completed" ? "Completed" : r.record_date < today ? "Overdue" : "Upcoming",
  }));
};

/**
 * Transport request counts by status within [startDate, endDate].
 * Returns [{ name, value }, ...] for the pie chart.
 */
export const getRequestReport = async (startDate, endDate) => {
  const { data, error } = await supabase
    .from("transport_requests")
    .select("status")
    .gte("request_date", startDate)
    .lte("request_date", endDate);

  if (error) throw error;

  // Updated for the Phase 4 workflow states (was Approved/Pending/
  // Rejected, which no longer exist as status values — every row was
  // silently falling through this count before).
  const counts = {
    Submitted: 0,
    "Department Approved": 0,
    "Transport Approved": 0,
    Allocated: 0,
    "In Progress": 0,
    Completed: 0,
    Rejected: 0,
  };
  const labelByStatus = {
    SUBMITTED: "Submitted",
    DEPARTMENT_APPROVED: "Department Approved",
    TRANSPORT_APPROVED: "Transport Approved",
    ALLOCATED: "Allocated",
    IN_PROGRESS: "In Progress",
    COMPLETED: "Completed",
    REJECTED: "Rejected",
  };
  (data || []).forEach((r) => {
    const label = labelByStatus[r.status];
    if (label) counts[label] += 1;
  });

  return Object.entries(counts).map(([name, value]) => ({ name, value }));
};