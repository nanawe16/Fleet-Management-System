import { useState, useEffect } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import UserForm from "../../components/forms/UserForm";
import { getAllUsers, updateUserProfile, createUser, deleteUser, updateUserEmail } from "../../services/userService";
import { getCurrentUser } from "../../services/authService";
import PageHeader from "../../components/common/PageHeader";
import AppSnackbar from "../../components/common/AppSnackbar";
import {
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Box,
  Typography,
  Skeleton,
  Alert,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import PersonOffIcon from "@mui/icons-material/PersonOff";
import GroupIcon from "@mui/icons-material/Group";

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [open, setOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [saving, setSaving] = useState(false);

  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const [deletingUser, setDeletingUser] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const currentUserId = getCurrentUser()?.id;

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await getAllUsers();
      setUsers(data);
      setError("");
    } catch (err) {
      setError(
        "Couldn't load users. This page requires admin access — make sure you're signed in as an admin and the admin RLS policies have been applied."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleNew = () => {
    setEditingUser(null);
    setOpen(true);
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setOpen(true);
  };

  const handleSave = async (form) => {
    setSaving(true);
    try {
      if (editingUser) {
        const updated = await updateUserProfile(editingUser.id, form);
        setUsers(users.map((u) => (u.id === editingUser.id ? updated : u)));

        // Email is a separate, privileged operation (its own Edge
        // Function) — handled after the profile fields succeed, and
        // reported on its own, so a failure here doesn't look like it
        // undid the name/phone/role/department changes that already
        // saved fine.
        if (form.newEmail?.trim()) {
          try {
            await updateUserEmail(editingUser.id, form.newEmail.trim());
            setSnackbar({ open: true, message: "User updated and email changed successfully!", severity: "success" });
          } catch (emailErr) {
            setSnackbar({
              open: true,
              message: `User details saved, but the email change failed: ${emailErr.message || "please try again."}`,
              severity: "error",
            });
            setEditingUser(null);
            setOpen(false);
            return;
          }
        } else {
          setSnackbar({ open: true, message: "User updated successfully!", severity: "success" });
        }
      } else {
        await createUser(form);
        setSnackbar({ open: true, message: "User created successfully!", severity: "success" });
        await loadUsers();
      }
      setEditingUser(null);
      setOpen(false);
    } catch (err) {
      setSnackbar({ open: true, message: err.message || "Couldn't save changes. Please try again.", severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingUser) return;
    setDeleting(true);
    try {
      await deleteUser(deletingUser.id);
      setUsers(users.filter((u) => u.id !== deletingUser.id));
      setSnackbar({ open: true, message: "User deleted.", severity: "success" });
      setDeletingUser(null);
    } catch (err) {
      // Left the dialog open on failure — most failures here are the
      // "this account has history, deactivate it instead" case, and
      // the admin should see that message right next to the account
      // they were trying to delete, not lose that context to a toast.
      setSnackbar({ open: true, message: err.message || "Couldn't delete this user.", severity: "error" });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <DashboardLayout>
      <PageHeader title="User Management" buttonText="New User" onAdd={handleNew} />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Stack spacing={1}>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={52} />
          ))}
        </Stack>
      ) : users.length === 0 ? (
        <Paper sx={{ p: 5, textAlign: "center", borderRadius: 3 }}>
          <GroupIcon sx={{ fontSize: 40, color: "text.disabled", mb: 1 }} />
          <Typography variant="body1" color="text.secondary">
            No users found.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id} hover>
                  <TableCell>{user.full_name || "—"}</TableCell>
                  <TableCell>{user.phone || "—"}</TableCell>
                  <TableCell>
                    <Chip label={user.role.replace(/_/g, " ")} size="small" />
                  </TableCell>
                  <TableCell>
                    {user.is_active ? (
                      <Chip label="Active" color="success" size="small" />
                    ) : (
                      <Chip
                        icon={<PersonOffIcon fontSize="small" />}
                        label="Deactivated"
                        color="default"
                        size="small"
                      />
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => handleEdit(user)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={user.id === currentUserId ? "You can't delete your own account" : "Delete"}>
                      <span>
                        <IconButton
                          size="small"
                          color="error"
                          disabled={user.id === currentUserId}
                          onClick={() => setDeletingUser(user)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <UserForm
        open={open}
        handleClose={() => {
          setOpen(false);
          setEditingUser(null);
        }}
        onSave={handleSave}
        initialData={editingUser}
        saving={saving}
      />

      <Dialog open={!!deletingUser} onClose={() => (!deleting ? setDeletingUser(null) : null)}>
        <DialogTitle>Delete {deletingUser?.full_name}?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This permanently deletes their login and profile — unlike deactivating, this can't be
            undone. If this account has any history (submitted requests, a driver record,
            approvals, etc.), the deletion will be refused automatically; deactivate it instead in
            that case.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeletingUser(null)} disabled={deleting}>
            Cancel
          </Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained" disabled={deleting}>
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      <AppSnackbar snackbar={snackbar} setSnackbar={setSnackbar} />
    </DashboardLayout>
  );
};

export default UserManagement;