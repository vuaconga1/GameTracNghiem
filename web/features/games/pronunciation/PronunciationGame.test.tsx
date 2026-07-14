import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { PronunciationGameContent } from './PronunciationGame';

describe('PronunciationGameContent', () => {
  const baseProps = {
    course: {
      id: 'course-1',
      name: 'EveryUp',
      levelName: 'A2',
    },
    questions: [
      {
        id: 'q1',
        index: 0,
        mode: 'phoneme',
        modeLabel: 'Luyện âm',
        prompt: 'Chú ý âm /l/ cuối từ',
        targetText: 'world',
        targetIpa: '/wɜːrld/',
        referenceAudioUrl: 'https://example.com/world.mp3',
        hint: '',
      },
      {
        id: 'q2',
        index: 1,
        mode: 'sentence',
        modeLabel: 'Luyện câu',
        prompt: 'Đọc to, rõ ràng và tự nhiên',
        targetText: 'Nice to meet you',
        targetIpa: '',
        referenceAudioUrl: '',
        hint: '',
      },
      {
        id: 'q3',
        index: 2,
        mode: 'stress',
        modeLabel: 'Trọng âm',
        prompt: 'Nhấn mạnh đúng âm tiết được đánh dấu',
        targetText: 'computer',
        targetIpa: '/kəmˈpjuːtər/',
        referenceAudioUrl: '',
        hint: '',
      },
    ],
    currentIndex: 0,
    currentMode: 'phoneme',
    recordState: 'idle' as const,
    showSelfEval: false,
    showActions: false,
    sessionPoints: 120,
    maxScore: 600,
    progressPercent: 20,
    answerResult: null,
    submitMessage: '',
    isSubmitting: false,
    onBack: vi.fn(),
    onModeChange: vi.fn(),
    onResetQuestion: vi.fn(),
    onPlayReference: vi.fn(),
    onPlaySlow: vi.fn(),
    onMicClick: vi.fn(),
    onSelfEval: vi.fn(),
    onRetry: vi.fn(),
    onNext: vi.fn(),
  };

  it('renders legacy pronunciation chrome and mode tabs', () => {
    const html = renderToStaticMarkup(
      createElement(PronunciationGameContent, {
        ...baseProps,
        statuses: ['empty', 'empty', 'empty'],
      })
    );

    expect(html).toContain('class="pronunciation-page pron-page-stack"');
    expect(html).toContain('class="pron-hero"');
    expect(html).toContain('class="game-meta pron-game-meta"');
    expect(html).toContain('class="mode-btn active"');
    expect(html).toContain('data-mode="phoneme"');
    expect(html).toContain('data-mode="sentence"');
    expect(html).toContain('class="pron-mic-panel"');
    expect(html).toContain('id="btnMicIcon"');
    expect(html).toContain('Nghe mẫu');
    expect(html).toContain('Nhấn micro để bắt đầu ghi âm');
  });

  it('shows self-eval panel after fake recording completes', () => {
    const html = renderToStaticMarkup(
      createElement(PronunciationGameContent, {
        ...baseProps,
        statuses: ['empty', 'empty', 'empty'],
        recordState: 'done',
        showSelfEval: true,
      })
    );

    expect(html).toContain('id="selfEvalPanel"');
    expect(html).toContain('class="self-eval"');
    expect(html).toContain('>Đúng<');
    expect(html).toContain('>Sai<');
    expect(html).toContain('Chọn kết quả tự đánh giá bên dưới');
  });

  it('shows action buttons and evaluation result for completed questions', () => {
    const html = renderToStaticMarkup(
      createElement(PronunciationGameContent, {
        ...baseProps,
        statuses: ['correct', 'empty', 'empty'],
        recordState: 'done',
        showActions: true,
        answerResult: { isCorrect: true, points: 150 },
      })
    );

    expect(html).toContain('id="actionContainer"');
    expect(html).toContain('id="btnRetry"');
    expect(html).toContain('id="btnNextAction"');
    expect(html).toContain('class="evaluation-result');
    expect(html).toContain('+150 điểm');
  });
});
