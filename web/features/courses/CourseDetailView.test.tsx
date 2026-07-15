import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { CourseDetailContent } from './CourseDetailView';

const sampleData = {
  success: true as const,
  course: {
    id: 'course-1',
    name: 'EveryUp',
    levelName: 'A2',
    courseKey: 'EveryUp::A2',
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
  it('renders lesson tab without book card and with ebook placeholder', () => {
    const html = renderToStaticMarkup(
      createElement(CourseDetailContent, { data: sampleData, initialTab: 'lesson' }),
    );

    expect(html).toContain('id="view-detail"');
    expect(html).toContain('class="view-detail"');
    expect(html).toContain('href="/"');
    expect(html).toContain('class="detail-back"');
    expect(html).toContain('class="detail-body detail-body--lesson-full"');
    expect(html).not.toContain('class="book-card"');
    expect(html).not.toContain('câu ngữ pháp');

    expect(html).toContain('class="detail-tabs tabs-secondary"');
    expect(html).toContain('class="tab-secondary active"');
    expect(html.indexOf('Bài tập')).toBeLessThan(html.indexOf('Bài học'));
    expect(html).toContain('Bài học');
    expect(html).toContain('Bài tập');
    expect(html).toContain('class="ebook-viewer"');
    expect(html).toContain('class="ebook-empty"');
    expect(html).toContain('Chưa gắn sách bài học');
  });

  it('defaults to exercises tab with aggregated stats in book card', () => {
    const html = renderToStaticMarkup(createElement(CourseDetailContent, { data: sampleData }));

    expect(html).toContain('class="book-card"');
    expect(html).toContain('EveryUp');
    expect(html).toContain('A2');
    expect(html).not.toContain('Lớp 8');
    expect(html).toContain('4/5');
    expect(html).toContain('câu đã làm');
    expect(html).toContain('1.250');
    expect(html).toContain('tổng điểm');
    expect(html).not.toContain('câu ngữ pháp');
    expect(html.indexOf('Bài tập')).toBeLessThan(html.indexOf('Bài học'));

    expect(html).toContain('class="activity-grid"');
    expect(html).toContain('href="/games/grammar/course-1"');
    expect(html).toContain('href="/games/quiz/course-1"');
    expect(html).toContain('href="/games/pronunciation/course-1"');
    expect(html).toContain('href="/games/scramble/course-1"');
    expect(html).toContain('href="/games/word-match/course-1"');
    expect(html).toContain('href="/games/look-and-write/course-1"');
    expect(html).toContain('href="/games/choose-and-circle/course-1"');
    expect(html).toContain('href="/games/vocabulary-check/course-1"');
    expect(html).toContain('class="activity-icon grammar"');
    expect(html).toContain('Ngữ pháp');
    expect(html).toContain('class="activity-icon quiz"');
    expect(html).toContain('class="activity-icon pronunciation"');
    expect(html).toContain('class="activity-icon scramble"');
    expect(html).toContain('class="activity-icon word-match"');
    expect(html).toContain('class="activity-icon look-write"');
    expect(html).not.toContain('Sắp có');
  });
});
