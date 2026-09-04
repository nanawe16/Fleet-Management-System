import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  AppBar,
  Toolbar,
  Typography,
  Avatar,
  Box,
  IconButton,
  Badge,
  Menu,
  MenuItem,
  ListItemIcon,
  Divider,
  useMediaQuery,
} from "@mui/material";
import {
  Notifications as NotificationsIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Menu as MenuIcon,
  DirectionsBus as DirectionsBusIcon,
} from "@mui/icons-material";
import { supabase } from "../lib/supabase";
import { getUnreadCount } from "../services/notificationService";

const getCurrentUser = () => {
  const raw = localStorage.getItem("fms_user") || sessionStorage.getItem("fms_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
};

const getInitial = (user) => {
  const source = user?.name || user?.email || "?";
  return source.trim().charAt(0).toUpperCase();
};

const formatRole = (role) => {
  if (!role) return "User";
  return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

const Navbar = ({ onMenuClick = () => {}, showMenuButton = false }) => {
  const navigate = useNavigate();
  const isMobile = useMediaQuery("(max-width:600px)");
  const user = getCurrentUser();

  const [notificationCount, setNotificationCount] = useState(0);
  const [profileAnchor, setProfileAnchor] = useState(null);

  useEffect(() => {
    const fetchCount = async () => {
      const count = await getUnreadCount();
      setNotificationCount(count);
    };

    fetchCount();
    const interval = setInterval(fetchCount, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    setProfileAnchor(null);
    try {
      await supabase.auth.signOut();
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
    <AppBar position="static" elevation={1} color="inherit">
      <Toolbar>
        {showMenuButton && (
          <IconButton
            onClick={onMenuClick}
            aria-label="Open menu"
            edge="start"
            sx={{ mr: 1 }}
          >
            <MenuIcon />
          </IconButton>
        )}

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.2, flexGrow: 1, minWidth: 0 }}>
          <Box
            sx={{
              width: 34,
              height: 34,
              flexShrink: 0,
              borderRadius: "8px",
              background: "linear-gradient(135deg, #1976d2, #0F172A)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
            }}
          >
            <DirectionsBusIcon fontSize="small" />
          </Box>

          <Box sx={{ minWidth: 0 }}>
            <Typography
              noWrap
              sx={{
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "1.5px",
                color: "text.secondary",
                textTransform: "uppercase",
                lineHeight: 1.2,
              }}
            >
              Oromia State University
            </Typography>
            <Typography
              noWrap
              sx={{
                fontSize: "18px",
                fontWeight: 700,
                lineHeight: 1.2,
                background: "linear-gradient(90deg, #1976d2, #0F172A)",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              fleet management system
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <IconButton onClick={() => navigate("/notifications")} aria-label="Notifications">
            <Badge badgeContent={notificationCount} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>

          <Box
            sx={{ display: "flex", alignItems: "center", gap: 1, cursor: "pointer", ml: 1 }}
            onClick={(e) => setProfileAnchor(e.currentTarget)}
          >
            {!isMobile && (
              <Box sx={{ textAlign: "right", lineHeight: 1.2 }}>
                <Typography variant="body2" fontWeight={600}>
                  {user?.name || user?.email || "Guest"}
                </Typography>
                <Typography variant="caption" color="text.secondary" component="div">
                  {formatRole(user?.role)}
                </Typography>
                {["department_head", "requester"].includes(user?.role) && user?.department_name && (
                  <Typography variant="caption" color="text.secondary" component="div">
                    {user.department_name}
                  </Typography>
                )}
              </Box>
            )}
            <Avatar>{getInitial(user)}</Avatar>
          </Box>

          <Menu
            anchorEl={profileAnchor}
            open={Boolean(profileAnchor)}
            onClose={() => setProfileAnchor(null)}
            transformOrigin={{ horizontal: "right", vertical: "top" }}
            anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
          >
            <MenuItem
              onClick={() => {
                setProfileAnchor(null);
                navigate("/settings?tab=profile");
              }}
            >
              <ListItemIcon>
                <SettingsIcon fontSize="small" />
              </ListItemIcon>
              Settings
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              Logout
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;