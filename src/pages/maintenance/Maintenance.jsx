import { useState, useEffect } from "react";

import DashboardLayout from "../../Layouts/DashboardLayout";
import MaintenanceTable from "../../components/tables/MaintenanceTable";
import MaintenanceForm from "../../components/forms/MaintenanceForm";
import {
  getMaintenanceRecords,
  createMaintenanceRecord,
  updateMaintenanceRecord,
  deleteMaintenanceRecord,
} from "../../services/maintenanceService";
import { getCurrentUser } from "../../services/authService";

import PageHeader from "../../components/common/PageHeader";
import SearchFilterBar from "../../components/common/SearchFilterBar";
import AppSnackbar from "../../components/common/AppSnackbar";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { Skeleton, Stack, Alert } from "@mui/material";

const isOverdue = (record) =>
  record.status === "Scheduled" && new Date(record.date) < new Date();

const Maintenance = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  const [open, setOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Role-based gating for create/edit/delete — see the matrix in the
  // Technical Documentation (Section 3) for the full picture per role.
  const currentUser = getCurrentUser();
  const role = currentUser?.role;
  const isAdmin = role === "admin";
  const isTransportManager = role === "transport_manager";
  const isMechanic = role === "mechanic";
  const isDriver = role === "driver";

  // Create: Admin (F), Transport Manager (Schedule), Mechanic (can
  // self-log a job against their own assignment), Driver (C Report).
  // Finance, Management, and Department Head have no create right on
  // this module at all.
  const canCreate = isAdmin || isTransportManager || isMechanic || isDriver;

  // Edit: Admin (F) and Transport Manager (Schedule) can edit any row.
  // Mechanic can edit too, but only rows assigned to them (F Assigned,
  // not F All) — enforced per-row below via canEdit. Driver/Finance/
  // Management get no edit at all.
  const canEditAny = isAdmin || isTransportManager || isMechanic;

  // Delete: Admin (F) can delete any row. Transport Manager's matrix
  // entry is "V/Schedule" — no D — so no delete at all, even though
  // they can edit. Mechanic can delete only their own assigned rows,
  // same per-row restriction as edit.
  const canDeleteAny = isAdmin || isMechanic;

  // Mechanic-only per-row restriction: only rows assigned to this
  // mechanic (record.mechanicId === their own profile id) are
  // editable/deletable. Admin and Transport Manager are intentionally
  // left unrestricted here (undefined = "every row"), since their
  // matrix rights aren't row-scoped.
  const mechanicOwnRow = (record) => record.mechanicId === currentUser?.id;
  const rowEditRestriction = isMechanic ? mechanicOwnRow : undefined;
  const rowDeleteRestriction = isMechanic ? mechanicOwnRow : undefined;

  const loadRecords = async () => {
    setLoading(true);
    const { data, usingMockData } = await getMaintenanceRecords();
    setRecords(data);
    setNotice(usingMockData ? "Backend not connected yet — showing sample data." : "");
    setLoading(false);
  };

  useEffect(() => {
    loadRecords();
  }, []);

  const validateRecord = (record) => {
    if (!record.vehicleId) {
      return "Vehicle is required.";
    }
    if (!record.serviceType?.trim()) {
      return "Service type is required.";
    }
    if (!record.cost || Number(record.cost) <= 0) {
      return "Cost must be a positive number.";
    }
    if (!record.date) {
      return "Date is required.";
    }
    return null;
  };

  const handleSave = async (record) => {
    const validationError = validateRecord(record);
    if (validationError) {
      setSnackbar({ open: true, message: validationError, severity: "error" });
      return;
    }

    setSaving(true);
    try {
      if (editingRecord) {
        const updated = await updateMaintenanceRecord(editingRecord.id, record);
        setRecords(records.map((r) => (r.id === editingRecord.id ? updated : r)));
        setSnackbar({
          open: true,
          message: "Maintenance record updated successfully!",
          severity: "success",
        });
      } else {
        const created = await createMaintenanceRecord(record);
        setRecords([...records, created]);
        setSnackbar({
          open: true,
          message: "Maintenance record added successfully!",
          severity: "success",
        });
      }

      setEditingRecord(null);
      setOpen(false);
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Couldn't save the maintenance record. Please try again.",
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    setOpen(true);
  };

  const handleDelete = (id) => {
    const record = records.find((r) => r.id === id);
    setRecordToDelete(record);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await deleteMaintenanceRecord(recordToDelete.id);
      setRecords(records.filter((r) => r.id !== recordToDelete.id));
      setSnackbar({
        open: true,
        message: "Maintenance record deleted successfully!",
        severity: "success",
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Couldn't delete the maintenance record. Please try again.",
        severity: "error",
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setRecordToDelete(null);
    }
  };

  const filteredRecords = records.filter((record) => {
    const matchesSearch =
      (record.vehicle || "").toLowerCase().includes(search.toLowerCase()) ||
      (record.serviceType || "").toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === "All" || record.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const overdueCount = records.filter(isOverdue).length;

  // mark overdue rows so MaintenanceTable can highlight them without
  // needing to duplicate the date-comparison logic itself
  const displayRecords = filteredRecords.map((r) => ({
    ...r,
    overdue: isOverdue(r),
  }));

  return (
    <DashboardLayout>
      <PageHeader
        title="Maintenance Management"
        buttonText="Add Maintenance"
        onAdd={canCreate ? () => setOpen(true) : undefined}
      />

      {notice && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {notice}
        </Alert>
      )}

      {overdueCount > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {overdueCount} scheduled maintenance {overdueCount === 1 ? "record is" : "records are"} overdue.
        </Alert>
      )}

      <SearchFilterBar
        search={search}
        setSearch={setSearch}
        status={statusFilter}
        setStatus={setStatusFilter}
        statusOptions={["All", "Scheduled", "Completed"]}
        searchLabel="Search Vehicle or Service"
      />

      <MaintenanceForm
        open={open}
        handleClose={() => {
          setOpen(false);
          setEditingRecord(null);
        }}
        onSave={handleSave}
        initialData={editingRecord}
        saving={saving}
      />

      {loading ? (
        <Stack spacing={1} sx={{ mt: 2 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={52} />
          ))}
        </Stack>
      ) : (
        <MaintenanceTable
          records={displayRecords}
          onEdit={canEditAny ? handleEdit : undefined}
          onDelete={canDeleteAny ? handleDelete : undefined}
          canEdit={rowEditRestriction}
          canDelete={rowDeleteRestriction}
        />
      )}

      <AppSnackbar snackbar={snackbar} setSnackbar={setSnackbar} />

      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Maintenance Record"
        message={`Delete maintenance record for ${recordToDelete?.vehicle || ""}?`}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        loading={deleting}
      />
    </DashboardLayout>
  );
};

export default Maintenance;