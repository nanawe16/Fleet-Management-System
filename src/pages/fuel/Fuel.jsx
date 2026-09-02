import { useState, useEffect } from "react";

import DashboardLayout from "../../Layouts/DashboardLayout";
import FuelTable from "../../components/tables/FuelTable";
import FuelForm from "../../components/forms/FuelForm";
import {
  getFuelRecords,
  createFuelRecord,
  updateFuelRecord,
  deleteFuelRecord,
  verifyFuelRecord,
  rejectFuelRecord,
} from "../../services/fuelService";
import { getCurrentUser } from "../../services/authService";

import PageHeader from "../../components/common/PageHeader";
import SearchFilterBar from "../../components/common/SearchFilterBar";
import AppSnackbar from "../../components/common/AppSnackbar";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import {
  Skeleton,
  Stack,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
} from "@mui/material";

const Fuel = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  const [open, setOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [fuelTypeFilter, setFuelTypeFilter] = useState("All");

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // verify/reject workflow state — mirrors Requests.jsx's approve/reject
  const [processingId, setProcessingId] = useState(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [recordToReject, setRecordToReject] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  // Only Finance can verify/reject (matrix: Fuel "V/A All"). RLS is the
  // real enforcement (022's trigger blocks anyone else's update anyway);
  // this just decides whether FuelTable shows the buttons at all.
  const isFinance = getCurrentUser()?.role === "finance_officer";

  // Edit/Delete on Fuel are Admin-only per the matrix (Admin "F";
  // everyone else is at most "V All" or "C Own" — Transport Manager,
  // Finance, and Management are view-only, matching 022's RLS which
  // never granted them insert/update/delete on fuel_records either).
  const isAdmin = getCurrentUser()?.role === "admin";

  // Create is Admin + Driver only (matrix: Admin "F", Driver "C Own" —
  // every other role, including Transport Manager, is view-only on this
  // module). 022 never granted Transport Manager an insert policy on
  // fuel_records either, so this matches what the database actually
  // allows.
  const canCreate = isAdmin || getCurrentUser()?.role === "driver";

  const loadRecords = async () => {
    setLoading(true);
    const { data, usingMockData } = await getFuelRecords();
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
    if (!record.driverId) {
      return "Driver is required.";
    }
    if (!record.liters || Number(record.liters) <= 0) {
      return "Liters must be a positive number.";
    }
    if (!record.cost || Number(record.cost) <= 0) {
      return "Cost must be a positive number.";
    }
    if (!record.date) {
      return "Date is required.";
    }
    if (new Date(record.date) > new Date()) {
      return "Fuel date can't be in the future.";
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
        const updated = await updateFuelRecord(editingRecord.id, record);
        setRecords(records.map((r) => (r.id === editingRecord.id ? updated : r)));
        setSnackbar({
          open: true,
          message: "Fuel record updated successfully!",
          severity: "success",
        });
      } else {
        const created = await createFuelRecord(record);
        setRecords([...records, created]);
        setSnackbar({
          open: true,
          message: "Fuel record added successfully!",
          severity: "success",
        });
      }

      setEditingRecord(null);
      setOpen(false);
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Couldn't save the fuel record. Please try again.",
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
      await deleteFuelRecord(recordToDelete.id);
      setRecords(records.filter((r) => r.id !== recordToDelete.id));
      setSnackbar({
        open: true,
        message: "Fuel record deleted successfully!",
        severity: "success",
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Couldn't delete the fuel record. Please try again.",
        severity: "error",
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setRecordToDelete(null);
    }
  };

  const handleVerify = async (id) => {
    setProcessingId(id);
    try {
      const updated = await verifyFuelRecord(id);
      setRecords(records.map((r) => (r.id === id ? updated : r)));
      setSnackbar({ open: true, message: "Fuel record verified.", severity: "success" });
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Couldn't verify the fuel record. Please try again.",
        severity: "error",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const openRejectDialog = (id) => {
    const record = records.find((r) => r.id === id);
    setRecordToReject(record);
    setRejectReason("");
    setRejectDialogOpen(true);
  };

  const confirmReject = async () => {
    setProcessingId(recordToReject.id);
    try {
      const updated = await rejectFuelRecord(recordToReject.id, rejectReason);
      setRecords(records.map((r) => (r.id === recordToReject.id ? updated : r)));
      setSnackbar({ open: true, message: "Fuel record rejected.", severity: "success" });
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Couldn't reject the fuel record. Please try again.",
        severity: "error",
      });
    } finally {
      setProcessingId(null);
      setRejectDialogOpen(false);
      setRecordToReject(null);
      setRejectReason("");
    }
  };

  const filteredRecords = records.filter((record) => {
    const matchesSearch =
      (record.vehicle || "").toLowerCase().includes(search.toLowerCase()) ||
      (record.driver || "").toLowerCase().includes(search.toLowerCase());

    const matchesFuelType = fuelTypeFilter === "All" || record.fuelType === fuelTypeFilter;

    return matchesSearch && matchesFuelType;
  });

  return (
    <DashboardLayout>
      <PageHeader
        title="Fuel Management"
        buttonText="Add Fuel Record"
        onAdd={canCreate ? () => setOpen(true) : undefined}
      />

      {notice && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {notice}
        </Alert>
      )}

      <SearchFilterBar
        search={search}
        setSearch={setSearch}
        status={fuelTypeFilter}
        setStatus={setFuelTypeFilter}
        statusOptions={["All", "Diesel", "Petrol"]}
        searchLabel="Search Vehicle or Driver"
      />

      <FuelForm
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
        <FuelTable
          records={filteredRecords}
          onEdit={isAdmin ? handleEdit : undefined}
          onDelete={isAdmin ? handleDelete : undefined}
          onVerify={isFinance ? handleVerify : undefined}
          onReject={isFinance ? openRejectDialog : undefined}
          processingId={processingId}
        />
      )}

      <AppSnackbar snackbar={snackbar} setSnackbar={setSnackbar} />

      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Fuel Record"
        message={`Delete fuel record for ${recordToDelete?.vehicle || ""}?`}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        loading={deleting}
      />

      <Dialog open={rejectDialogOpen} onClose={() => setRejectDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>
          Reject fuel record for {recordToReject?.vehicle || ""}?
        </DialogTitle>
        <DialogContent>
          <TextField
            label="Reason (optional)"
            fullWidth
            multiline
            minRows={2}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={confirmReject}
            disabled={processingId === recordToReject?.id}
          >
            Reject
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardLayout>
  );
};

export default Fuel;