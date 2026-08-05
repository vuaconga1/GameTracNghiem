'use client';

import { useI18n } from '@/components/i18n/I18nProvider';
import type { Locale } from '@/lib/i18n/config';

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();

  function toggle() {
    const next: Locale = locale === 'en' ? 'vi' : 'en';
    setLocale(next);
  }

  return (
    <button
      type="button"
      className="action-item action-item-lang"
      onClick={toggle}
      title={t('common.language')}
      aria-label={t('common.language')}
    >
      <i className="fas fa-globe" aria-hidden="true" />
      <span>{locale === 'en' ? 'EN' : 'VI'}</span>
    </button>
  );
}
