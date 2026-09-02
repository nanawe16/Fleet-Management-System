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

const emptyReport = {
  vehicle: "",
  vehicleId: "",
  driver: "",
  driverId: "",
  date: "",
  location: "",
  description: "",
  severity: "Minor",
  estimatedCost: "",
  status: "Reported",
};

const today = () => new Date().toISOString().split("T")[0];

const AccidentForm = ({ open, handleClose, onSave, initialData, saving = false }) => {
  const [report, setReport] = useState(emptyReport);
  const [errors, setErrors] = useState({});
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  useEffect(() => {
    setReport(initialData || emptyReport);
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
    setReport((prev) => ({
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

    if (!report.vehicleId) newErrors.vehicleId = "Vehicle is required";
    if (!report.driverId) newErrors.driverId = "Driver is required";
    if (!report.location.trim()) newErrors.location = "Location is required";
    if (!report.description.trim()) newErrors.description = "Description is required";

    if (!report.date) {
      newErrors.date = "Date is required";
    } else if (report.date > today()) {
      newErrors.date = "Date can't be in the future";
    }

    if (report.estimatedCost !== "" && Number(report.estimatedCost) < 0) {
      newErrors.estimatedCost = "Estimated cost can't be negative";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    // Parent closes this dialog itself once the save actually succeeds —
    // same pattern as every other form in this app.
    onSave(report);
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : handleClose} fullWidth maxWidth="sm">
      <DialogTitle>{initialData ? "Edit Accident Report" : "Report an Accident"}</DialogTitle>

      <DialogContent>
        <Stack spacing={2} mt={1}>
          <TextField
            select
            label="Vehicle"
            name="vehicleId"
            value={report.vehicleId || ""}
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
            value={report.driverId || ""}
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
            type="date"
            label="Date"
            name="date"
            value={report.date}
            onChange={handleChange}
            error={!!errors.date}
            helperText={errors.date}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />

          <TextField
            label="Location"
            name="location"
            value={report.location}
            onChange={handleChange}
            error={!!errors.location}
            helperText={errors.location}
            placeholder="e.g. Adama-Addis Ababa road, near Bishoftu"
            fullWidth
          />

          <TextField
            label="Description"
            name="description"
            value={report.description}
            onChange={handleChange}
            error={!!errors.description}
            helperText={errors.description}
            multiline
            rows={3}
            fullWidth
          />

          <Stack direction="row" spacing={2}>
            <TextField
              select
              label="Severity"
              name="severity"
              value={report.severity}
              onChange={handleChange}
              fullWidth
            >
              <MenuItem value="Minor">Minor</MenuItem>
              <MenuItem value="Moderate">Moderate</MenuItem>
              <MenuItem value="Severe">Severe</MenuItem>
            </TextField>

            <TextField
              label="Estimated Cost (ETB)"
              name="estimatedCost"
              type="number"
              value={report.estimatedCost}
              onChange={handleChange}
              error={!!errors.estimatedCost}
              helperText={errors.estimatedCost}
              fullWidth
            />
          </Stack>

          {initialData && (
            <TextField
              select
              label="Status"
              name="status"
              value={report.status}
              onChange={handleChange}
              fullWidth
            >
              <MenuItem value="Reported">Reported</MenuItem>
              <MenuItem value="Under Review">Under Review</MenuItem>
              <MenuItem value="Resolved">Resolved</MenuItem>
            </TextField>
          )}
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

export default AccidentForm;