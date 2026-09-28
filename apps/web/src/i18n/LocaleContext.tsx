import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  dateLocale,
  detectSupportedLocale,
  languageOptions,
  normalizeLocale,
  t as translate,
  type Locale,
  type TranslationKey,
  type TranslationParams,
} from "../../../../packages/domain/src";

const STORAGE_KEY = "bdt.locale.v1";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, params?: TranslationParams) => string;
  dateLocale: ReturnType<typeof dateLocale>;
  options: ReturnType<typeof languageOptions>;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function detectWebLocale(): Locale {
  try {
    const stored = normalizeLocale(localStorage.getItem(STORAGE_KEY));
    if (stored) return stored;
  } catch {}
  const values = typeof navigator !== "undefined"
    ? [...(navigator.languages || []), navigator.language].filter(Boolean)
    : [];
  return detectSupportedLocale(values);
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, updateLocale] = useState<Locale>(() => detectWebLocale());
  const setLocale = useCallback((next: Locale) => {
    updateLocale(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch {}
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale === "pt" ? "pt-BR" : locale === "en" ? "en-US" : "es-MX";
  }, [locale]);
  const value = useMemo<LocaleContextValue>(() => ({
    locale,
    setLocale,
    t: (key, params) => translate(locale, key, params),
    dateLocale: dateLocale(locale),
    options: languageOptions(locale),
  }), [locale, setLocale]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const value = useContext(LocaleContext);
  if (!value) throw new Error("useLocale precisa estar dentro de LocaleProvider");
  return value;
}
