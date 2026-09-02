import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Skeleton,
  Alert,
  Stack,
} from "@mui/material";
import { getMaintenanceReport } from "../../services/reportService";

const statusColor = {
  Upcoming: "warning",
  Overdue: "error",
  Completed: "success",
};

const MaintenanceReport = ({ startDate, endDate }) => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const rows = await getMaintenanceReport(startDate, endDate);
        setRecords(rows);
        setNotice("");
      } catch (err) {
        console.error("Error loading maintenance report:", err);
        setNotice("Couldn't load maintenance data for this range.");
        setRecords([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate]);

  return (
    <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
      <CardContent>
        <Typography variant="h6" mb={2}>
          Maintenance Schedule
        </Typography>

        {notice && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {notice}
          </Alert>
        )}

        {loading ? (
          <Stack spacing={1}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} variant="rounded" height={40} />
            ))}
          </Stack>
        ) : records.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No maintenance records in this date range.
          </Typography>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Vehicle</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Due Date</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {records.map((row, i) => (
                <TableRow key={i}>
                  <TableCell>{row.vehicle}</TableCell>
                  <TableCell>{row.type}</TableCell>
                  <TableCell>{row.dueDate}</TableCell>
                  <TableCell>
                    <Chip label={row.status} color={statusColor[row.status] || "default"} size="small" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default MaintenanceReport;