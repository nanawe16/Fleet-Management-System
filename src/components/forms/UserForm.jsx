import { useState, useEffect } from "react";
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
  FormControlLabel,
  Switch,
  FormHelperText,
  InputAdornment,
  IconButton,
  Tooltip,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { getDepartments } from "../../services/departmentService";

// Cheap, dependency-free random password — not for anything beyond a
// one-time credential the admin hands off and the person is expected to
// change on first login (per the helper text below the field).
const generateTempPassword = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  let out = "";
  for (let i = 0; i < 12; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
};

const ROLE_OPTIONS = [
  "admin",
  "transport_manager",
  "department_head",
  "driver",
  "mechanic",
  "finance_officer",
  // Was "management" — every RLS policy and the Sidebar's role arrays
  // consistently use "vice_president"; a user saved with "management"
  // would match no policy at all and effectively have no access.
  "vice_president",
  "requester",
];

const UserForm = ({ open, handleClose, onSave, initialData, saving = false }) => {
  const isNewUser = !initialData;
  const [form, setForm] = useState({
    email: "",
    password: "",
    newEmail: "",
    full_name: "",
    phone: "",
    role: "transport_manager",
    is_active: true,
    department_id: "",
  });
  const [errors, setErrors] = useState({});
  const [departments, setDepartments] = useState([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (initialData) {
      setForm({
        email: "",
        password: "",
        newEmail: "",
        full_name: initialData.full_name || "",
        phone: initialData.phone || "",
        role: initialData.role || "transport_manager",
        is_active: initialData.is_active ?? true,
        department_id: initialData.department_id || "",
      });
    } else {
      // New user — blank slate every time the dialog reopens, rather
      // than carrying over whatever the previous "New User" attempt
      // had typed in. Password is pre-filled with a generated one
      // (admin can still edit or regenerate it) so creating an account
      // doesn't require inventing a password on the spot.
      setForm({
        email: "",
        password: generateTempPassword(),
        newEmail: "",
        full_name: "",
        phone: "",
        role: "transport_manager",
        is_active: true,
        department_id: "",
      });
    }
    setErrors({});
  }, [initialData, open]);

  useEffect(() => {
    if (!open) return;

    const loadDepartments = async () => {
      setLoadingDepartments(true);
      const { data } = await getDepartments();
      setDepartments(data);
      setLoadingDepartments(false);
    };

    loadDepartments();
  }, [open]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const newErrors = {};
    if (!form.full_name.trim()) newErrors.full_name = "Name is required";
    if (isNewUser) {
      if (!form.email.trim()) newErrors.email = "Email is required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) newErrors.email = "Enter a valid email";
      if (!form.password) newErrors.password = "Password is required";
      else if (form.password.length < 6) newErrors.password = "Password must be at least 6 characters";
    } else if (form.newEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.newEmail.trim())) {
      newErrors.newEmail = "Enter a valid email";
    }
    if ((form.role === "department_head" || form.role === "requester") && !form.department_id) {
      newErrors.department_id =
        form.role === "requester"
          ? "A Requester must be assigned a department"
          : "A Department Head must be assigned a department";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave(form);
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : handleClose} fullWidth maxWidth="sm">
      <DialogTitle>{isNewUser ? "New User" : "Edit User"}</DialogTitle>

      <DialogContent>
        <Stack spacing={2} mt={1}>
          {isNewUser && (
            <>
              <TextField
                label="Email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                error={!!errors.email}
                helperText={errors.email}
                fullWidth
              />
              <TextField
                label="Temporary Password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={handleChange}
                error={!!errors.password}
                helperText={
                  errors.password ||
                  "Generated automatically — copy it to share with them, or edit it. They can change it from their own Profile Settings after logging in."
                }
                fullWidth
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title="Generate a new password">
                        <IconButton
                          size="small"
                          onClick={() => setForm((prev) => ({ ...prev, password: generateTempPassword() }))}
                        >
                          <RefreshIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={showPassword ? "Hide password" : "Show password"}>
                        <IconButton size="small" onClick={() => setShowPassword((v) => !v)}>
                          {showPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                        </IconButton>
                      </Tooltip>
                    </InputAdornment>
                  ),
                }}
              />
            </>
          )}

          <TextField
            label="Full Name"
            name="full_name"
            value={form.full_name}
            onChange={handleChange}
            error={!!errors.full_name}
            helperText={errors.full_name}
            fullWidth
          />

          {!isNewUser && (
            <TextField
              label="New Email"
              name="newEmail"
              type="email"
              value={form.newEmail}
              onChange={handleChange}
              error={!!errors.newEmail}
              helperText={
                errors.newEmail ||
                "Leave blank to keep their current email. Changing this takes effect immediately, no confirmation needed."
              }
              fullWidth
            />
          )}

          <TextField
            label="Phone"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            fullWidth
          />

          <TextField
            select
            label="Role"
            name="role"
            value={form.role}
            onChange={handleChange}
            fullWidth
          >
            {ROLE_OPTIONS.map((r) => (
              <MenuItem key={r} value={r}>
                {r.replace(/_/g, " ")}
              </MenuItem>
            ))}
          </TextField>

          {/* Only Department Head and Requester's access is actually
              scoped by department today (Row-Level Security checks
              profiles.department_id for them specifically) — showing
              this for every role would imply it does something it
              doesn't. */}
          {(form.role === "department_head" || form.role === "requester") && (
            <>
              <TextField
                select
                label="Department"
                name="department_id"
                // While departments are still loading, `form.department_id`
                // is already a real UUID (from initialData) but no matching
                // <MenuItem> exists yet — MUI logs an "out-of-range value"
                // warning for that. Showing "" until loaded (which always
                // matches the placeholder item below) avoids it; the real
                // value takes over as soon as the options are in.
                value={loadingDepartments ? "" : form.department_id || ""}
                onChange={handleChange}
                error={!!errors.department_id}
                helperText={errors.department_id}
                disabled={loadingDepartments}
                fullWidth
              >
                <MenuItem value="">
                  <em>{loadingDepartments ? "Loading departments..." : "Select a department"}</em>
                </MenuItem>
                {departments.map((department) => (
                  <MenuItem key={department.id} value={department.id}>
                    {department.name}
                  </MenuItem>
                ))}
              </TextField>
              <FormHelperText sx={{ mt: -1.5 }}>
                {form.role === "requester"
                  ? "Determines which department this user's transport requests are submitted under, and who approves them."
                  : "Determines which department's transport requests, drivers, and trips this user can see and approve."}
              </FormHelperText>
            </>
          )}

          <FormControlLabel
            control={
              <Switch
                checked={form.is_active}
                onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))}
              />
            }
            label={form.is_active ? "Active" : "Deactivated (cannot log in)"}
          />
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {saving ? "Saving..." : isNewUser ? "Create User" : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UserForm;