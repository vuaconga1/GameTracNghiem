import { GAME_CATALOG } from './gameCatalog';

export function isCourseGameKey(value: unknown): value is string {
  return typeof value === 'string' && GAME_CATALOG.some((game) => game.key === value);
}

export type CourseGameLessonRange = {
  pageStart: number;
  pageEnd: number;
};

export type CourseGameLessonRangeResult =
  | { ok: true; value: CourseGameLessonRange }
  | { ok: false; message: string };

function parsePositiveInteger(value: unknown): number | null {
  if (typeof value === 'string' && !/^\d+$/.test(value.trim())) {
    return null;
  }

  if (typeof value !== 'string' && typeof value !== 'number') {
    return null;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function parseCourseGameLessonRange(
  value: { pageStart?: unknown; pageEnd?: unknown },
  pageCount: number | null | undefined
): CourseGameLessonRangeResult {
  const pageStart = parsePositiveInteger(value?.pageStart);
  const pageEnd = parsePositiveInteger(value?.pageEnd);

  if (pageStart === null || pageEnd === null) {
    return {
      ok: false,
      message: 'Trang bắt đầu và trang kết thúc phải là số nguyên dương.',
    };
  }

  if (pageEnd < pageStart) {
    return {
      ok: false,
      message: 'Trang kết thúc phải lớn hơn hoặc bằng trang bắt đầu.',
    };
  }

  if (pageCount != null && pageEnd > pageCount) {
    return {
      ok: false,
      message: `Phạm vi trang không được vượt quá ${pageCount} trang của tệp PDF.`,
    };
  }

  return {
    ok: true,
    value: { pageStart, pageEnd },
  };
}

export type CourseGameLessonDescriptor = {
  ebookId: string;
  pageStart: number;
  pageEnd: number;
};

/** Validate a stored mapping against an active ebook's page count. */
export function resolveCourseGameLessonDescriptor(input: {
  ebookId: string;
  pageStart: number;
  pageEnd: number;
  pageCount: number | null | undefined;
}): CourseGameLessonDescriptor | null {
  const parsed = parseCourseGameLessonRange(
    { pageStart: input.pageStart, pageEnd: input.pageEnd },
    input.pageCount,
  );
  if (!parsed.ok) return null;
  return {
    ebookId: input.ebookId,
    pageStart: parsed.value.pageStart,
    pageEnd: parsed.value.pageEnd,
  };
}
