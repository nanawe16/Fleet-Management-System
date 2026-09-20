import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  CircularProgress,
  FormControlLabel,
  Switch,
} from "@mui/material";

const emptyBranch = {
  name: "",
  code: "",
  location: "",
  isActive: true,
};

const BranchForm = ({ open, handleClose, onSave, initialData, saving = false }) => {
  const [branch, setBranch] = useState(emptyBranch);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setBranch(initialData || emptyBranch);
    setErrors({});
  }, [initialData, open]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setBranch((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!branch.name.trim()) newErrors.name = "Branch name is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave?.(branch);
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : handleClose} fullWidth maxWidth="sm">
      <DialogTitle>{initialData ? "Edit Branch" : "New Branch"}</DialogTitle>

      <DialogContent>
        <Stack spacing={2} mt={1}>
          <TextField
            label="Branch Name"
            name="name"
            value={branch.name}
            onChange={handleChange}
            error={!!errors.name}
            helperText={errors.name || "e.g. Adama Campus"}
            fullWidth
            autoFocus
          />

          <TextField
            label="Code (optional)"
            name="code"
            value={branch.code}
            onChange={handleChange}
            helperText="A short identifier, e.g. ADAMA. Leave blank if you don't use codes."
            fullWidth
          />

          <TextField
            label="Location (optional)"
            name="location"
            value={branch.location}
            onChange={handleChange}
            helperText="City or area, e.g. Adama"
            fullWidth
          />

          <FormControlLabel
            control={
              <Switch
                checked={branch.isActive}
                onChange={(e) => setBranch((prev) => ({ ...prev, isActive: e.target.checked }))}
              />
            }
            label="Active"
          />
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
          {saving ? "Saving..." : initialData ? "Update" : "Add Branch"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BranchForm;