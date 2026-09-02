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
  CircularProgress,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import LocalGasStationIcon from "@mui/icons-material/LocalGasStation";

const statusColor = (status) => {
  if (status === "Verified") return "success";
  if (status === "Rejected") return "error";
  return "warning"; // Pending
};

// onEdit/onDelete are optional — Fuel.jsx omits them for the Driver
// role (create + view only, matrix "C Own" + view added in 025).
// onVerify/onReject are optional too — Fuel.jsx only passes them when
// the logged-in user is a Finance Officer, same convention
// Requests.jsx uses for onApprove/onReject on RequestTable.
const FuelTable = ({ records, onEdit, onDelete, onVerify, onReject, processingId }) => {
  if (records.length === 0) {
    return (
      <Paper sx={{ p: 5, textAlign: "center", borderRadius: 3 }}>
        <LocalGasStationIcon sx={{ fontSize: 40, color: "text.disabled", mb: 1 }} />
        <Typography variant="body1" color="text.secondary">
          No fuel records found.
        </Typography>
        <Typography variant="body2" color="text.disabled">
          Try adjusting your search or filter, or add a new fuel record.
        </Typography>
      </Paper>
    );
  }

  const showActions = onEdit || onDelete || onVerify || onReject;

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Vehicle</TableCell>
            <TableCell>Driver</TableCell>
            <TableCell>Fuel Type</TableCell>
            <TableCell align="right">Liters</TableCell>
            <TableCell align="right">Cost</TableCell>
            <TableCell>Date</TableCell>
            <TableCell>Status</TableCell>
            {showActions && <TableCell align="right">Actions</TableCell>}
          </TableRow>
        </TableHead>

        <TableBody>
          {records.map((record) => {
            const isProcessing = processingId === record.id;
            const isPending = record.status === "Pending";

            return (
              <TableRow key={record.id} hover>
                <TableCell>{record.vehicle}</TableCell>
                <TableCell>{record.driver}</TableCell>
                <TableCell>
                  <Chip
                    label={record.fuelType}
                    color={record.fuelType === "Diesel" ? "success" : "primary"}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">{record.liters} L</TableCell>
                <TableCell align="right">ETB {Number(record.cost).toLocaleString()}</TableCell>
                <TableCell>{record.date}</TableCell>
                <TableCell>
                  {record.status && (
                    <Chip label={record.status} color={statusColor(record.status)} size="small" />
                  )}
                </TableCell>
                {showActions && (
                  <TableCell align="right">
                    <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 0.5, alignItems: "center" }}>
                      {isProcessing ? (
                        <CircularProgress size={20} sx={{ mx: 1 }} />
                      ) : (
                        isPending &&
                        onVerify &&
                        onReject && (
                          <>
                            <Tooltip title="Verify">
                              <IconButton size="small" color="success" onClick={() => onVerify(record.id)}>
                                <CheckIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Reject">
                              <IconButton size="small" color="error" onClick={() => onReject(record.id)}>
                                <CloseIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
                        )
                      )}

                      {onEdit && (
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => onEdit(record)} disabled={isProcessing}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {onDelete && (
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => onDelete(record.id)}
                            disabled={isProcessing}
                          >
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

export default FuelTable;