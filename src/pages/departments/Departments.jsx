import { useState, useEffect } from "react";
import DashboardLayout from "../../Layouts/DashboardLayout";
import DepartmentTable from "../../components/tables/DepartmentTable";
import DepartmentForm from "../../components/forms/DepartmentForm";
import {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from "../../services/departmentService";

import PageHeader from "../../components/common/PageHeader";
import SearchFilterBar from "../../components/common/SearchFilterBar";
import AppSnackbar from "../../components/common/AppSnackbar";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { Skeleton, Stack, Alert } from "@mui/material";
import { getCurrentUser } from "../../services/authService";

const Departments = () => {
  const isAdmin = getCurrentUser()?.role === "admin";
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  const [open, setOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [departmentToDelete, setDepartmentToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadDepartments = async () => {
    setLoading(true);
    const { data, usingMockData } = await getDepartments();
    setDepartments(data);
    setNotice(usingMockData ? "Backend not connected yet — showing sample data." : "");
    setLoading(false);
  };

  useEffect(() => {
    loadDepartments();
  }, []);

  const isDuplicateName = (name, ignoreId = null) =>
    departments.some(
      (d) =>
        d.id !== ignoreId &&
        d.name.trim().toLowerCase() === name.trim().toLowerCase()
    );

  const handleSaveDepartment = async (department) => {
    if (isDuplicateName(department.name, editingDepartment?.id)) {
      setSnackbar({
        open: true,
        message: `A department named "${department.name}" already exists.`,
        severity: "error",
      });
      return;
    }

    setSaving(true);
    try {
      if (editingDepartment) {
        const updated = await updateDepartment(editingDepartment.id, department);
        setDepartments(
          departments.map((d) => (d.id === editingDepartment.id ? updated : d))
        );
        setSnackbar({
          open: true,
          message: "Department updated successfully!",
          severity: "success",
        });
      } else {
        const created = await createDepartment(department);
        setDepartments([...departments, created]);
        setSnackbar({
          open: true,
          message: "Department added successfully!",
          severity: "success",
        });
      }

      setEditingDepartment(null);
      setOpen(false);
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Couldn't save the department. Please try again.",
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (department) => {
    setEditingDepartment(department);
    setOpen(true);
  };

  const handleDelete = (id) => {
    const department = departments.find((d) => d.id === id);
    setDepartmentToDelete(department);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await deleteDepartment(departmentToDelete.id);
      setDepartments(departments.filter((d) => d.id !== departmentToDelete.id));
      setSnackbar({
        open: true,
        message: "Department deleted successfully!",
        severity: "success",
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Couldn't delete the department. Please try again.",
        severity: "error",
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setDepartmentToDelete(null);
    }
  };

  const filteredDepartments = departments.filter((department) => {
    const matchesSearch =
      department.name.toLowerCase().includes(search.toLowerCase()) ||
      department.manager.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "All" || department.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <DashboardLayout>
      <PageHeader
        title="Department Management"
        buttonText="Add Department"
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
        statusOptions={["All", "Active", "Inactive"]}
        searchLabel="Search Departments"
      />

      <DepartmentForm
        open={open}
        handleClose={() => {
          setOpen(false);
          setEditingDepartment(null);
        }}
        onSave={handleSaveDepartment}
        initialData={editingDepartment}
        saving={saving}
      />

      {loading ? (
        <Stack spacing={1} sx={{ mt: 2 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={52} />
          ))}
        </Stack>
      ) : (
        <DepartmentTable
          departments={filteredDepartments}
          onEdit={isAdmin ? handleEdit : undefined}
          onDelete={isAdmin ? handleDelete : undefined}
        />
      )}

      <AppSnackbar snackbar={snackbar} setSnackbar={setSnackbar} />

      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Department"
        message={`Are you sure you want to delete ${departmentToDelete?.name || ""}?`}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        loading={deleting}
      />
    </DashboardLayout>
  );
};

export default Departments;
