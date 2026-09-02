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
  FormHelperText,
} from "@mui/material";
import { getLinkableDriverProfiles } from "../../services/driverService";

const emptyDriver = {
  name: "",
  licenseNumber: "",
  licenseExpiry: "",
  phone: "",
  status: "Available",
  profileId: "",
};

const DriverForm = ({ open, handleClose, onSave, initialData, saving = false }) => {
  const [driver, setDriver] = useState(emptyDriver);
  const [errors, setErrors] = useState({});
  const [linkableProfiles, setLinkableProfiles] = useState([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);

  useEffect(() => {
    setDriver(initialData || emptyDriver);
    setErrors({});
  }, [initialData, open]);

  useEffect(() => {
    if (!open) return;
    const fetchProfiles = async () => {
      setLoadingProfiles(true);
      try {
        const profiles = await getLinkableDriverProfiles(initialData?.profileId || null);
        setLinkableProfiles(profiles);
      } catch (err) {
        console.error("Error loading linkable profiles:", err);
        setLinkableProfiles([]);
      } finally {
        setLoadingProfiles(false);
      }
    };
    fetchProfiles();
  }, [open, initialData?.profileId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setDriver((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const tempErrors = {};

    if (!driver.name.trim()) tempErrors.name = "Driver name is required";
    if (!driver.licenseNumber.trim()) tempErrors.licenseNumber = "License number is required";

    if (!driver.phone.trim()) {
      tempErrors.phone = "Phone number is required";
    } else if (!/^0\d{9}$/.test(driver.phone.trim())) {
      tempErrors.phone = "Enter a valid 10-digit phone number (e.g. 0911223344)";
    }

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave(driver);
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : handleClose} fullWidth maxWidth="sm">
      <DialogTitle>{initialData ? "Edit Driver" : "Add Driver"}</DialogTitle>

      <DialogContent>
        <Stack spacing={2} mt={1}>
          <TextField
            label="Driver Name"
            name="name"
            value={driver.name}
            onChange={handleChange}
            error={!!errors.name}
            helperText={errors.name}
            fullWidth
          />

          <TextField
            label="License Number"
            name="licenseNumber"
            value={driver.licenseNumber}
            onChange={handleChange}
            error={!!errors.licenseNumber}
            helperText={errors.licenseNumber}
            fullWidth
          />

          <TextField
            type="date"
            label="License Expiry"
            name="licenseExpiry"
            value={driver.licenseExpiry || ""}
            onChange={handleChange}
            InputLabelProps={{ shrink: true }}
            helperText="Used to generate expiry alerts — optional but recommended"
            fullWidth
          />

          <TextField
            label="Phone Number"
            name="phone"
            value={driver.phone}
            onChange={handleChange}
            error={!!errors.phone}
            helperText={errors.phone}
            fullWidth
          />

          <TextField select label="Status" name="status" value={driver.status} onChange={handleChange} fullWidth>
            <MenuItem value="Available">Available</MenuItem>
            <MenuItem value="On Trip">On Trip</MenuItem>
            <MenuItem value="Leave">Leave</MenuItem>
          </TextField>

          <TextField
            select
            label="Linked User Account"
            name="profileId"
            value={driver.profileId || ""}
            onChange={handleChange}
            disabled={loadingProfiles}
          >
            <MenuItem value="">
              <em>Not linked</em>
            </MenuItem>
            {linkableProfiles.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.full_name || "(no name set)"}
              </MenuItem>
            ))}
          </TextField>
          <FormHelperText sx={{ mt: -1.5 }}>
            Links this driver record to their login account, so they can see their own assigned trips.
            Only shows accounts with the "driver" role that aren't linked to another driver record yet.
          </FormHelperText>
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
          {saving ? "Saving..." : initialData ? "Update" : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DriverForm;