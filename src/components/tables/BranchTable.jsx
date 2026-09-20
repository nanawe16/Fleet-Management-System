import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  IconButton,
  Chip,
  Tooltip,
} from "@mui/material";
import { Edit, Delete } from "@mui/icons-material";

const BranchTable = ({ branches, onEdit, onDelete }) => {
  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableCell>Name</TableCell>
          <TableCell>Code</TableCell>
          <TableCell>Location</TableCell>
          <TableCell>Status</TableCell>
          {(onEdit || onDelete) && <TableCell align="right">Actions</TableCell>}
        </TableRow>
      </TableHead>
      <TableBody>
        {branches.map((branch) => (
          <TableRow key={branch.id} hover>
            <TableCell>{branch.name}</TableCell>
            <TableCell>{branch.code || "—"}</TableCell>
            <TableCell>{branch.location || "—"}</TableCell>
            <TableCell>
              <Chip
                label={branch.isActive ? "Active" : "Inactive"}
                color={branch.isActive ? "success" : "default"}
                size="small"
              />
            </TableCell>
            {(onEdit || onDelete) && (
              <TableCell align="right">
                {onEdit && (
                  <Tooltip title="Edit">
                    <IconButton size="small" onClick={() => onEdit(branch)}>
                      <Edit fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                {onDelete && (
                  <Tooltip title="Delete">
                    <IconButton size="small" onClick={() => onDelete(branch.id)}>
                      <Delete fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </TableCell>
            )}
          </TableRow>
        ))}
        {branches.length === 0 && (
          <TableRow>
            <TableCell colSpan={5} align="center" sx={{ color: "text.secondary", py: 4 }}>
              No branches yet.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
};

export default BranchTable;