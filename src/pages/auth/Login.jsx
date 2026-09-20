import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  TextField,
  Button,
  Typography,
  InputAdornment,
  IconButton,
  Alert,
  CircularProgress,
  Checkbox,
  FormControlLabel,
  Stack,
} from "@mui/material";
import {
  Visibility,
  VisibilityOff,
  MailOutline,
  LockOutlined,
  ArrowForward,
  SendOutlined,
  ShowChart,
} from "@mui/icons-material";
import { signIn } from "../../services/authService";

function Login() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Enter a valid email address";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setServerError("");

    if (!validate()) return;

    setLoading(true);

    try {
      const { token, user } = await signIn(formData.email, formData.password);

      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem("fms_token", token);
      storage.setItem("fms_user", JSON.stringify(user));

      // route by role, same mapping used before
      const roleRoutes = {
        admin: "/dashboard",
        transport_manager: "/dashboard",
        department_head: "/dashboard",
        driver: "/dashboard",
        mechanic: "/maintenance",
        finance_officer: "/reports",
        management: "/dashboard",
      };

      navigate(roleRoutes[user.role] || "/dashboard");
    } catch (err) {
      // Supabase error messages are human-readable already (e.g.
      // "Invalid login credentials"), so surface them fairly directly
      if (err.message?.toLowerCase().includes("invalid login credentials")) {
        setServerError("Invalid email or password.");
      } else if (err.message?.toLowerCase().includes("email not confirmed")) {
        setServerError("Please confirm your email before logging in.");
      } else {
        setServerError(err.message || "Unable to sign in. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "stretch",
        justifyContent: "center",
        bgcolor: "#f4f6f9",
        p: { xs: 0, sm: 3 },
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: 1000,
          m: "auto",
          display: "flex",
          borderRadius: { xs: 0, sm: 4 },
          overflow: "hidden",
          boxShadow: { xs: "none", sm: "0 8px 40px rgba(15, 23, 42, 0.12)" },
          bgcolor: "#fff",
          minHeight: { sm: 560 },
        }}
      >
        {/* Left panel — branding. Hidden on small screens so mobile
            just gets the sign-in form full-width. */}
        <Box
          sx={{
            flex: 1,
            display: { xs: "none", md: "flex" },
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            textAlign: "center",
            p: 6,
            borderRight: "1px solid #eef0f3",
          }}
        >
          <Box
            sx={{
              width: 96,
              height: 96,
              borderRadius: "50%",
              border: "3px solid #cfe4ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mb: 3,
              overflow: "hidden",
              bgcolor: "#fff",
            }}
          >
            <Box
              component="img"
              src="/osu-logo.png"
              alt="Oromia State University"
              sx={{ width: 62, height: 62, objectFit: "contain" }}
            />
          </Box>

          <Typography variant="h5" fontWeight={700}>
            FMS — Fleet Management
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, maxWidth: 280 }}>
            Your gateway to Oromia State University's vehicle fleet and transport operations.
          </Typography>

          <Stack spacing={2.5} sx={{ mt: 5, width: "100%", maxWidth: 300, textAlign: "left" }}>
            <Stack direction="row" spacing={2} alignItems="flex-start">
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  flexShrink: 0,
                  borderRadius: "10px",
                  bgcolor: "#e8f1ff",
                  color: "#1976d2",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <SendOutlined fontSize="small" />
              </Box>
              <Box>
                <Typography variant="subtitle2" fontWeight={600}>
                  Submit Transport Requests
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  File and track vehicle requests for your department
                </Typography>
              </Box>
            </Stack>

            <Stack direction="row" spacing={2} alignItems="flex-start">
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  flexShrink: 0,
                  borderRadius: "10px",
                  bgcolor: "#e8f1ff",
                  color: "#1976d2",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ShowChart fontSize="small" />
              </Box>
              <Box>
                <Typography variant="subtitle2" fontWeight={600}>
                  Track Fleet Activity
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Monitor vehicles, trips, and requests in real time
                </Typography>
              </Box>
            </Stack>
          </Stack>
        </Box>

        {/* Right panel — the actual sign-in form */}
        <Box
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            p: { xs: 4, sm: 6 },
          }}
        >
          <Typography variant="h4" fontWeight={700}>
            Welcome back
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3 }}>
            Sign in to your OSU Fleet Management account
          </Typography>

          {serverError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {serverError}
            </Alert>
          )}

          <Box component="form" onSubmit={handleLogin} noValidate>
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
              Email
            </Typography>
            <TextField
              fullWidth
              placeholder="you@example.com"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              error={!!errors.email}
              helperText={errors.email}
              autoComplete="email"
              autoFocus
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <MailOutline fontSize="small" color="disabled" />
                  </InputAdornment>
                ),
              }}
            />

            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 2, mb: 0.5 }}>
              <Typography variant="subtitle2" fontWeight={600}>
                Password
              </Typography>
              <Typography
                variant="body2"
                color="primary"
                sx={{ cursor: "pointer" }}
                onClick={() => navigate("/forgot-password")}
              >
                Forgot password?
              </Typography>
            </Box>
            <TextField
              fullWidth
              placeholder="Password"
              name="password"
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={handleChange}
              error={!!errors.password}
              helperText={errors.password}
              autoComplete="current-password"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlined fontSize="small" color="disabled" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword((prev) => !prev)}
                      edge="end"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <FormControlLabel
              sx={{ mt: 1 }}
              control={
                <Checkbox
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  size="small"
                />
              }
              label={<Typography variant="body2">Remember me</Typography>}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              endIcon={!loading && <ArrowForward />}
              sx={{
                mt: 2,
                py: 1.3,
                borderRadius: 2,
                fontWeight: 600,
                background: "linear-gradient(90deg, #1976d2, #0F172A)",
                "&:hover": { background: "linear-gradient(90deg, #1565c0, #0b1120)" },
              }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : "Sign In"}
            </Button>
          </Box>

          <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 4 }}>
            Need an account? Contact your system administrator.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

export default Login;