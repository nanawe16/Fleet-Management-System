import { useState, useEffect } from "react";
import { Card, CardContent, Typography, Skeleton, Alert, ToggleButtonGroup, ToggleButton, Box } from "@mui/material";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { getFuelReport } from "../../services/reportService";

const FuelReport = ({ startDate, endDate }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [metric, setMetric] = useState("liters");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const rows = await getFuelReport(startDate, endDate);
        setData(rows);
        setNotice("");
      } catch (err) {
        console.error("Error loading fuel report:", err);
        setNotice("Couldn't load fuel data for this range.");
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate]);

  return (
    <Card sx={{ borderRadius: 3, boxShadow: 3, p: 2 }}>
      <CardContent>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Typography variant="h6">
            Fuel Consumption {metric === "liters" ? "(Liters)" : "(Cost)"}
          </Typography>

          <ToggleButtonGroup
            value={metric}
            exclusive
            size="small"
            onChange={(_, value) => value && setMetric(value)}
          >
            <ToggleButton value="liters">Liters</ToggleButton>
            <ToggleButton value="cost">Cost</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {notice && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {notice}
          </Alert>
        )}

        {loading ? (
          <Skeleton variant="rounded" height={320} />
        ) : data.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No fuel records in this date range.
          </Typography>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              {metric === "liters" ? (
                <Line type="monotone" dataKey="liters" name="Liters" stroke="#1976d2" strokeWidth={2} />
              ) : (
                <Line type="monotone" dataKey="cost" name="Cost (ETB)" stroke="#2e7d32" strokeWidth={2} />
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default FuelReport;