import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Box,
  Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import PersonIcon from "@mui/icons-material/Person";

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

const DriverTable = ({ drivers, onEdit, onDelete }) => {
  if (drivers.length === 0) {
    return (
      <Paper sx={{ p: 5, textAlign: "center", borderRadius: 3 }}>
        <PersonIcon sx={{ fontSize: 40, color: "text.disabled", mb: 1 }} />
        <Typography variant="body1" color="text.secondary">
          No drivers found.
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
            <TableCell>Name</TableCell>
            <TableCell>License Number</TableCell>
            <TableCell>License Expiry</TableCell>
            <TableCell>Phone</TableCell>
            <TableCell>Status</TableCell>
            {(onEdit || onDelete) && <TableCell align="right">Actions</TableCell>}
          </TableRow>
        </TableHead>

        <TableBody>
          {drivers.map((driver) => (
            <TableRow
              key={driver.id}
              hover
              sx={
                driver.licenseExpiry && daysUntil(driver.licenseExpiry) < 0
                  ? { bgcolor: "error.50", "&:hover": { bgcolor: "error.100" } }
                  : undefined
              }
            >
              <TableCell>{driver.name}</TableCell>
              <TableCell>{driver.licenseNumber}</TableCell>
              <TableCell>
                <ExpiryChip date={driver.licenseExpiry} />
              </TableCell>
              <TableCell>{driver.phone}</TableCell>
              <TableCell>
                <Chip
                  label={driver.status}
                  color={
                    driver.status === "Available" ? "success" : driver.status === "On Trip" ? "warning" : "default"
                  }
                  size="small"
                />
              </TableCell>
              {(onEdit || onDelete) && (
                <TableCell align="right">
                  <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 0.5 }}>
                    {onEdit && <Tooltip title="Edit"><IconButton size="small" onClick={() => onEdit(driver)}><EditIcon fontSize="small" /></IconButton></Tooltip>}
                    {onDelete && <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => onDelete(driver.id)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>}
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

export default DriverTable;
