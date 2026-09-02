import { useState, useEffect } from "react";
import { Card, CardContent, Typography, TextField, Button, Grid, Skeleton, Alert } from "@mui/material";
import AppSnackbar from "../common/AppSnackbar";
import { getSystemSettings, updateSystemSettings } from "../../services/settingsService";

const SystemSettings = () => {
  const [settings, setSettings] = useState({ orgName: "", contactEmail: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const data = await getSystemSettings();
        setSettings(data);
        setNotice("");
      } catch (err) {
        console.error("Error loading system settings:", err);
        setNotice("Couldn't load system settings.");
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleChange = (field) => (e) => {
    setSettings((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validate = () => {
    const newErrors = {};
    if (!settings.orgName.trim()) newErrors.orgName = "Organization name is required";
    if (!settings.contactEmail.trim()) {
      newErrors.contactEmail = "Contact email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.contactEmail)) {
      newErrors.contactEmail = "Enter a valid email address";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await updateSystemSettings(settings);
      setSnackbar({ open: true, message: "System settings saved!", severity: "success" });
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.message?.includes("row-level") || err.code === "42501"
          ? "Only admins can change system settings."
          : "Couldn't save settings. Please try again.",
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
      <CardContent>
        <Typography variant="h6" mb={3}>
          System Preferences
        </Typography>

        {notice && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {notice}
          </Alert>
        )}

        {loading ? (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Skeleton variant="rounded" height={56} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Skeleton variant="rounded" height={56} />
            </Grid>
          </Grid>
        ) : (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Organization Name"
                fullWidth
                value={settings.orgName}
                onChange={handleChange("orgName")}
                error={!!errors.orgName}
                helperText={errors.orgName}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Contact Email"
                fullWidth
                value={settings.contactEmail}
                onChange={handleChange("contactEmail")}
                error={!!errors.contactEmail}
                helperText={errors.contactEmail}
              />
            </Grid>
          </Grid>
        )}

        <Button variant="contained" sx={{ mt: 3 }} onClick={handleSave} disabled={loading || saving}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </CardContent>

      <AppSnackbar snackbar={snackbar} setSnackbar={setSnackbar} />
    </Card>
  );
};

export default SystemSettings;