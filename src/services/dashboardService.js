import { supabase } from "../lib/supabase";

const MOCK_STATS = { vehicleCount: 45, driverCount: 32, activeTrips: 18, pendingRequests: 7 };
const MOCK_TRIP_TREND = [
  { day: "Mon", trips: 12 }, { day: "Tue", trips: 18 }, { day: "Wed", trips: 15 },
  { day: "Thu", trips: 22 }, { day: "Fri", trips: 19 }, { day: "Sat", trips: 9 }, { day: "Sun", trips: 6 },
];
const MOCK_FUEL_USAGE = [
  { month: "Feb", liters: 1200 }, { month: "Mar", liters: 1450 }, { month: "Apr", liters: 1100 },
  { month: "May", liters: 1600 }, { month: "Jun", liters: 1380 }, { month: "Jul", liters: 1520 },
];
const MOCK_VEHICLE_STATUS = [
  { status: "Active", count: 32 }, { status: "Maintenance", count: 8 }, { status: "Idle", count: 5 },
];
const MOCK_ACTIVITY = [
  { id: 1, type: "maintenance", message: "Vehicle OSU-014 due for service", timeAgo: "2h ago", urgent: true },
];

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const timeAgo = (iso) => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

/**
 * Aggregates dashboard stats, trends, and recent activity from several
 * tables. Falls back to mock data (flagged) if any query fails.
 * Returns: { stats, tripTrend, fuelUsage, vehicleStatus, activity, usingMockData }
 */
export const getDashboardData = async () => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    const sixMonthsAgoStr = sixMonthsAgo.toISOString().split("T")[0];

    const [
      vehiclesRes,
      driversRes,
      activeTripsRes,
      pendingRequestsRes,
      tripTrendRes,
      fuelUsageRes,
      vehicleStatusRes,
      recentMaintenanceRes,
      recentFuelRes,
      recentAccidentsRes,
    ] = await Promise.all([
      supabase.from("vehicles").select("id", { count: "exact", head: true }),
      supabase.from("drivers").select("id", { count: "exact", head: true }),
      supabase.from("trips").select("id", { count: "exact", head: true }).eq("status", "Ongoing"),
      supabase.from("transport_requests").select("id", { count: "exact", head: true }).eq("status", "Pending"),
      supabase.from("trips").select("start_date").gte("start_date", sevenDaysAgoStr),
      supabase.from("fuel_records").select("record_date, liters").gte("record_date", sixMonthsAgoStr),
      supabase.from("vehicles").select("status"),
      supabase.from("maintenance_records").select("id, vehicle, service_type, status, created_at").order("created_at", { ascending: false }).limit(3),
      supabase.from("fuel_records").select("id, vehicle, created_at").order("created_at", { ascending: false }).limit(2),
      supabase.from("accident_reports").select("id, vehicle, severity, created_at").order("created_at", { ascending: false }).limit(2),
    ]);

    // trip trend: count trips per day of week over the last 7 days
    const tripCountByDay = {};
    (tripTrendRes.data || []).forEach((t) => {
      const day = DAY_LABELS[new Date(t.start_date).getDay()];
      tripCountByDay[day] = (tripCountByDay[day] || 0) + 1;
    });
    const tripTrend = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const label = DAY_LABELS[d.getDay()];
      tripTrend.push({ day: label, trips: tripCountByDay[label] || 0 });
    }

    // fuel usage: sum liters per month over the last 6 months
    const litersByMonth = {};
    (fuelUsageRes.data || []).forEach((r) => {
      const d = new Date(r.record_date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      litersByMonth[key] = (litersByMonth[key] || 0) + Number(r.liters);
    });
    const fuelUsage = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      fuelUsage.push({ month: MONTH_LABELS[d.getMonth()], liters: Math.round(litersByMonth[key] || 0) });
    }

    // vehicle status breakdown
    const statusCounts = {};
    (vehicleStatusRes.data || []).forEach((v) => {
      statusCounts[v.status] = (statusCounts[v.status] || 0) + 1;
    });
    const vehicleStatus = Object.entries(statusCounts).map(([status, count]) => ({ status, count }));

    // recent activity: merge maintenance/fuel/accident events, newest first
    const activity = [
      ...(recentMaintenanceRes.data || []).map((r) => ({
        id: `maint-${r.id}`,
        type: "maintenance",
        message: `${r.vehicle}: ${r.service_type} (${r.status})`,
        timeAgo: timeAgo(r.created_at),
        urgent: r.status === "Scheduled",
        createdAt: r.created_at,
      })),
      ...(recentFuelRes.data || []).map((r) => ({
        id: `fuel-${r.id}`,
        type: "fuel",
        message: `Fuel log added for ${r.vehicle}`,
        timeAgo: timeAgo(r.created_at),
        urgent: false,
        createdAt: r.created_at,
      })),
      ...(recentAccidentsRes.data || []).map((r) => ({
        id: `accident-${r.id}`,
        type: "alert",
        message: `${r.severity} accident reported for ${r.vehicle}`,
        timeAgo: timeAgo(r.created_at),
        urgent: r.severity === "Severe",
        createdAt: r.created_at,
      })),
    ]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);

    return {
      stats: {
        vehicleCount: vehiclesRes.count ?? 0,
        driverCount: driversRes.count ?? 0,
        activeTrips: activeTripsRes.count ?? 0,
        pendingRequests: pendingRequestsRes.count ?? 0,
      },
      tripTrend,
      fuelUsage,
      vehicleStatus,
      activity,
      usingMockData: false,
    };
  } catch (err) {
    console.error("Error loading dashboard data:", err);
    return {
      stats: MOCK_STATS,
      tripTrend: MOCK_TRIP_TREND,
      fuelUsage: MOCK_FUEL_USAGE,
      vehicleStatus: MOCK_VEHICLE_STATUS,
      activity: MOCK_ACTIVITY,
      usingMockData: true,
    };
  }
};