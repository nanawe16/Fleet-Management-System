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
import { getVehicles } from "../../services/vehicleService";
import { getDrivers } from "../../services/driverService";

const emptyFuel = {
  vehicle: "",
  vehicleId: "",
  driver: "",
  driverId: "",
  fuelType: "Diesel",
  liters: "",
  cost: "",
  date: "",
};

const today = () => new Date().toISOString().split("T")[0];

const FuelForm = ({ open, handleClose, onSave, initialData, saving = false }) => {
  const [fuel, setFuel] = useState(emptyFuel);
  const [errors, setErrors] = useState({});
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  useEffect(() => {
    setFuel(initialData || emptyFuel);
    setErrors({});
  }, [initialData, open]);

  useEffect(() => {
    if (!open) return;

    const loadOptions = async () => {
      setLoadingOptions(true);
      const [{ data: vehicleData }, { data: driverData }] = await Promise.all([getVehicles(), getDrivers()]);
      setVehicles(vehicleData);
      setDrivers(driverData);
      setLoadingOptions(false);
    };

    loadOptions();
  }, [open]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const selectedVehicle = name === "vehicleId" ? vehicles.find((vehicle) => vehicle.id === value) : null;
    const selectedDriver = name === "driverId" ? drivers.find((driver) => driver.id === value) : null;
    setFuel((prev) => ({
      ...prev,
      [name]: value,
      ...(selectedVehicle ? { vehicle: selectedVehicle.plateNumber } : {}),
      ...(selectedDriver ? { driver: selectedDriver.name } : {}),
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!fuel.vehicleId) newErrors.vehicleId = "Vehicle is required";
    if (!fuel.driverId) newErrors.driverId = "Driver is required";

    if (!fuel.liters || Number(fuel.liters) <= 0) {
      newErrors.liters = "Liters must be a positive number";
    }

    if (!fuel.cost || Number(fuel.cost) <= 0) {
      newErrors.cost = "Cost must be a positive number";
    }

    if (!fuel.date) {
      newErrors.date = "Date is required";
    } else if (fuel.date > today()) {
      newErrors.date = "Date can't be in the future";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    // Don't close or reset here — onSave is async in the parent and can
    // still fail (network error, etc). The parent closes this dialog
    // itself once the save actually succeeds.
    onSave(fuel);
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : handleClose} fullWidth maxWidth="sm">
      <DialogTitle>{initialData ? "Edit Fuel Record" : "Add Fuel Record"}</DialogTitle>

      <DialogContent>
        <Stack spacing={2} mt={1}>
          <TextField
            select
            label="Vehicle"
            name="vehicleId"
            value={fuel.vehicleId || ""}
            onChange={handleChange}
            error={!!errors.vehicleId}
            helperText={errors.vehicleId}
            disabled={loadingOptions}
            fullWidth
          >
            {vehicles.map((vehicle) => (
              <MenuItem key={vehicle.id} value={vehicle.id}>
                {vehicle.plateNumber} — {vehicle.model}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Driver"
            name="driverId"
            value={fuel.driverId || ""}
            onChange={handleChange}
            error={!!errors.driverId}
            helperText={errors.driverId}
            disabled={loadingOptions}
            fullWidth
          >
            {drivers.map((driver) => (
              <MenuItem key={driver.id} value={driver.id}>
                {driver.name} {driver.status ? `(${driver.status})` : ""}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Fuel Type"
            name="fuelType"
            value={fuel.fuelType}
            onChange={handleChange}
            fullWidth
          >
            <MenuItem value="Diesel">Diesel</MenuItem>
            <MenuItem value="Petrol">Petrol</MenuItem>
          </TextField>

          <TextField
            label="Liters"
            name="liters"
            type="number"
            value={fuel.liters}
            onChange={handleChange}
            error={!!errors.liters}
            helperText={errors.liters}
            fullWidth
          />

          <TextField
            label="Cost"
            name="cost"
            type="number"
            value={fuel.cost}
            onChange={handleChange}
            error={!!errors.cost}
            helperText={errors.cost}
            fullWidth
          />

          <TextField
            type="date"
            name="date"
            value={fuel.date}
            onChange={handleChange}
            error={!!errors.date}
            helperText={errors.date}
            InputLabelProps={{ shrink: true }}
            fullWidth
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
          {saving ? "Saving..." : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FuelForm;