import { useState, useEffect } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import SummaryCard from "../../components/reports/SummaryCard";
import FuelReport from "../../components/reports/FuelReport";
import MaintenanceReport from "../../components/reports/MaintenanceReport";
import RequestReport from "../../components/reports/RequestReport";
import { getSummary } from "../../services/reportService";
import { getCurrentUser } from "../../services/authService";
import { reportSections } from "../../config/permissions";
import {
  Typography,
  Grid,
  Tabs,
  Tab,
  Box,
  TextField,
  Button,
  Stack,
  Skeleton,
  Alert,
} from "@mui/material";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import LocalGasStationIcon from "@mui/icons-material/LocalGasStation";
import BuildIcon from "@mui/icons-material/Build";
import AssignmentIcon from "@mui/icons-material/Assignment";
import PrintIcon from "@mui/icons-material/Print";

const ICONS_BY_TITLE = {
  "Total Vehicles": <DirectionsCarIcon fontSize="inherit" />,
  "Pending Requests": <AssignmentIcon fontSize="inherit" />,
  "Fuel Cost (This Month)": <LocalGasStationIcon fontSize="inherit" />,
  "Maintenance Due": <BuildIcon fontSize="inherit" />,
};

const today = () => new Date().toISOString().split("T")[0];
const monthAgo = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().split("T")[0];
};

const Reports = () => {
  const [tab, setTab] = useState(0);
  const [summaryData, setSummaryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  const [startDate, setStartDate] = useState(monthAgo());
  const [endDate, setEndDate] = useState(today());
  const role = getCurrentUser()?.role;
  const canViewOperational = reportSections.operational.includes(role);
  const canViewFinancial = reportSections.financial.includes(role);
  const reportTabs = [
    ...(canViewFinancial ? [{ label: "Fuel", content: <FuelReport startDate={startDate} endDate={endDate} /> }] : []),
    ...(canViewOperational
      ? [
          { label: "Maintenance", content: <MaintenanceReport startDate={startDate} endDate={endDate} /> },
          { label: "Requests", content: <RequestReport startDate={startDate} endDate={endDate} /> },
        ]
      : []),
  ];

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const cards = await getSummary();
      setSummaryData(cards.map((c) => ({ ...c, icon: ICONS_BY_TITLE[c.title] ?? null })));
      setNotice("");
    } catch (err) {
      console.error("Error loading report summary:", err);
      setNotice("Couldn't load summary data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApplyRange = () => {
    fetchSummary();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <DashboardLayout>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={2}
        mb={3}
      >
        <Typography variant="h4">Reports</Typography>

        <Button variant="outlined" startIcon={<PrintIcon />} onClick={handlePrint}>
          Print
        </Button>
      </Stack>

      {notice && (
        <Alert severity="info" sx={{ mb: 3 }}>
          {notice}
        </Alert>
      )}

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center" mb={3}>
        <TextField
          label="From"
          type="date"
          size="small"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="To"
          type="date"
          size="small"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <Button variant="outlined" size="small" onClick={handleApplyRange}>
          Apply
        </Button>
      </Stack>

      <Grid container spacing={2} mb={4}>
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Grid item xs={12} sm={6} md={3} key={i}>
                <Skeleton variant="rounded" height={100} />
              </Grid>
            ))
          : summaryData
            .filter((card) => canViewFinancial || card.title !== "Fuel Cost (This Month)")
            .map((card) => (
              <Grid item xs={12} sm={6} md={3} key={card.title}>
                <SummaryCard {...card} />
              </Grid>
            ))}
      </Grid>

      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          {reportTabs.map((item) => <Tab key={item.label} label={item.label} />)}
        </Tabs>
      </Box>

      {reportTabs[tab]?.content}
    </DashboardLayout>
  );
};

export default Reports;
