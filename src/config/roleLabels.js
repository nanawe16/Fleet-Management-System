const ROLE_LABELS = {
  admin: "Admin",
  transport_manager: "Transport Manager",
  department_head: "Office Head",
  driver: "Driver",
  mechanic: "Mechanic",
  finance_officer: "Finance Officer",
  vice_president: "Vice President",
  requester: "Requester",
};

export const getRoleLabel = (role) => ROLE_LABELS[role] || "User";
