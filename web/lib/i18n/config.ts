export const LOCALES = ['en', 'vi'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALE_COOKIE = 'wewin_locale';
export const LOCALE_STORAGE_KEY = 'wewin_locale';

export function isLocale(value: unknown): value is Locale {
  return value === 'en' || value === 'vi';
}

export function normalizeLocale(value: unknown): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}
