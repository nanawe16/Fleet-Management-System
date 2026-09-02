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
import { Assignment, HourglassEmpty, CheckCircleOutline, HighlightOff } from "@mui/icons-material";
import DashboardLayout from "../../Layouts/DashboardLayout";
import StatCard from "../../components/dashboard/StatCard";
import { getRequests } from "../../services/requestService";
import { getCurrentUser } from "../../services/authService";

const PENDING_STATUSES = ["SUBMITTED", "DEPARTMENT_APPROVED", "TRANSPORT_APPROVED"];
const IN_PROGRESS_STATUSES = ["ALLOCATED", "IN_PROGRESS"];

const statusColor = (status) => {
  if (status === "DRAFT") return "default";
  if (status === "REJECTED") return "error";
  if (status === "COMPLETED") return "success";
  if (IN_PROGRESS_STATUSES.includes(status)) return "info";
  return "warning";
};

// RLS scopes getRequests() to this account's own rows once role is
// 'requester' (035_requester_role.sql) — no separate "my requests"
// query needed, this is already the full and only list they can see.
const RequesterDashboard = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const user = getCurrentUser();

  useEffect(() => {
    const load = async () => {
      const { data, usingMockData } = await getRequests();
      setRequests(data);
      setNotice(usingMockData ? "Couldn't load your requests — showing nothing until this is fixed." : "");
      setLoading(false);
    };
    load();
  }, []);

  const draftCount = requests.filter((r) => r.status === "DRAFT").length;
  const pendingCount = requests.filter((r) => PENDING_STATUSES.includes(r.status)).length;
  const approvedCount = requests.filter(
    (r) => IN_PROGRESS_STATUSES.includes(r.status) || r.status === "COMPLETED"
  ).length;
  const rejectedCount = requests.filter((r) => r.status === "REJECTED").length;

  const recentRequests = [...requests]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  return (
    <DashboardLayout>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4 }}>
        <Box>
          <Typography variant="h4">My Dashboard</Typography>
          <Typography color="text.secondary">Welcome back, {user?.name || "Requester"}.</Typography>
        </Box>
        <Button component={Link} to="/requests" variant="contained" startIcon={<Assignment />}>
          New Request
        </Button>
      </Box>

      {notice && <Alert severity="info" sx={{ mb: 3 }}>{notice}</Alert>}

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(4, 1fr)" }, gap: 3, mb: 4 }}>
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} variant="rounded" height={110} />)
        ) : (
          <>
            <StatCard title="Drafts" value={draftCount} icon={<Assignment />} color="#616161" />
            <StatCard title="Awaiting Approval" value={pendingCount} icon={<HourglassEmpty />} color="#ef6c00" />
            <StatCard title="Approved" value={approvedCount} icon={<CheckCircleOutline />} color="#2e7d32" />
            <StatCard title="Rejected" value={rejectedCount} icon={<HighlightOff />} color="#c62828" />
          </>
        )}
      </Box>

      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
          My recent requests
        </Typography>
        {loading ? (
          <Skeleton variant="rounded" height={180} />
        ) : requests.length === 0 ? (
          <Typography color="text.secondary">
            You haven't submitted any transport requests yet — use "New Request" to get started.
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            {recentRequests.map((request) => (
              <Box
                key={request.id}
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
                  <Typography fontWeight={600}>{request.destination}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {request.date}
                    {request.rejectionReason ? ` · ${request.rejectionReason}` : ""}
                  </Typography>
                </Box>
                <Chip size="small" label={request.status.replace(/_/g, " ")} color={statusColor(request.status)} />
              </Box>
            ))}
          </Stack>
        )}
      </Paper>
    </DashboardLayout>
  );
};

export default RequesterDashboard;