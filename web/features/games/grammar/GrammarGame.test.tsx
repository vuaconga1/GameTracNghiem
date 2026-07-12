import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { GrammarGameContent } from './GrammarGame';

describe('GrammarGameContent', () => {
  it('renders the legacy list question and result panel chrome', () => {
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
      statuses: ['correct', 'empty'] as const,
      currentIndex: 1,
      input: '',
      answerResult: null,
      submitMessage: '',
      sessionPoints: 120,
      isSubmitting: false,
      completedCount: 1,
      progressPercent: 50,
      stats: { total: 2, correct: 1, wrong: 0, pending: 1 },
      onBackHome: vi.fn(),
      onBackToList: vi.fn(),
      onOpenQuestion: vi.fn(),
      onStartContinue: vi.fn(),
      onInputChange: vi.fn(),
      onSubmit: vi.fn(),
      onNext: vi.fn(),
    };

    const listHtml = renderToStaticMarkup(
      createElement(GrammarGameContent, { ...baseProps, panel: 'list' })
    );
    expect(listHtml).toContain('class="game-page"');
    expect(listHtml).toContain('id="listPanel"');
    expect(listHtml).toContain('class="list-stats"');
    expect(listHtml).toContain('class="q-list-item status-correct"');
    expect(listHtml).toContain('class="q-list-item status-pending"');
    expect(listHtml).toContain('Bắt đầu làm bài');

    const questionHtml = renderToStaticMarkup(
      createElement(GrammarGameContent, { ...baseProps, panel: 'question' })
    );
    expect(questionHtml).toContain('class="game-meta"');
    expect(questionHtml).toContain('class="question-counter-pill"');
    expect(questionHtml).toContain('class="meta-pill meta-score-pill"');
    expect(questionHtml).toContain('class="progress-bar-wrap"');
    expect(questionHtml).toContain('style="width:50%"');
    expect(questionHtml).toContain('class="rewrite-row"');
    expect(questionHtml).toContain('class="hint-box"');

    const resultHtml = renderToStaticMarkup(
      createElement(GrammarGameContent, { ...baseProps, panel: 'result' })
    );
    expect(resultHtml).toContain('id="resultPanel"');
    expect(resultHtml).toContain('class="result-panel"');
    expect(resultHtml).toContain('Tổng điểm phiên: +120 điểm');
    expect(resultHtml).toContain('Đúng');
    expect(resultHtml).toContain('Chưa làm');
  });
});
