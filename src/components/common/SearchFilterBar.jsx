import { Stack, TextField, MenuItem, InputAdornment, IconButton, Button } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import { useTranslation } from "react-i18next";

// statusOptions: [{ value, label }] — value is the raw stored value used for
// filtering/comparison (kept in English to match the data model), label is
// what's shown in the dropdown and can be a translated string.
const SearchFilterBar = ({
  search,
  setSearch,
  status,
  setStatus,
  statusOptions,
  searchLabel,
}) => {
  const { t } = useTranslation();
  const defaultStatus = statusOptions[0].value;
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
        label={searchLabel || t("common.search")}
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
              <IconButton size="small" onClick={() => setSearch("")} aria-label={t("common.clearSearch")}>
                <ClearIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          ),
        }}
      />

      <TextField
        select
        label={t("common.status")}
        size="small"
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        sx={{ width: { xs: "100%", sm: 180 } }}
      >
        {statusOptions.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </TextField>

      {isFiltered && (
        <Button size="small" onClick={handleReset} sx={{ alignSelf: { xs: "flex-start", sm: "center" } }}>
          {t("common.reset")}
        </Button>
      )}
    </Stack>
  );
};

export default SearchFilterBar;