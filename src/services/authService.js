// src/services/authService.js
import { supabase } from "../lib/supabase";

/**
 * Sign in with email + password via Supabase Auth, then load the
 * matching row from public.profiles for role/name — a profiles row is
 * created automatically for every new user by the handle_new_user()
 * trigger, so this should always find one.
 * Throws on failure so the caller can show an appropriate message.
 * Returns { token, user } in the shape the rest of the app expects
 * (Sidebar/Navbar read `fms_user`/`fms_token`).
 */
export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;

  const authUser = data.user;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name, role, phone, avatar_url, is_active, department_id, department:departments(name)")
    .eq("id", authUser.id)
    .single();

  if (profileError) {
    // Auth succeeded but the profile row is missing or unreadable
    // (RLS misconfigured, trigger didn't fire, etc) — surface this
    // clearly rather than silently logging the user in with no role.
    throw new Error(
      "Signed in, but couldn't load your profile. Contact an administrator."
    );
  }

  if (profile.is_active === false) {
    await supabase.auth.signOut();
    throw new Error("This account has been deactivated. Contact an administrator.");
  }

  // Store user in localStorage for synchronous access
  const userData = {
    id: authUser.id,
    email: authUser.email,
    name: profile.full_name || authUser.email,
    full_name: profile.full_name || authUser.email,
    role: profile.role,
    phone: profile.phone,
    avatarUrl: profile.avatar_url,
    department_id: profile.department_id,
    department_name: profile.department?.name || null,
    is_active: profile.is_active,
  };
  
  localStorage.setItem("fms_user", JSON.stringify(userData));

  return {
    token: data.session.access_token,
    user: userData,
  };
};

export const signOut = async () => {
  localStorage.removeItem("fms_user");
  sessionStorage.removeItem("fms_user");
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

/**
 * Returns the current Supabase session, or null if not logged in.
 * Useful for checking auth state on app load / refresh.
 */
export const getCurrentSession = async () => {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.error("Error fetching session:", error);
    return null;
  }
  return data.session;
};

/**
 * Synchronous read of the logged-in user's cached profile (id, name,
 * role, etc) from local/session storage — no network call, safe to use
 * for UI gating like showing/hiding a form field or action button.
 *
 * Extracted from ProtectedRoute.jsx, which had this exact logic inline.
 * That was the only place it lived — now both ProtectedRoute and any
 * component doing its own role-based UI gating (e.g. MaintenanceForm's
 * mechanic-assignment field, Fuel's verify/reject actions) import from
 * here instead of re-implementing the storage read.
 *
 * This is a UX gate, not a security boundary — RLS is what actually
 * enforces access. See ProtectedRoute.jsx's note on this.
 */
export const getCurrentUser = () => {
  const raw = localStorage.getItem("fms_user") || sessionStorage.getItem("fms_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
};

/**
 * Set the current user in localStorage
 * Useful for updating the cached user data
 */
export const setCurrentUser = (user) => {
  try {
    if (user) {
      localStorage.setItem("fms_user", JSON.stringify(user));
    } else {
      localStorage.removeItem("fms_user");
    }
  } catch (error) {
    console.error("Error saving user to localStorage:", error);
  }
};

/**
 * Get the current user's role
 */
export const getCurrentUserRole = () => {
  const user = getCurrentUser();
  return user?.role || null;
};

/**
 * Get the current user's ID
 */
export const getCurrentUserId = () => {
  const user = getCurrentUser();
  return user?.id || null;
};

/**
 * Get the current user's department ID
 */
export const getCurrentUserDepartmentId = () => {
  const user = getCurrentUser();
  return user?.department_id || null;
};

/**
 * Get the current user's department name
 */
export const getCurrentUserDepartmentName = () => {
  const user = getCurrentUser();
  return user?.department_name || null;
};

/**
 * Get the current user's full name
 */
export const getCurrentUserName = () => {
  const user = getCurrentUser();
  return user?.full_name || user?.name || null;
};

/**
 * Get the current driver ID from the drivers table
 * Links the auth user (profiles) to their driver record
 * 
 * This is used for:
 * - Drivers viewing only their own trips
 * - Drivers viewing only their assigned vehicle
 * - Drivers creating fuel/maintenance/accident records
 */
export const getCurrentDriverId = async () => {
  try {
    const user = getCurrentUser();
    if (!user) {
      console.warn("No authenticated user found");
      return null;
    }

    // First try to get from cached user session (if available)
    if (user.driver_id) {
      return user.driver_id;
    }

    // Query the drivers table for the profile_id
    const { data, error } = await supabase
      .from("drivers")
      .select("id")
      .eq("profile_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Error fetching driver ID:", error);
      return null;
    }

    if (!data) {
      console.warn("No driver record found for user:", user.id);
      return null;
    }

    // Cache the driver_id in the user session for future use
    user.driver_id = data.id;
    setCurrentUser(user);

    return data.id;
  } catch (error) {
    console.error("Unexpected error in getCurrentDriverId:", error);
    return null;
  }
};

/**
 * Get the current driver record (full row)
 * Includes all driver details like license number, phone, etc.
 */
