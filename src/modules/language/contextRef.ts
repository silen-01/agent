import { createContext } from "react";
import type { Lang, TranslationKey } from "./translations.ts";

export type LanguageContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey) => string;
};

export const LanguageContext = createContext<LanguageContextValue | null>(null);
