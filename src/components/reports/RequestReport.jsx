import { useState, useEffect } from "react";
import { Card, CardContent, Typography, Grid, Skeleton, Alert } from "@mui/material";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { getRequestReport } from "../../services/reportService";

// Updated for the Phase 4 workflow states (was Approved/Pending/
// Rejected, which reportService.getRequestReport no longer returns).
const STATUS_COLORS = {
  Submitted: "#ed6c02",
  "Department Approved": "#f9a825",
  "Transport Approved": "#0288d1",
  Allocated: "#5e35b1",
  "In Progress": "#1976d2",
  Completed: "#2e7d32",
  Rejected: "#d32f2f",
};

const RequestReport = ({ startDate, endDate }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const rows = await getRequestReport(startDate, endDate);
        setData(rows);
        setNotice("");
      } catch (err) {
        console.error("Error loading request report:", err);
        setNotice("Couldn't load request data for this range.");
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate]);

  const total = data.reduce((sum, entry) => sum + entry.value, 0);

  return (
    <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
      <CardContent>
        <Typography variant="h6" mb={2}>
          Transport Request Status
        </Typography>

        {notice && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {notice}
          </Alert>
        )}

        {loading ? (
          <Skeleton variant="rounded" height={320} />
        ) : total === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No transport requests in this date range.
          </Typography>
        ) : (
          <Grid container justifyContent="center">
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={110} label>
                  {data.map((entry) => (
                    <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || "#9e9e9e"} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Grid>
        )}
      </CardContent>
    </Card>
  );
};

export default RequestReport;