// Route/menu access matrix. Originally derived from "Technical
// Documentation §3" — that source document was not available during
// the session that added `requester`, opened `settings` to every role,
// and removed `management` (see below). Those changes were made by
// direct decisions during that work, not verified against §3. If that
// document is ever located, reconcile it against this file specifically
// for: the `requester` role's access (added, not in the original
// matrix by definition), `settings` now being open to every role
// (was admin-only), and whatever §3 actually specifies for
// `vice_president` vs. how it's used here (mirrors `admin` throughout —
// see also 038_vice_president_notifications.sql for the same
// assumption applied to notification routing).
//
// `management` was previously listed here as a "legacy alias" for
// `vice_president`, but no RLS policy in the database has ever checked
// for that role string — only `vice_president`. That made it a trap: an
// account with role='management' would see the full UI but every real
// query would come back empty. Removed here; the database now also
// rejects 'management' outright via a CHECK constraint (see migration
// 039_lock_down_profile_roles.sql) so it can't be reintroduced by a
// direct insert either. Confirmed zero real accounts had this role
// before removing it.
//
// `super_admin` (added in migration 045, for multi-branch support) is
// included everywhere `admin` appears below — it's meant to have at
// least admin's access, but across all branches instead of just one.
// Without this, a super_admin account would pass every database check
// but get bounced from every page by ProtectedRoute, since routing
// access is decided by these arrays, not by the database role alone.
export const roles = {
  all: ["admin", "super_admin", "transport_manager", "department_head", "driver", "mechanic", "finance_officer", "vice_president", "requester"],
  dashboard: ["admin", "super_admin", "transport_manager", "department_head", "driver", "mechanic", "finance_officer", "vice_president", "requester"],
  vehicles: ["admin", "super_admin", "transport_manager", "department_head", "driver", "mechanic", "finance_officer", "vice_president"],
  drivers: ["admin", "super_admin", "transport_manager", "department_head", "driver", "mechanic", "vice_president"],
  // Work Units are configured and maintained solely by Administrators.
  departments: ["admin", "super_admin"],
  // Branches are configured solely by Administrators — a branch-scoped
  // Admin manages their own branch's record here; Super Admin manages
  // all of them. Matches the RLS policy on the branches table itself.
  branches: ["admin", "super_admin"],
  requests: ["admin", "super_admin", "transport_manager", "department_head", "driver", "finance_officer", "vice_president", "requester"],
  trips: ["admin", "super_admin", "transport_manager", "department_head", "driver", "finance_officer", "vice_president"],
  gps: ["admin", "super_admin", "transport_manager", "department_head", "driver", "mechanic", "finance_officer", "vice_president"],
  fuel: ["admin", "super_admin", "transport_manager", "driver", "finance_officer", "vice_president"],
  maintenance: ["admin", "super_admin", "transport_manager", "driver", "mechanic", "finance_officer", "vice_president"],
  inventory: ["admin", "super_admin", "transport_manager", "mechanic", "finance_officer", "vice_president"],
  accidents: ["admin", "super_admin", "transport_manager", "department_head", "driver", "mechanic", "vice_president"],
  reports: ["admin", "super_admin", "transport_manager", "department_head", "finance_officer", "vice_president"],
  notifications: ["admin", "super_admin", "transport_manager", "department_head", "driver", "mechanic", "finance_officer", "vice_president", "requester"],
  settings: ["admin", "super_admin", "transport_manager", "department_head", "driver", "mechanic", "finance_officer", "vice_president", "requester"],
  users: ["admin", "super_admin"],
};

// The existing Reports page combines operational and financial content.
// These section permissions preserve the more granular matrix rules.
export const reportSections = {
  operational: ["admin", "super_admin", "transport_manager", "department_head", "finance_officer", "vice_president"],
  financial: ["admin", "super_admin", "transport_manager", "finance_officer", "vice_president"],
};