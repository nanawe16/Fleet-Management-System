import {
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  TableContainer,
  Chip,
  IconButton,
  Tooltip,
  Box,
  Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";

const daysUntil = (dateStr) => {
  if (!dateStr) return null;
  const diffMs = new Date(dateStr).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0);
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
};

const ExpiryChip = ({ date }) => {
  if (!date) {
    return (
      <Typography variant="caption" color="text.disabled">
        Not set
      </Typography>
    );
  }

  const days = daysUntil(date);
  if (days < 0) return <Chip label={`Expired ${date}`} color="error" size="small" />;
  if (days <= 14) return <Chip label={`Expires ${date}`} color="warning" size="small" />;
  return <Chip label={date} size="small" variant="outlined" />;
};

const VehicleTable = ({ vehicles, onEdit, onDelete }) => {
  if (vehicles.length === 0) {
    return (
      <Paper sx={{ p: 5, textAlign: "center", borderRadius: 3 }}>
        <DirectionsCarIcon sx={{ fontSize: 40, color: "text.disabled", mb: 1 }} />
        <Typography variant="body1" color="text.secondary">
          No vehicles found.
        </Typography>
        <Typography variant="body2" color="text.disabled">Try adjusting your search or filter.</Typography>
      </Paper>
    );
  }

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Plate Number</TableCell>
            <TableCell>Model</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Driver</TableCell>
            <TableCell>Insurance Expiry</TableCell>
            <TableCell>Status</TableCell>
            {(onEdit || onDelete) && <TableCell align="right">Actions</TableCell>}
          </TableRow>
        </TableHead>

        <TableBody>
          {vehicles.map((vehicle) => (
            <TableRow
              key={vehicle.id}
              hover
              sx={
                vehicle.insuranceExpiry && daysUntil(vehicle.insuranceExpiry) < 0
                  ? { bgcolor: "error.50", "&:hover": { bgcolor: "error.100" } }
                  : undefined
              }
            >
              <TableCell>{vehicle.plateNumber}</TableCell>
              <TableCell>{vehicle.model}</TableCell>
              <TableCell>{vehicle.type}</TableCell>
              <TableCell>{vehicle.driver}</TableCell>
              <TableCell>
                <ExpiryChip date={vehicle.insuranceExpiry} />
              </TableCell>
              <TableCell>
                <Chip
                  label={vehicle.status}
                  color={
                    vehicle.status === "Available" ? "success" : vehicle.status === "On Trip" ? "warning" : "error"
                  }
                  size="small"
                />
              </TableCell>
              {(onEdit || onDelete) && (
                <TableCell align="right">
                  <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 0.5 }}>
                    {onEdit && <Tooltip title="Edit"><IconButton size="small" onClick={() => onEdit(vehicle)}><EditIcon fontSize="small" /></IconButton></Tooltip>}
                    {onDelete && <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => onDelete(vehicle.id)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>}
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

export default VehicleTable;
