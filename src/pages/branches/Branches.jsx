import { useState, useEffect } from "react";
import DashboardLayout from "../../Layouts/DashboardLayout";
import BranchTable from "../../components/tables/BranchTable";
import BranchForm from "../../components/forms/BranchForm";
import { getBranches, createBranch, updateBranch, deleteBranch } from "../../services/branchService";
import { getCurrentUser } from "../../services/authService";

import PageHeader from "../../components/common/PageHeader";
import SearchFilterBar from "../../components/common/SearchFilterBar";
import AppSnackbar from "../../components/common/AppSnackbar";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { Skeleton, Stack, Alert } from "@mui/material";

const STATUS_OPTIONS = ["All", "Active", "Inactive"];

const Branches = () => {
  console.log("BRANCHES COMPONENT RENDERED");

  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  const [open, setOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [branchToDelete, setBranchToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const role = getCurrentUser()?.role;
  // Only Admin/Super Admin manage branches — matches the RLS policy on
  // the branches table itself, so this is a UX guard mirroring a real
  // database restriction, not the only thing enforcing it.
  const isAdmin = role === "admin" || role === "super_admin";

  const loadBranches = async () => {
    setLoading(true);
    const { data, usingMockData } = await getBranches();
    setBranches(data);
    setNotice(usingMockData ? "Backend not connected yet — showing sample data." : "");
    setLoading(false);
  };

  useEffect(() => {
    loadBranches();
  }, []);

  const handleSave = async (branch) => {
    setSaving(true);
    try {
      if (editingBranch) {
        const updated = await updateBranch(editingBranch.id, branch);
        setBranches(branches.map((b) => (b.id === editingBranch.id ? updated : b)));
        setSnackbar({ open: true, message: "Branch updated successfully!", severity: "success" });
      } else {
        const created = await createBranch(branch);
        setBranches([...branches, created]);
        setSnackbar({ open: true, message: "Branch added successfully!", severity: "success" });
      }
      setEditingBranch(null);
      setOpen(false);
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.message || "Couldn't save the branch. Please try again.",
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (branch) => {
    setEditingBranch(branch);
    setOpen(true);
  };

  const handleDelete = (id) => {
    const branch = branches.find((b) => b.id === id);
    setBranchToDelete(branch);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await deleteBranch(branchToDelete.id);
      setBranches(branches.filter((b) => b.id !== branchToDelete.id));
      setSnackbar({ open: true, message: "Branch deleted successfully!", severity: "success" });
    } catch (err) {
      // Most likely a foreign-key violation — departments/vehicles/
      // drivers/profiles still reference this branch. Surface the real
      // reason instead of a generic failure message.
      setSnackbar({
        open: true,
        message:
          err.message?.includes("foreign key")
            ? "Can't delete this branch — departments, vehicles, or drivers are still assigned to it. Deactivate it instead."
            : err.message || "Couldn't delete the branch. Please try again.",
        severity: "error",
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setBranchToDelete(null);
    }
  };

  const filteredBranches = branches.filter((branch) => {
    const matchesSearch =
      branch.name.toLowerCase().includes(search.toLowerCase()) ||
      branch.code.toLowerCase().includes(search.toLowerCase()) ||
      branch.location.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "All" ||
      (statusFilter === "Active" && branch.isActive) ||
      (statusFilter === "Inactive" && !branch.isActive);

    return matchesSearch && matchesStatus;
  });

  return (
    <DashboardLayout>
      <PageHeader
        title="Branches"
        buttonText="New Branch"
        onAdd={isAdmin ? () => setOpen(true) : undefined}
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
        searchLabel="Search Branches"
      />

      <BranchForm
        open={open}
        handleClose={() => {
          setOpen(false);
          setEditingBranch(null);
        }}
        onSave={handleSave}
        initialData={editingBranch}
        saving={saving}
      />

      {loading ? (
        <Stack spacing={1} sx={{ mt: 2 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={52} />
          ))}
        </Stack>
      ) : (
        <BranchTable
          branches={filteredBranches}
          onEdit={isAdmin ? handleEdit : undefined}
          onDelete={isAdmin ? handleDelete : undefined}
        />
      )}

      <AppSnackbar snackbar={snackbar} setSnackbar={setSnackbar} />

      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Branch"
        message={`Delete "${branchToDelete?.name || ""}"? This can't be undone.`}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        loading={deleting}
      />
    </DashboardLayout>
  );
};

export default Branches;