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
export const roles = {
  all: ["admin", "transport_manager", "department_head", "driver", "mechanic", "finance_officer", "vice_president", "requester"],
  dashboard: ["admin", "transport_manager", "department_head", "driver", "mechanic", "finance_officer", "vice_president", "requester"],
  vehicles: ["admin", "transport_manager", "department_head", "driver", "mechanic", "finance_officer", "vice_president"],
  drivers: ["admin", "transport_manager", "department_head", "driver", "mechanic", "vice_president"],
  departments: ["admin", "transport_manager", "department_head", "driver", "mechanic", "finance_officer", "vice_president"],
  requests: ["admin", "transport_manager", "department_head", "driver", "finance_officer", "vice_president", "requester"],
  trips: ["admin", "transport_manager", "department_head", "driver", "finance_officer", "vice_president"],
  gps: ["admin", "transport_manager", "department_head", "driver", "mechanic", "finance_officer", "vice_president"],
  fuel: ["admin", "transport_manager", "driver", "finance_officer", "vice_president"],
  maintenance: ["admin", "transport_manager", "driver", "mechanic", "finance_officer", "vice_president"],
  inventory: ["admin", "transport_manager", "mechanic", "finance_officer", "vice_president"],
  accidents: ["admin", "transport_manager", "department_head", "driver", "mechanic", "vice_president"],
  reports: ["admin", "transport_manager", "department_head", "finance_officer", "vice_president"],
  notifications: ["admin", "transport_manager", "department_head", "driver", "mechanic", "finance_officer", "vice_president", "requester"],
  settings: ["admin", "transport_manager", "department_head", "driver", "mechanic", "finance_officer", "vice_president", "requester"],
  users: ["admin"],
};

// The existing Reports page combines operational and financial content.
// These section permissions preserve the more granular matrix rules.
export const reportSections = {
  operational: ["admin", "transport_manager", "department_head", "finance_officer", "vice_president"],
  financial: ["admin", "transport_manager", "finance_officer", "vice_president"],
};