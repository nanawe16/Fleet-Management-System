import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Dashboard,
  DirectionsCar,
  Person,
  Assignment,
  LocalGasStation,
  Build,
  Assessment,
  Settings,
  AltRoute,
  Logout,
  MyLocation,
  Notifications as NotificationsIcon,
  Inventory2,
  CarCrash,
  Group,
} from "@mui/icons-material";
import Business from "@mui/icons-material/Business";
import { signOut, getCurrentUser } from "../services/authService";
import { roles } from "../config/permissions";

const ALL_MENU_ITEMS = [
  { name: "Dashboard", path: "/dashboard", icon: <Dashboard />, roles: roles.dashboard },
  { name: "Vehicles", path: "/vehicles", icon: <DirectionsCar />, roles: roles.vehicles },
  { name: "Drivers", path: "/drivers", icon: <Person />, roles: roles.drivers },
  { name: "Departments", path: "/departments", icon: <Business />, roles: roles.departments },
  { name: "Transport Requests", path: "/requests", icon: <Assignment />, roles: roles.requests },
  { name: "Trip Management", path: "/trips", icon: <AltRoute />, roles: roles.trips },
  { name: "Fuel", path: "/fuel", icon: <LocalGasStation />, roles: roles.fuel },
  { name: "Maintenance", path: "/maintenance", icon: <Build />, roles: roles.maintenance },
  { name: "Inventory", path: "/inventory", icon: <Inventory2 />, roles: roles.inventory },
  { name: "Accidents", path: "/accidents", icon: <CarCrash />, roles: roles.accidents },
  { name: "GPS Tracking", path: "/gps-tracking", icon: <MyLocation />, roles: roles.gps },
  { name: "Reports", path: "/reports", icon: <Assessment />, roles: roles.reports },
  { name: "Notifications", path: "/notifications", icon: <NotificationsIcon />, roles: roles.notifications },
  { name: "User Management", path: "/users", icon: <Group />, roles: roles.users },
  { name: "Settings", path: "/settings", icon: <Settings />, roles: roles.settings },
];

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = getCurrentUser();

  const menu = ALL_MENU_ITEMS.filter((item) => item.roles.includes(user?.role));

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (err) {
      // sign-out failing shouldn't block clearing local session state
    }
    localStorage.removeItem("fms_token");
    localStorage.removeItem("fms_user");
    sessionStorage.removeItem("fms_token");
    sessionStorage.removeItem("fms_user");
    navigate("/login");
  };

  return (
    <div
      style={{
        width: "250px",
        flexShrink: 0,
        background: "#0F172A",
        color: "white",
        height: "100vh",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
      }}
    >
      <h2 style={{ marginBottom: "8px", fontFamily: "'Poppins', sans-serif", fontWeight: 600, letterSpacing: "0.5px" }}>
        🚗 FMS
      </h2>

      {user && (
        <div style={{ marginBottom: "24px", opacity: 0.7, fontSize: "13px" }}>
          {user.name || user.email}
          {user.role && <div style={{ textTransform: "capitalize" }}>{user.role.replace(/_/g, " ")}</div>}
          {["department_head", "requester"].includes(user.role) && user.department_name && (
            <div>{user.department_name}</div>
          )}
        </div>
      )}

      <style>{`
        .fms-sidebar-scroll {
          scrollbar-width: thin;
          scrollbar-color: #334155 transparent;
        }
        .fms-sidebar-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .fms-sidebar-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .fms-sidebar-scroll::-webkit-scrollbar-thumb {
          background-color: #334155;
          border-radius: 8px;
        }
        .fms-sidebar-scroll::-webkit-scrollbar-thumb:hover {
          background-color: #475569;
        }
      `}</style>

      <div className="fms-sidebar-scroll" style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
        {menu.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.name}
              to={item.path}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                color: "white",
                textDecoration: "none",
                padding: "12px",
                borderRadius: "8px",
                marginBottom: "8px",
                background: isActive ? "#1E293B" : "transparent",
                borderLeft: isActive ? "3px solid #3B82F6" : "3px solid transparent",
                transition: "background 0.15s ease",
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.background = "#1E293B80";
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.background = "transparent";
              }}
            >
              {item.icon}
              {item.name}
            </Link>
          );
        })}
      </div>

      <button
        onClick={handleLogout}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          color: "white",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          padding: "12px",
          borderRadius: "8px",
          fontSize: "15px",
          textAlign: "left",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "#1E293B80")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        <Logout />
        Logout
      </button>
    </div>
  );
};

export default Sidebar;