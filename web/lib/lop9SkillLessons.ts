import { resolve } from 'node:path';

import type { SkillId } from './skillCatalog';
import lop9SkillLessonPageMapJson from '../scripts/data/lop9-skill-lessons/page-map.json';

export const LOP9_SKILL_LESSON_UNITS = [1, 2, 3, 4, 5, 6] as const;

export type Lop9SkillLessonSkillId = Exclude<SkillId, 'listening'>;

export type Lop9SkillLessonSource = {
  skillId: Lop9SkillLessonSkillId;
  label: string;
  order: number;
};

export const LOP9_SKILL_LESSON_SOURCES: readonly Lop9SkillLessonSource[] = [
  {
    skillId: 'vocabulary',
    label: 'Từ vựng',
    order: 1,
  },
  {
    skillId: 'writing',
    label: 'Ngữ pháp',
    order: 2,
  },
  {
    skillId: 'speaking',
    label: 'Phát âm',
    order: 3,
  },
  {
    skillId: 'reading',
    label: 'Đọc hiểu',
    order: 4,
  },
] as const;

export const LOP9_SKILL_LESSON_SOURCE_PDF =
  'PDF/GLOBAL_GRADE_9_FINAL_Anh_Phu_Trang.pdf';

export type Lop9SkillLessonManifestSkillEntry = {
  skillId: Lop9SkillLessonSkillId;
  sourcePdf: string;
  unitPdf: string;
  sourcePageStart: number;
  sourcePageEnd: number;
  pageCount: number;
};

export type Lop9SkillLessonManifestUnit = {
  unit: number;
  skills: Lop9SkillLessonManifestSkillEntry[];
};

export type Lop9SkillLessonManifest = {
  generatedAt: string;
  sourcePdf: string;
  units: Record<string, Lop9SkillLessonManifestUnit>;
};

export type Lop9SkillLessonPageMapEntry = {
  skillId: Lop9SkillLessonSkillId;
  pageStart: number;
  pageEnd: number;
};

export const LOP9_SKILL_LESSON_MANIFEST_RELATIVE_PATH =
  'scripts/data/lop9-skill-lessons/manifest.json';
export const LOP9_SKILL_LESSON_PAGE_MAP_RELATIVE_PATH =
  'scripts/data/lop9-skill-lessons/page-map.json';
export const LOP9_SKILL_LESSON_PAGE_MAP = lop9SkillLessonPageMapJson as Record<
  string,
  Lop9SkillLessonPageMapEntry[]
>;

export function lop9SkillLessonManifestPath(cwd = process.cwd()) {
  return resolve(cwd, LOP9_SKILL_LESSON_MANIFEST_RELATIVE_PATH);
}

export function lop9SkillLessonPageMapPath(cwd = process.cwd()) {
  return resolve(cwd, LOP9_SKILL_LESSON_PAGE_MAP_RELATIVE_PATH);
}

export function lop9SkillLessonSourceForSkill(skillId: Lop9SkillLessonSkillId) {
  return LOP9_SKILL_LESSON_SOURCES.find((item) => item.skillId === skillId) ?? null;
}

export function orderedLop9SkillLessonEntries(
  entries: Lop9SkillLessonManifestSkillEntry[]
): Lop9SkillLessonManifestSkillEntry[] {
  return [...entries].sort((a, b) => {
    const left = lop9SkillLessonSourceForSkill(a.skillId)?.order ?? Number.MAX_SAFE_INTEGER;
    const right = lop9SkillLessonSourceForSkill(b.skillId)?.order ?? Number.MAX_SAFE_INTEGER;
    return left - right || a.skillId.localeCompare(b.skillId);
  });
}
