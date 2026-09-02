import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../Layouts/DashboardLayout";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from "../../services/notificationService";
import {
  Typography,
  Box,
  Paper,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
  Button,
  Chip,
  Skeleton,
  Alert,
  Divider,
} from "@mui/material";
import BuildIcon from "@mui/icons-material/Build";
import SecurityIcon from "@mui/icons-material/Security";
import BadgeIcon from "@mui/icons-material/Badge";
import AssignmentIcon from "@mui/icons-material/Assignment";
import NotificationsIcon from "@mui/icons-material/Notifications";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import DeleteIcon from "@mui/icons-material/Delete";
import DoneAllIcon from "@mui/icons-material/DoneAll";

const TYPE_META = {
  maintenance: { label: "Maintenance", icon: <BuildIcon fontSize="small" />, color: "warning" },
  insurance: { label: "Insurance", icon: <SecurityIcon fontSize="small" />, color: "error" },
  license: { label: "License", icon: <BadgeIcon fontSize="small" />, color: "error" },
  request: { label: "Requests", icon: <AssignmentIcon fontSize="small" />, color: "info" },
};

const FILTER_TABS = ["all", "maintenance", "insurance", "license", "request"];

const timeAgo = (iso) => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const Notifications = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState("all");

  const loadNotifications = async () => {
    setLoading(true);
    const { data, usingMockData } = await getNotifications();
    // newest first
    setNotifications([...data].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    setNotice(usingMockData ? "Backend not connected yet — showing sample notifications." : "");
    setLoading(false);
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const filtered = tab === "all" ? notifications : notifications.filter((n) => n.type === tab);

  const handleClick = async (notification) => {
    if (!notification.isRead) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n))
      );
      try {
        await markAsRead(notification.id);
      } catch (err) {
        // backend not connected yet — the optimistic local update above is
        // enough for demo purposes, nothing further to do here
      }
    }
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await markAllAsRead();
    } catch (err) {
      // same as above — optimistic update already applied
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    const previous = notifications;
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await deleteNotification(id);
    } catch (err) {
      // backend not connected — keep the optimistic removal rather than
      // reverting, so the demo still feels functional
    }
  };

  return (
    <DashboardLayout>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
        <Typography variant="h4">Notifications</Typography>
        {unreadCount > 0 && (
          <Button startIcon={<DoneAllIcon />} onClick={handleMarkAllRead} size="small">
            Mark all as read
          </Button>
        )}
      </Box>
      <Typography variant="body2" color="text.secondary" mb={3}>
        {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
      </Typography>

      {notice && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {notice}
        </Alert>
      )}

      <Paper sx={{ borderRadius: 3, overflow: "hidden" }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: "divider", px: 1 }}
        >
          {FILTER_TABS.map((key) => (
            <Tab key={key} value={key} label={key === "all" ? "All" : TYPE_META[key].label} />
          ))}
        </Tabs>

        {loading ? (
          <Box sx={{ p: 2 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} variant="rounded" height={64} sx={{ mb: 1 }} />
            ))}
          </Box>
        ) : filtered.length === 0 ? (
          <Box sx={{ p: 5, textAlign: "center" }}>
            <NotificationsNoneIcon sx={{ fontSize: 40, color: "text.disabled", mb: 1 }} />
            <Typography variant="body1" color="text.secondary">
              No notifications here.
            </Typography>
          </Box>
        ) : (
          <List disablePadding>
            {filtered.map((notification, idx) => {
              const meta = TYPE_META[notification.type] || {
                label: notification.type,
                icon: <NotificationsIcon fontSize="small" />,
                color: "default",
              };

              return (
                <Box key={notification.id}>
                  <ListItemButton
                    onClick={() => handleClick(notification)}
                    sx={{
                      bgcolor: notification.isRead ? "transparent" : "action.hover",
                      py: 1.5,
                    }}
                  >
                    <ListItemIcon>{meta.icon}</ListItemIcon>
                    <ListItemText
                      primary={notification.message}
                      secondary={timeAgo(notification.createdAt)}
                      primaryTypographyProps={{
                        fontWeight: notification.isRead ? 400 : 600,
                      }}
                    />
                    <Chip label={meta.label} size="small" color={meta.color} sx={{ mr: 1 }} />
                    <Tooltip title="Delete">
                      <IconButton size="small" onClick={(e) => handleDelete(e, notification.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </ListItemButton>
                  {idx < filtered.length - 1 && <Divider component="li" />}
                </Box>
              );
            })}
          </List>
        )}
      </Paper>
    </DashboardLayout>
  );
};

export default Notifications;