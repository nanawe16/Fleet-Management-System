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
import BuildIcon from "@mui/icons-material/Build";

// onEdit/onDelete are optional at the page level — Maintenance.jsx
// omits them entirely for roles with no edit/delete right at all
// (Driver, Finance, Management). canEdit/canDelete are optional
// per-row predicates on top of that — needed for Mechanic, whose
// matrix right is "F Assigned", not "F All": they can manage jobs
// assigned to them, not every job. When canEdit/canDelete aren't
// passed, every row is editable/deletable (matches Admin's "F All"
// and Transport Manager's row-independent "Schedule" right).
const MaintenanceTable = ({ records, onEdit, onDelete, canEdit, canDelete }) => {
  if (records.length === 0) {
    return (
      <Paper sx={{ p: 5, textAlign: "center", borderRadius: 3 }}>
        <BuildIcon sx={{ fontSize: 40, color: "text.disabled", mb: 1 }} />
        <Typography variant="body1" color="text.secondary">
          No maintenance records found.
        </Typography>
        <Typography variant="body2" color="text.disabled">
          Try adjusting your search or filter, or add a new maintenance record.
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
            <TableCell>Service Type</TableCell>
            <TableCell>Description</TableCell>
            <TableCell align="right">Cost</TableCell>
            <TableCell>Date</TableCell>
            <TableCell>Status</TableCell>
            {showActions && <TableCell align="right">Actions</TableCell>}
          </TableRow>
        </TableHead>

        <TableBody>
          {records.map((record) => {
            const rowCanEdit = onEdit && (!canEdit || canEdit(record));
            const rowCanDelete = onDelete && (!canDelete || canDelete(record));

            return (
              <TableRow
                key={record.id}
                hover
                sx={
                  record.overdue
                    ? { bgcolor: "error.50", "&:hover": { bgcolor: "error.100" } }
                    : undefined
                }
              >
                <TableCell>{record.vehicle}</TableCell>
                <TableCell>{record.serviceType}</TableCell>
                <TableCell>{record.description}</TableCell>
                <TableCell align="right">ETB {Number(record.cost).toLocaleString()}</TableCell>
                <TableCell>{record.date}</TableCell>
                <TableCell>
                  {record.overdue ? (
                    <Chip label="Overdue" color="error" size="small" />
                  ) : (
                    <Chip
                      label={record.status}
                      color={record.status === "Completed" ? "success" : "warning"}
                      size="small"
                    />
                  )}
                </TableCell>
                {showActions && (
                  <TableCell align="right">
                    <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 0.5 }}>
                      {rowCanEdit && (
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => onEdit(record)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {rowCanDelete && (
                        <Tooltip title="Delete">
                          <IconButton size="small" color="error" onClick={() => onDelete(record.id)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default MaintenanceTable;