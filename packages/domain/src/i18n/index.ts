import { en, es, pt, type TranslationKey } from "./catalogs";
import type { LanguageOption, Locale, TranslationParams } from "./types";
export type { LanguageOption, Locale, TranslationParams, TranslationKey };

const catalogs = { pt, en, es } as const;

export function normalizeLocale(value: string | null | undefined): Locale | null {
  if (!value) return null;
  const lang = value.trim().toLowerCase().replace("_", "-").split("-")[0];
  return lang === "pt" || lang === "en" || lang === "es" ? lang : null;
}

export function detectSupportedLocale(values: readonly string[]): Locale {
  const primary = values.find((value) => value?.trim());

  if (!primary) return "en";

  const lang = primary.trim().toLowerCase().replace("_", "-").split("-")[0];

  if (lang === "pt") return "pt";
  if (lang === "es") return "es";

  return "en";
}

export function t(locale: Locale, key: TranslationKey, params: TranslationParams = {}): string {
  let value: string = catalogs[locale][key] || pt[key];
  return value.replace(/\{([a-zA-Z0-9_]+)\}/g, (_match, name: string) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : `{${name}}`,
  );
}

export function dateLocale(locale: Locale): "pt-BR" | "en-US" | "es-MX" {
  return locale === "en" ? "en-US" : locale === "es" ? "es-MX" : "pt-BR";
}

const languageAliases: Record<string, Locale> = {
  pt: "pt", "pt-br": "pt", "pt-pt": "pt", portugues: "pt", português: "pt", portuguese: "pt", portugués: "pt",
  en: "en", "en-us": "en", "en-gb": "en", english: "en", ingles: "en", inglês: "en", inglés: "en",
  es: "es", "es-mx": "es", "es-es": "es", spanish: "es", espanhol: "es", español: "es", espanol: "es",
};

function normalizeLanguageName(raw: string): string {
  return raw.trim().toLowerCase();
}

function resolveContentLocale(raw: string): Locale | null {
  const normalized = normalizeLanguageName(raw);
  return languageAliases[normalized] ?? normalizeLocale(normalized);
}

export function prioritizeBooksByLocale<T extends { language: string }>(
  books: readonly T[],
  locale: Locale,
): T[] {
  return [...books].sort((a, b) => {
    const aMatches = resolveContentLocale(a.language) === locale;
    const bMatches = resolveContentLocale(b.language) === locale;

    return Number(bMatches) - Number(aMatches);
  });
}

export function bookLanguageLabel(raw: string, locale: Locale): string {
  const resolved = languageAliases[normalizeLanguageName(raw)];
  if (!resolved) return raw;
  const labels: Record<Locale, Record<Locale, string>> = {
    pt: { pt: "Português", en: "Inglês", es: "Espanhol" },
    en: { pt: "Portuguese", en: "English", es: "Spanish" },
    es: { pt: "Portugués", en: "Inglés", es: "Español" },
  };
  return labels[locale][resolved];
}

export function languageOptions(locale: Locale): LanguageOption[] {
  return [
    { locale: "pt", flag: "🇧🇷", label: bookLanguageLabel("pt", locale) },
    { locale: "en", flag: "🇺🇸", label: bookLanguageLabel("en", locale) },
    { locale: "es", flag: "🇲🇽", label: bookLanguageLabel("es", locale) },
  ];
}

export function topicLabelLocalized(id: string, locale: Locale): string {
  const labels: Record<string, Record<Locale, string>> = {
    mbti: { pt: "MBTI", en: "MBTI", es: "MBTI" },
    eneagrama: { pt: "Eneagrama", en: "Enneagram", es: "Eneagrama" },
    protoanalise: { pt: "Protoanálise", en: "Protoanalysis", es: "Protoanálisis" },
    socionics: { pt: "Socionics", en: "Socionics", es: "Socionics" },
    jung: { pt: "Psicologia Junguiana", en: "Jungian Psychology", es: "Psicología Junguiana" },
    neurotype: { pt: "Neurotype", en: "Neurotype", es: "Neurotype" },
    psicossofia: { pt: "Psicossofia", en: "Psychosophy", es: "Psicosofía" },
  };
  return labels[id]?.[locale] || id;
}
