import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Stack,
  CircularProgress,
  Alert,
} from "@mui/material";
import { getDepartments } from "../../services/departmentService";
import { getCurrentUser } from "../../services/authService";

const emptyRequest = {
  department: "",
  departmentId: "",
  requester: "",
  destination: "",
  date: "",
};

const RequestForm = ({ open, handleClose, onSave, initialData, saving = false }) => {
  const [request, setRequest] = useState(emptyRequest);
  const [errors, setErrors] = useState({});
  const [departments, setDepartments] = useState([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [departmentsLoaded, setDepartmentsLoaded] = useState(false);

  useEffect(() => {
    if (initialData) {
      setRequest(initialData);
    } else {
      // New request — prefill with the logged-in user's own name so a
      // requester filling out their own request doesn't have to type it.
      // Anyone can still change it (e.g. a Department Head filing on
      // someone else's behalf).
      const currentUser = getCurrentUser();
      setRequest({ ...emptyRequest, requester: currentUser?.name || "" });
    }
    setErrors({});
  }, [initialData, open]);

  useEffect(() => {
    if (!open) return;

    const loadDepartments = async () => {
      setLoadingDepartments(true);
      setDepartmentsLoaded(false);
      const { data } = await getDepartments();
      setDepartments(data);
      setLoadingDepartments(false);
      setDepartmentsLoaded(true);

      // Department Head / Requester accounts only ever see their own
      // department here (RLS-scoped) — auto-select it instead of making
      // them pick the one option in a dropdown.
      if (data.length === 1) {
        setRequest((prev) =>
          prev.departmentId ? prev : { ...prev, departmentId: data[0].id, department: data[0].name }
        );
      }
    };

    loadDepartments();
  }, [open]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const selectedDepartment =
      name === "departmentId" ? departments.find((department) => department.id === value) : null;
    setRequest((prev) => ({
      ...prev,
      [name]: value,
      ...(selectedDepartment ? { department: selectedDepartment.name } : {}),
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!request.departmentId) newErrors.departmentId = "Department is required";
    if (!request.requester.trim()) newErrors.requester = "Requester is required";
    if (!request.destination.trim()) newErrors.destination = "Destination is required";
    if (!request.date) newErrors.date = "Date is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    // Don't close or reset here — onSave is async in the parent and can
    // still fail. The parent closes this dialog itself once the save
    // actually succeeds.
    onSave?.(request);
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : handleClose} fullWidth maxWidth="sm">
      <DialogTitle>{initialData ? "Edit Request" : "New Request"}</DialogTitle>

      <DialogContent>
        <Stack spacing={2} mt={1}>
          {departmentsLoaded && departments.length === 0 && (
            <Alert severity="warning">
              No department is assigned to your account yet, so there's nothing to select here.
              Ask an administrator to assign you a department in User Management before submitting
              a request.
            </Alert>
          )}

          <TextField
            select
            label="Department"
            name="departmentId"
            value={request.departmentId || ""}
            onChange={handleChange}
            error={!!errors.departmentId}
            helperText={errors.departmentId}
            disabled={loadingDepartments}
            fullWidth
          >
            {departments.map((department) => (
              <MenuItem key={department.id} value={department.id}>
                {department.name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Requester"
            name="requester"
            value={request.requester}
            onChange={handleChange}
            error={!!errors.requester}
            helperText={errors.requester}
            fullWidth
          />

          <TextField
            label="Destination"
            name="destination"
            value={request.destination}
            onChange={handleChange}
            error={!!errors.destination}
            helperText={errors.destination}
            fullWidth
          />

          <TextField
            type="date"
            name="date"
            value={request.date}
            onChange={handleChange}
            error={!!errors.date}
            helperText={errors.date}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />

          {/* Status is no longer editable here — it moves only through
              the workflow actions (Approve/Reject/Allocate buttons in
              RequestTable), each backed by a server-side function that
              checks the current stage. A free-form Status field here
              would let anyone with edit rights skip stages, which
              defeats the point of a workflow. */}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={saving}>
          Cancel
        </Button>

        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {saving ? "Saving..." : initialData ? "Update" : "Submit Request"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RequestForm;
