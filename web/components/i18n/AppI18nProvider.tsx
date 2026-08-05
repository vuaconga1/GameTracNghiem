import { cookies } from 'next/headers';

import { I18nProvider } from '@/components/i18n/I18nProvider';
import { DEFAULT_LOCALE, LOCALE_COOKIE, normalizeLocale } from '@/lib/i18n/config';

export async function AppI18nProvider({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  const initialLocale = normalizeLocale(jar.get(LOCALE_COOKIE)?.value || DEFAULT_LOCALE);
  return <I18nProvider initialLocale={initialLocale}>{children}</I18nProvider>;
}
