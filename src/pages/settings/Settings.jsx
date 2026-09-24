import { useState } from "react";
import DashboardLayout from "../../Layouts/DashboardLayout";
import ProfileSettings from "../../components/settings/ProfileSettings";
import SystemSettings from "../../components/settings/SystemSettings";
import NotificationSettings from "../../components/settings/NotificationSettings";
import { Typography, Tabs, Tab, Box } from "@mui/material";
import { getCurrentUser } from "../../services/authService";
import LanguageSwitcher from "../../i18n/LanguageSwitcher";
import { useTranslation } from "react-i18next";

const Settings = () => {
  const [tab, setTab] = useState(0);
  const { t } = useTranslation();

  const isAdmin = getCurrentUser()?.role === "admin";

  const tabs = [
    {
      label: t("settings.profile"),
      content: <ProfileSettings />,
    },

    ...(isAdmin
      ? [
          {
            label: t("settings.system"),
            content: <SystemSettings />,
          },
        ]
      : []),

    {
      label: t("settings.notificationsTab"),
      content: <NotificationSettings />,
    },

    {
      label: t("settings.languageTab"),
      content: (
        <Box sx={{ maxWidth: 320 }}>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 2 }}
          >
            {t("common.selectLanguage")}
          </Typography>

          <LanguageSwitcher showLabel={false} />
        </Box>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <Typography variant="h4" mb={3}>
        {t("settings.title")}
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          {tabs.map((item) => (
            <Tab key={item.label} label={item.label} />
          ))}
        </Tabs>
      </Box>

      {tabs[tab]?.content}
    </DashboardLayout>
  );
};

export default Settings;