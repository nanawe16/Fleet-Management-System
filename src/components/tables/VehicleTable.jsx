import {
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  TableContainer,
  Chip,
  IconButton,
  Tooltip,
  Box,
  Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import { useTranslation } from "react-i18next";

// Vehicle status is stored/compared in English (matches the data model);
// this maps each stored value to its translation key for display only.
const STATUS_KEYS = {
  Available: "available",
  "On Trip": "onTrip",
  Maintenance: "maintenance",
};

const daysUntil = (dateStr) => {
  if (!dateStr) return null;
  const diffMs = new Date(dateStr).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0);
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
};

const ExpiryChip = ({ date }) => {
  const { t } = useTranslation();

  if (!date) {
    return (
      <Typography variant="caption" color="text.disabled">
        {t("common.notSet")}
      </Typography>
    );
  }

  const days = daysUntil(date);
  if (days < 0) return <Chip label={t("vehicles.table.expired", { date })} color="error" size="small" />;
  if (days <= 14) return <Chip label={t("vehicles.table.expires", { date })} color="warning" size="small" />;
  return <Chip label={date} size="small" variant="outlined" />;
};

const VehicleTable = ({ vehicles, onEdit, onDelete }) => {
  const { t } = useTranslation();

  if (vehicles.length === 0) {
    return (
      <Paper sx={{ p: 5, textAlign: "center", borderRadius: 3 }}>
        <DirectionsCarIcon sx={{ fontSize: 40, color: "text.disabled", mb: 1 }} />
        <Typography variant="body1" color="text.secondary">
          {t("vehicles.table.noneFound")}
        </Typography>
        <Typography variant="body2" color="text.disabled">{t("common.adjustSearchOrFilter")}</Typography>
      </Paper>
    );
  }

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>{t("vehicles.table.plateNumber")}</TableCell>
            <TableCell>{t("vehicles.table.model")}</TableCell>
            <TableCell>{t("vehicles.table.type")}</TableCell>
            <TableCell>{t("vehicles.table.driver")}</TableCell>
            <TableCell>{t("vehicles.table.insuranceExpiry")}</TableCell>
            <TableCell>{t("common.status")}</TableCell>
            {(onEdit || onDelete) && <TableCell align="right">{t("common.actions")}</TableCell>}
          </TableRow>
        </TableHead>

        <TableBody>
          {vehicles.map((vehicle) => (
            <TableRow
              key={vehicle.id}
              hover
              sx={
                vehicle.insuranceExpiry && daysUntil(vehicle.insuranceExpiry) < 0
                  ? { bgcolor: "error.50", "&:hover": { bgcolor: "error.100" } }
                  : undefined
              }
            >
              <TableCell>{vehicle.plateNumber}</TableCell>
              <TableCell>{vehicle.model}</TableCell>
              <TableCell>{vehicle.type}</TableCell>
              <TableCell>{vehicle.driver}</TableCell>
              <TableCell>
                <ExpiryChip date={vehicle.insuranceExpiry} />
              </TableCell>
              <TableCell>
                <Chip
                  label={t(`vehicles.status.${STATUS_KEYS[vehicle.status] || vehicle.status}`)}
                  color={
                    vehicle.status === "Available" ? "success" : vehicle.status === "On Trip" ? "warning" : "error"
                  }
                  size="small"
                />
              </TableCell>
              {(onEdit || onDelete) && (
                <TableCell align="right">
                  <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 0.5 }}>
                    {onEdit && <Tooltip title={t("common.edit")}><IconButton size="small" onClick={() => onEdit(vehicle)}><EditIcon fontSize="small" /></IconButton></Tooltip>}
                    {onDelete && <Tooltip title={t("common.delete")}><IconButton size="small" color="error" onClick={() => onDelete(vehicle.id)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>}
                  </Box>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default VehicleTable;