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
import AltRouteIcon from "@mui/icons-material/AltRoute";

const statusColor = {
  Scheduled: "info",
  Ongoing: "warning",
  Completed: "success",
  Cancelled: "error",
};

const TripTable = ({ trips, onEdit, onDelete, canEdit = true, canDelete = true }) => {
  if (trips.length === 0) {
    return (
      <Paper sx={{ p: 5, textAlign: "center", borderRadius: 3 }}>
        <AltRouteIcon sx={{ fontSize: 40, color: "text.disabled", mb: 1 }} />
        <Typography variant="body1" color="text.secondary">
          No trips found.
        </Typography>
        <Typography variant="body2" color="text.disabled">
          Try adjusting your search or filter, or assign a new trip.
        </Typography>
      </Paper>
    );
  }

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Vehicle</TableCell>
            <TableCell>Driver</TableCell>
            <TableCell>Destination</TableCell>
            <TableCell>Start Date</TableCell>
            <TableCell>End Date</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {trips.map((trip) => (
            <TableRow key={trip.id} hover>
              <TableCell>{trip.vehicle}</TableCell>
              <TableCell>{trip.driver}</TableCell>
              <TableCell>{trip.destination}</TableCell>
              <TableCell>{trip.startDate}</TableCell>
              <TableCell>{trip.endDate}</TableCell>
              <TableCell>
                <Chip label={trip.status} color={statusColor[trip.status] || "default"} size="small" />
              </TableCell>
              <TableCell align="right">
                <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 0.5 }}>
                  {canEdit && (
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => onEdit(trip)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  {canDelete && (
                    <Tooltip title="Delete">
                      <IconButton size="small" color="error" onClick={() => onDelete(trip.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default TripTable;