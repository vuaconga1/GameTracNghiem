import { createElement } from 'react';

type Props = {
  variant?: 'loading' | 'message';
  message?: string;
};

export const LOADING_TEXT = 'đang tải dữ liệu';

export function DataLoading({
  variant = 'loading',
  message = LOADING_TEXT,
}: Props) {
  if (variant === 'loading') {
    return createElement(
      'div',
      { className: 'data-loading-state' },
      createElement('i', {
        className: 'fas fa-gear fa-spin',
        'aria-hidden': true,
      }),
      ' ',
      message
    );
  }

  return createElement('div', { className: 'data-loading-state' }, message);
}
