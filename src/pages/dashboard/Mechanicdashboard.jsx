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
import { DirectionsCarFilled, Build, Warning, Inventory2 } from "@mui/icons-material";
import DashboardLayout from "../../layouts/DashboardLayout";
import StatCard from "../../components/dashboard/StatCard";
import { getVehicles } from "../../services/vehicleService";
import { getMaintenanceRecords } from "../../services/maintenanceService";
import { getCurrentUser } from "../../services/authService";

// Matrix: Mechanic dashboard is "V Maint." — maintenance-focused, not
// the full-fleet admin view. getVehicles()/getMaintenanceRecords() are
// already RLS-scoped to this mechanic (030 for vehicles, 022 for
// maintenance_records), so no extra filtering is needed here — same
// pattern as DriverDashboard.
const MechanicDashboard = () => {
  const [vehicles, setVehicles] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const user = getCurrentUser();

  useEffect(() => {
    const load = async () => {
      const [
        { data: vehicleData, usingMockData: vehiclesUnavailable },
        { data: jobData, usingMockData: jobsUnavailable },
      ] = await Promise.all([getVehicles(), getMaintenanceRecords()]);
      setVehicles(vehicleData);
      setJobs(jobData);
      setNotice(
        vehiclesUnavailable || jobsUnavailable
          ? "Some of your live dashboard data could not be loaded."
          : ""
      );
      setLoading(false);
    };
    load();
  }, []);

  const openJobs = jobs.filter((j) => j.status !== "Completed" && j.status !== "Overdue");
  const overdueJobs = jobs.filter((j) => j.status === "Overdue");

  return (
    <DashboardLayout>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4 }}>
        <Box>
          <Typography variant="h4">My Dashboard</Typography>
          <Typography color="text.secondary">Welcome back, {user?.name || "Mechanic"}.</Typography>
        </Box>
        <Button component={Link} to="/maintenance" variant="outlined" startIcon={<Build />}>
          My Jobs
        </Button>
      </Box>

      {notice && <Alert severity="info" sx={{ mb: 3 }}>{notice}</Alert>}

      {overdueJobs.length > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          {overdueJobs.length} maintenance {overdueJobs.length === 1 ? "job is" : "jobs are"} overdue.
        </Alert>
      )}

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(3, 1fr)" }, gap: 3, mb: 4 }}>
        {loading ? (
          Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} variant="rounded" height={110} />)
        ) : (
          <>
            <StatCard title="Assigned Vehicles" value={vehicles.length} icon={<DirectionsCarFilled />} color="#1976d2" />
            <StatCard title="Open Jobs" value={openJobs.length} icon={<Build />} color="#ef6c00" />
            <StatCard title="Overdue Jobs" value={overdueJobs.length} icon={<Warning />} color="#d32f2f" />
          </>
        )}
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "2fr 1fr" }, gap: 3 }}>
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>My maintenance jobs</Typography>
          {loading ? (
            <Skeleton variant="rounded" height={180} />
          ) : jobs.length === 0 ? (
            <Typography color="text.secondary">You have no assigned maintenance jobs yet.</Typography>
          ) : (
            <Stack spacing={1.5}>
              {jobs.slice(0, 5).map((job) => (
                <Box
                  key={job.id}
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
                    <Typography fontWeight={600}>{job.serviceType}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {job.date} · {job.vehicle}
                    </Typography>
                  </Box>
                  <Chip
                    size="small"
                    label={job.status}
                    color={job.status === "Overdue" ? "error" : job.status === "Completed" ? "success" : "default"}
                  />
                </Box>
              ))}
            </Stack>
          )}
        </Paper>

        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>Quick actions</Typography>
          <Stack spacing={1.5}>
            <Button component={Link} to="/maintenance" variant="outlined" startIcon={<Build />}>
              Add maintenance record
            </Button>
            <Button component={Link} to="/inventory" variant="outlined" startIcon={<Inventory2 />}>
              Manage inventory
            </Button>
          </Stack>
        </Paper>
      </Box>
    </DashboardLayout>
  );
};

export default MechanicDashboard;