import { useState } from "react";
import DashboardLayout from "../../Layouts/DashboardLayout";
import ProfileSettings from "../../components/settings/ProfileSettings";
import SystemSettings from "../../components/settings/SystemSettings";
import NotificationSettings from "../../components/settings/NotificationSettings";
import { Typography, Tabs, Tab, Box } from "@mui/material";
import { getCurrentUser } from "../../services/authService";

const Settings = () => {
  const [tab, setTab] = useState(0);
  // System settings (org name, contact email) are fleet-wide config —
  // keep that tab admin-only even though everyone else now has their
  // own Profile and Notifications tabs here.
  const isAdmin = getCurrentUser()?.role === "admin";
  const tabs = [
    { label: "Profile", content: <ProfileSettings /> },
    ...(isAdmin ? [{ label: "System", content: <SystemSettings /> }] : []),
    { label: "Notifications", content: <NotificationSettings /> },
  ];

  return (
    <DashboardLayout>
      <Typography variant="h4" mb={3}>
        Settings
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          {tabs.map((item) => <Tab key={item.label} label={item.label} />)}
        </Tabs>
      </Box>

      {tabs[tab]?.content}
    </DashboardLayout>
  );
};

export default Settings;