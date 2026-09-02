import { supabase } from "../lib/supabase";

const toAppShape = (row) => ({
  id: row.id,
  name: row.name,
  licenseNumber: row.license_number,
  licenseExpiry: row.license_expiry,
  phone: row.phone,
  status: row.status,
  profileId: row.profile_id,
});

const toDbShape = (driver) => ({
  name: driver.name,
  license_number: driver.licenseNumber,
  license_expiry: driver.licenseExpiry || null,
  phone: driver.phone,
  status: driver.status,
  profile_id: driver.profileId || null,
});

export const getDrivers = async () => {
  const { data, error } = await supabase.from("drivers").select("*").order("created_at", { ascending: false });
  if (error) {
    console.error("Error fetching drivers:", error);
    return { data: [], usingMockData: true };
  }
  return { data: data.map(toAppShape), usingMockData: false };
};

export const createDriver = async (driver) => {
  const { data, error } = await supabase.from("drivers").insert(toDbShape(driver)).select().single();
  if (error) throw error;
  return toAppShape(data);
};

export const updateDriver = async (id, driver) => {
  const { data, error } = await supabase.from("drivers").update(toDbShape(driver)).eq("id", id).select().single();
  if (error) throw error;
  return toAppShape(data);
};

export const deleteDriver = async (id) => {
  const { error } = await supabase.from("drivers").delete().eq("id", id);
  if (error) throw error;
};

/**
 * Profiles with role='driver' that aren't yet linked to a driver
 * record, plus whichever profile is currently linked to `currentDriverId`
 * (so editing an already-linked driver still shows their current link
 * as a selectable option, not just unlinked ones).
 */
export const getLinkableDriverProfiles = async (currentDriverId = null) => {
  const { data: allDriverProfiles, error } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "driver")
    .order("full_name", { ascending: true });

  if (error) throw error;

  const { data: linkedRows, error: linkedError } = await supabase
    .from("drivers")
    .select("profile_id")
    .not("profile_id", "is", null);

  if (linkedError) throw linkedError;

  const linkedIds = new Set(linkedRows.map((r) => r.profile_id));

  return allDriverProfiles.filter((p) => !linkedIds.has(p.id) || p.id === currentDriverId);
};