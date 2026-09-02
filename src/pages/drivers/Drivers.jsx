import { useState, useEffect } from "react";

import DashboardLayout from "../../Layouts/DashboardLayout";
import DriverTable from "../../components/tables/DriverTable";
import DriverForm from "../../components/forms/DriverForm";
import {
  getDrivers,
  createDriver,
  updateDriver,
  deleteDriver,
} from "../../services/driverService";
import PageHeader from "../../components/common/PageHeader";
import SearchFilterBar from "../../components/common/SearchFilterBar";
import AppSnackbar from "../../components/common/AppSnackbar";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { Skeleton, Stack, Alert } from "@mui/material";
import { getCurrentUser } from "../../services/authService";

const Drivers = () => {
  const role = getCurrentUser()?.role;
  const canManageDrivers = role === "admin" || role === "transport_manager";
  const canDeleteDrivers = role === "admin";
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  const [open, setOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [driverToDelete, setDriverToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadDrivers = async () => {
    setLoading(true);
    const { data, usingMockData } = await getDrivers();
    setDrivers(data);
    setNotice(usingMockData ? "Backend not connected yet — showing sample data." : "");
    setLoading(false);
  };

  useEffect(() => {
    loadDrivers();
  }, []);

  const isDuplicateLicense = (licenseNumber, ignoreId = null) =>
    drivers.some(
      (d) =>
        d.id !== ignoreId &&
        d.licenseNumber.trim().toLowerCase() === licenseNumber.trim().toLowerCase()
    );

  const handleSaveDriver = async (driver) => {
    if (isDuplicateLicense(driver.licenseNumber, editingDriver?.id)) {
      setSnackbar({
        open: true,
        message: `License number "${driver.licenseNumber}" is already assigned to another driver.`,
        severity: "error",
      });
      return;
    }

    setSaving(true);
    try {
      if (editingDriver) {
        const updated = await updateDriver(editingDriver.id, driver);
        setDrivers(drivers.map((d) => (d.id === editingDriver.id ? updated : d)));
        setSnackbar({
          open: true,
          message: "Driver updated successfully!",
          severity: "success",
        });
      } else {
        const created = await createDriver(driver);
        setDrivers([...drivers, created]);
        setSnackbar({
          open: true,
          message: "Driver added successfully!",
          severity: "success",
        });
      }

      setEditingDriver(null);
      setOpen(false);
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Couldn't save the driver. Please try again.",
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (driver) => {
    setEditingDriver(driver);
    setOpen(true);
  };

  const handleDelete = (id) => {
    const driver = drivers.find((d) => d.id === id);
    setDriverToDelete(driver);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await deleteDriver(driverToDelete.id);
      setDrivers(drivers.filter((d) => d.id !== driverToDelete.id));
      setSnackbar({
        open: true,
        message: "Driver deleted successfully!",
        severity: "success",
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Couldn't delete the driver. Please try again.",
        severity: "error",
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setDriverToDelete(null);
    }
  };

  const filteredDrivers = drivers.filter((driver) => {
    const matchesSearch =
      driver.name.toLowerCase().includes(search.toLowerCase()) ||
      driver.licenseNumber.toLowerCase().includes(search.toLowerCase()) ||
      driver.phone.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === "All" || driver.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <DashboardLayout>
      <PageHeader
        title={role === "driver" ? "My Driver Profile" : "Driver Management"}
        buttonText="Add Driver"
        onAdd={canManageDrivers ? () => setOpen(true) : undefined}
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
        statusOptions={["All", "Available", "On Trip", "Leave"]}
        searchLabel="Search Drivers"
      />

      <DriverForm
        open={open}
        handleClose={() => {
          setOpen(false);
          setEditingDriver(null);
        }}
        onSave={handleSaveDriver}
        initialData={editingDriver}
        saving={saving}
      />

      {loading ? (
        <Stack spacing={1} sx={{ mt: 2 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={52} />
          ))}
        </Stack>
      ) : (
        <DriverTable
          drivers={filteredDrivers}
          onEdit={canManageDrivers ? handleEdit : undefined}
          onDelete={canDeleteDrivers ? handleDelete : undefined}
        />
      )}

      <AppSnackbar snackbar={snackbar} setSnackbar={setSnackbar} />

      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Driver"
        message={`Are you sure you want to delete ${driverToDelete?.name || ""}?`}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        loading={deleting}
      />
    </DashboardLayout>
  );
};

export default Drivers;
