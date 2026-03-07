import { useState, useCallback, useMemo } from "react";
import { constants } from "../constants.ts";
import { translations, type Lang, type TranslationKey } from "./translations.ts";
import { LanguageContext } from "./contextRef.ts";

const loadSavedLang = (): Lang => {
  try {
    const saved = localStorage.getItem(constants.language.storageKey);
    if (saved === "en" || saved === "ru") return saved;
  } catch {
    // игнорируем ошибки localStorage
  }
  return constants.language.defaultLang;
};

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [lang, setLangState] = useState<Lang>(loadSavedLang);

  const setLang = useCallback((newLang: Lang) => {
    setLangState(newLang);
    try {
      localStorage.setItem(constants.language.storageKey, newLang);
    } catch {
      // игнорируем ошибки localStorage
    }
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
