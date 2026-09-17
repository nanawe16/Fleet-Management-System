import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import am from "./locales/am.json";
import om from "./locales/om.json";

// Persist the chosen language across visits/reloads. Falls back to
// English on first-ever visit (no saved preference yet).
const savedLanguage = localStorage.getItem("fms_language") || "en";

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    am: { translation: am },
    om: { translation: om },
  },
  lng: savedLanguage,
  fallbackLng: "en", // any missing key in am/om falls back to the English string
  interpolation: {
    escapeValue: false, // React already escapes output, so this isn't needed
  },
});

// Keep <html lang="..."> in sync with the active language. This isn't
// just for accessibility/SEO — the :lang(am) CSS rule that swaps in the
// Noto Sans Ethiopic font (for Amharic's Ge'ez script) only matches
// when this attribute is actually set to "am".
const syncHtmlLang = (lng) => {
  document.documentElement.lang = lng;
};
syncHtmlLang(i18n.language);
i18n.on("languageChanged", syncHtmlLang);

export default i18n;