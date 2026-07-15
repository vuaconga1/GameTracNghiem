import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { PronunciationGameContent } from './PronunciationGame';
import { scoreTranscript } from './scoreTranscript';

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
        modeLabel: 'Luyện từ',
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
    panel: 'question' as const,
    currentIndex: 0,
    currentMode: 'phoneme' as const,
    recordState: 'idle' as const,
    showActions: false,
    sessionPoints: 120,
    maxScore: 600,
    progressPercent: 20,
    answerResult: null,
    submitMessage: '',
    isSubmitting: false,
    isResetting: false,
    stats: { total: 2, correct: 0, wrong: 0, pending: 2 },
    gameScore: 850,
    onBackHome: vi.fn(),
    onBackToList: vi.fn(),
    onOpenQuestion: vi.fn(),
    onStartContinue: vi.fn(),
    onRetry: vi.fn(),
    onRetryFromStart: vi.fn(),
    onViewResult: vi.fn(),
    onModeChange: vi.fn(),
    onResetQuestion: vi.fn(),
    onPlayReference: vi.fn(),
    onPlaySlow: vi.fn(),
    onMicClick: vi.fn(),
    onNext: vi.fn(),
  };

  it('shows question list and start button on list panel', () => {
    const html = renderToStaticMarkup(
      createElement(PronunciationGameContent, {
        ...baseProps,
        panel: 'list',
        statuses: ['correct', 'empty', 'empty'],
        stats: { total: 2, correct: 1, wrong: 0, pending: 1 },
      })
    );

    expect(html).toContain('id="listPanel"');
    expect(html).toContain('Danh sách câu hỏi');
    expect(html).toContain('Bắt đầu làm bài');
    expect(html).toContain('Tổng điểm cao nhất');
    expect(html).toContain('850');
    expect(html).toContain('world');
    expect(html).toContain('Nice to meet you');
    expect(html).not.toContain('id="btnMicIcon"');
    expect(html).not.toContain('computer');
  });

  it('shows redo from start when all playable questions are graded', () => {
    const html = renderToStaticMarkup(
      createElement(PronunciationGameContent, {
        ...baseProps,
        panel: 'list',
        statuses: ['correct', 'wrong', 'empty'],
        stats: { total: 2, correct: 1, wrong: 1, pending: 0 },
      })
    );

    expect(html).toContain('Làm lại từ đầu');
    expect(html).toContain('Xem kết quả');
  });

  it('renders pronunciation chrome and hides stress tab', () => {
    const html = renderToStaticMarkup(
      createElement(PronunciationGameContent, {
        ...baseProps,
        statuses: ['empty', 'empty', 'empty'],
      })
    );

    expect(html).toContain('class="pronunciation-page pron-page-stack"');
    expect(html).toContain('data-mode="phoneme"');
    expect(html).toContain('data-mode="sentence"');
    expect(html).not.toContain('data-mode="stress"');
    expect(html).toContain('Nhấn micro để bắt đầu ghi âm');
    expect(html).not.toContain('id="selfEvalPanel"');
  });

  it('shows auto-scored word result without phoneme chips or self-eval', () => {
    const score = scoreTranscript('world', 'world', 'phoneme');
    const html = renderToStaticMarkup(
      createElement(PronunciationGameContent, {
        ...baseProps,
        statuses: ['correct', 'empty', 'empty'],
        recordState: 'done',
        showActions: true,
        answerResult: {
          isCorrect: true,
          points: 150,
          score,
          engine: 'groq',
        },
      })
    );

    expect(html).toContain('id="actionContainer"');
    expect(html).toContain('id="btnNextAction"');
    expect(html).not.toContain('id="btnRetry"');
    expect(html).toContain('Độ chính xác');
    expect(html).toContain('Phát âm rất chuẩn');
    expect(html).toContain('+150 điểm');
    expect(html).not.toContain('Phân tích từng âm');
    expect(html).not.toContain('id="selfEvalPanel"');
  });

  it('shows per-word scores for sentence mode', () => {
    const score = scoreTranscript('Nice to meet you', 'Nice to meet you', 'sentence');
    const html = renderToStaticMarkup(
      createElement(PronunciationGameContent, {
        ...baseProps,
        currentIndex: 1,
        currentMode: 'sentence',
        statuses: ['empty', 'correct', 'empty'],
        recordState: 'done',
        showActions: true,
        answerResult: {
          isCorrect: true,
          points: 120,
          score,
          engine: 'webspeech',
        },
      })
    );

    expect(html).toContain('Từng từ một');
    expect(html).toContain('Chấm bằng nhận dạng trình duyệt');
    expect(html).toContain('Nice');
  });
});
