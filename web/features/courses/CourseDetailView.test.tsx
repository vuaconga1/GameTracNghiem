import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}));

import type { CourseDetailData } from '@/lib/loadCourseDetail';
import type { GameSkillsMap, SkillId } from '@/lib/skillCatalog';

import { CourseDetailContent } from './CourseDetailView';

const sampleGameSkills = {
  grammar: 'writing',
  quiz: 'vocabulary',
  pronunciation: 'speaking',
  scramble: 'vocabulary',
  word_match: 'reading',
  look_and_write: null,
  choose_and_circle: 'reading',
  read_and_complete: 'reading',
  read_and_match: 'reading',
  vocabulary_test: 'reading',
  vocabulary_check: 'reading',
} satisfies GameSkillsMap;

const sampleData: CourseDetailData = {
  success: true,
  course: {
    id: 'course-1',
    name: 'EveryUp',
    levelName: 'A2',
    courseKey: 'EveryUp::A2',
    enabledSkills: ['listening', 'reading', 'speaking', 'writing', 'vocabulary'],
    gameSkills: sampleGameSkills,
  },
  games: {
    grammar: {
      questionCount: 3,
      statuses: ['correct', 'empty', 'wrong'],
    },
    quiz: {
      questionCount: 2,
      statuses: ['correct', 'correct'],
    },
  },
  totalScore: 1250,
};

