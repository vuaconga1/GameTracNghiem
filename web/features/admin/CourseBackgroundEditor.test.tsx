import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { CourseBackgroundEditor } from './CourseBackgroundEditor';

describe('CourseBackgroundEditor', () => {
  it('renders preview and both URL/upload controls for a saved course', () => {
    const html = renderToStaticMarkup(
      createElement(CourseBackgroundEditor, {
        courseId: 'course-1',
        imageSrc: 'https://example.com/unit.png',
        externalUrl: 'https://example.com/unit.png',
        onUpdated: () => undefined,
      })
    );

    expect(html).toContain('class="course-background-preview"');
    expect(html).toContain('URL ảnh');
    expect(html).toContain('Tải ảnh');
    expect(html).toContain('Xóa ảnh');
  });

  it('requires saving a new course before uploading', () => {
    const html = renderToStaticMarkup(
      createElement(CourseBackgroundEditor, {
        courseId: null,
        imageSrc: null,
        externalUrl: '',
        onUpdated: () => undefined,
      })
    );

    expect(html).toContain('Lưu Unit trước khi thêm ảnh');
  });
});
