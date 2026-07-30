import { describe, expect, it } from 'vitest';

import {
  LOP9_SKILL_LESSON_MANIFEST_RELATIVE_PATH,
  LOP9_SKILL_LESSON_PAGE_MAP,
  LOP9_SKILL_LESSON_PAGE_MAP_RELATIVE_PATH,
  LOP9_SKILL_LESSON_SOURCE_PDF,
  LOP9_SKILL_LESSON_SOURCES,
  lop9SkillLessonSourceForSkill,
  orderedLop9SkillLessonEntries,
} from './lop9SkillLessons';

describe('lop9SkillLessons', () => {
  it('pins the Lop 9 skill-to-source mapping', () => {
    expect(LOP9_SKILL_LESSON_SOURCES).toEqual([
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
    ]);
    expect(LOP9_SKILL_LESSON_SOURCE_PDF).toBe('PDF/GLOBAL_GRADE_9_FINAL_Anh_Phu_Trang.pdf');
    expect(LOP9_SKILL_LESSON_MANIFEST_RELATIVE_PATH).toBe(
      'scripts/data/lop9-skill-lessons/manifest.json'
    );
    expect(LOP9_SKILL_LESSON_PAGE_MAP_RELATIVE_PATH).toBe(
      'scripts/data/lop9-skill-lessons/page-map.json'
    );
  });

  it('returns the configured source for a skill', () => {
    expect(lop9SkillLessonSourceForSkill('writing')?.order).toBe(2);
    expect(lop9SkillLessonSourceForSkill('speaking')?.label).toBe('Phát âm');
  });

  it('orders manifest entries using the configured ebook page order', () => {
    const ordered = orderedLop9SkillLessonEntries([
      {
        skillId: 'reading',
        sourcePdf: 'PDF/GLOBAL_GRADE_9_FINAL_Anh_Phu_Trang.pdf',
        unitPdf: 'unit-1-reading.pdf',
        sourcePageStart: 10,
        sourcePageEnd: 12,
        pageCount: 3,
      },
      {
        skillId: 'vocabulary',
        sourcePdf: 'PDF/GLOBAL_GRADE_9_FINAL_Anh_Phu_Trang.pdf',
        unitPdf: 'unit-1-vocab.pdf',
        sourcePageStart: 1,
        sourcePageEnd: 3,
        pageCount: 3,
      },
      {
        skillId: 'speaking',
        sourcePdf: 'PDF/GLOBAL_GRADE_9_FINAL_Anh_Phu_Trang.pdf',
        unitPdf: 'unit-1-speaking.pdf',
        sourcePageStart: 4,
        sourcePageEnd: 5,
        pageCount: 2,
      },
    ]);

    expect(ordered.map((item) => item.skillId)).toEqual(['vocabulary', 'speaking', 'reading']);
  });

  it('moves the Lop 9 vocabulary reference sheets into reading', () => {
    expect(LOP9_SKILL_LESSON_PAGE_MAP['1']).toEqual([
      { skillId: 'vocabulary', pageStart: 2, pageEnd: 3 },
      { skillId: 'reading', pageStart: 4, pageEnd: 4 },
      { skillId: 'writing', pageStart: 5, pageEnd: 5 },
      { skillId: 'speaking', pageStart: 6, pageEnd: 8 },
    ]);

    expect(LOP9_SKILL_LESSON_PAGE_MAP['2']).toContainEqual({
      skillId: 'reading',
      pageStart: 12,
      pageEnd: 12,
    });
    expect(LOP9_SKILL_LESSON_PAGE_MAP['3']).toContainEqual({
      skillId: 'reading',
      pageStart: 20,
      pageEnd: 20,
    });
    expect(LOP9_SKILL_LESSON_PAGE_MAP['4']).toContainEqual({
      skillId: 'reading',
      pageStart: 25,
      pageEnd: 25,
    });
    expect(LOP9_SKILL_LESSON_PAGE_MAP['5']).toContainEqual({
      skillId: 'reading',
      pageStart: 32,
      pageEnd: 32,
    });
    expect(LOP9_SKILL_LESSON_PAGE_MAP['6']).toContainEqual({
      skillId: 'reading',
      pageStart: 38,
      pageEnd: 38,
    });

    expect(
      Object.fromEntries(
        Object.entries(LOP9_SKILL_LESSON_PAGE_MAP).map(([unit, entries]) => [
          unit,
          entries
            .filter((entry) => entry.skillId === 'reading')
            .map((entry) => `${entry.pageStart}-${entry.pageEnd}`),
        ])
      )
    ).toEqual({
      '1': ['4-4'],
      '2': ['12-12'],
      '3': ['20-20'],
      '4': ['25-25'],
      '5': ['32-32'],
      '6': ['38-38'],
    });
  });
});
