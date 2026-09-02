import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import { LocalGasStation, Build, Assessment, HourglassTop } from "@mui/icons-material";
import DashboardLayout from "../../layouts/DashboardLayout";
import StatCard from "../../components/dashboard/StatCard";
import { getFuelRecords } from "../../services/fuelService";
import { getMaintenanceRecords } from "../../services/maintenanceService";
import { getCurrentUser } from "../../services/authService";

// Matrix: Finance Officer dashboard is "V Financial" — spend and
// approvals, not the full operational picture (trip volume, vehicle
// status breakdown, driver counts, etc. belong to Admin/Transport
// Manager's dashboard, not this one). getFuelRecords() and
// getMaintenanceRecords() are already RLS-scoped to read-all for
// finance_officer, so no extra filtering is needed to fetch them —
// the filtering here is about which numbers to surface, not row access.
const FinanceDashboard = () => {
  const [fuelRecords, setFuelRecords] = useState([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const user = getCurrentUser();

  useEffect(() => {
    const load = async () => {
      const [
        { data: fuelData, usingMockData: fuelUnavailable },
        { data: maintenanceData, usingMockData: maintenanceUnavailable },
      ] = await Promise.all([getFuelRecords(), getMaintenanceRecords()]);
      setFuelRecords(fuelData);
      setMaintenanceRecords(maintenanceData);
      setNotice(
        fuelUnavailable || maintenanceUnavailable
          ? "Some of your live dashboard data could not be loaded."
          : ""
      );
      setLoading(false);
    };
    load();
  }, []);

  const isThisMonth = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  };

  const fuelCostThisMonth = fuelRecords
    .filter((r) => isThisMonth(r.date) && r.status !== "Rejected")
    .reduce((sum, r) => sum + (Number(r.cost) || 0), 0);

  const pendingFuelApprovals = fuelRecords.filter((r) => r.status === "Pending");

  const maintenanceCostThisMonth = maintenanceRecords
    .filter((r) => isThisMonth(r.date))
    .reduce((sum, r) => sum + (Number(r.cost) || 0), 0);

  const recentFuel = fuelRecords.slice(0, 5);

  return (
    <DashboardLayout>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4 }}>
        <Box>
          <Typography variant="h4">My Dashboard</Typography>
          <Typography color="text.secondary">Welcome back, {user?.name || "Finance Officer"}.</Typography>
        </Box>
        <Button component={Link} to="/reports" variant="outlined" startIcon={<Assessment />}>
          Financial Reports
        </Button>
      </Box>

      {notice && <Alert severity="info" sx={{ mb: 3 }}>{notice}</Alert>}

      {pendingFuelApprovals.length > 0 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          {pendingFuelApprovals.length} fuel {pendingFuelApprovals.length === 1 ? "record is" : "records are"} waiting on your approval.
        </Alert>
      )}

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(3, 1fr)" }, gap: 3, mb: 4 }}>
        {loading ? (
          Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} variant="rounded" height={110} />)
        ) : (
          <>
            <StatCard title="Fuel Cost (This Month)" value={`ETB ${fuelCostThisMonth.toLocaleString()}`} icon={<LocalGasStation />} color="#2e7d32" />
            <StatCard title="Maintenance Cost (This Month)" value={`ETB ${maintenanceCostThisMonth.toLocaleString()}`} icon={<Build />} color="#ef6c00" />
            <StatCard title="Pending Fuel Approvals" value={pendingFuelApprovals.length} icon={<HourglassTop />} color="#d32f2f" />
          </>
        )}
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "2fr 1fr" }, gap: 3 }}>
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>Recent fuel records</Typography>
          {loading ? (
            <Skeleton variant="rounded" height={180} />
          ) : recentFuel.length === 0 ? (
            <Typography color="text.secondary">No fuel records yet.</Typography>
          ) : (
            <Stack spacing={1.5}>
              {recentFuel.map((record) => (
                <Box
                  key={record.id}
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 2,
                    alignItems: "center",
                    py: 1,
                    borderBottom: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Box>
                    <Typography fontWeight={600}>{record.vehicle} · ETB {record.cost}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {record.date} · {record.driver}
                    </Typography>
                  </Box>
                  <Chip
                    size="small"
                    label={record.status}
                    color={record.status === "Verified" ? "success" : record.status === "Rejected" ? "error" : "default"}
                  />
                </Box>
              ))}
            </Stack>
          )}
        </Paper>

        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>Quick actions</Typography>
          <Stack spacing={1.5}>
            <Button component={Link} to="/fuel" variant="outlined" startIcon={<LocalGasStation />}>
              Review fuel records
            </Button>
            <Button component={Link} to="/reports" variant="outlined" startIcon={<Assessment />}>
              View reports
            </Button>
          </Stack>
        </Paper>
      </Box>
    </DashboardLayout>
  );
};

export default FinanceDashboard;