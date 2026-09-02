import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Stack,
  CircularProgress,
} from "@mui/material";

const emptyDepartment = {
  name: "",
  manager: "",
  phone: "",
  status: "Active",
};

const DepartmentForm = ({ open, handleClose, onSave, initialData, saving = false }) => {
  const [department, setDepartment] = useState(emptyDepartment);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setDepartment(initialData || emptyDepartment);
    setErrors({});
  }, [initialData, open]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setDepartment((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!department.name.trim()) newErrors.name = "Department name is required";
    if (!department.manager.trim()) newErrors.manager = "Manager is required";
    if (!department.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!/^0\d{9}$/.test(department.phone.trim())) {
      newErrors.phone = "Enter a valid 10-digit phone number (e.g. 0911111111)";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    // Don't close here — onSave is async in the parent (it checks for
    // duplicate names and calls the API). The parent closes this dialog
    // itself once the save actually succeeds, via the `open` prop.
    onSave(department);
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : handleClose} fullWidth maxWidth="sm">
      <DialogTitle>{initialData ? "Edit Department" : "Add Department"}</DialogTitle>

      <DialogContent>
        <Stack spacing={2} mt={1}>
          <TextField
            label="Department Name"
            name="name"
            value={department.name}
            onChange={handleChange}
            error={!!errors.name}
            helperText={errors.name}
            fullWidth
          />

          <TextField
            label="Manager"
            name="manager"
            value={department.manager}
            onChange={handleChange}
            error={!!errors.manager}
            helperText={errors.manager}
            fullWidth
          />

          <TextField
            label="Phone"
            name="phone"
            value={department.phone}
            onChange={handleChange}
            error={!!errors.phone}
            helperText={errors.phone}
            fullWidth
          />

          <TextField
            select
            label="Status"
            name="status"
            value={department.status}
            onChange={handleChange}
            fullWidth
          >
            <MenuItem value="Active">Active</MenuItem>
            <MenuItem value="Inactive">Inactive</MenuItem>
          </TextField>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={saving}>
          Cancel
        </Button>

        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {saving ? "Saving..." : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DepartmentForm;