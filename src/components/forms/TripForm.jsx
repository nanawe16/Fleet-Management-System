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

const emptyTrip = {
  vehicle: "",
  vehicleId: "",
  driver: "",
  driverId: "",
  destination: "",
  startDate: "",
  endDate: "",
  status: "Scheduled",
};

const TripForm = ({ open, handleClose, onSave, initialData, saving = false }) => {
  const [trip, setTrip] = useState(emptyTrip);
  const [errors, setErrors] = useState({});
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);

  useEffect(() => {
    setTrip(initialData || emptyTrip);
    setErrors({});
  }, [initialData, open]);

  useEffect(() => {
    if (!open) return;

    const loadAssignments = async () => {
      setLoadingAssignments(true);
      const [{ data: vehicleData }, { data: driverData }] = await Promise.all([getVehicles(), getDrivers()]);
      setVehicles(vehicleData);
      setDrivers(driverData);
      setLoadingAssignments(false);
    };

    loadAssignments();
  }, [open]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const selectedVehicle = name === "vehicleId" ? vehicles.find((vehicle) => vehicle.id === value) : null;
    const selectedDriver = name === "driverId" ? drivers.find((driver) => driver.id === value) : null;
    setTrip((prev) => ({
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

    if (!trip.vehicleId) newErrors.vehicleId = "Vehicle is required";
    if (!trip.driverId) newErrors.driverId = "Driver is required";
    if (!trip.destination.trim()) newErrors.destination = "Destination is required";

    if (!trip.startDate) newErrors.startDate = "Start date is required";
    if (!trip.endDate) newErrors.endDate = "End date is required";

    if (trip.startDate && trip.endDate && trip.endDate < trip.startDate) {
      newErrors.endDate = "End date can't be before start date";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    // Don't close or reset here — onSave is async in the parent and runs
    // the double-booking conflict check (same vehicle/driver, overlapping
    // dates) before saving. If it rejects the trip, this dialog needs to
    // stay open with the entered data so it can actually be fixed.
    onSave(trip);
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : handleClose} fullWidth maxWidth="sm">
      <DialogTitle>{initialData ? "Edit Trip" : "Assign New Trip"}</DialogTitle>

      <DialogContent>
        <Stack spacing={2} mt={1}>
          <TextField
            select
            label="Vehicle"
            name="vehicleId"
            value={trip.vehicleId || ""}
            onChange={handleChange}
            error={!!errors.vehicleId}
            helperText={errors.vehicleId}
            disabled={loadingAssignments}
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
            value={trip.driverId || ""}
            onChange={handleChange}
            error={!!errors.driverId}
            helperText={errors.driverId}
            disabled={loadingAssignments}
            fullWidth
          >
            {drivers.map((driver) => (
              <MenuItem key={driver.id} value={driver.id}>
                {driver.name} {driver.status ? `(${driver.status})` : ""}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Destination / Purpose"
            name="destination"
            value={trip.destination}
            onChange={handleChange}
            error={!!errors.destination}
            helperText={errors.destination}
            fullWidth
          />

          <TextField
            type="date"
            label="Start Date"
            name="startDate"
            value={trip.startDate}
            onChange={handleChange}
            error={!!errors.startDate}
            helperText={errors.startDate}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />

          <TextField
            type="date"
            label="End Date"
            name="endDate"
            value={trip.endDate}
            onChange={handleChange}
            error={!!errors.endDate}
            helperText={errors.endDate}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />

          <TextField
            select
            label="Status"
            name="status"
            value={trip.status}
            onChange={handleChange}
            fullWidth
          >
            <MenuItem value="Scheduled">Scheduled</MenuItem>
            <MenuItem value="Ongoing">Ongoing</MenuItem>
            <MenuItem value="Completed">Completed</MenuItem>
            <MenuItem value="Cancelled">Cancelled</MenuItem>
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

export default TripForm;
