import { describe, expect, it } from 'vitest';

import {
  findFirstQuestionByMode,
  nextEmptyPlayableIndex,
  nextPlayableIndex,
  nextQuestionIndexInMode,
  playableModes,
  uniqueModes,
} from './findQuestion';
import type { PronunciationQuestion } from './types';

const sampleQuestions: PronunciationQuestion[] = [
  {
    id: '1',
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
    id: '2',
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
    id: '3',
    index: 2,
    mode: 'stress',
    modeLabel: 'Trọng âm',
    prompt: 'Nhấn mạnh đúng âm tiết được đánh dấu',
    targetText: 'computer',
    targetIpa: '/kəmˈpjuːtər/',
    referenceAudioUrl: '',
    hint: '',
  },
  {
    id: '4',
    index: 3,
    mode: 'phoneme',
    modeLabel: 'Luyện âm',
    prompt: 'Luyện âm /r/',
    targetText: 'river',
    targetIpa: '/ˈrɪvər/',
    referenceAudioUrl: '',
    hint: '',
  },
];

describe('findQuestion helpers', () => {
  it('returns unique modes in first-seen order', () => {
    expect(uniqueModes(sampleQuestions)).toEqual(['phoneme', 'sentence', 'stress']);
  });

  it('hides stress mode from playable tabs', () => {
    expect(playableModes(sampleQuestions)).toEqual(['phoneme', 'sentence']);
  });

  it('finds the first question for a mode', () => {
    expect(findFirstQuestionByMode(sampleQuestions, 'sentence')).toBe(1);
    expect(findFirstQuestionByMode(sampleQuestions, 'phoneme')).toBe(0);
  });

  it('advances within the same mode and wraps', () => {
    expect(nextQuestionIndexInMode(sampleQuestions, 0, 'phoneme')).toBe(3);
    expect(nextQuestionIndexInMode(sampleQuestions, 3, 'phoneme')).toBe(0);
    expect(nextQuestionIndexInMode(sampleQuestions, 1, 'sentence')).toBe(1);
  });

  it('finds next empty playable index and skips stress', () => {
    expect(nextEmptyPlayableIndex(sampleQuestions, ['correct', 'empty', 'empty', 'empty'])).toBe(1);
    expect(nextEmptyPlayableIndex(sampleQuestions, ['correct', 'wrong', 'empty', 'correct'])).toBe(-1);
  });

  it('finds next playable index without wrapping', () => {
    expect(nextPlayableIndex(sampleQuestions, 0)).toBe(1);
    expect(nextPlayableIndex(sampleQuestions, 1)).toBe(3);
    expect(nextPlayableIndex(sampleQuestions, 3)).toBe(-1);
  });
});
