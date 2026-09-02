import {
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Box,
  Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CarCrashIcon from "@mui/icons-material/CarCrash";

const severityColor = { Minor: "warning", Moderate: "error", Severe: "error" };
const statusColor = { Reported: "info", "Under Review": "warning", Resolved: "success" };

// onEdit/onDelete are optional — Accidents.jsx omits them for the
// Driver role, since a Driver can only create/view their own reported
// accidents (matrix: "C Own" + view added in 025), never edit or delete.
const AccidentTable = ({ reports, onEdit, onDelete }) => {
  if (reports.length === 0) {
    return (
      <Paper sx={{ p: 5, textAlign: "center", borderRadius: 3 }}>
        <CarCrashIcon sx={{ fontSize: 40, color: "text.disabled", mb: 1 }} />
        <Typography variant="body1" color="text.secondary">
          No accident reports found.
        </Typography>
        <Typography variant="body2" color="text.disabled">
          Try adjusting your search or filter, or report a new incident.
        </Typography>
      </Paper>
    );
  }

  const showActions = onEdit || onDelete;

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Vehicle</TableCell>
            <TableCell>Driver</TableCell>
            <TableCell>Date</TableCell>
            <TableCell>Location</TableCell>
            <TableCell>Severity</TableCell>
            <TableCell align="right">Est. Cost</TableCell>
            <TableCell>Status</TableCell>
            {showActions && <TableCell align="right">Actions</TableCell>}
          </TableRow>
        </TableHead>

        <TableBody>
          {reports.map((report) => (
            <TableRow
              key={report.id}
              hover
              sx={
                report.severity === "Severe"
                  ? { bgcolor: "error.50", "&:hover": { bgcolor: "error.100" } }
                  : undefined
              }
            >
              <TableCell>{report.vehicle}</TableCell>
              <TableCell>{report.driver}</TableCell>
              <TableCell>{report.date}</TableCell>
              <TableCell>{report.location}</TableCell>
              <TableCell>
                <Chip label={report.severity} color={severityColor[report.severity]} size="small" />
              </TableCell>
              <TableCell align="right">
                {report.estimatedCost ? `ETB ${Number(report.estimatedCost).toLocaleString()}` : "—"}
              </TableCell>
              <TableCell>
                <Chip label={report.status} color={statusColor[report.status] || "default"} size="small" />
              </TableCell>
              {showActions && (
                <TableCell align="right">
                  <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 0.5 }}>
                    {onEdit && (
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => onEdit(report)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {onDelete && (
                      <Tooltip title="Delete">
                        <IconButton size="small" color="error" onClick={() => onDelete(report.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default AccidentTable;