import { he } from "./he";
import { en } from "./en";

export type Language = "he" | "en";
export type TranslationKey = keyof typeof he;

export const translations = {
  he,
  en,
};

/**
 * Basic translation helper resolving a key with parameter replacement.
 */
export function translate(lang: Language, key: TranslationKey, params?: Record<string, string | number>): string {
  const dict = translations[lang] || translations.he;
  let text = dict[key] || he[key] || String(key);
  
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(`{${k}}`, String(v));
    });
  }
  
  return text;
}
