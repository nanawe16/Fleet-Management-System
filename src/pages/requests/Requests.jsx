import { useState, useEffect } from "react";
import DashboardLayout from "../../Layouts/DashboardLayout";
import RequestTable from "../../components/tables/RequestTable";
import RequestForm from "../../components/forms/RequestForm";
import {
  getRequests,
  createRequest,
  submitRequest,
  updateRequest,
  deleteRequest,
  departmentApproveRequest,
  departmentRejectRequest,
  transportApproveRequest,
  transportRejectRequest,
  allocateRequest,
} from "../../services/requestService";
import { getVehicles } from "../../services/vehicleService";
import { getDrivers } from "../../services/driverService";
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
  MenuItem,
  Button,
} from "@mui/material";

const STATUS_OPTIONS = [
  "All",
  "DRAFT",
  "SUBMITTED",
  "DEPARTMENT_APPROVED",
  "TRANSPORT_APPROVED",
  "ALLOCATED",
  "IN_PROGRESS",
  "COMPLETED",
  "REJECTED",
];

const Requests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  const [open, setOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState(null);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // workflow action state
  const [processingId, setProcessingId] = useState(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [requestToReject, setRequestToReject] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  // allocation dialog state
  const [allocateDialogOpen, setAllocateDialogOpen] = useState(false);
  const [requestToAllocate, setRequestToAllocate] = useState(null);
  const [allocateVehicleId, setAllocateVehicleId] = useState("");
  const [allocateDriverId, setAllocateDriverId] = useState("");
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loadingAllocateOptions, setLoadingAllocateOptions] = useState(false);

  const currentUser = getCurrentUser();
  const role = currentUser?.role;
  const isAdmin = role === "admin";
  const isTransportManager = role === "transport_manager";
  const isDepartmentHead = role === "department_head";
  const isRequester = role === "requester";
  // Matrix: Admin/Transport Manager/Department Head can create+edit
  // ("C/E/A" for all three, scoped Dept for Dept Head via RLS); only
  // Admin can delete (027 removed delete rights from the other two).
  // Requester can create+edit too, but only their own DRAFT rows — see
  // restrictEditToOwnDraft passed to RequestTable below.
  const canCreateOrEdit = isAdmin || isTransportManager || isDepartmentHead || isRequester;

  const loadRequests = async () => {
    setLoading(true);
    const { data, usingMockData } = await getRequests();
    setRequests(data);
    setNotice(usingMockData ? "Backend not connected yet — showing sample data." : "");
    setLoading(false);
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const validateRequest = (request) => {
    if (!request.requester?.trim()) return "Requester is required.";
    if (!request.departmentId) return "Department is required.";
    if (!request.destination?.trim()) return "Destination is required.";
    if (!request.date) return "Date is required.";
    return null;
  };

  const handleSave = async (request) => {
    const validationError = validateRequest(request);
    if (validationError) {
      setSnackbar({ open: true, message: validationError, severity: "error" });
      return;
    }

    setSaving(true);
    try {
      if (editingRequest) {
        const updated = await updateRequest(editingRequest.id, request);
        setRequests(requests.map((r) => (r.id === editingRequest.id ? updated : r)));
        setSnackbar({
          open: true,
          message: "Request updated successfully!",
          severity: "success",
        });
      } else {
        // No status override here — createRequest no longer accepts one;
        // new requests default to SUBMITTED at the database level.
        const created = await createRequest(request);
        setRequests([...requests, created]);
        setSnackbar({
          open: true,
          message: "Request created successfully!",
          severity: "success",
        });
      }

      setEditingRequest(null);
      setOpen(false);
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.message || "Couldn't save the request. Please try again.",
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (request) => {
    setEditingRequest(request);
    setOpen(true);
  };

  const handleSubmitDraft = async (id) => {
    setProcessingId(id);
    try {
      const updated = await submitRequest(id);
      setRequests((current) => current.map((request) => (request.id === id ? updated : request)));
      setSnackbar({ open: true, message: "Request submitted.", severity: "success" });
    } catch (err) {
      setSnackbar({ open: true, message: err.message || "Couldn't submit the request.", severity: "error" });
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = (id) => {
    const request = requests.find((r) => r.id === id);
    setRequestToDelete(request);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await deleteRequest(requestToDelete.id);
      setRequests(requests.filter((r) => r.id !== requestToDelete.id));
      setSnackbar({
        open: true,
        message: "Request deleted successfully!",
        severity: "success",
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Couldn't delete the request. Please try again.",
        severity: "error",
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setRequestToDelete(null);
    }
  };

  // ===== Department Head: approve/reject a SUBMITTED request =====
  const handleDepartmentApprove = async (id) => {
    setProcessingId(id);
    try {
      const updated = await departmentApproveRequest(id);
      setRequests(requests.map((r) => (r.id === id ? updated : r)));
      setSnackbar({ open: true, message: "Request approved by department.", severity: "success" });
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.message || "Couldn't approve the request. Please try again.",
        severity: "error",
      });
    } finally {
      setProcessingId(null);
    }
  };

  // ===== Transport Manager: approve/reject a DEPARTMENT_APPROVED request =====
  const handleTransportApprove = async (id) => {
    setProcessingId(id);
    try {
      const updated = await transportApproveRequest(id);
      setRequests(requests.map((r) => (r.id === id ? updated : r)));
      setSnackbar({ open: true, message: "Request approved by Transport Manager.", severity: "success" });
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.message || "Couldn't approve the request. Please try again.",
        severity: "error",
      });
    } finally {
      setProcessingId(null);
    }
  };

  // Single reject dialog serves both stages — which function actually
  // gets called is decided by the request's status at the moment it was
  // opened (captured in requestToReject).
  const openRejectDialog = (id) => {
    const request = requests.find((r) => r.id === id);
    setRequestToReject(request);
    setRejectReason("");
    setRejectDialogOpen(true);
  };

  const confirmReject = async () => {
    setProcessingId(requestToReject.id);
    try {
      const rejectFn =
        requestToReject.status === "SUBMITTED" ? departmentRejectRequest : transportRejectRequest;
      const updated = await rejectFn(requestToReject.id, rejectReason);
      setRequests(requests.map((r) => (r.id === requestToReject.id ? updated : r)));
      setSnackbar({ open: true, message: "Request rejected.", severity: "success" });
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.message || "Couldn't reject the request. Please try again.",
        severity: "error",
      });
    } finally {
      setProcessingId(null);
      setRejectDialogOpen(false);
      setRequestToReject(null);
      setRejectReason("");
    }
  };

  // ===== Transport Manager: allocate a vehicle + driver =====
  const openAllocateDialog = async (id) => {
    const request = requests.find((r) => r.id === id);
    setRequestToAllocate(request);
    setAllocateVehicleId("");
    setAllocateDriverId("");
    setAllocateDialogOpen(true);

    setLoadingAllocateOptions(true);
    const [{ data: vehicleData }, { data: driverData }] = await Promise.all([getVehicles(), getDrivers()]);
    setVehicles(vehicleData);
    setDrivers(driverData);
    setLoadingAllocateOptions(false);
  };

  const confirmAllocate = async () => {
    if (!allocateVehicleId || !allocateDriverId) {
      setSnackbar({ open: true, message: "Select both a vehicle and a driver.", severity: "error" });
      return;
    }

    setProcessingId(requestToAllocate.id);
    try {
      const updated = await allocateRequest(requestToAllocate.id, allocateVehicleId, allocateDriverId);
      setRequests(requests.map((r) => (r.id === requestToAllocate.id ? updated : r)));
      setSnackbar({ open: true, message: "Vehicle and driver allocated — trip created.", severity: "success" });
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.message || "Couldn't allocate a vehicle. Please try again.",
        severity: "error",
      });
    } finally {
      setProcessingId(null);
      setAllocateDialogOpen(false);
      setRequestToAllocate(null);
      setAllocateVehicleId("");
      setAllocateDriverId("");
    }
  };

  const filteredRequests = requests.filter((request) => {
    const matchesSearch =
      request.requester.toLowerCase().includes(search.toLowerCase()) ||
      request.department.toLowerCase().includes(search.toLowerCase()) ||
      request.destination.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === "All" || request.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <DashboardLayout>
      <PageHeader
        title="Transport Requests"
        buttonText="New Request"
        onAdd={canCreateOrEdit ? () => setOpen(true) : undefined}
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
        statusOptions={STATUS_OPTIONS}
        searchLabel="Search Requests"
      />

      <RequestForm
        open={open}
        handleClose={() => {
          setOpen(false);
          setEditingRequest(null);
        }}
        onSave={handleSave}
        initialData={editingRequest}
        saving={saving}
      />

      {loading ? (
        <Stack spacing={1} sx={{ mt: 2 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={52} />
          ))}
        </Stack>
      ) : (
        <RequestTable
          requests={filteredRequests}
          onEdit={canCreateOrEdit ? handleEdit : undefined}
          onDelete={isAdmin ? handleDelete : undefined}
          onDepartmentApprove={isDepartmentHead ? handleDepartmentApprove : undefined}
          onDepartmentReject={isDepartmentHead ? openRejectDialog : undefined}
          onTransportApprove={isTransportManager ? handleTransportApprove : undefined}
          onTransportReject={isTransportManager ? openRejectDialog : undefined}
          onAllocate={isTransportManager ? openAllocateDialog : undefined}
          onSubmit={handleSubmitDraft}
          currentUserId={currentUser?.id}
          // A requester can only edit their own request while it's still
          // DRAFT (matches the DB's update policy) — everyone else who
          // can edit at all (Admin/TM/Dept Head) can edit any status, so
          // this only restricts the Requester case.
          restrictEditToOwnDraft={isRequester}
          processingId={processingId}
        />
      )}

      <AppSnackbar snackbar={snackbar} setSnackbar={setSnackbar} />

      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Request"
        message={`Delete request from ${requestToDelete?.requester || ""}?`}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        loading={deleting}
      />

      <Dialog open={rejectDialogOpen} onClose={() => setRejectDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>
          Reject request from {requestToReject?.requester || ""}?
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
            disabled={processingId === requestToReject?.id}
          >
            Reject
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={allocateDialogOpen} onClose={() => setAllocateDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>
          Allocate vehicle &amp; driver for {requestToAllocate?.requester || ""}?
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              select
              label="Vehicle"
              value={allocateVehicleId}
              onChange={(e) => setAllocateVehicleId(e.target.value)}
              disabled={loadingAllocateOptions}
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
              value={allocateDriverId}
              onChange={(e) => setAllocateDriverId(e.target.value)}
              disabled={loadingAllocateOptions}
              fullWidth
            >
              {drivers.map((driver) => (
                <MenuItem key={driver.id} value={driver.id}>
                  {driver.name} {driver.status ? `(${driver.status})` : ""}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAllocateDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={confirmAllocate}
            disabled={processingId === requestToAllocate?.id}
          >
            Allocate
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardLayout>
  );
};

export default Requests;