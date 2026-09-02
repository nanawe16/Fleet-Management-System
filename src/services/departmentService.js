import { supabase } from "../lib/supabase";

/**
 * Fetch all departments, newest first.
 * Falls back to an empty list (flagged) if Supabase isn't reachable —
 * matches the shape every other page expects: { data, usingMockData }.
 * "usingMockData" here really means "request failed" since there's no
 * local mock fallback anymore; the flag name is kept for consistency
 * with the rest of the app's pages.
 */
export const getDepartments = async () => {
  const { data, error } = await supabase
    .from("departments")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching departments:", error);
    return { data: [], usingMockData: true };
  }

  return { data, usingMockData: false };
};

export const createDepartment = async (department) => {
  const { data, error } = await supabase
    .from("departments")
    .insert({
      name: department.name,
      manager: department.manager,
      phone: department.phone,
      status: department.status,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateDepartment = async (id, department) => {
  const { data, error } = await supabase
    .from("departments")
    .update({
      name: department.name,
      manager: department.manager,
      phone: department.phone,
      status: department.status,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteDepartment = async (id) => {
  const { error } = await supabase.from("departments").delete().eq("id", id);
  if (error) throw error;
};