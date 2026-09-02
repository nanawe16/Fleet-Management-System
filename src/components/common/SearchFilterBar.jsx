import { Stack, TextField, MenuItem, InputAdornment, IconButton, Button } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";

const SearchFilterBar = ({
  search,
  setSearch,
  status,
  setStatus,
  statusOptions,
  searchLabel = "Search",
}) => {
  const defaultStatus = statusOptions[0];
  const isFiltered = search !== "" || status !== defaultStatus;

  const handleReset = () => {
    setSearch("");
    setStatus(defaultStatus);
  };

  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={2}
      alignItems={{ xs: "stretch", sm: "center" }}
      sx={{ mb: 3 }}
    >
      <TextField
        label={searchLabel}
        size="small"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ width: { xs: "100%", sm: 320 } }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
          endAdornment: search && (
            <InputAdornment position="end">
              <IconButton size="small" onClick={() => setSearch("")} aria-label="Clear search">
                <ClearIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          ),
        }}
      />

      <TextField
        select
        label="Status"
        size="small"
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        sx={{ width: { xs: "100%", sm: 180 } }}
      >
        {statusOptions.map((option) => (
          <MenuItem key={option} value={option}>
            {option}
          </MenuItem>
        ))}
      </TextField>

      {isFiltered && (
        <Button size="small" onClick={handleReset} sx={{ alignSelf: { xs: "flex-start", sm: "center" } }}>
          Reset
        </Button>
      )}
    </Stack>
  );
};

export default SearchFilterBar;