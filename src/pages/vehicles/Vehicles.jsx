import { useState, useEffect } from "react";

import DashboardLayout from "../../Layouts/DashboardLayout";
import VehicleTable from "../../components/tables/VehicleTable";
import VehicleForm from "../../components/forms/VehicleForm";
import {
  getVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
} from "../../services/vehicleService";
import PageHeader from "../../components/common/PageHeader";
import SearchFilterBar from "../../components/common/SearchFilterBar";
import AppSnackbar from "../../components/common/AppSnackbar";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { Skeleton, Stack, Alert } from "@mui/material";
import { getCurrentUser } from "../../services/authService";

const Vehicles = () => {
  const role = getCurrentUser()?.role;
  const canManageVehicles = role === "admin" || role === "transport_manager";
  const canDeleteVehicles = role === "admin";
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  const [open, setOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [vehicleToDelete, setVehicleToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const loadVehicles = async () => {
    setLoading(true);
    const { data, usingMockData } = await getVehicles();
    setVehicles(data);
    setNotice(usingMockData ? "Backend not connected yet — showing sample data." : "");
    setLoading(false);
  };

  useEffect(() => {
    loadVehicles();
  }, []);

  const isDuplicatePlate = (plateNumber, ignoreId = null) =>
    vehicles.some(
      (v) =>
        v.id !== ignoreId &&
        v.plateNumber.trim().toLowerCase() === plateNumber.trim().toLowerCase()
    );

  const handleEdit = (vehicle) => {
    setEditingVehicle(vehicle);
    setOpen(true);
  };

  const handleSaveVehicle = async (vehicle) => {
    if (isDuplicatePlate(vehicle.plateNumber, editingVehicle?.id)) {
      setSnackbar({
        open: true,
        message: `Plate number "${vehicle.plateNumber}" is already registered to another vehicle.`,
        severity: "error",
      });
      return;
    }

    setSaving(true);
    try {
      if (editingVehicle) {
        const updated = await updateVehicle(editingVehicle.id, vehicle);
        setVehicles(vehicles.map((v) => (v.id === editingVehicle.id ? updated : v)));
        setSnackbar({
          open: true,
          message: "Vehicle updated successfully!",
          severity: "success",
        });
      } else {
        const created = await createVehicle(vehicle);
        setVehicles([...vehicles, created]);
        setSnackbar({
          open: true,
          message: "Vehicle added successfully!",
          severity: "success",
        });
      }

      setEditingVehicle(null);
      setOpen(false);
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Couldn't save the vehicle. Please try again.",
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id) => {
    const vehicle = vehicles.find((v) => v.id === id);
    setVehicleToDelete(vehicle);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await deleteVehicle(vehicleToDelete.id);
      setVehicles(vehicles.filter((v) => v.id !== vehicleToDelete.id));
      setSnackbar({
        open: true,
        message: "Vehicle deleted successfully!",
        severity: "success",
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Couldn't delete the vehicle. Please try again.",
        severity: "error",
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setVehicleToDelete(null);
    }
  };

  const filteredVehicles = vehicles.filter((vehicle) => {
    const matchesSearch =
      vehicle.plateNumber.toLowerCase().includes(search.toLowerCase()) ||
      vehicle.model.toLowerCase().includes(search.toLowerCase()) ||
      vehicle.type.toLowerCase().includes(search.toLowerCase()) ||
      vehicle.driver.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === "All" || vehicle.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <DashboardLayout>
      <PageHeader
        title={role === "driver" ? "My Vehicle" : "Vehicle Management"}
        buttonText="Add Vehicle"
        onAdd={canManageVehicles ? () => setOpen(true) : undefined}
      />

      {notice && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {notice}
        </Alert>
      )}

      <SearchFilterBar
        search={search}
        setSearch={setSearch}
        status={statusFilter}
        setStatus={setStatusFilter}
        statusOptions={["All", "Available", "On Trip", "Maintenance"]}
        searchLabel="Search Vehicles"
      />

      <VehicleForm
        open={open}
        handleClose={() => {
          setOpen(false);
          setEditingVehicle(null);
        }}
        onSave={handleSaveVehicle}
        initialData={editingVehicle}
        saving={saving}
      />

      {loading ? (
        <Stack spacing={1} sx={{ mt: 2 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={52} />
          ))}
        </Stack>
      ) : (
        <VehicleTable
          vehicles={filteredVehicles}
          onEdit={canManageVehicles ? handleEdit : undefined}
          onDelete={canDeleteVehicles ? handleDelete : undefined}
        />
      )}

      <AppSnackbar snackbar={snackbar} setSnackbar={setSnackbar} />

      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Vehicle"
        message={`Are you sure you want to delete ${vehicleToDelete?.model || ""} (${vehicleToDelete?.plateNumber || ""})?`}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        loading={deleting}
      />
    </DashboardLayout>
  );
};

export default Vehicles;
