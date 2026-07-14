import { getWordSyllables, stressedSyllableText, unstressedSyllableText } from './syllables';
import type { PronunciationMode } from './types';

export type PhonemeChip = {
  char: string;
  score: number;
  weak: boolean;
};

export type WordScore = {
  word: string;
  score: number;
};

export type ScoreRing = {
  value: number;
  label: string;
  color: string;
};

export function extractIpaHighlight(targetIpa: string): string {
  if (!targetIpa) return '/l/';
  const matched = targetIpa.match(/\/([^/]+)\//);
  return matched ? matched[0] : targetIpa;
}

export function getWordPhonemeBreakdown(word: string, isCorrect: boolean): PhonemeChip[] {
  const letters = word.toLowerCase().replace(/[^a-z]/g, '').split('');
  let weakIndex = letters.indexOf('l');
  if (weakIndex === -1 && letters.length > 0) {
    weakIndex = Math.floor(letters.length / 2);
  }

  return letters.map((char, index) => {
    if (isCorrect) {
      return { char, score: Math.floor(Math.random() * 15) + 85, weak: false };
    }
    if (index === weakIndex) {
      return { char, score: Math.floor(Math.random() * 20) + 10, weak: true };
    }
    return { char, score: Math.floor(Math.random() * 20) + 60, weak: false };
  });
}

export function getSentenceWordScores(sentence: string, isCorrect: boolean): WordScore[] {
  const words = sentence.replace(/[.,/#!$%^&*;:{}=\-_`~()?]/g, '').split(/\s+/).filter(Boolean);
  return words.map((word) => {
    if (isCorrect) {
      return { word, score: Math.floor(Math.random() * 15) + 85 };
    }
    return {
      word,
      score: Math.random() > 0.4 ? Math.floor(Math.random() * 20) + 75 : Math.floor(Math.random() * 30) + 30,
    };
  });
}

export function phonemeScoreRings(isCorrect: boolean, targetIpa: string): ScoreRing[] {
  const scorePhoneme = isCorrect ? Math.floor(Math.random() * 10) + 90 : Math.floor(Math.random() * 20) + 15;
  const scoreAccuracy = isCorrect ? Math.floor(Math.random() * 10) + 88 : Math.floor(Math.random() * 20) + 50;
  const ipaVal = extractIpaHighlight(targetIpa);
  return [
    { value: scorePhoneme, label: `Âm ${ipaVal}`, color: isCorrect ? '#22c55e' : '#ef4444' },
    { value: scoreAccuracy, label: 'Độ chính xác', color: '#22c55e' },
  ];
}

export function sentenceScoreRings(isCorrect: boolean): ScoreRing[] {
  const scoreAccuracy = isCorrect ? Math.floor(Math.random() * 8) + 90 : Math.floor(Math.random() * 20) + 45;
  const scoreFluency = isCorrect ? Math.floor(Math.random() * 8) + 88 : Math.floor(Math.random() * 25) + 40;
  return [
    { value: scoreAccuracy, label: 'Độ chính xác', color: '#22c55e' },
    { value: scoreFluency, label: 'Trôi chảy', color: '#0d2b6e' },
  ];
}

export function stressFeedbackText(word: string, isCorrect: boolean): { title: string; body: string } {
  const stressedText = stressedSyllableText(word);
  const unstressedText = unstressedSyllableText(word);
  if (isCorrect) {
    return {
      title: 'Nhấn đúng trọng âm!',
      body: `Giọng của bạn nhấn mạnh đúng vào ${stressedText}. Xuất sắc!`,
    };
  }
  return {
    title: 'Chưa đúng trọng âm',
    body: `Giọng bạn mạnh nhất ở ${unstressedText}. Mục tiêu: ${stressedText}. Thử lại nhé.`,
  };
}

export function pitchCurvePoints(isCorrect: boolean): string {
  return isCorrect
    ? '0,24 40,24 80,8 120,24 160,24 200,24'
    : '0,18 40,16 80,26 100,6 160,28 200,22';
}

export function wordScoreColor(score: number): string {
  if (score >= 80) return 'text-green-500';
  if (score >= 60) return 'text-amber-500';
  return 'text-red-500';
}

export function resolveFeedbackMode(mode: PronunciationMode): PronunciationMode {
  if (mode === 'phoneme' || mode === 'sentence' || mode === 'stress') return mode;
  return 'phoneme';
}

export function stressSyllablesForDisplay(word: string) {
  return getWordSyllables(word);
}
