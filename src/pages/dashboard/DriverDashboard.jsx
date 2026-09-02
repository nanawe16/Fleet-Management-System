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
import { DirectionsCarFilled, LocalGasStation, AltRoute, Build } from "@mui/icons-material";
import DashboardLayout from "../../Layouts/DashboardLayout";
import StatCard from "../../components/dashboard/StatCard";
import { getTrips } from "../../services/tripService";
import { getVehicles } from "../../services/vehicleService";
import { getCurrentUser } from "../../services/authService";

const DriverDashboard = () => {
  const [trips, setTrips] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const user = getCurrentUser();

  useEffect(() => {
    const load = async () => {
      const [{ data: tripData, usingMockData: tripsUnavailable }, { data: vehicleData, usingMockData: vehiclesUnavailable }] =
        await Promise.all([getTrips(), getVehicles()]);
      setTrips(tripData);
      setVehicles(vehicleData);
      setNotice(tripsUnavailable || vehiclesUnavailable ? "Some of your live dashboard data could not be loaded." : "");
      setLoading(false);
    };
    load();
  }, []);

  const activeTrips = trips.filter((trip) => trip.status === "Ongoing");
  const upcomingTrips = trips.filter((trip) => trip.status === "Scheduled");
  const assignedVehicle = vehicles[0];

  return (
    <DashboardLayout>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4 }}>
        <Box>
          <Typography variant="h4">My Dashboard</Typography>
          <Typography color="text.secondary">Welcome back, {user?.name || "Driver"}.</Typography>
        </Box>
        <Button component={Link} to="/trips" variant="outlined" startIcon={<AltRoute />}>My Trips</Button>
      </Box>

      {notice && <Alert severity="info" sx={{ mb: 3 }}>{notice}</Alert>}

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(3, 1fr)" }, gap: 3, mb: 4 }}>
        {loading ? Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} variant="rounded" height={110} />) : <>
          <StatCard title="My Vehicle" value={assignedVehicle?.plateNumber || "Not assigned"} icon={<DirectionsCarFilled />} color="#1976d2" />
          <StatCard title="Active Trips" value={activeTrips.length} icon={<AltRoute />} color="#ef6c00" />
          <StatCard title="Upcoming Trips" value={upcomingTrips.length} icon={<AltRoute />} color="#2e7d32" />
        </>}
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "2fr 1fr" }, gap: 3 }}>
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>My trips</Typography>
          {loading ? <Skeleton variant="rounded" height={180} /> : trips.length === 0 ? (
            <Typography color="text.secondary">You have no assigned trips yet.</Typography>
          ) : (
            <Stack spacing={1.5}>
              {trips.slice(0, 5).map((trip) => (
                <Box key={trip.id} sx={{ display: "flex", justifyContent: "space-between", gap: 2, alignItems: "center", py: 1, borderBottom: "1px solid", borderColor: "divider" }}>
                  <Box><Typography fontWeight={600}>{trip.destination}</Typography><Typography variant="body2" color="text.secondary">{trip.startDate} · {trip.vehicle}</Typography></Box>
                  <Chip size="small" label={trip.status} color={trip.status === "Ongoing" ? "primary" : "default"} />
                </Box>
              ))}
            </Stack>
          )}
        </Paper>

        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>Quick actions</Typography>
          <Stack spacing={1.5}>
            <Button component={Link} to="/fuel" variant="outlined" startIcon={<LocalGasStation />}>Add fuel record</Button>
            <Button component={Link} to="/maintenance" variant="outlined" startIcon={<Build />}>Report maintenance</Button>
            <Button component={Link} to="/accidents" variant="outlined">Report accident</Button>
          </Stack>
        </Paper>
      </Box>
    </DashboardLayout>
  );
};

export default DriverDashboard;