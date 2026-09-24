'use client';

/* eslint-disable @next/next/no-img-element */

import type { ImgHTMLAttributes } from 'react';

type OptimizedImgProps = ImgHTMLAttributes<HTMLImageElement> & {
  src: string;
};

/** Prefer sibling `.webp` when present; keep `.png`/original as fallback. */
export function OptimizedImg({ src, alt = '', ...rest }: OptimizedImgProps) {
  const webpSrc =
    typeof src === 'string' && /\.png$/i.test(src) ? src.replace(/\.png$/i, '.webp') : null;

  if (!webpSrc || webpSrc === src) {
    return <img src={src} alt={alt} {...rest} />;
  }

  return (
    <picture>
      <source srcSet={webpSrc} type="image/webp" />
      <img src={src} alt={alt} {...rest} />
    </picture>
  );
}
