import { useState, useEffect } from "react";

import DashboardLayout from "../../Layouts/DashboardLayout";
import TripTable from "../../components/tables/TripTable";
import TripForm from "../../components/forms/TripForm";
import {
  getTrips,
  createTrip,
  updateTrip,
  deleteTrip,
} from "../../services/tripService";
import { getCurrentUser } from "../../services/authService";

import PageHeader from "../../components/common/PageHeader";
import SearchFilterBar from "../../components/common/SearchFilterBar";
import AppSnackbar from "../../components/common/AppSnackbar";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { Skeleton, Stack, Alert } from "@mui/material";

// statuses that actually occupy a vehicle/driver's schedule
const ACTIVE_STATUSES = ["Scheduled", "Ongoing"];

const rangesOverlap = (startA, endA, startB, endB) =>
  new Date(startA) <= new Date(endB) && new Date(endA) >= new Date(startB);

const Trips = () => {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  const [open, setOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState(null);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tripToDelete, setTripToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const currentUser = getCurrentUser();
  const role = currentUser?.role;
  const isAdmin = role === "admin";
  const isTransportManager = role === "transport_manager";
  const isDriver = role === "driver";
  // Matrix: Admin (Full) and Transport Manager (Create/Edit All) can
  // create trips. Driver is View/Edit-Own only, no Create.
  const canCreate = isAdmin || isTransportManager;
  // Matrix: Admin/Transport Manager edit any trip; Driver edits their
  // own only -- but getTrips() is already RLS-filtered to a driver's
  // own trips (028), so every row a driver sees here IS their own,
  // no per-row check needed. Any other role (Dept Head, Mechanic,
  // Finance, Management) is view-only on this page.
  const canEdit = isAdmin || isTransportManager || isDriver;
  // Matrix: only Admin gets Delete ("F" vs Transport Manager's "C/E
  // All"). NOTE: the current trips RLS policy still grants Transport
  // Manager delete too (same gap already fixed for transport_requests
  // in 027) -- hiding this button matches the *intended* matrix, but
  // ask about a follow-up migration if you want the backend to
  // actually enforce it, otherwise Transport Manager could still
  // delete via a direct API call.
  const canDelete = isAdmin;

  const loadTrips = async () => {
    setLoading(true);
    const { data, usingMockData } = await getTrips();
    setTrips(data);
    setNotice(usingMockData ? "Backend not connected yet — showing sample data." : "");
    setLoading(false);
  };

  useEffect(() => {
    loadTrips();
  }, []);

  // finds a conflicting trip for the same vehicle OR same driver on overlapping dates
  const findConflict = (trip, ignoreId = null) => {
    return trips.find((t) => {
      if (t.id === ignoreId) return false;
      if (!ACTIVE_STATUSES.includes(t.status)) return false;

      const sameVehicle = t.vehicleId === trip.vehicleId;
      const sameDriver = t.driverId === trip.driverId;
      if (!sameVehicle && !sameDriver) return false;

      return rangesOverlap(trip.startDate, trip.endDate, t.startDate, t.endDate);
    });
  };

  const validateTrip = (trip) => {
    if (!trip.vehicleId) return "Vehicle is required.";
    if (!trip.driverId) return "Driver is required.";
    if (!trip.destination?.trim()) return "Destination is required.";
    if (!trip.startDate || !trip.endDate) return "Start and end dates are required.";
    if (new Date(trip.endDate) < new Date(trip.startDate)) {
      return "End date can't be before start date.";
    }
    return null;
  };

  const handleSave = async (trip) => {
    const validationError = validateTrip(trip);
    if (validationError) {
      setSnackbar({ open: true, message: validationError, severity: "error" });
      return;
    }

    if (ACTIVE_STATUSES.includes(trip.status)) {
      const conflict = findConflict(trip, editingTrip?.id);
      if (conflict) {
        const conflictField = conflict.vehicleId === trip.vehicleId ? "Vehicle" : "Driver";
        setSnackbar({
          open: true,
          message: `${conflictField} already assigned to a trip (${conflict.destination}) on overlapping dates.`,
          severity: "error",
        });
        return;
      }
    }

    setSaving(true);
    try {
      if (editingTrip) {
        const updated = await updateTrip(editingTrip.id, trip);
        setTrips(trips.map((t) => (t.id === editingTrip.id ? updated : t)));
        setSnackbar({
          open: true,
          message: "Trip updated successfully!",
          severity: "success",
        });
      } else {
        const created = await createTrip(trip);
        setTrips([...trips, created]);
        setSnackbar({
          open: true,
          message: "Trip assigned successfully!",
          severity: "success",
        });
      }

      setEditingTrip(null);
      setOpen(false);
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Couldn't save the trip. Please try again.",
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (trip) => {
    setEditingTrip(trip);
    setOpen(true);
  };

  const handleDelete = (id) => {
    const trip = trips.find((t) => t.id === id);
    setTripToDelete(trip);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await deleteTrip(tripToDelete.id);
      setTrips(trips.filter((t) => t.id !== tripToDelete.id));
      setSnackbar({
        open: true,
        message: "Trip deleted successfully!",
        severity: "success",
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Couldn't delete the trip. Please try again.",
        severity: "error",
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setTripToDelete(null);
    }
  };

  const filteredTrips = trips.filter((trip) => {
    const matchesSearch =
      trip.vehicle.toLowerCase().includes(search.toLowerCase()) ||
      trip.driver.toLowerCase().includes(search.toLowerCase()) ||
      trip.destination.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === "All" || trip.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <DashboardLayout>
      <PageHeader
        title="Trip Management"
        buttonText="Assign Trip"
        onAdd={canCreate ? () => setOpen(true) : undefined}
      />

      {notice && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {notice}
        </Alert>
      )}

      <SearchFilterBar
        search={search}
        setSearch={setSearch}
        status={statusFilter}
        setStatus={setStatusFilter}
        statusOptions={["All", "Scheduled", "Ongoing", "Completed", "Cancelled"]}
        searchLabel="Search Vehicle, Driver or Destination"
      />

      <TripForm
        open={open}
        handleClose={() => {
          setOpen(false);
          setEditingTrip(null);
        }}
        onSave={handleSave}
        initialData={editingTrip}
        saving={saving}
      />

      {loading ? (
        <Stack spacing={1} sx={{ mt: 2 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={52} />
          ))}
        </Stack>
      ) : (
        <TripTable
          trips={filteredTrips}
          onEdit={handleEdit}
          onDelete={handleDelete}
          canEdit={canEdit}
          canDelete={canDelete}
        />
      )}

      <AppSnackbar snackbar={snackbar} setSnackbar={setSnackbar} />

      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Trip"
        message={`Delete trip for ${tripToDelete?.vehicle || ""}?`}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        loading={deleting}
      />
    </DashboardLayout>
  );
};

export default Trips;