describe('CourseDetailContent', () => {
  it('keeps the unit overview on exercises even when lesson tab is requested', () => {
    const html = renderToStaticMarkup(
      createElement(CourseDetailContent, { data: sampleData, initialTab: 'lesson' }),
    );

    expect(html).toContain('id="view-detail"');
    expect(html).toContain('class="view-detail"');
    expect(html).toContain('href="/"');
    expect(html).toContain('class="page-back"');
    expect(html).toContain('class="detail-body"');
    expect(html).not.toContain('detail-body--lesson-full');
    expect(html).toContain('class="book-card"');
    expect(html).not.toContain('class="detail-tabs tabs-secondary"');
    expect(html).not.toContain('Bài học');
    expect(html).not.toContain('class="ebook-viewer"');
  });

  it('does not render the unit lesson viewer when no skill is selected', () => {
    const data: CourseDetailData = {
      ...sampleData,
      course: {
        ...sampleData.course,
        ebook: {
          id: 'ebook-1',
          title: 'Unit 1',
          pageStart: 1,
          pageEnd: 5,
        },
        skillLessons: {
          listening: { pageStart: 1, pageEnd: 1 },
        },
      },
    };
    const html = renderToStaticMarkup(
      createElement(CourseDetailContent, { data, initialTab: 'lesson' }),
    );

    expect(html).not.toContain('class="detail-tabs tabs-secondary"');
    expect(html).not.toContain('class="ebook-flip-root"');
    expect(html).toContain('data-skill-step="skills"');
  });

  it('restricts lesson pages to the selected skill range', () => {
    const data: CourseDetailData = {
      ...sampleData,
      course: {
        ...sampleData.course,
        ebook: {
          id: 'ebook-1',
          title: 'Unit 1',
          pageStart: 1,
          pageEnd: 5,
        },
        skillLessons: {
          listening: { pageStart: 2, pageEnd: 2 },
        },
      },
    };
    const html = renderToStaticMarkup(
      createElement(CourseDetailContent, {
        data,
        initialTab: 'lesson',
        initialSkill: 'listening',
      }),
    );

    expect(html).toContain('class="ebook-flip-root"');
    expect(html).not.toContain('Chưa gán trang bài học cho kỹ năng này');
  });

  it('shows an empty state when the selected skill has no lesson pages', () => {
    const data: CourseDetailData = {
      ...sampleData,
      course: {
        ...sampleData.course,
        ebook: {
          id: 'ebook-1',
          title: 'Unit 1',
          pageStart: 1,
          pageEnd: 5,
        },
        skillLessons: {
          listening: { pageStart: 1, pageEnd: 1 },
        },
      },
    };
    const html = renderToStaticMarkup(
      createElement(CourseDetailContent, {
        data,
        initialTab: 'lesson',
        initialSkill: 'reading',
      }),
    );

    expect(html).toContain('Chưa gán trang bài học cho kỹ năng này');
    expect(html).not.toContain('class="ebook-flip-root"');
  });

  it('defaults to exercises tab with five skill cards', () => {
    const html = renderToStaticMarkup(createElement(CourseDetailContent, { data: sampleData }));

    expect(html).toContain('class="book-card"');
    expect(html).toContain('EveryUp');
    expect(html).toContain('A2');
    expect(html).not.toContain('Lớp 8');
    expect(html).toContain('4/5');
    expect(html).toContain('câu đã làm');
    expect(html).toContain('1.250');
    expect(html).toContain('tổng điểm');
    expect(html).not.toContain('class="detail-tabs tabs-secondary"');
    expect(html).not.toContain('Bài học');

    expect(html).toContain('data-skill-step="skills"');
    expect(html).toContain('Luyện kỹ năng nghe');
    expect(html).toContain('Luyện kỹ năng đọc');
    expect(html).toContain('Luyện kỹ năng nói');
    expect(html).toContain('Luyện kỹ năng viết');
    expect(html).toContain('Luyện từ vựng');
    expect(html).toContain('href="/courses/course-1?skill=listening"');
    expect(html).toContain('href="/courses/course-1?skill=reading"');
    expect(html).toContain('href="/courses/course-1?skill=speaking"');
    expect(html).toContain('href="/courses/course-1?skill=writing"');
    expect(html).toContain('href="/courses/course-1?skill=vocabulary"');
    expect(html).not.toContain('href="/games/grammar/course-1"');
  });

  it('shows quiz and scramble under vocabulary skill', () => {
    const skill: SkillId = 'vocabulary';
    const html = renderToStaticMarkup(
      createElement(CourseDetailContent, { data: sampleData, initialSkill: skill }),
    );

    expect(html).toContain('href="/courses/course-1"');
    expect(html).toContain('class="detail-tabs tabs-secondary"');
    expect(html).toContain('Bài tập');
    expect(html).toContain('Bài học');
    expect(html).toContain('data-skill-step="games"');
    expect(html).toContain('Luyện từ vựng');
    expect(html).toContain('href="/games/quiz/course-1?skill=vocabulary"');
    expect(html).toContain('href="/games/scramble/course-1"');
    expect(html).not.toContain('href="/games/grammar/course-1"');
  });

  it('shows filtered games for writing and backs to the unit', () => {
    const skill: SkillId = 'writing';
    const data: CourseDetailData = {
      ...sampleData,
      gameExercises: {
        grammar: [
          {
            key: 'W Exercise 15',
            label: 'Viết lại câu theo từ gợi ý',
            questionCount: 10,
            completedCount: 4,
            indices: Array.from({ length: 10 }, (_, index) => index),
          },
          {
            key: 'W Exercise 16',
            label: 'Sắp xếp từ thành câu hoàn chỉnh',
            questionCount: 8,
            completedCount: 1,
            indices: Array.from({ length: 8 }, (_, index) => index + 10),
          },
        ],
      },
    };
    const html = renderToStaticMarkup(
      createElement(CourseDetailContent, { data, initialSkill: skill }),
    );

    expect(html).toContain('href="/courses/course-1"');
    expect(html).toContain('data-skill-step="games"');
    expect(html).toContain('Luyện kỹ năng viết');
    expect(html).toContain('href="/games/grammar/course-1?exercise=W%20Exercise%2015"');
    expect(html).toContain('href="/games/grammar/course-1?exercise=W%20Exercise%2016"');
    expect(html).toContain('>Viết lại câu theo từ gợi ý<');
    expect(html).toContain('>Sắp xếp từ thành câu hoàn chỉnh<');
    expect(html).not.toContain('href="/games/scramble/course-1"');
    expect(html).not.toContain('href="/games/look-and-write/course-1"');
    expect(html).not.toContain('href="/games/quiz/course-1');
    expect(html).not.toContain('href="/games/pronunciation/course-1"');
  });

  it('uses skillStats so multi-skill quiz counts only that skill', () => {
    const data: CourseDetailData = {
      ...sampleData,
      course: {
        ...sampleData.course,
        gameSkills: {
          ...sampleGameSkills,
          quiz: ['reading', 'writing', 'vocabulary'],
        },
      },
      games: {
        ...sampleData.games,
        quiz: {
          questionCount: 78,
          statuses: Array.from({ length: 78 }, () => 'empty'),
        },
      },
      skillStats: {
        reading: {
          totalQuestions: 26,
          completedQuestions: 12,
          byGame: {
            quiz: { questionCount: 26, completedCount: 12 },
          },
        },
      },
    };

    const skillsHtml = renderToStaticMarkup(
      createElement(CourseDetailContent, { data }),
    );
    expect(skillsHtml).toContain('12/26');
    expect(skillsHtml).not.toContain('12/78');

    const readingHtml = renderToStaticMarkup(
      createElement(CourseDetailContent, { data, initialSkill: 'reading' }),
    );
    expect(readingHtml).toContain('href="/games/quiz/course-1?skill=reading"');
    expect(readingHtml).toContain('>12/26<');
    expect(readingHtml).not.toContain('>12/78<');
  });

  it('shows single pronunciation card under speaking skill (groups are internal)', () => {
    const skill: SkillId = 'speaking';
    const data: CourseDetailData = {
      ...sampleData,
      games: {
        ...sampleData.games,
        pronunciation: {
          questionCount: 5,
          statuses: ['correct', 'empty', 'wrong', 'empty', 'empty'],
        },
      },
      gameExercises: {
        pronunciation: [
          {
            key: 'AE',
            label: 'Âm /æ/',
            questionCount: 2,
            completedCount: 1,
            indices: [0, 1],
          },
          {
            key: 'AA',
            label: 'Âm /ɑː/',
            questionCount: 3,
            completedCount: 1,
            indices: [2, 3, 4],
          },
        ],
      },
    };
    const html = renderToStaticMarkup(
      createElement(CourseDetailContent, { data, initialSkill: skill }),
    );

    expect(html).toContain('href="/games/pronunciation/course-1"');
    expect(html).not.toContain('exercise=AE');
    expect(html).not.toContain('exercise=AA');
    expect(html).not.toContain('Âm /æ/');
    expect(html).not.toContain('Âm /ɑː/');
  });
});
