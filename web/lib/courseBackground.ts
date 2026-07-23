export type CourseBackgroundFields = {
  id: string;
  backgroundImageKey?: string | null;
  backgroundImageUrl?: string | null;
};

export function normalizeExternalImageUrl(value: unknown): string | null {
  const raw = String(value || '').trim();
  if (!raw) return null;

  try {
    const url = new URL(raw);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

/** Root-relative static assets from `/public`, e.g. `/images/courses/lop4/unit-01.svg`. */
export function normalizeStaticImagePath(value: unknown): string | null {
  const raw = String(value || '').trim();
  if (!raw.startsWith('/') || raw.startsWith('//')) return null;
  if (raw.includes('..')) return null;
  return raw;
}

export function courseBackgroundSrc(course: CourseBackgroundFields): string | null {
  if (String(course.backgroundImageKey || '').trim()) {
    return `/api/course-backgrounds/${encodeURIComponent(course.id)}`;
  }
  return (
    normalizeExternalImageUrl(course.backgroundImageUrl) ??
    normalizeStaticImagePath(course.backgroundImageUrl)
  );
}
