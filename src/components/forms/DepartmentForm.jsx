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
import { getBranches } from "../../services/branchService";

const emptyDepartment = {
  name: "",
  manager: "",
  phone: "",
  status: "Active",
  branchId: "",
};

const DepartmentForm = ({ open, handleClose, onSave, initialData, saving = false }) => {
  const [department, setDepartment] = useState(emptyDepartment);
  const [errors, setErrors] = useState({});
  const [branches, setBranches] = useState([]);
  const [loadingBranches, setLoadingBranches] = useState(false);

  useEffect(() => {
    setDepartment(initialData || emptyDepartment);
    setErrors({});
  }, [initialData, open]);

  useEffect(() => {
    if (!open) return;

    const loadBranches = async () => {
      setLoadingBranches(true);
      const { data } = await getBranches();
      setBranches(data);
      setLoadingBranches(false);

      // Only one branch exists so far (Main Campus) — auto-select it
      // instead of making every admin pick the one option. Once more
      // branches are added this only fires when there's genuinely one.
      if (data.length === 1) {
        setDepartment((prev) => (prev.branchId ? prev : { ...prev, branchId: data[0].id }));
      }
    };

    loadBranches();
  }, [open]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setDepartment((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!department.name.trim()) newErrors.name = "Work unit name is required";
    if (!department.manager.trim()) newErrors.manager = "Office Head is required";
    if (!department.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!/^0\d{9}$/.test(department.phone.trim())) {
      newErrors.phone = "Enter a valid 10-digit phone number (e.g. 0911111111)";
    }
    if (!department.branchId) newErrors.branchId = "Branch is required";
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
      <DialogTitle>{initialData ? "Edit Work Unit" : "Add Work Unit"}</DialogTitle>

      <DialogContent>
        <Stack spacing={2} mt={1}>
          <TextField
            select
            label="Branch"
            name="branchId"
            value={department.branchId || ""}
            onChange={handleChange}
            error={!!errors.branchId}
            helperText={errors.branchId}
            disabled={loadingBranches}
            fullWidth
          >
            {branches.map((branch) => (
              <MenuItem key={branch.id} value={branch.id}>
                {branch.name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Work Unit Name"
            name="name"
            value={department.name}
            onChange={handleChange}
            error={!!errors.name}
            helperText={errors.name}
            fullWidth
          />

          <TextField
            label="Office Head"
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