import enTranslations from "./translations/en.json";
import uaTranslations from "./translations/ua.json";
import type { Language, Translations } from "./types";

export const translations: Record<Language, Translations> = {
  en: enTranslations,
  ua: uaTranslations,
};

export const defaultLanguage: Language = "en";

export const supportedLanguages: Language[] = ["en", "ua"];

export function getNestedTranslation(
  translations: Translations,
  key: string
): string {
  const keys = key.split(".");
  let value: any = translations;

  for (const k of keys) {
    if (value && typeof value === "object" && k in value) {
      value = value[k];
    } else {
      return key;
    }
  }

  return typeof value === "string" ? value : key;
}