export const getCurrentDriver = async () => {
  try {
    const driverId = await getCurrentDriverId();
    if (!driverId) {
      return null;
    }

    const { data, error } = await supabase
      .from("drivers")
      .select("*, department:departments(id, name)")
      .eq("id", driverId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching driver:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Unexpected error in getCurrentDriver:", error);
    return null;
  }
};

/**
 * Check if the current user is authenticated
 */
export const isAuthenticated = () => {
  return !!getCurrentUser();
};

/**
 * Check if the current user has a specific role
 */
export const hasRole = (role) => {
  const userRole = getCurrentUserRole();
  return userRole === role;
};

/**
 * Check if the current user has any of the specified roles
 */
export const hasAnyRole = (roles) => {
  const userRole = getCurrentUserRole();
  return roles.includes(userRole);
};

/**
 * Check if the current user is an admin
 */
export const isAdmin = () => {
  return hasRole("admin");
};

/**
 * Check if the current user is a transport manager
 */
export const isTransportManager = () => {
  return hasRole("transport_manager");
};

/**
 * Check if the current user is a department head
 */
export const isDepartmentHead = () => {
  return hasRole("department_head");
};

/**
 * Check if the current user is a driver
 */
export const isDriver = () => {
  return hasRole("driver");
};

/**
 * Check if the current user is a mechanic
 */
export const isMechanic = () => {
  return hasRole("mechanic");
};

/**
 * Check if the current user is a finance officer
 */
export const isFinanceOfficer = () => {
  return hasRole("finance_officer");
};

/**
 * Check if the current user is management
 */
export const isManagement = () => {
  return hasRole("management");
};

export const requestPasswordReset = async (email) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) throw error;
};

export const resetPassword = async (password) => {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
};

/**
 * Update user profile
 */
export const updateProfile = async (updates) => {
  try {
    const user = getCurrentUser();
    if (!user) {
      throw new Error("Not authenticated");
    }

    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id)
      .select()
      .single();

    if (error) throw error;

    // Update cached user
    const updatedUser = {
      ...user,
      ...data,
    };
    setCurrentUser(updatedUser);

    return { data: updatedUser, error: null };
  } catch (error) {
    console.error("Profile update error:", error);
    return { data: null, error: error.message };
  }
};

/**
 * Update notification preferences
 */
export const updateNotificationPreferences = async (preferences) => {
  try {
    const user = getCurrentUser();
    if (!user) {
      throw new Error("Not authenticated");
    }

    const { data, error } = await supabase
      .from("notification_preferences")
      .upsert({
        user_id: user.id,
        ...preferences,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error("Notification preferences update error:", error);
    return { data: null, error: error.message };
  }
};

/**
 * Get notification preferences
 */
export const getNotificationPreferences = async () => {
  try {
    const user = getCurrentUser();
    if (!user) {
      throw new Error("Not authenticated");
    }

    const { data, error } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error("Notification preferences fetch error:", error);
    return { data: null, error: error.message };
  }
};

/**
 * Load user session from Supabase (on app init)
 * Useful for restoring session after page refresh
 */
export const loadUserSession = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) throw error;
    
    if (!session) {
      localStorage.removeItem("fms_user");
      return { user: null, error: null };
    }

    // Fetch profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("full_name, role, phone, avatar_url, is_active, department_id, department:departments(name)")
      .eq("id", session.user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Error fetching profile during session load:", profileError);
      return { user: null, error: profileError.message };
    }

    if (!profile || profile.is_active === false) {
      await supabase.auth.signOut();
      localStorage.removeItem("fms_user");
      return { user: null, error: "Account is deactivated" };
    }

    const userData = {
      id: session.user.id,
      email: session.user.email,
      name: profile.full_name || session.user.email,
      full_name: profile.full_name || session.user.email,
      role: profile.role,
      phone: profile.phone,
      avatarUrl: profile.avatar_url,
      department_id: profile.department_id,
      department_name: profile.department?.name || null,
      is_active: profile.is_active,
    };

    localStorage.setItem("fms_user", JSON.stringify(userData));
    return { user: userData, error: null };
  } catch (error) {
    console.error("Session load error:", error);
    localStorage.removeItem("fms_user");
    return { user: null, error: error.message };
  }
};

/**
 * Clear user session (force logout)
 */
export const clearUserSession = () => {
  localStorage.removeItem("fms_user");
  sessionStorage.removeItem("fms_user");
};

// Export all functions as a module (optional)
export default {
  signIn,
  signOut,
  getCurrentSession,
  getCurrentUser,
  setCurrentUser,
  getCurrentUserRole,
  getCurrentUserId,
  getCurrentUserDepartmentId,
  getCurrentUserDepartmentName,
  getCurrentUserName,
  getCurrentDriverId,
  getCurrentDriver,
  isAuthenticated,
  hasRole,
  hasAnyRole,
  isAdmin,
  isTransportManager,
  isDepartmentHead,
  isDriver,
  isMechanic,
  isFinanceOfficer,
  isManagement,
  requestPasswordReset,
  resetPassword,
  updateProfile,
  updateNotificationPreferences,
  getNotificationPreferences,
  loadUserSession,
  clearUserSession,
};