import { Typography, Button, Stack } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";

const PageHeader = ({ title, buttonText, onAdd }) => {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={2}
      sx={{
        justifyContent: "space-between",
        alignItems: { xs: "stretch", sm: "center" },
        mb: 3,
      }}
    >
      <Typography variant="h4">{title}</Typography>

      {/* only render the button if the page actually wants one —
          lets a read-only view use PageHeader without an Add action */}
      {onAdd && (
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={onAdd}
          sx={{ alignSelf: { xs: "stretch", sm: "auto" } }}
        >
          {buttonText}
        </Button>
      )}
    </Stack>
  );
};

export default PageHeader;