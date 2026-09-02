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
import { getDrivers } from "../../services/driverService";

const emptyVehicle = {
  plateNumber: "",
  model: "",
  type: "",
  driver: "",
  assignedDriverId: "",
  status: "Available",
  insuranceExpiry: "",
};

const VehicleForm = ({ open, handleClose, onSave, initialData, saving = false }) => {
  const [vehicle, setVehicle] = useState(emptyVehicle);
  const [errors, setErrors] = useState({});
  const [drivers, setDrivers] = useState([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);

  useEffect(() => {
    setVehicle(initialData || emptyVehicle);
    setErrors({});
  }, [initialData, open]);

  useEffect(() => {
    if (!open) return;

    const loadDrivers = async () => {
      setLoadingDrivers(true);
      const { data } = await getDrivers();
      setDrivers(data);
      setLoadingDrivers(false);
    };

    loadDrivers();
  }, [open]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const selectedDriver = name === "assignedDriverId" ? drivers.find((driver) => driver.id === value) : null;
    setVehicle((prev) => ({
      ...prev,
      [name]: value,
      ...(selectedDriver ? { driver: selectedDriver.name } : {}),
    }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const tempErrors = {};
    if (!vehicle.plateNumber.trim()) tempErrors.plateNumber = "Plate Number is required";
    if (!vehicle.model.trim()) tempErrors.model = "Vehicle Model is required";
    if (!vehicle.type.trim()) tempErrors.type = "Vehicle Type is required";
    if (!vehicle.assignedDriverId) tempErrors.assignedDriverId = "Assigned driver is required";
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave(vehicle);
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : handleClose} fullWidth maxWidth="sm">
      <DialogTitle>{initialData ? "Edit Vehicle" : "Add New Vehicle"}</DialogTitle>

      <DialogContent>
        <Stack spacing={2} mt={1}>
          <TextField
            label="Plate Number"
            name="plateNumber"
            value={vehicle.plateNumber}
            onChange={handleChange}
            error={!!errors.plateNumber}
            helperText={errors.plateNumber}
            fullWidth
          />

          <TextField
            label="Vehicle Model"
            name="model"
            value={vehicle.model}
            onChange={handleChange}
            error={!!errors.model}
            helperText={errors.model}
            fullWidth
          />

          <TextField
            label="Vehicle Type"
            name="type"
            value={vehicle.type}
            onChange={handleChange}
            error={!!errors.type}
            helperText={errors.type}
            fullWidth
          />

          <TextField
            select
            label="Assigned Driver"
            name="assignedDriverId"
            value={vehicle.assignedDriverId || ""}
            onChange={handleChange}
            error={!!errors.assignedDriverId}
            helperText={errors.assignedDriverId}
            disabled={loadingDrivers}
            fullWidth
          >
            {drivers.map((driver) => (
              <MenuItem key={driver.id} value={driver.id}>
                {driver.name} {driver.status ? `(${driver.status})` : ""}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            type="date"
            label="Insurance Expiry"
            name="insuranceExpiry"
            value={vehicle.insuranceExpiry || ""}
            onChange={handleChange}
            InputLabelProps={{ shrink: true }}
            helperText="Used to generate expiry alerts — optional but recommended"
            fullWidth
          />

          <TextField label="Status" name="status" value={vehicle.status} onChange={handleChange} select fullWidth>
            <MenuItem value="Available">Available</MenuItem>
            <MenuItem value="On Trip">On Trip</MenuItem>
            <MenuItem value="Maintenance">Maintenance</MenuItem>
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

export default VehicleForm;
