import { supabase } from "../lib/supabase";

// DB uses snake_case (part_name, reorder_level, unit_cost); the app
// uses camelCase. Translated here so Inventory.jsx / InventoryForm.jsx /
// InventoryTable.jsx need no changes.
const toAppShape = (row) => ({
  id: row.id,
  partName: row.part_name,
  category: row.category,
  quantity: row.quantity,
  unit: row.unit,
  reorderLevel: row.reorder_level,
  unitCost: row.unit_cost,
  supplier: row.supplier,
});

const toDbShape = (item) => ({
  part_name: item.partName,
  category: item.category,
  quantity: item.quantity,
  unit: item.unit,
  reorder_level: item.reorderLevel,
  unit_cost: item.unitCost,
  supplier: item.supplier,
});

/**
 * Fetch all spare-parts inventory items.
 * Returns: { data: InventoryItem[], usingMockData: boolean }
 */
export const getInventory = async () => {
  const { data, error } = await supabase
    .from("spare_parts")
    .select("*")
    .order("part_name", { ascending: true });

  if (error) {
    console.error("Error fetching inventory:", error);
    return { data: [], usingMockData: true };
  }

  return { data: data.map(toAppShape), usingMockData: false };
};

export const createInventoryItem = async (item) => {
  const { data, error } = await supabase
    .from("spare_parts")
    .insert(toDbShape(item))
    .select()
    .single();

  if (error) throw error;
  return toAppShape(data);
};

export const updateInventoryItem = async (id, item) => {
  const { data, error } = await supabase
    .from("spare_parts")
    .update(toDbShape(item))
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return toAppShape(data);
};

export const deleteInventoryItem = async (id) => {
  const { error } = await supabase.from("spare_parts").delete().eq("id", id);
  if (error) throw error;
};

/**
 * Record a stock transaction (part used, or new stock received) via the
 * record_inventory_transaction() Postgres function — this updates the
 * quantity and logs the transaction atomically, so the two can't drift
 * out of sync. Returns the updated item.
 */
export const recordTransaction = async (id, { type, quantity, note }) => {
  const { data, error } = await supabase.rpc("record_inventory_transaction", {
    p_part_id: id,
    p_type: type,
    p_quantity: quantity,
    p_note: note || null,
  });

  if (error) throw error;
  return toAppShape(data);
};