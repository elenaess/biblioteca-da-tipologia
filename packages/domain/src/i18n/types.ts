export type Locale = "pt" | "en" | "es";
export type TranslationParams = Record<string, string | number>;
export interface LanguageOption {
  locale: Locale;
  label: string;
  flag: "🇧🇷" | "🇺🇸" | "🇲🇽";
}
