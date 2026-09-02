import { supabase } from "../lib/supabase";

const toAppShape = (row) => ({
  id: row.id,
  type: row.type,
  message: row.message,
  isRead: row.is_read,
  createdAt: row.created_at,
  link: row.link,
});

/**
 * Fetch all notifications visible to the current user's role (RLS
 * already filters by target_role, so this just reads everything the
 * database is willing to return).
 * Returns: { data: Notification[], usingMockData: boolean }
 */
export const getNotifications = async () => {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching notifications:", error);
    return { data: [], usingMockData: true };
  }

  return { data: data.map(toAppShape), usingMockData: false };
};

export const markAsRead = async (id) => {
  const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id);
  if (error) throw error;
};

export const markAllAsRead = async () => {
  const { error } = await supabase.from("notifications").update({ is_read: true }).eq("is_read", false);
  if (error) throw error;
};

export const deleteNotification = async (id) => {
  const { error } = await supabase.from("notifications").delete().eq("id", id);
  if (error) throw error;
};

export const getUnreadCount = async () => {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("is_read", false);

  if (error) {
    console.error("Error fetching unread count:", error);
    return 0;
  }
  return count ?? 0;
};

/**
 * The "simple" side of the hybrid design: any service can call this
 * directly, right when something notification-worthy happens (e.g. a
 * severe accident being reported), rather than needing a database
 * trigger for every case. Goes through the same create_notification()
 * function the automatic triggers/scheduled checks use, so behavior
 * (including dedup) stays consistent either way.
 */
export const notifyRoles = async (type, message, link, targetRoles) => {
  const { error } = await supabase.rpc("create_notification", {
    p_type: type,
    p_message: message,
    p_link: link,
    p_target_role: targetRoles,
    p_dedup_key: null,
  });
  if (error) throw error;
};