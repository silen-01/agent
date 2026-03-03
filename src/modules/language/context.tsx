import { createContext, useContext, useState, useCallback, useMemo } from "react";
import { constants } from "../constants.ts";
import { translations, type Lang, type TranslationKey } from "./translations.ts";

type LanguageContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

const loadSavedLang = (): Lang => {
  try {
    const saved = localStorage.getItem(constants.language.storageKey);
    if (saved === "en" || saved === "ru") return saved;
  } catch {}
  return constants.language.defaultLang;
};

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [lang, setLangState] = useState<Lang>(loadSavedLang);

  const setLang = useCallback((newLang: Lang) => {
    setLangState(newLang);
    try {
      localStorage.setItem(constants.language.storageKey, newLang);
    } catch {}
  }, []);

  const t = useCallback(
    (key: TranslationKey) => translations[lang][key] ?? key,
    [lang]
  );

  const value = useMemo(
    () => ({ lang, setLang, t }),
    [lang, setLang, t]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
};
