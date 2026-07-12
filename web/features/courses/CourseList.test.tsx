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
            className: 'Lớp 1',
            levelName: 'A1',
          },
        ],
      })
    );

    expect(html).toContain('class="course-grid"');
    expect(html).toContain('class="course-card"');
    expect(html).toContain('href="/courses/course-1"');
    expect(html).toContain('class="course-thumb-placeholder"');
    expect(html).toContain('class="course-title"');
    expect(html).toContain('Starter A');
  });
});
