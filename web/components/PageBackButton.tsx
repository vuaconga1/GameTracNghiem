'use client';

import Link from 'next/link';

import { useI18n } from '@/components/i18n/I18nProvider';

type PageBackButtonProps = {
  href?: string;
  onClick?: () => void;
  title?: string;
  label?: string;
};

export function PageBackButton({
  href,
  onClick,
  title,
  label,
}: PageBackButtonProps) {
  const { t } = useI18n();
  const resolvedTitle = title ?? t('common.back');
  const resolvedLabel = label ?? t('common.back');
  const content = (
    <>
      <i className="fas fa-arrow-left" aria-hidden="true" />
      {resolvedLabel}
    </>
  );

  return (
    <div className="page-back-bar">
      {href ? (
        <Link href={href} className="page-back" title={resolvedTitle} aria-label={resolvedTitle}>
          {content}
        </Link>
      ) : (
        <button
          type="button"
          className="page-back"
          title={resolvedTitle}
          aria-label={resolvedTitle}
          onClick={onClick}
        >
          {content}
        </button>
      )}
    </div>
  );
}
