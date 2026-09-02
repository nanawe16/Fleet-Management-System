import { useState, useEffect } from "react";
import DashboardLayout from "../../Layouts/DashboardLayout";
import StatCard from "../../components/dashboard/StatCard";
import { getDashboardData } from "../../services/dashboardService";
import { getCurrentUser } from "../../services/authService";
import DriverDashboard from "./DriverDashboard";
import MechanicDashboard from "./MechanicDashboard";
import FinanceDashboard from "./FinanceDashboard";
import RequesterDashboard from "./RequesterDashboard";
import {
  Typography,
  Box,
  Paper,
  Skeleton,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Divider,
} from "@mui/material";
import {
  DirectionsCarFilled,
  PersonOutline,
  AltRoute,
  PendingActions,
  Build,
  LocalGasStation,
  Warning,
} from "@mui/icons-material";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const REFRESH_INTERVAL = 60000;
const STATUS_COLORS = { Available: "#2e7d32", "On Trip": "#1976d2", Maintenance: "#ef6c00" };

const Dashboard = () => {
  const isDriver = getCurrentUser()?.role === "driver";
  const isMechanic = getCurrentUser()?.role === "mechanic";
  const isFinance = getCurrentUser()?.role === "finance_officer";
  const isRequester = getCurrentUser()?.role === "requester";
  const [stats, setStats] = useState(null);
  const [tripTrend, setTripTrend] = useState([]);
  const [fuelUsage, setFuelUsage] = useState([]);
  const [vehicleStatus, setVehicleStatus] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  const loadDashboard = async () => {
    const result = await getDashboardData();
    setStats(result.stats);
    setTripTrend(result.tripTrend);
    setFuelUsage(result.fuelUsage);
    setVehicleStatus(result.vehicleStatus);
    setActivity(result.activity);
    setNotice(result.usingMockData ? "Couldn't load live data — showing sample data." : "");
    setLoading(false);
  };

  useEffect(() => {
    loadDashboard();
    const interval = setInterval(loadDashboard, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  if (isDriver) return <DriverDashboard />;
  if (isMechanic) return <MechanicDashboard />;
  if (isFinance) return <FinanceDashboard />;
  if (isRequester) return <RequesterDashboard />;

  return (
    <DashboardLayout>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4 }}>
        <Typography variant="h4">Dashboard</Typography>
        <Typography variant="body2" color="text.secondary">
          Updated {new Date().toLocaleTimeString()}
        </Typography>
      </Box>

      {notice && (
        <Alert severity="info" sx={{ mb: 3 }}>
          {notice}
        </Alert>
      )}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr 1fr" },
          gap: 3,
          mb: 4,
        }}
      >
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} variant="rounded" height={110} />)
        ) : (
          <>
            <StatCard title="Vehicles" value={stats.vehicleCount} icon={<DirectionsCarFilled />} color="#1976d2" />
            <StatCard title="Drivers" value={stats.driverCount} icon={<PersonOutline />} color="#2e7d32" />
            <StatCard title="Active Trips" value={stats.activeTrips} icon={<AltRoute />} color="#ef6c00" />
            <StatCard title="Pending Requests" value={stats.pendingRequests} icon={<PendingActions />} color="#d32f2f" />
          </>
        )}
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "2fr 1fr" }, gap: 3, mb: 4 }}>
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
            Trips — Last 7 Days
          </Typography>
          {loading ? (
            <Skeleton variant="rounded" height={260} />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={tripTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="trips" stroke="#1976d2" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Paper>

        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
            Vehicle Status
          </Typography>
          {loading ? (
            <Skeleton variant="rounded" height={260} />
          ) : vehicleStatus.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No vehicles yet.
            </Typography>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={vehicleStatus} dataKey="count" nameKey="status" innerRadius={55} outerRadius={90} paddingAngle={3}>
                  {vehicleStatus.map((entry) => (
                    <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || "#9e9e9e"} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Paper>
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "2fr 1fr" }, gap: 3 }}>
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
            Fuel Consumption — Last 6 Months (liters)
          </Typography>
          {loading ? (
            <Skeleton variant="rounded" height={260} />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={fuelUsage}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="liters" fill="#ef6c00" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Paper>

        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
            Recent Activity
          </Typography>
          {loading ? (
            <Skeleton variant="rounded" height={260} />
          ) : (
            <List dense>
              {activity.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  No recent activity.
                </Typography>
              )}
              {activity.map((item, idx) => (
                <Box key={item.id}>
                  <ListItem disableGutters>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      {item.type === "maintenance" && <Build fontSize="small" color="warning" />}
                      {item.type === "fuel" && <LocalGasStation fontSize="small" color="primary" />}
                      {item.type === "alert" && <Warning fontSize="small" color="error" />}
                    </ListItemIcon>
                    <ListItemText
                      primary={item.message}
                      secondary={item.timeAgo}
                      primaryTypographyProps={{ variant: "body2" }}
                      secondaryTypographyProps={{ variant: "caption" }}
                    />
                    {item.urgent && <Chip label="Urgent" size="small" color="error" />}
                  </ListItem>
                  {idx < activity.length - 1 && <Divider component="li" />}
                </Box>
              ))}
            </List>
          )}
        </Paper>
      </Box>
    </DashboardLayout>
  );
};

export default Dashboard;