import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { CourseGameLessonEditor } from './CourseGameLessonEditor';

const game = {
  key: 'grammar',
  label: 'Ngữ pháp',
};

describe('CourseGameLessonEditor', () => {
  it('renders the saved page range and remove action', () => {
    const html = renderToStaticMarkup(
      <CourseGameLessonEditor
        game={game}
        ebookAvailable
        value={{ pageStart: '12', pageEnd: '18', saved: true }}
        busy={false}
        onChange={vi.fn()}
        onSave={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    expect(html).toContain('aria-label="Trang bắt đầu cho Ngữ pháp"');
    expect(html).toContain('value="12"');
    expect(html).toContain('aria-label="Trang kết thúc cho Ngữ pháp"');
    expect(html).toContain('value="18"');
    expect(html).toContain('Lưu');
    expect(html).toContain('Gỡ');
  });

  it('disables PDF controls when the course has no ebook', () => {
    const html = renderToStaticMarkup(
      <CourseGameLessonEditor
        game={game}
        ebookAvailable={false}
        value={{ pageStart: '', pageEnd: '', saved: false }}
        busy={false}
        onChange={vi.fn()}
        onSave={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    expect(html).toContain('Khóa học chưa gắn sách PDF');
    expect(html.match(/disabled=""/g)).toHaveLength(3);
  });

  it('does not render remove action without a saved mapping', () => {
    const html = renderToStaticMarkup(
      <CourseGameLessonEditor
        game={game}
        ebookAvailable
        value={{ pageStart: '2', pageEnd: '5', saved: false }}
        busy={false}
        onChange={vi.fn()}
        onSave={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    expect(html).toContain('value="2"');
    expect(html).toContain('value="5"');
    expect(html).not.toContain('Gỡ');
  });
});
