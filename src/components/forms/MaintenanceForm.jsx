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
import { getMechanicProfiles } from "../../services/userService";
import { getCurrentUser } from "../../services/authService";

const emptyMaintenance = {
  vehicle: "",
  vehicleId: "",
  mechanicId: "",
  serviceType: "",
  description: "",
  cost: "",
  date: "",
  status: "Scheduled",
};

const MaintenanceForm = ({ open, handleClose, onSave, initialData, saving = false }) => {
  const [maintenance, setMaintenance] = useState(emptyMaintenance);
  const [errors, setErrors] = useState({});
  const [vehicles, setVehicles] = useState([]);
  const [mechanics, setMechanics] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  // Assigning a mechanic is a Transport Manager action per the
  // permission matrix (Transport Manager: V/Schedule on Maintenance,
  // which includes assigning who does the work; Mechanic doesn't
  // self-assign). Admin can also do everything.
  const canAssignMechanic = ["admin", "transport_manager"].includes(getCurrentUser()?.role);

  useEffect(() => {
    setMaintenance(initialData || emptyMaintenance);
    setErrors({});
  }, [initialData, open]);

  useEffect(() => {
    if (!open) return;

    const loadOptions = async () => {
      setLoadingOptions(true);
      const [{ data: vehicleData }, mechanicData] = await Promise.all([
        getVehicles(),
        canAssignMechanic ? getMechanicProfiles() : Promise.resolve([]),
      ]);
      setVehicles(vehicleData);
      setMechanics(mechanicData);
      setLoadingOptions(false);
    };

    loadOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const selectedVehicle = name === "vehicleId" ? vehicles.find((vehicle) => vehicle.id === value) : null;
    setMaintenance((prev) => ({
      ...prev,
      [name]: value,
      ...(selectedVehicle ? { vehicle: selectedVehicle.plateNumber } : {}),
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!maintenance.vehicleId) newErrors.vehicleId = "Vehicle is required";
    if (!maintenance.serviceType.trim()) newErrors.serviceType = "Service type is required";

    if (!maintenance.cost || Number(maintenance.cost) <= 0) {
      newErrors.cost = "Cost must be a positive number";
    }

    if (!maintenance.date) {
      newErrors.date = "Date is required";
    }
    // note: unlike fuel records, a future date is valid here —
    // "Scheduled" maintenance is expected to be dated ahead

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    // Don't close or reset here — onSave is async in the parent and can
    // still fail. The parent closes this dialog itself once the save
    // actually succeeds.
    onSave(maintenance);
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : handleClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {initialData ? "Edit Maintenance Record" : "Add Maintenance Record"}
      </DialogTitle>

      <DialogContent>
        <Stack spacing={2} mt={1}>
          <TextField
            select
            label="Vehicle"
            name="vehicleId"
            value={maintenance.vehicleId || ""}
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

          {/* Only Admin/Transport Manager can assign a mechanic — a
              Mechanic viewing their own assigned jobs shouldn't see a
              control that implies they can reassign themselves. */}
          {canAssignMechanic && (
            <TextField
              select
              label="Assigned Mechanic"
              name="mechanicId"
              value={maintenance.mechanicId || ""}
              onChange={handleChange}
              disabled={loadingOptions}
              helperText="Optional — can be assigned later"
              fullWidth
            >
              <MenuItem value="">Unassigned</MenuItem>
              {mechanics.map((mechanic) => (
                <MenuItem key={mechanic.id} value={mechanic.id}>
                  {mechanic.full_name}
                </MenuItem>
              ))}
            </TextField>
          )}

          <TextField
            label="Service Type"
            name="serviceType"
            value={maintenance.serviceType}
            onChange={handleChange}
            error={!!errors.serviceType}
            helperText={errors.serviceType}
            fullWidth
          />

          <TextField
            label="Description"
            name="description"
            value={maintenance.description}
            onChange={handleChange}
            multiline
            rows={3}
            fullWidth
          />

          <TextField
            label="Cost"
            name="cost"
            type="number"
            value={maintenance.cost}
            onChange={handleChange}
            error={!!errors.cost}
            helperText={errors.cost}
            fullWidth
          />

          <TextField
            type="date"
            name="date"
            value={maintenance.date}
            onChange={handleChange}
            error={!!errors.date}
            helperText={errors.date}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />

          <TextField
            select
            label="Status"
            name="status"
            value={maintenance.status}
            onChange={handleChange}
            fullWidth
          >
            <MenuItem value="Scheduled">Scheduled</MenuItem>
            <MenuItem value="Completed">Completed</MenuItem>
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

export default MaintenanceForm;