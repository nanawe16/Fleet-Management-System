import { Component, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Typography, Button } from "@mui/material";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

import { supabase } from "../lib/supabase";

const isAuthenticated = () => {
  return Boolean(
    localStorage.getItem("fms_user") ||
    sessionStorage.getItem("fms_user")
  );
};

class LayoutErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("Dashboard content crashed:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="h6" gutterBottom>
            Something went wrong loading this page.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Try reloading. If the problem continues, the backend for this page may not be connected yet.
          </Typography>
          <Button variant="contained" onClick={() => window.location.reload()}>
            Reload
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}

const DashboardLayout = ({ children }) => {
  const navigate = useNavigate();
  const authed = isAuthenticated();

  useEffect(() => {
    if (!authed) {
      navigate("/login", { replace: true });
    }
  }, [authed, navigate]);

  if (!authed) {
    return null;
  }

  return (
    // height locked to the viewport, with overflow hidden here — the
    // Sidebar and the content area below the Navbar each own their own
    // scrollbar instead of the whole page scrolling as one block
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar />

      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", height: "100vh" }}>
        {/* Navbar sits outside the scrollable area below, so it never moves */}
        <Navbar />

        <style>{`
          .fms-content-scroll {
            scrollbar-width: thin;
            scrollbar-color: #cbd5e1 transparent;
          }
          .fms-content-scroll::-webkit-scrollbar {
            width: 8px;
          }
          .fms-content-scroll::-webkit-scrollbar-track {
            background: transparent;
          }
          .fms-content-scroll::-webkit-scrollbar-thumb {
            background-color: #cbd5e1;
            border-radius: 8px;
          }
          .fms-content-scroll::-webkit-scrollbar-thumb:hover {
            background-color: #94a3b8;
          }
        `}</style>

        <div className="fms-content-scroll" style={{ flex: 1, overflowY: "auto", padding: "25px" }}>
          <LayoutErrorBoundary>{children}</LayoutErrorBoundary>
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;