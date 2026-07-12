import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { CourseDetailContent } from './CourseDetailView';

describe('CourseDetailContent', () => {
  it('renders the legacy course detail book, ebook, and activity layout', () => {
    const html = renderToStaticMarkup(
      createElement(CourseDetailContent, {
        data: {
          success: true,
          course: {
            id: 'course-1',
            name: 'EveryUp',
            className: 'Lớp 8',
            levelName: 'A2',
            courseKey: 'EveryUp::A2',
          },
          games: {
            grammar: {
              questionCount: 3,
              statuses: ['correct', 'empty', 'wrong'],
            },
          },
        },
      })
    );

    expect(html).toContain('id="view-detail"');
    expect(html).toContain('class="view-detail"');
    expect(html).toContain('href="/"');
    expect(html).toContain('class="detail-back"');
    expect(html).toContain('class="book-card"');
    expect(html).toContain('EveryUp');
    expect(html).toContain('Lớp 8');
    expect(html).toContain('A2');
    expect(html).toContain('3');
    expect(html).toContain('2/3');

    expect(html).toContain('class="detail-tabs tabs-secondary"');
    expect(html).toContain('class="tab-secondary active"');
    expect(html).toContain('Bài học');
    expect(html).toContain('Bài tập');
    expect(html).toContain('class="ebook-viewer"');
    expect(html).toContain('class="ebook-toolbar"');
    expect(html).toContain('class="ebook-empty"');
    expect(html).toContain('Sách điện tử sẽ được kết nối sau.');

    expect(html).toContain('class="activity-grid"');
    expect(html).toContain('href="/games/grammar/course-1"');
    expect(html).toContain('class="activity-icon grammar"');
    expect(html).toContain('Ngữ pháp');
    expect(html).toContain('class="activity-icon quiz"');
    expect(html).toContain('class="activity-icon pronunciation"');
    expect(html).toContain('class="activity-icon scramble"');
    expect(html).toContain('class="activity-icon word-match"');
    expect(html).toContain('class="activity-icon look-write"');
    expect(html).toContain('Sắp có');
  });
});
