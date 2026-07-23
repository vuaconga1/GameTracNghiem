import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { CourseList } from './CourseList';

describe('CourseList', () => {
  it('renders legacy course card links', () => {
    const html = renderToStaticMarkup(
      createElement(CourseList, {
        courses: [
          {
            id: 'course-1',
            name: 'Starter A',
            levelName: 'A1',
            completionPercent: 75,
            backgroundImageUrl: 'https://cdn.example.com/unit-1.webp',
          },
        ],
      })
    );

    expect(html).toContain('class="course-grid"');
    expect(html).toContain('class="course-card"');
    expect(html).toContain('href="/courses/course-1"');
    expect(html).toContain('class="course-thumb"');
    expect(html).toContain('src="https://cdn.example.com/unit-1.webp"');
    expect(html).toContain('class="course-card-body"');
    expect(html).toContain('class="course-title"');
    expect(html).toContain('class="course-level"');
    expect(html).toContain('class="course-progress-text"');
    expect(html).toContain('75% hoàn thành');
    expect(html).toContain('class="course-progress-fill"');
    expect(html).toContain('width:75%');
    expect(html).toContain('class="course-start-button"');
    expect(html).toContain('Bắt đầu học');
    expect(html).toContain('Starter A');
    expect(html).toContain('A1');
  });

  it('keeps the gradient placeholder when no background is configured', () => {
    const html = renderToStaticMarkup(
      createElement(CourseList, {
        courses: [
          {
            id: 'course-2',
            name: 'Unit 2',
            levelName: 'Lớp 8',
            completionPercent: 0,
            backgroundImageUrl: null,
          },
        ],
      })
    );

    expect(html).toContain('class="course-thumb-placeholder"');
    expect(html).not.toContain('class="course-thumb"');
  });
});
