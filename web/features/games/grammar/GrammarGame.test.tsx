import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

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
      createElement(GrammarGameContent, {
        ...baseProps,
        statuses: ['correct', 'empty'],
        panel: 'list',
      })
    );
    expect(listHtml).toContain('class="game-page grammar-page"');
    expect(listHtml).toContain('id="listPanel"');
    expect(listHtml).toContain('class="list-stats"');
    expect(listHtml).toContain('class="q-list-item status-correct"');
    expect(listHtml).toContain('class="q-list-item status-pending"');
    expect(listHtml).toContain('Bắt đầu làm bài');

    const questionHtml = renderToStaticMarkup(
      createElement(GrammarGameContent, {
        ...baseProps,
        statuses: ['correct', 'empty'],
        panel: 'question',
      })
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
      createElement(GrammarGameContent, {
        ...baseProps,
        statuses: ['correct', 'empty'],
        panel: 'result',
      })
    );
    expect(resultHtml).toContain('id="resultPanel"');
    expect(resultHtml).toContain('class="result-panel"');
    expect(resultHtml).toContain('Tổng điểm phiên: +120 điểm');
    expect(resultHtml).toContain('Làm lại');
    expect(resultHtml).toContain('Quay lại khóa học');
  });

  it('shows retry-from-start primary CTA when all questions are answered', () => {
    const listHtml = renderToStaticMarkup(
      createElement(GrammarGameContent, {
        ...baseProps,
        statuses: ['correct', 'wrong'],
        stats: { total: 2, correct: 1, wrong: 1, pending: 0 },
        progressPercent: 100,
        panel: 'list',
      })
    );

    expect(listHtml).toContain('Làm lại từ đầu');
    expect(listHtml).toContain('Xem kết quả');
    expect(listHtml).not.toContain('Bắt đầu làm bài');
  });
});
