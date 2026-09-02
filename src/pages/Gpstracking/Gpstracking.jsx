import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import DashboardLayout from "../../Layouts/DashboardLayout";
import { getVehiclePositions } from "../../services/gpsService";
import { getDevicesByVehicle, provisionDevice, deactivateDevice } from "../../services/gpsDeviceService";
import { getCurrentUser } from "../../services/authService";
import {
  Typography,
  Box,
  Paper,
  List,
  ListItemButton,
  ListItemText,
  Chip,
  Alert,
  Skeleton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  Tooltip,
  TextField,
} from "@mui/material";
import SettingsInputAntennaIcon from "@mui/icons-material/SettingsInputAntenna";
import RefreshIcon from "@mui/icons-material/Refresh";
import BlockIcon from "@mui/icons-material/Block";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";

const REFRESH_INTERVAL = 3000;

// Default Leaflet marker icons reference image files that Vite doesn't
// bundle correctly out of the box — using a small inline SVG divIcon
// sidesteps that entirely instead of patching Leaflet's asset paths.
const carIcon = (color) =>
  L.divIcon({
    className: "",
    html: `
      <div style="
        background:${color};
        width:28px;height:28px;border-radius:50%;
        display:flex;align-items:center;justify-content:center;
        box-shadow:0 2px 6px rgba(0,0,0,0.4);
        border:2px solid white;
      ">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="white">
          <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
        </svg>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

// Recenters the map when a vehicle is selected from the list, without
// remounting the whole MapContainer
const MapRecenter = ({ position }) => {
  const map = useMap();
  const lastPlateRef = useRef(null);

  useEffect(() => {
    if (position && position.plateNumber !== lastPlateRef.current) {
      map.flyTo([position.lat, position.lng], 9, { duration: 0.8 });
      lastPlateRef.current = position.plateNumber;
    }
  }, [position, map]);

  return null;
};

const DIRECTION_COLOR = { outbound: "#1976d2", returning: "#ed6c02" };

const GpsTracking = () => {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [selectedPlate, setSelectedPlate] = useState(null);
  const intervalRef = useRef(null);

  const isFleetManager = ["admin", "transport_manager"].includes(getCurrentUser()?.role);
  const [deviceDialogOpen, setDeviceDialogOpen] = useState(false);
  const [deviceRows, setDeviceRows] = useState([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [deviceActionId, setDeviceActionId] = useState(null);
  const [revealedKey, setRevealedKey] = useState(null); // { plateNumber, key }

  const fetchPositions = async () => {
    const { data, usingSimulatedData } = await getVehiclePositions();
    setPositions(data);
    setNotice(
      usingSimulatedData
        ? "No GPS hardware connected — showing simulated vehicle movement for demo purposes."
        : ""
    );
    setLoading(false);
  };

  useEffect(() => {
    fetchPositions();
    intervalRef.current = setInterval(fetchPositions, REFRESH_INTERVAL);
    return () => clearInterval(intervalRef.current);
  }, []);

  const loadDevices = async () => {
    setLoadingDevices(true);
    try {
      setDeviceRows(await getDevicesByVehicle());
    } catch (err) {
      setNotice(err.message || "Couldn't load GPS devices.");
    } finally {
      setLoadingDevices(false);
    }
  };

  const openDeviceDialog = () => {
    setDeviceDialogOpen(true);
    loadDevices();
  };

  const handleProvision = async (vehicleId, plateNumber) => {
    setDeviceActionId(vehicleId);
    try {
      const rawKey = await provisionDevice(vehicleId, `${plateNumber} tracker`);
      setRevealedKey({ plateNumber, key: rawKey });
      await loadDevices();
    } catch (err) {
      setNotice(err.message || "Couldn't generate a device key.");
    } finally {
      setDeviceActionId(null);
    }
  };

  const handleDeactivate = async (vehicleId) => {
    setDeviceActionId(vehicleId);
    try {
      await deactivateDevice(vehicleId);
      await loadDevices();
    } catch (err) {
      setNotice(err.message || "Couldn't deactivate the device.");
    } finally {
      setDeviceActionId(null);
    }
  };

  const selectedPosition = positions.find((p) => p.plateNumber === selectedPlate);

  // default center: roughly between Shashamane, Adama, and Addis Ababa
  const defaultCenter = [8.0, 38.7];

  return (
    <DashboardLayout>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
        <Typography variant="h4">GPS Tracking</Typography>
        {isFleetManager && (
          <Button variant="outlined" startIcon={<SettingsInputAntennaIcon />} onClick={openDeviceDialog}>
            Manage GPS Devices
          </Button>
        )}
      </Box>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Live vehicle locations, updated every {REFRESH_INTERVAL / 1000}s.
      </Typography>

      {notice && (
        <Alert severity="info" sx={{ mb: 3 }}>
          {notice}
        </Alert>
      )}

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "280px 1fr" }, gap: 2 }}>
        <Paper sx={{ borderRadius: 3, overflow: "hidden" }}>
          {loading ? (
            <Box sx={{ p: 2 }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} variant="rounded" height={64} sx={{ mb: 1 }} />
              ))}
            </Box>
          ) : (
            <List disablePadding>
              {positions.map((vehicle) => (
                <ListItemButton
                  key={vehicle.plateNumber}
                  selected={vehicle.plateNumber === selectedPlate}
                  onClick={() => setSelectedPlate(vehicle.plateNumber)}
                  sx={{ borderBottom: "1px solid", borderColor: "divider" }}
                >
                  <ListItemText
                    primary={vehicle.plateNumber}
                    secondary={vehicle.routeLabel || (vehicle.source === "device" ? "Live GPS" : undefined)}
                  />
                  <Chip
                    label={vehicle.source === "device" ? "Live" : "Simulated"}
                    size="small"
                    variant={vehicle.source === "device" ? "filled" : "outlined"}
                    color={vehicle.source === "device" ? "success" : "default"}
                    sx={{ mr: 1 }}
                  />
                  <Chip
                    label={`${vehicle.speed} km/h`}
                    size="small"
                    sx={{
                      bgcolor: DIRECTION_COLOR[vehicle.direction] || "#616161",
                      color: "white",
                    }}
                  />
                </ListItemButton>
              ))}
              {positions.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                  No vehicles currently tracked.
                </Typography>
              )}
            </List>
          )}
        </Paper>

        <Paper sx={{ borderRadius: 3, overflow: "hidden", height: 560 }}>
          {loading ? (
            <Skeleton variant="rectangular" height="100%" />
          ) : (
            <MapContainer center={defaultCenter} zoom={7} style={{ height: "100%", width: "100%" }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {positions.map((vehicle) => (
                <Marker
                  key={vehicle.plateNumber}
                  position={[vehicle.lat, vehicle.lng]}
                  icon={carIcon(vehicle.source === "device" ? "#2e7d32" : DIRECTION_COLOR[vehicle.direction] || "#616161")}
                  eventHandlers={{ click: () => setSelectedPlate(vehicle.plateNumber) }}
                >
                  <Popup>
                    <strong>{vehicle.plateNumber}</strong>
                    <br />
                    {vehicle.routeLabel && (
                      <>
                        {vehicle.routeLabel}
                        <br />
                      </>
                    )}
                    {vehicle.speed} km/h &middot; {vehicle.source === "device" ? "Live GPS" : vehicle.direction}
                  </Popup>
                </Marker>
              ))}

              {selectedPosition && <MapRecenter position={selectedPosition} />}
            </MapContainer>
          )}
        </Paper>
      </Box>
      <Dialog open={deviceDialogOpen} onClose={() => setDeviceDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Manage GPS Devices</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Register a real GPS device against a vehicle to switch that vehicle from simulated demo
            movement to live tracking. Each vehicle gets one device key — generating a new one
            replaces the old key immediately.
          </DialogContentText>
          {loadingDevices ? (
            <Skeleton variant="rounded" height={200} />
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Vehicle</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Last Seen</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {deviceRows.map((row) => (
                  <TableRow key={row.vehicleId}>
                    <TableCell>{row.plateNumber}</TableCell>
                    <TableCell>
                      {row.device?.is_active ? (
                        <Chip label="Registered" size="small" color="success" />
                      ) : row.device ? (
                        <Chip label="Deactivated" size="small" />
                      ) : (
                        <Chip label="Not set up" size="small" variant="outlined" />
                      )}
                    </TableCell>
                    <TableCell>
                      {row.device?.last_seen_at ? new Date(row.device.last_seen_at).toLocaleString() : "Never"}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title={row.device?.is_active ? "Regenerate key" : "Generate key"}>
                        <span>
                          <IconButton
                            size="small"
                            disabled={deviceActionId === row.vehicleId}
                            onClick={() => handleProvision(row.vehicleId, row.plateNumber)}
                          >
                            <RefreshIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      {row.device?.is_active && (
                        <Tooltip title="Deactivate">
                          <span>
                            <IconButton
                              size="small"
                              color="error"
                              disabled={deviceActionId === row.vehicleId}
                              onClick={() => handleDeactivate(row.vehicleId)}
                            >
                              <BlockIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeviceDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!revealedKey} onClose={() => setRevealedKey(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Device key for {revealedKey?.plateNumber}</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This is shown once and can't be retrieved again — copy it now and program it into the
            device. If it's lost, generate a new one (this replaces it).
          </Alert>
          <TextField
            fullWidth
            value={revealedKey?.key || ""}
            InputProps={{
              readOnly: true,
              endAdornment: (
                <IconButton
                  size="small"
                  onClick={() => navigator.clipboard?.writeText(revealedKey?.key || "")}
                >
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              ),
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRevealedKey(null)} variant="contained">
            Done
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardLayout>
  );
};

export default GpsTracking;