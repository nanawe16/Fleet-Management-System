import { useState, useEffect } from "react";
import { Card, CardContent, Typography, TextField, Button, Grid } from "@mui/material";
import { supabase } from "../../lib/supabase";
import AppSnackbar from "../common/AppSnackbar";

const getCurrentUser = () => {
  const raw = localStorage.getItem("fms_user") || sessionStorage.getItem("fms_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
};

const ProfileSettings = ({ user }) => {
  const currentUser = user || getCurrentUser();

  const [name, setName] = useState(currentUser?.name || "");
  const [phone, setPhone] = useState(currentUser?.phone || "");
  const [email, setEmail] = useState(currentUser?.email || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  useEffect(() => {
    setName(currentUser?.name || "");
    setPhone(currentUser?.phone || "");
    setEmail(currentUser?.email || "");
  }, [currentUser?.name, currentUser?.phone, currentUser?.email]);

  const validate = () => {
    const newErrors = {};
    if (!name.trim()) newErrors.name = "Name is required";

    if (email.trim() !== currentUser?.email) {
      if (!email.trim()) newErrors.email = "Email is required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) newErrors.email = "Enter a valid email";
    }

    if (password || confirmPassword) {
      if (password.length < 6) newErrors.password = "Password must be at least 6 characters";
      if (password !== confirmPassword) newErrors.confirmPassword = "Passwords don't match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);

    const emailChanged = email.trim() !== currentUser?.email;

    try {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ full_name: name, phone, updated_at: new Date().toISOString() })
        .eq("id", currentUser.id);

      if (profileError) throw profileError;

      // password changes go through Supabase Auth, not the profiles table
      if (password) {
        const { error: passwordError } = await supabase.auth.updateUser({ password });
        if (passwordError) throw passwordError;
      }

      // Email changes go through Supabase Auth too, but — unlike
      // password — don't take effect immediately: a confirmation link
      // is sent to the new address (and possibly the old one too,
      // depending on the project's "Secure email change" setting), and
      // auth.users.email only updates once that's clicked. So this
      // deliberately does NOT write the new email into local
      // storage/Sidebar/Navbar yet — showing it as already changed
      // before it actually is would be misleading.
      if (emailChanged) {
        const { error: emailError } = await supabase.auth.updateUser({ email: email.trim() });
        if (emailError) throw emailError;
      }

      // keep Sidebar/Navbar in sync immediately, without a reload —
      // email is deliberately left out of this, per the note above
      const updatedUser = { ...currentUser, name, phone };
      if (localStorage.getItem("fms_user")) {
        localStorage.setItem("fms_user", JSON.stringify(updatedUser));
      } else if (sessionStorage.getItem("fms_user")) {
        sessionStorage.setItem("fms_user", JSON.stringify(updatedUser));
      }

      setPassword("");
      setConfirmPassword("");
      if (emailChanged) {
        // Revert the field to the still-current (unconfirmed change
        // pending) email, so the form doesn't look like it already
        // succeeded.
        setEmail(currentUser?.email || "");
        setSnackbar({
          open: true,
          message: "Profile updated. Check your new email address for a confirmation link to finish the email change.",
          severity: "success",
        });
      } else {
        setSnackbar({ open: true, message: "Profile updated successfully!", severity: "success" });
      }
    } catch (err) {
      setSnackbar({ open: true, message: err.message || "Couldn't save changes.", severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
      <CardContent>
        <Typography variant="h6" mb={3}>
          Profile Settings
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Full Name"
              fullWidth
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={!!errors.name}
              helperText={errors.name}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Phone" fullWidth value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Email"
              type="email"
              fullWidth
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={!!errors.email}
              helperText={errors.email || "Changing this sends a confirmation link to the new address."}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="New Password"
              type="password"
              fullWidth
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave blank to keep current password"
              error={!!errors.password}
              helperText={errors.password}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Confirm New Password"
              type="password"
              fullWidth
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              error={!!errors.confirmPassword}
              helperText={errors.confirmPassword}
            />
          </Grid>
        </Grid>
        <Button variant="contained" sx={{ mt: 3 }} onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </CardContent>

      <AppSnackbar snackbar={snackbar} setSnackbar={setSnackbar} />
    </Card>
  );
};

export default ProfileSettings;