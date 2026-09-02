import { supabase } from "../lib/supabase";

// ---------- System settings (single global row) ----------

export const getSystemSettings = async () => {
  const { data, error } = await supabase
    .from("system_settings")
    .select("org_name, contact_email")
    .eq("id", 1)
    .single();

  if (error) throw error;
  return { orgName: data.org_name, contactEmail: data.contact_email };
};

export const updateSystemSettings = async ({ orgName, contactEmail }) => {
  const { error } = await supabase
    .from("system_settings")
    .update({ org_name: orgName, contact_email: contactEmail, updated_at: new Date().toISOString() })
    .eq("id", 1);

  if (error) throw error;
};

// ---------- Per-user notification preferences ----------

export const getNotificationPreferences = async (userId) => {
  const { data, error } = await supabase
    .from("notification_preferences")
    .select("maintenance_alerts, insurance_alerts, license_alerts")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;

  // no row yet for this user (first visit) — return sensible defaults
  if (!data) {
    return { maintenanceAlerts: true, insuranceAlerts: true, licenseAlerts: false };
  }

  return {
    maintenanceAlerts: data.maintenance_alerts,
    insuranceAlerts: data.insurance_alerts,
    licenseAlerts: data.license_alerts,
  };
};

export const updateNotificationPreferences = async (userId, prefs) => {
  const { error } = await supabase.from("notification_preferences").upsert({
    user_id: userId,
    maintenance_alerts: prefs.maintenanceAlerts,
    insurance_alerts: prefs.insuranceAlerts,
    license_alerts: prefs.licenseAlerts,
    updated_at: new Date().toISOString(),
  });

  if (error) throw error;
};