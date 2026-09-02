import { supabase } from "../lib/supabase";

const toAppShape = (row) => ({
  id: row.id,
  plateNumber: row.plate_number,
  model: row.model,
  type: row.type,
  driver: row.driver,
  assignedDriverId: row.assigned_driver_id,
  status: row.status,
  insuranceExpiry: row.insurance_expiry,
});

const toDbShape = (vehicle) => ({
  plate_number: vehicle.plateNumber,
  model: vehicle.model,
  type: vehicle.type,
  driver: vehicle.driver,
  assigned_driver_id: vehicle.assignedDriverId || null,
  status: vehicle.status,
  insurance_expiry: vehicle.insuranceExpiry || null,
});

export const getVehicles = async () => {
  const { data, error } = await supabase.from("vehicles").select("*").order("created_at", { ascending: false });
  if (error) {
    console.error("Error fetching vehicles:", error);
    return { data: [], usingMockData: true };
  }
  return { data: data.map(toAppShape), usingMockData: false };
};

export const createVehicle = async (vehicle) => {
  const { data, error } = await supabase.from("vehicles").insert(toDbShape(vehicle)).select().single();
  if (error) throw error;
  return toAppShape(data);
};

export const updateVehicle = async (id, vehicle) => {
  const { data, error } = await supabase.from("vehicles").update(toDbShape(vehicle)).eq("id", id).select().single();
  if (error) throw error;
  return toAppShape(data);
};

export const deleteVehicle = async (id) => {
  const { error } = await supabase.from("vehicles").delete().eq("id", id);
  if (error) throw error;
};