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
import SwapVertIcon from "@mui/icons-material/SwapVert";
import Inventory2Icon from "@mui/icons-material/Inventory2";

// onEdit/onDelete/onRecordTransaction are all optional — Inventory.jsx
// only passes them for roles the matrix actually grants write access
// to (Admin "F", Mechanic "F"). Transport Manager, Finance, and
// Management are "V" (view only) and get none of them; the whole
// Actions column disappears rather than showing buttons RLS would
// reject.
const InventoryTable = ({ items, onEdit, onDelete, onRecordTransaction }) => {
  if (items.length === 0) {
    return (
      <Paper sx={{ p: 5, textAlign: "center", borderRadius: 3 }}>
        <Inventory2Icon sx={{ fontSize: 40, color: "text.disabled", mb: 1 }} />
        <Typography variant="body1" color="text.secondary">
          No spare parts found.
        </Typography>
        <Typography variant="body2" color="text.disabled">
          Try adjusting your search or filter, or add a new part.
        </Typography>
      </Paper>
    );
  }

  const showActions = onEdit || onDelete || onRecordTransaction;

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Part Name</TableCell>
            <TableCell>Category</TableCell>
            <TableCell align="right">Quantity</TableCell>
            <TableCell align="right">Unit Cost</TableCell>
            <TableCell>Supplier</TableCell>
            <TableCell>Stock Status</TableCell>
            {showActions && <TableCell align="right">Actions</TableCell>}
          </TableRow>
        </TableHead>

        <TableBody>
          {items.map((item) => {
            const lowStock = Number(item.quantity) <= Number(item.reorderLevel);

            return (
              <TableRow
                key={item.id}
                hover
                sx={lowStock ? { bgcolor: "error.50", "&:hover": { bgcolor: "error.100" } } : undefined}
              >
                <TableCell>{item.partName}</TableCell>
                <TableCell>{item.category}</TableCell>
                <TableCell align="right">
                  {item.quantity} {item.unit}
                  {item.quantity !== 1 && item.unit !== "unit" ? "s" : ""}
                </TableCell>
                <TableCell align="right">ETB {Number(item.unitCost).toLocaleString()}</TableCell>
                <TableCell>{item.supplier}</TableCell>
                <TableCell>
                  {lowStock ? (
                    <Chip label="Low Stock" color="error" size="small" />
                  ) : (
                    <Chip label="In Stock" color="success" size="small" />
                  )}
                </TableCell>
                {showActions && (
                  <TableCell align="right">
                    <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 0.5 }}>
                      {onRecordTransaction && (
                        <Tooltip title="Record Stock In/Out">
                          <IconButton size="small" onClick={() => onRecordTransaction(item)}>
                            <SwapVertIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {onEdit && (
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => onEdit(item)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {onDelete && (
                        <Tooltip title="Delete">
                          <IconButton size="small" color="error" onClick={() => onDelete(item.id)}>
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

export default InventoryTable;