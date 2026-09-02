import { Card, CardContent, Typography, Box } from "@mui/material";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import PersonIcon from "@mui/icons-material/Person";
import CommuteIcon from "@mui/icons-material/Commute";
import AssignmentIcon from "@mui/icons-material/Assignment";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";

// fallback icons by title, kept for any page still calling StatCard
// without an explicit icon prop
const getFallbackIcon = (title) => {
  switch (title) {
    case "Vehicles":
      return <DirectionsCarIcon fontSize="large" />;
    case "Drivers":
      return <PersonIcon fontSize="large" />;
    case "Active Trips":
      return <CommuteIcon fontSize="large" />;
    case "Pending Requests":
      return <AssignmentIcon fontSize="large" />;
    default:
      return null;
  }
};

const StatCard = ({ title, value, color, icon, trend }) => {
  const displayIcon = icon ?? getFallbackIcon(title);
  const hasTrend = trend !== undefined && trend !== null;
  const isPositive = hasTrend && trend >= 0;

  return (
    <Card
      sx={{
        minWidth: 220,
        borderLeft: `6px solid ${color}`,
        borderRadius: 3,
        boxShadow: 3,
      }}
    >
      <CardContent>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <Box sx={{ color }}>{displayIcon}</Box>

          {hasTrend && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                color: isPositive ? "success.main" : "error.main",
              }}
            >
              {isPositive ? (
                <ArrowUpwardIcon fontSize="small" />
              ) : (
                <ArrowDownwardIcon fontSize="small" />
              )}
              <Typography variant="body2" fontWeight={600}>
                {Math.abs(trend)}%
              </Typography>
            </Box>
          )}
        </Box>

        <Typography variant="h6" sx={{ mt: 1 }}>
          {title}
        </Typography>

        <Typography
          variant="h3"
          sx={{
            fontWeight: "bold",
            mt: 2,
          }}
        >
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
};

export default StatCard;