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
import BusinessIcon from "@mui/icons-material/Business";

const DepartmentTable = ({ departments, onEdit, onDelete }) => {
  if (departments.length === 0) {
    return (
      <Paper sx={{ p: 5, textAlign: "center", borderRadius: 3 }}>
        <BusinessIcon sx={{ fontSize: 40, color: "text.disabled", mb: 1 }} />
        <Typography variant="body1" color="text.secondary">
          No departments found.
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
            <TableCell>Department</TableCell>
            <TableCell>Manager</TableCell>
            <TableCell>Phone</TableCell>
            <TableCell>Status</TableCell>
            {(onEdit || onDelete) && <TableCell align="right">Actions</TableCell>}
          </TableRow>
        </TableHead>

        <TableBody>
          {departments.map((department) => (
            <TableRow key={department.id} hover>
              <TableCell>{department.name}</TableCell>
              <TableCell>{department.manager}</TableCell>
              <TableCell>{department.phone}</TableCell>
              <TableCell>
                <Chip
                  label={department.status}
                  color={department.status === "Active" ? "success" : "error"}
                  size="small"
                />
              </TableCell>
              {(onEdit || onDelete) && (
                <TableCell align="right">
                  <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 0.5 }}>
                    {onEdit && <Tooltip title="Edit"><IconButton size="small" onClick={() => onEdit(department)}><EditIcon fontSize="small" /></IconButton></Tooltip>}
                    {onDelete && <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => onDelete(department.id)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>}
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

export default DepartmentTable;
