import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Paper,
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
import { Visibility, VisibilityOff, DirectionsBus } from "@mui/icons-material";
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
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "grey.100",
        px: 2,
      }}
    >
      <Paper
        elevation={3}
        sx={{
          width: "100%",
          maxWidth: 400,
          p: 4,
          borderRadius: 3,
        }}
      >
        <Stack alignItems="center" spacing={1} sx={{ mb: 3 }}>
          <Box
            sx={{
              bgcolor: "primary.main",
              color: "white",
              borderRadius: "50%",
              width: 56,
              height: 56,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <DirectionsBus fontSize="large" />
          </Box>
          <Typography variant="h5" fontWeight={700} textAlign="center">
            Fleet Management System
          </Typography>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            Oromia State University
          </Typography>
        </Stack>

        {serverError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {serverError}
          </Alert>
        )}

        <Box component="form" onSubmit={handleLogin} noValidate>
          <TextField
            fullWidth
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            error={!!errors.email}
            helperText={errors.email}
            margin="normal"
            autoComplete="email"
            autoFocus
          />

          <TextField
            fullWidth
            label="Password"
            name="password"
            type={showPassword ? "text" : "password"}
            value={formData.password}
            onChange={handleChange}
            error={!!errors.password}
            helperText={errors.password}
            margin="normal"
            autoComplete="current-password"
            InputProps={{
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

          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mt: 1,
            }}
          >
            <FormControlLabel
              control={
                <Checkbox
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  size="small"
                />
              }
              label={<Typography variant="body2">Remember me</Typography>}
            />
            <Typography
              variant="body2"
              color="primary"
              sx={{ cursor: "pointer" }}
              onClick={() => navigate("/forgot-password")}
            >
              Forgot password?
            </Typography>
          </Box>

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={loading}
            sx={{ mt: 3, py: 1.2 }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : "Login"}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}

export default Login;
