import { Card, CardContent, Typography, Box } from "@mui/material";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";

const SummaryCard = ({ title, value, color, icon, trend }) => {
  const hasTrend = trend !== undefined && trend !== null;
  const isPositive = hasTrend && trend >= 0;

  return (
    <Card
      sx={{
        borderLeft: `6px solid ${color}`,
        borderRadius: 3,
        boxShadow: 3,
        height: "100%",
      }}
    >
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="subtitle1" color="text.secondary">
              {title}
            </Typography>
            <Typography variant="h4" fontWeight="bold" sx={{ mt: 1 }}>
              {value}
            </Typography>

            {hasTrend && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  mt: 0.5,
                  color: isPositive ? "success.main" : "error.main",
                }}
              >
                {isPositive ? (
                  <ArrowUpwardIcon sx={{ fontSize: 16 }} />
                ) : (
                  <ArrowDownwardIcon sx={{ fontSize: 16 }} />
                )}
                <Typography variant="caption" fontWeight={600}>
                  {Math.abs(trend)}% vs previous period
                </Typography>
              </Box>
            )}
          </Box>

          {icon && <Box sx={{ color, opacity: 0.7, fontSize: 32 }}>{icon}</Box>}
        </Box>
      </CardContent>
    </Card>
  );
};

export default SummaryCard;