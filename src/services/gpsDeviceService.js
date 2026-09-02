import { supabase } from "../lib/supabase";
import { getVehicles } from "./vehicleService";

/**
 * Every vehicle, each annotated with its GPS device status (if any).
 * Vehicles with no gps_devices row have never been provisioned.
 */
export const getDevicesByVehicle = async () => {
  const [{ data: vehicles }, { data: devices, error }] = await Promise.all([
    getVehicles(),
    supabase.from("gps_devices").select("id, vehicle_id, label, is_active, created_at, last_seen_at"),
  ]);

  if (error) throw error;

  const byVehicleId = new Map((devices || []).map((d) => [d.vehicle_id, d]));

  return (vehicles || []).map((vehicle) => ({
    vehicleId: vehicle.id,
    plateNumber: vehicle.plateNumber,
    device: byVehicleId.get(vehicle.id) || null,
  }));
};

/**
 * Generates (or regenerates) a device key for a vehicle. Returns the
 * RAW key — the only time it's ever available in plaintext; only its
 * hash is stored server-side (provision_gps_device(), 041). The
 * caller is responsible for showing this to the admin exactly once.
 */
export const provisionDevice = async (vehicleId, label) => {
  const { data, error } = await supabase.rpc("provision_gps_device", {
    p_vehicle_id: vehicleId,
    p_label: label || null,
  });
  if (error) throw error;
  return data; // the raw key
};

export const deactivateDevice = async (vehicleId) => {
  const { error } = await supabase.rpc("deactivate_gps_device", { p_vehicle_id: vehicleId });
  if (error) throw error;
};