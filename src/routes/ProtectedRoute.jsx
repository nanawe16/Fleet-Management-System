import { Navigate } from "react-router-dom";
import { getCurrentUser } from "../services/authService";

/**
 * Wraps a route element and only renders it if the logged-in user's
 * role is in `roles`. Unauthorized users are redirected to /dashboard
 * rather than seeing the page at all — this is what actually stops
 * someone from reaching an admin-only page by typing the URL directly,
 * which hiding the Sidebar link alone does not prevent.
 *
 * This is a UX/routing guard, not a security boundary by itself — the
 * real security boundary is the database (RLS policies + the
 * prevent_self_privilege_escalation trigger). Always enforce sensitive
 * actions at the database level too; this just avoids showing someone
 * a page/form they have no real access to.
 */
const ProtectedRoute = ({ roles, children }) => {
  const user = getCurrentUser();
  const allowed = roles === "all" || roles.includes(user?.role);

  if (!allowed) {
    return <Navigate to={user ? "/dashboard" : "/login"} replace />;
  }

  return children;
};

export default ProtectedRoute;
