import { Routes, Route, Navigate } from "react-router-dom";

import Login from "../pages/auth/Login";
import Dashboard from "../pages/dashboard/Dashboard";
import Vehicles from "../pages/vehicles/Vehicles";
import Drivers from "../pages/drivers/Drivers";
import Departments from "../pages/departments/Departments";
import Requests from "../pages/requests/Requests";
import Fuel from "../pages/fuel/Fuel";
import Maintenance from "../pages/maintenance/Maintenance";
import Reports from "../pages/reports/Reports";
import Settings from "../pages/settings/Settings";
import Trips from "../pages/trips/Trips";
import GpsTracking from "../pages/Gpstracking/Gpstracking";
import Notifications from "../pages/Notifications/Notifications";
import Inventory from "../pages/Inventory/Inventory";
import Accidents from "../pages/accidents/accidents";
import UserManagement from "../pages/users/UserManagement";
import ProtectedRoute from "../routes/ProtectedRoute";
import PasswordRecovery from "../pages/auth/PasswordRecovery";
import { roles } from "../config/permissions";

const protectedPage = (element, roles = "all") => (
  <ProtectedRoute roles={roles}>{element}</ProtectedRoute>
);

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<PasswordRecovery mode="request" />} />
      <Route path="/reset-password" element={<PasswordRecovery mode="reset" />} />

      <Route path="/dashboard" element={protectedPage(<Dashboard />, roles.dashboard)} />
      <Route path="/vehicles" element={protectedPage(<Vehicles />, roles.vehicles)} />
      <Route path="/drivers" element={protectedPage(<Drivers />, roles.drivers)} />
      <Route path="/departments" element={protectedPage(<Departments />, roles.departments)} />
      <Route path="/requests" element={protectedPage(<Requests />, roles.requests)} />
      <Route path="/fuel" element={protectedPage(<Fuel />, roles.fuel)} />
      <Route path="/maintenance" element={protectedPage(<Maintenance />, roles.maintenance)} />
      <Route path="/reports" element={protectedPage(<Reports />, roles.reports)} />
      <Route path="/settings" element={protectedPage(<Settings />, roles.settings)} />
      <Route path="/trips" element={protectedPage(<Trips />, roles.trips)} />
      <Route path="/gps-tracking" element={protectedPage(<GpsTracking />, roles.gps)} />
      <Route path="/notifications" element={protectedPage(<Notifications />, roles.notifications)} />
      <Route path="/inventory" element={protectedPage(<Inventory />, roles.inventory)} />
      <Route path="/accidents" element={protectedPage(<Accidents />, roles.accidents)} />
      <Route path="/users" element={protectedPage(<UserManagement />, roles.users)} />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default AppRoutes;
