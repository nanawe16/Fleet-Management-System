import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  Typography,
  FormControlLabel,
  Switch,
  Button,
  Stack,
  Skeleton,
  Alert,
} from "@mui/material";
import AppSnackbar from "../common/AppSnackbar";
import { getNotificationPreferences, updateNotificationPreferences } from "../../services/settingsService";

const getCurrentUser = () => {
  const raw = localStorage.getItem("fms_user") || sessionStorage.getItem("fms_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
};

const DEFAULT_PREFS = { maintenanceAlerts: true, insuranceAlerts: true, licenseAlerts: false };

const NotificationSettings = () => {
  const user = getCurrentUser();
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  useEffect(() => {
    const fetchPrefs = async () => {
      if (!user?.id) {
        setNotice("Couldn't identify your account. Try logging in again.");
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const data = await getNotificationPreferences(user.id);
        setPrefs(data);
        setNotice("");
      } catch (err) {
        console.error("Error loading notification preferences:", err);
        setPrefs(DEFAULT_PREFS);
        setNotice("Couldn't load your preferences — showing defaults.");
      } finally {
        setLoading(false);
      }
    };

    fetchPrefs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggle = (key) => (e) => {
    setPrefs((prev) => ({ ...prev, [key]: e.target.checked }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateNotificationPreferences(user.id, prefs);
      setSnackbar({ open: true, message: "Notification preferences saved!", severity: "success" });
    } catch (err) {
      setSnackbar({ open: true, message: "Couldn't save preferences. Please try again.", severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
      <CardContent>
        <Typography variant="h6" mb={3}>
          Notification Preferences
        </Typography>

        {notice && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {notice}
          </Alert>
        )}

        {loading ? (
          <Stack spacing={1.5}>
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} variant="rounded" height={32} width={280} />
            ))}
          </Stack>
        ) : (
          <Stack spacing={1}>
            <FormControlLabel
              control={<Switch checked={prefs.maintenanceAlerts} onChange={handleToggle("maintenanceAlerts")} />}
              label="Maintenance due alerts"
            />
            <FormControlLabel
              control={<Switch checked={prefs.insuranceAlerts} onChange={handleToggle("insuranceAlerts")} />}
              label="Insurance expiry alerts"
            />
            <FormControlLabel
              control={<Switch checked={prefs.licenseAlerts} onChange={handleToggle("licenseAlerts")} />}
              label="Driver license expiry alerts"
            />
          </Stack>
        )}

        <Button variant="contained" sx={{ mt: 3 }} onClick={handleSave} disabled={loading || saving || !user?.id}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </CardContent>

      <AppSnackbar snackbar={snackbar} setSnackbar={setSnackbar} />
    </Card>
  );
};

export default NotificationSettings;