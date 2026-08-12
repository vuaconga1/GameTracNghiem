import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { I18nProvider } from '@/components/i18n/I18nProvider';
import { GrammarGameContent } from './GrammarGame';

describe('GrammarGameContent', () => {
  const baseProps = {
    courseId: 'course-1',
    course: {
      id: 'course-1',
      name: 'EveryUp',
      levelName: 'A2',
    },
    questions: [
      {
        id: 'q1',
        index: 0,
        source: 'She goes to school every day.',
        prefix: 'She',
        suffix: 'to school every day.',
        hint: 'Present simple',
        answers: ['goes'],
      },
      {
        id: 'q2',
        index: 1,
        source: 'They played football yesterday.',
        prefix: 'They',
        suffix: 'football yesterday.',
        hint: 'Past simple',
        answers: ['played'],
      },
    ],
    currentIndex: 1,
    input: '',
    answerResult: null,
    submitMessage: '',
    sessionPoints: 120,
    maxScore: 400,
    isSubmitting: false,
    isResetting: false,
    progressPercent: 30,
    stats: { total: 2, correct: 1, wrong: 0, pending: 1 },
    onBackHome: vi.fn(),
    onBackToList: vi.fn(),
    onOpenQuestion: vi.fn(),
    onStartContinue: vi.fn(),
    onRetry: vi.fn(),
    onRetryFromStart: vi.fn(),
    onViewResult: vi.fn(),
    onInputChange: vi.fn(),
    onSubmit: vi.fn(),
    onNext: vi.fn(),
  };

  it('renders the legacy list question and result panel chrome', () => {
    const listHtml = renderToStaticMarkup(
      createElement(I18nProvider, { initialLocale: 'vi' }, createElement(GrammarGameContent, {
        ...baseProps,
        statuses: ['correct', 'empty'],
        panel: 'list',
      }))
    );
    expect(listHtml).toContain('class="game-page grammar-page"');
    expect(listHtml).toContain('id="listPanel"');
    expect(listHtml).toContain('class="list-stats"');
    expect(listHtml).not.toContain('class="game-score-hero"');
    expect(listHtml).not.toContain('Tổng điểm cao nhất');
    expect(listHtml).toContain('class="q-list-item status-correct"');
    expect(listHtml).toContain('class="q-list-item status-pending"');
    expect(listHtml).toContain('Làm tiếp');
    expect(listHtml).toContain('Làm lại từ đầu');
    expect(listHtml).not.toContain('Bắt đầu làm bài');

    const questionHtml = renderToStaticMarkup(
      createElement(I18nProvider, { initialLocale: 'vi' }, createElement(GrammarGameContent, {
        ...baseProps,
        statuses: ['correct', 'empty'],
        panel: 'question',
      }))
    );
    expect(questionHtml).toContain('class="game-meta"');
    expect(questionHtml).toContain('class="question-counter-pill"');
    expect(questionHtml).toContain('class="meta-pill meta-score-pill"');
    expect(questionHtml).toContain('120/400 điểm');
    expect(questionHtml).toContain('class="progress-bar-wrap"');
    expect(questionHtml).toContain('style="width:30%"');
    expect(questionHtml).toContain('class="rewrite-row"');
    expect(questionHtml).toContain('class="hint-box"');

    const resultHtml = renderToStaticMarkup(
      createElement(I18nProvider, { initialLocale: 'vi' }, createElement(GrammarGameContent, {
        ...baseProps,
        statuses: ['correct', 'empty'],
        panel: 'result',
      }))
    );
    expect(resultHtml).toContain('id="resultPanel"');
    expect(resultHtml).not.toContain('class="game-score-hero"');
    expect(resultHtml).not.toContain('Tổng điểm cao nhất');
    expect(resultHtml).toContain('Đúng 1/2 câu');
    expect(resultHtml).toContain('Làm lại');
    expect(resultHtml).toContain('Quay lại khóa học');
  });

  it('shows retry-from-start primary CTA when all questions are answered', () => {
    const listHtml = renderToStaticMarkup(
      createElement(I18nProvider, { initialLocale: 'vi' }, createElement(GrammarGameContent, {
        ...baseProps,
        statuses: ['correct', 'wrong'],
        stats: { total: 2, correct: 1, wrong: 1, pending: 0 },
        progressPercent: 100,
        panel: 'list',
      }))
    );

    expect(listHtml).toContain('Làm lại từ đầu');
    expect(listHtml).toContain('Xem kết quả');
    expect(listHtml).not.toContain('Bắt đầu làm bài');
  });

  it('shows Vietnamese fill instruction when source is a workbook code', () => {
    const questionHtml = renderToStaticMarkup(
      createElement(I18nProvider, { initialLocale: 'vi' }, createElement(GrammarGameContent, {
        ...baseProps,
        questions: [
          {
            id: 'q1',
            index: 0,
            source: 'U1 Ex4',
            prefix: 'The',
            suffix: 'collected evidence.',
            hint: 'police officer, firefighter',
            answers: ['police officer'],
          },
        ],
        currentIndex: 0,
        statuses: ['empty'],
        stats: { total: 1, correct: 0, wrong: 0, pending: 1 },
        panel: 'question',
      }))
    );
    expect(questionHtml).toContain('Chọn từ trong gợi ý và điền vào chỗ trống.');
    expect(questionHtml).toContain('Điền từ vào chỗ trống:');
    expect(questionHtml).not.toContain('>U1 Ex4<');
    expect(questionHtml).not.toContain('Câu mẫu');
  });

  it('renders descriptive rewrite instructions for prompt-based writing questions', () => {
    const questionHtml = renderToStaticMarkup(
      createElement(I18nProvider, { initialLocale: 'vi' }, createElement(GrammarGameContent, {
        ...baseProps,
        questions: [
          {
            id: 'q1',
            index: 0,
            source: "Mary doesn't know how she can get to the community centre.",
            prefix: "Mary doesn't know",
            suffix: '',
            hint: 'W Exercise 15',
            answers: ['how to get to the community centre.'],
          },
        ],
        currentIndex: 0,
        exerciseTitle: 'Viết lại câu theo từ gợi ý',
        statuses: ['empty'],
        stats: { total: 1, correct: 0, wrong: 0, pending: 1 },
        panel: 'question',
      }))
    );

    expect(questionHtml).toContain(
      'Đọc câu gốc rồi viết phần còn thiếu để hoàn thành câu mới đúng ngữ pháp và đúng nghĩa.'
    );
    expect(questionHtml).toContain('Câu gốc');
    expect(questionHtml).toContain('Viết phần còn thiếu:');
    expect(questionHtml).not.toContain('>W Exercise 15<');
    expect(questionHtml).toContain(
      'Giữ nguyên phần đã cho và chỉ điền đoạn còn thiếu vào ô trả lời.'
    );
  });

  it('renders descriptive correction instructions for error-fixing questions', () => {
    const questionHtml = renderToStaticMarkup(
      createElement(I18nProvider, { initialLocale: 'vi' }, createElement(GrammarGameContent, {
        ...baseProps,
        questions: [
          {
            id: 'q1',
            index: 0,
            source: 'My father was drive to work when he saw an accident on the road.',
            prefix: '',
            suffix: '',
            hint: 'W Exercise 14',
            answers: ['My father was driving to work when he saw an accident on the road.'],
          },
        ],
        currentIndex: 0,
        exerciseTitle: 'Tìm và sửa lỗi sai trong câu',
        statuses: ['empty'],
        stats: { total: 1, correct: 0, wrong: 0, pending: 1 },
        panel: 'question',
      }))
    );

    expect(questionHtml).toContain('Đọc câu, tìm lỗi sai rồi viết lại cả câu cho đúng.');
    expect(questionHtml).toContain('Câu có lỗi');
    expect(questionHtml).toContain('Viết lại câu đúng:');
    expect(questionHtml).not.toContain('Câu mẫu');
    expect(questionHtml).not.toContain('>W Exercise 14<');
  });

  it('renders double-comparative instructions for sparse slash cues', () => {
    const questionHtml = renderToStaticMarkup(
      createElement(I18nProvider, { initialLocale: 'vi' }, createElement(GrammarGameContent, {
        ...baseProps,
        questions: [
          {
            id: 'q1',
            index: 0,
            source: 'modern/ car/ be,/ expensive/ it/ cost',
            prefix: '',
            suffix: '',
            hint: 'W Exercise 16',
            answers: ['The more modern the car is, the more it costs.'],
          },
        ],
        currentIndex: 0,
        exerciseTitle: 'Viết lại câu theo dạng so sánh kép',
        statuses: ['empty'],
        stats: { total: 1, correct: 0, wrong: 0, pending: 1 },
        panel: 'question',
      }))
    );

    expect(questionHtml).toContain(
      'Dùng các từ gợi ý để viết câu theo cấu trúc so sánh kép (The more/less/-er ..., the more/less/-er ...).'
    );
    expect(questionHtml).toContain('Từ/cụm từ gợi ý');
    expect(questionHtml).toContain('Viết câu so sánh kép:');
    expect(questionHtml).toContain('Viết đầy đủ câu dạng &quot;The ..., the ...&quot;');
    expect(questionHtml).not.toContain('Sắp xếp các từ hoặc cụm từ đã cho');
    expect(questionHtml).not.toContain('>W Exercise 16<');
  });

  it('renders present-perfect instructions for guided slash cues', () => {
    const questionHtml = renderToStaticMarkup(
      createElement(I18nProvider, { initialLocale: 'vi' }, createElement(GrammarGameContent, {
        ...baseProps,
        questions: [
          {
            id: 'q1',
            index: 0,
            source: 'I/ already/ speak/ / the manager/ the issue./',
            prefix: '',
            suffix: '',
            hint: 'W Exercise 15',
            answers: ['I have already spoken to the manager about the issue.'],
          },
        ],
        currentIndex: 0,
        exerciseTitle: 'Viết câu dùng thì hiện tại hoàn thành',
        statuses: ['empty'],
        stats: { total: 1, correct: 0, wrong: 0, pending: 1 },
        panel: 'question',
      }))
    );

    expect(questionHtml).toContain(
      'Dùng các từ gợi ý để viết câu đúng với thì hiện tại hoàn thành (present perfect).'
    );
    expect(questionHtml).toContain('Từ/cụm từ gợi ý');
    expect(questionHtml).toContain('Viết câu hiện tại hoàn thành:');
    expect(questionHtml).toContain('Chia động từ ở thì hiện tại hoàn thành');
    expect(questionHtml).not.toContain('Sắp xếp các từ hoặc cụm từ đã cho');
    expect(questionHtml).not.toContain('>W Exercise 15<');
  });
});
