import { useState, useEffect } from "react";
import DashboardLayout from "../../Layouts/DashboardLayout";
import AccidentTable from "../../components/tables/AccidentTable";
import AccidentForm from "../../components/forms/AccidentForm";
import {
  getAccidentReports,
  createAccidentReport,
  updateAccidentReport,
  deleteAccidentReport,
} from "../../services/accidentService";
import { getCurrentUser } from "../../services/authService";

import PageHeader from "../../components/common/PageHeader";
import SearchFilterBar from "../../components/common/SearchFilterBar";
import AppSnackbar from "../../components/common/AppSnackbar";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { Skeleton, Stack, Alert } from "@mui/material";

const Accidents = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  const [open, setOpen] = useState(false);
  const [editingReport, setEditingReport] = useState(null);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Driver has create + view only on Accidents (matrix: "C Own" + view
  // added in 025) — no update/delete, matches RLS (024 never granted a
  // Driver update/delete rights here).
  // Matrix: Accidents — Admin "F"; Transport Manager "C/E All" (no D);
  // Department Head "V Dept"; Driver "C Own"; Mechanic "V Assigned";
  // Finance "—"; Management "V". So create is Admin/Transport
  // Manager/Driver only, edit is Admin/Transport Manager only, and
  // delete is Admin only — everyone else is view-only or has no access.
  const role = getCurrentUser()?.role;
  const isAdmin = role === "admin";
  const isTransportManager = role === "transport_manager";
  const isDriver = role === "driver";

  const canCreate = isAdmin || isTransportManager || isDriver;
  const canEdit = isAdmin || isTransportManager;
  const canDelete = isAdmin;

  const loadReports = async () => {
    setLoading(true);
    const { data, usingMockData } = await getAccidentReports();
    setReports(data);
    setNotice(usingMockData ? "Backend not connected yet — showing sample data." : "");
    setLoading(false);
  };

  useEffect(() => {
    loadReports();
  }, []);

  const validateReport = (report) => {
    if (!report.vehicleId) return "Vehicle is required.";
    if (!report.driverId) return "Driver is required.";
    if (!report.location?.trim()) return "Location is required.";
    if (!report.description?.trim()) return "Description is required.";
    if (!report.date) return "Date is required.";
    return null;
  };

  const handleSave = async (report) => {
    const validationError = validateReport(report);
    if (validationError) {
      setSnackbar({ open: true, message: validationError, severity: "error" });
      return;
    }

    setSaving(true);
    try {
      if (editingReport) {
        const updated = await updateAccidentReport(editingReport.id, report);
        setReports(reports.map((r) => (r.id === editingReport.id ? updated : r)));
        setSnackbar({ open: true, message: "Accident report updated successfully!", severity: "success" });
      } else {
        const created = await createAccidentReport({ ...report, status: "Reported" });
        setReports([...reports, created]);
        setSnackbar({ open: true, message: "Accident reported successfully!", severity: "success" });
      }
      setEditingReport(null);
      setOpen(false);
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Couldn't save the accident report. Please try again.",
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (report) => {
    setEditingReport(report);
    setOpen(true);
  };

  const handleDelete = (id) => {
    const report = reports.find((r) => r.id === id);
    setReportToDelete(report);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await deleteAccidentReport(reportToDelete.id);
      setReports(reports.filter((r) => r.id !== reportToDelete.id));
      setSnackbar({ open: true, message: "Accident report deleted successfully!", severity: "success" });
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Couldn't delete the accident report. Please try again.",
        severity: "error",
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setReportToDelete(null);
    }
  };

  const severeCount = reports.filter((r) => r.severity === "Severe" && r.status !== "Resolved").length;

  const filteredReports = reports.filter((report) => {
    const matchesSearch =
      (report.vehicle || "").toLowerCase().includes(search.toLowerCase()) ||
      (report.driver || "").toLowerCase().includes(search.toLowerCase()) ||
      (report.location || "").toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === "All" || report.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <DashboardLayout>
      <PageHeader
        title="Accident Management"
        buttonText="Report Accident"
        onAdd={canCreate ? () => setOpen(true) : undefined}
      />

      {notice && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {notice}
        </Alert>
      )}

      {severeCount > 0 && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {severeCount} severe accident {severeCount === 1 ? "report is" : "reports are"} still open.
        </Alert>
      )}

      <SearchFilterBar
        search={search}
        setSearch={setSearch}
        status={statusFilter}
        setStatus={setStatusFilter}
        statusOptions={["All", "Reported", "Under Review", "Resolved"]}
        searchLabel="Search Vehicle, Driver, or Location"
      />

      <AccidentForm
        open={open}
        handleClose={() => {
          setOpen(false);
          setEditingReport(null);
        }}
        onSave={handleSave}
        initialData={editingReport}
        saving={saving}
      />

      {loading ? (
        <Stack spacing={1} sx={{ mt: 2 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={52} />
          ))}
        </Stack>
      ) : (
        <AccidentTable
          reports={filteredReports}
          onEdit={canEdit ? handleEdit : undefined}
          onDelete={canDelete ? handleDelete : undefined}
        />
      )}

      <AppSnackbar snackbar={snackbar} setSnackbar={setSnackbar} />

      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Accident Report"
        message={`Delete the accident report for ${reportToDelete?.vehicle || ""} on ${reportToDelete?.date || ""}?`}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        loading={deleting}
      />
    </DashboardLayout>
  );
};

export default Accidents;