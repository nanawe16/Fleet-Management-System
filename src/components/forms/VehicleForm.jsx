import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
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
import { getBranches } from "../../services/branchService";

const emptyVehicle = {
  plateNumber: "",
  model: "",
  type: "",
  driver: "",
  assignedDriverId: "",
  status: "Available",
  insuranceExpiry: "",
  branchId: "",
};

const VehicleForm = ({ open, handleClose, onSave, initialData, saving = false }) => {
  const { t } = useTranslation();
  const [vehicle, setVehicle] = useState(emptyVehicle);
  const [errors, setErrors] = useState({});
  const [drivers, setDrivers] = useState([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [branches, setBranches] = useState([]);
  const [loadingBranches, setLoadingBranches] = useState(false);

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

    const loadBranches = async () => {
      setLoadingBranches(true);
      const { data } = await getBranches();
      setBranches(data);
      setLoadingBranches(false);

      // Only one branch exists so far (Main Campus) — auto-select it
      // instead of making every admin pick the one option.
      if (data.length === 1) {
        setVehicle((prev) => (prev.branchId ? prev : { ...prev, branchId: data[0].id }));
      }
    };

    loadDrivers();
    loadBranches();
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
    if (!vehicle.plateNumber.trim()) tempErrors.plateNumber = t("vehicles.form.errors.plateNumber");
    if (!vehicle.model.trim()) tempErrors.model = t("vehicles.form.errors.model");
    if (!vehicle.type.trim()) tempErrors.type = t("vehicles.form.errors.type");
    if (!vehicle.assignedDriverId) tempErrors.assignedDriverId = t("vehicles.form.errors.driver");
    if (!vehicle.branchId) tempErrors.branchId = t("vehicles.form.errors.branch");
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave(vehicle);
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : handleClose} fullWidth maxWidth="sm">
      <DialogTitle>{initialData ? t("vehicles.form.editTitle") : t("vehicles.form.addTitle")}</DialogTitle>

      <DialogContent>
        <Stack spacing={2} mt={1}>
          <TextField
            select
            label={t("vehicles.form.branch")}
            name="branchId"
            value={vehicle.branchId || ""}
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
            label={t("vehicles.form.plateNumber")}
            name="plateNumber"
            value={vehicle.plateNumber}
            onChange={handleChange}
            error={!!errors.plateNumber}
            helperText={errors.plateNumber}
            fullWidth
          />

          <TextField
            label={t("vehicles.form.model")}
            name="model"
            value={vehicle.model}
            onChange={handleChange}
            error={!!errors.model}
            helperText={errors.model}
            fullWidth
          />

          <TextField
            label={t("vehicles.form.type")}
            name="type"
            value={vehicle.type}
            onChange={handleChange}
            error={!!errors.type}
            helperText={errors.type}
            fullWidth
          />

          <TextField
            select
            label={t("vehicles.form.assignedDriver")}
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
            label={t("vehicles.form.insuranceExpiry")}
            name="insuranceExpiry"
            value={vehicle.insuranceExpiry || ""}
            onChange={handleChange}
            InputLabelProps={{ shrink: true }}
            helperText={t("vehicles.form.insuranceExpiryHelper")}
            fullWidth
          />

          <TextField label={t("vehicles.form.status")} name="status" value={vehicle.status} onChange={handleChange} select fullWidth>
            <MenuItem value="Available">{t("vehicles.status.available")}</MenuItem>
            <MenuItem value="On Trip">{t("vehicles.status.onTrip")}</MenuItem>
            <MenuItem value="Maintenance">{t("vehicles.status.maintenance")}</MenuItem>
          </TextField>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={saving}>
          {t("common.cancel")}
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {saving ? t("common.saving") : t("common.save")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default VehicleForm;