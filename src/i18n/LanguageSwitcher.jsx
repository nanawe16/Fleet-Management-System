import { useTranslation } from "react-i18next";
import { FormControl, Select, MenuItem, InputLabel } from "@mui/material";
import LanguageIcon from "@mui/icons-material/Language";

// Reusable language dropdown. Drop this anywhere (Dashboard header,
// Settings page, Navbar, etc.) — all instances stay in sync since
// react-i18next holds the current language centrally.
const LanguageSwitcher = ({ size = "small", showLabel = true }) => {
  const { t, i18n } = useTranslation();

  const handleChange = (event) => {
    const lng = event.target.value;
    i18n.changeLanguage(lng);
    localStorage.setItem("fms_language", lng);
  };

  return (
    <FormControl size={size} sx={{ minWidth: 160 }}>
      {showLabel && <InputLabel id="language-select-label">{t("common.language")}</InputLabel>}
      <Select
        labelId="language-select-label"
        value={i18n.language}
        label={showLabel ? t("common.language") : undefined}
        onChange={handleChange}
        renderValue={(value) => (
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <LanguageIcon fontSize="small" />
            {t(`languages.${value}`)}
          </span>
        )}
      >
        <MenuItem value="en">{t("languages.en")}</MenuItem>
        <MenuItem value="am">{t("languages.am")}</MenuItem>
        <MenuItem value="om">{t("languages.om")}</MenuItem>
      </Select>
    </FormControl>
  );
};

export default LanguageSwitcher;