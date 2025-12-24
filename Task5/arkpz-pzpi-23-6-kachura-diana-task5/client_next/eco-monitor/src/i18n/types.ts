export type Language = "en" | "ua";

export type TranslationKey = string;

export interface Translations {
  [key: string]: string | Translations;
}
