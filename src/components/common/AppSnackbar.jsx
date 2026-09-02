import { Snackbar, Alert } from "@mui/material";

const AppSnackbar = ({ snackbar, setSnackbar }) => {
  const handleClose = (event, reason) => {
    // ignore clicks outside the snackbar so an important message
    // (e.g. a validation or save error) isn't dismissed by accident
    if (reason === "clickaway") return;

    setSnackbar({ ...snackbar, open: false });
  };

  // errors get more time on screen than a quick success toast
  const duration = snackbar.severity === "error" ? 6000 : 3000;

  return (
    <Snackbar
      open={snackbar.open}
      autoHideDuration={duration}
      onClose={handleClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
    >
      <Alert severity={snackbar.severity} variant="filled" sx={{ width: "100%" }} onClose={handleClose}>
        {snackbar.message}
      </Alert>
    </Snackbar>
  );
};

export default AppSnackbar;