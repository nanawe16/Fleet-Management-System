import { supabase } from "../lib/supabase";

const toAppShape = (row) => ({
  id: row.id,
  name: row.name,
  code: row.code || "",
  location: row.location || "",
  isActive: row.is_active,
  createdAt: row.created_at,
});

const toDbShape = (branch) => ({
  name: branch.name,
  code: branch.code || null,
  location: branch.location || null,
  is_active: branch.isActive ?? true,
});

/**
 * Fetch all branches, ordered by name. Readable by anyone signed in
 * (RLS: "Anyone signed in can view branches") — needed since every
 * Vehicle/Driver/Department/User form has a branch dropdown regardless
 * of the viewer's own role.
 * Returns: { data: Branch[], usingMockData: boolean }
 */
export const getBranches = async () => {
  const { data, error } = await supabase.from("branches").select("*").order("name");

  if (error) {
    console.error("Error fetching branches:", error);
    return { data: [], usingMockData: true };
  }

  return { data: data.map(toAppShape), usingMockData: false };
};

/**
 * Create a new branch. RLS restricts this to Admin/Super Admin —
 * anyone else calling it will get a permission error from Postgres,
 * which the caller's catch block should surface via err.message.
 */
export const createBranch = async (branch) => {
  const { data, error } = await supabase.from("branches").insert(toDbShape(branch)).select().single();

  if (error) throw error;
  return toAppShape(data);
};

export const updateBranch = async (id, branch) => {
  const { data, error } = await supabase
    .from("branches")
    .update(toDbShape(branch))
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return toAppShape(data);
};

/**
 * Deleting a branch is blocked at the database level (foreign key
 * constraints) while any department/vehicle/driver/profile still
 * references it — Postgres will raise a foreign-key-violation error,
 * which surfaces here as err.message for the page to show. Deactivating
 * (isActive: false) via updateBranch is the safer everyday action;
 * delete is really only for a branch created by mistake with nothing
 * attached to it yet.
 */
export const deleteBranch = async (id) => {
  const { error } = await supabase.from("branches").delete().eq("id", id);
  if (error) throw error;
};