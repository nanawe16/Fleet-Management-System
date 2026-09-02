import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Alert, Box, Button, CircularProgress, Paper, Stack, TextField, Typography } from "@mui/material";
import { requestPasswordReset, resetPassword } from "../../services/authService";

const PasswordRecovery = ({ mode }) => {
  const navigate = useNavigate();
  const isReset = mode === "reset";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    if (isReset && (password.length < 6 || password !== confirmPassword)) {
      setError(password.length < 6 ? "Use a password with at least 6 characters." : "Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      if (isReset) {
        await resetPassword(password);
        setMessage("Your password has been updated. You can now sign in.");
        setTimeout(() => navigate("/login", { replace: true }), 1200);
      } else {
        await requestPasswordReset(email);
        setMessage("If that email has an account, a reset link has been sent.");
      }
    } catch (err) {
      setError(err.message || "Unable to process your request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "grey.100", px: 2 }}>
      <Paper elevation={3} sx={{ width: "100%", maxWidth: 400, p: 4, borderRadius: 3 }}>
        <Stack spacing={2} component="form" onSubmit={handleSubmit}>
          <Typography variant="h5" fontWeight={700}>{isReset ? "Set a new password" : "Reset your password"}</Typography>
          <Typography variant="body2" color="text.secondary">
            {isReset ? "Choose a new password for your account." : "Enter your email and we’ll send you a reset link."}
          </Typography>
          {error && <Alert severity="error">{error}</Alert>}
          {message && <Alert severity="success">{message}</Alert>}
          {isReset ? <><TextField label="New password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" required /><TextField label="Confirm new password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" required /></> : <TextField label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />}
          <Button type="submit" variant="contained" disabled={loading}>{loading ? <CircularProgress size={22} color="inherit" /> : isReset ? "Update password" : "Send reset link"}</Button>
          <Link to="/login">Back to sign in</Link>
        </Stack>
      </Paper>
    </Box>
  );
};

export default PasswordRecovery;
