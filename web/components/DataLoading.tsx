'use client';

import { createElement } from 'react';

import { useOptionalI18n } from '@/components/i18n/I18nProvider';

type Props = {
  variant?: 'loading' | 'message';
  message?: string;
};

export const LOADING_TEXT = 'đang tải dữ liệu';

export function DataLoading({ variant = 'loading', message }: Props) {
  const { t } = useOptionalI18n();
  const resolved = message ?? t('common.loading');

  if (variant === 'loading') {
    return createElement(
      'div',
      { className: 'data-loading-state' },
      createElement('i', {
        className: 'fas fa-gear fa-spin',
        'aria-hidden': true,
      }),
      ' ',
      resolved,
    );
  }

  return createElement('div', { className: 'data-loading-state' }, resolved);
}
