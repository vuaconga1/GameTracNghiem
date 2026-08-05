'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_STORAGE_KEY,
  normalizeLocale,
  type Locale,
} from '@/lib/i18n/config';
import en from '@/lib/i18n/messages/en';
import vi from '@/lib/i18n/messages/vi';
import { formatClassLevelName, translate, type Messages } from '@/lib/i18n/translate';

const TABLES: Record<Locale, Messages> = { en, vi };

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  formatClassLevel: (levelName: string) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function persistLocale(locale: Locale) {
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    /* ignore */
  }
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
  document.documentElement.lang = locale;
}

type I18nProviderProps = {
  children?: ReactNode;
  initialLocale?: Locale;
};

export function I18nProvider({ children, initialLocale }: I18nProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(normalizeLocale(initialLocale));

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
      if (stored) {
        const next = normalizeLocale(stored);
        setLocaleState(next);
        document.documentElement.lang = next;
        return;
      }
    } catch {
      /* ignore */
    }
    document.documentElement.lang = locale;
  }, []);

  const setLocale = useCallback((next: Locale) => {
    const normalized = normalizeLocale(next);
    setLocaleState(normalized);
    persistLocale(normalized);
  }, []);

  const value = useMemo<I18nContextValue>(() => {
    const messages = TABLES[locale] || TABLES[DEFAULT_LOCALE];
    return {
      locale,
      setLocale,
      t: (key, params) => translate(messages, key, params),
      formatClassLevel: (levelName) => formatClassLevelName(levelName, locale),
    };
  }, [locale, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return ctx;
}

/** Safe hook for optional usage (returns EN fallback outside provider). */
export function useOptionalI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (ctx) return ctx;
  return {
    locale: DEFAULT_LOCALE,
    setLocale: () => undefined,
    t: (key, params) => translate(TABLES[DEFAULT_LOCALE], key, params),
    formatClassLevel: (levelName) => formatClassLevelName(levelName, DEFAULT_LOCALE),
  };
}
