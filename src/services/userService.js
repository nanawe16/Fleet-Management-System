import { supabase } from "../lib/supabase";

/**
 * Fetch every user profile (admin-only — enforced by RLS via the
 * is_admin() policy, not just hidden in the UI).
 */
export const getAllUsers = async () => {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, phone, role, is_active, department_id, created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
};

/**
 * Create a brand-new user account: an auth.users row plus its matching
 * profiles row. Runs through the admin-create-user Edge Function
 * rather than direct table access, because creating another person's
 * auth account requires the service role key — a key the browser must
 * never hold. The function itself re-checks that the caller is an
 * admin server-side, so this isn't relying on the UI to enforce that.
 */
export const createUser = async ({ email, password, full_name, phone, role, department_id }) => {
  const { data, error } = await supabase.functions.invoke("admin-create-user", {
    body: { email, password, full_name, phone, role, department_id },
  });

  if (error) {
    // A non-2xx response comes back as a FunctionsHttpError whose
    // useful message lives in its response body, not error.message —
    // try to pull our own { error: "..." } text out of it.
    let message = error.message;
    try {
      const body = await error.context.json();
      if (body?.error) message = body.error;
    } catch {
      // context wasn't JSON / wasn't readable — fall back to error.message
    }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);

  return data;
};

/**
 * Permanently delete a user account. Same reasoning as createUser
 * above — needs the service role key, so it goes through the
 * admin-delete-user Edge Function rather than direct table access.
 * The database itself refuses this (and the function surfaces a
 * clear message) if the account has any real history — see
 * admin-delete-user/index.ts for why. Deactivating (updateUserProfile
 * with is_active: false) is the right choice for those accounts;
 * this is only for truly unused ones.
 */
export const deleteUser = async (id) => {
  const { data, error } = await supabase.functions.invoke("admin-delete-user", {
    body: { id },
  });

  if (error) {
    let message = error.message;
    try {
      const body = await error.context.json();
      if (body?.error) message = body.error;
    } catch {
      // context wasn't JSON / wasn't readable — fall back to error.message
    }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);

  return data;
};

/**
 * Admin changes ANOTHER user's email. Needs the service role key —
 * same reasoning as createUser/deleteUser — so it goes through the
 * admin-update-user-email Edge Function. Takes effect immediately, no
 * confirmation email (the admin is vouching for it). For a user
 * changing their OWN email, use changeOwnEmail instead — that one goes
 * through Supabase's normal confirmation flow and doesn't need any of
 * this.
 */
export const updateUserEmail = async (id, email) => {
  const { data, error } = await supabase.functions.invoke("admin-update-user-email", {
    body: { id, email },
  });

  if (error) {
    let message = error.message;
    try {
      const body = await error.context.json();
      if (body?.error) message = body.error;
    } catch {
      // context wasn't JSON / wasn't readable — fall back to error.message
    }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);

  return data;
};

export const updateUserProfile = async (id, updates) => {
  const { data, error } = await supabase
    .from("profiles")
    .update({
      full_name: updates.full_name,
      phone: updates.phone,
      role: updates.role,
      is_active: updates.is_active,
      // Only meaningful for department_head (and, per the matrix,
      // eventually driver — see UserForm.jsx), but harmless to write
      // for any role; RLS/scoping for other roles simply ignores it.
      department_id: updates.department_id || null,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Fetch profiles with role = 'mechanic', for the maintenance-assignment
 * dropdown. Callable by Admin or Transport Manager — enforced by RLS
 * (021_allow_transport_manager_read_mechanics.sql), not just by hiding
 * the dropdown in the UI.
 */
export const getMechanicProfiles = async () => {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "mechanic")
    .order("full_name", { ascending: true });

  if (error) throw error;
  return data;
};