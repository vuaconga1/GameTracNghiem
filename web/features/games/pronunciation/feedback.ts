import type { TranscriptScoreResult } from './scoreTranscript';
import { getWordSyllables, stressedSyllableText, unstressedSyllableText } from './syllables';
import type { PronunciationMode } from './types';

export type ScoreRing = {
  value: number;
  label: string;
  color: string;
};

type Translate = (key: string, params?: Record<string, string | number>) => string;

export function extractIpaHighlight(targetIpa: string): string {
  if (!targetIpa) return '';
  const matched = targetIpa.match(/\/([^/]+)\//);
  return matched ? matched[0] : targetIpa;
}

export function wordScoreRings(score: TranscriptScoreResult, t: Translate): ScoreRing[] {
  const color = score.isCorrect ? '#22c55e' : '#ef4444';
  return [{ value: score.accuracy, label: t('pronunciation.accuracy'), color }];
}

export function sentenceScoreRingsFromResult(
  score: TranscriptScoreResult,
  t: Translate,
): ScoreRing[] {
  const accuracyColor = score.isCorrect ? '#22c55e' : '#ef4444';
  return [
    { value: score.accuracy, label: t('pronunciation.accuracy'), color: accuracyColor },
    { value: score.fluency ?? score.accuracy, label: t('pronunciation.fluency'), color: '#0d2b6e' },
  ];
}

export function stressFeedbackText(
  word: string,
  isCorrect: boolean,
  t: Translate,
): { title: string; body: string } {
  const stressedText = stressedSyllableText(word);
  const unstressedText = unstressedSyllableText(word);
  if (isCorrect) {
    return {
      title: t('pronunciation.stressCorrectTitle'),
      body: t('pronunciation.stressCorrectBody', { stressed: stressedText }),
    };
  }
  return {
    title: t('pronunciation.stressWrongTitle'),
    body: t('pronunciation.stressWrongBody', {
      unstressed: unstressedText,
      stressed: stressedText,
    }),
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
  if (mode === 'sentence') return 'sentence';
  if (mode === 'stress') return 'stress';
  return 'phoneme';
}

export function stressSyllablesForDisplay(word: string) {
  return getWordSyllables(word);
}

export function feedbackMessage(score: TranscriptScoreResult, t: Translate): string {
  if (score.isCorrect) {
    return score.mode === 'sentence'
      ? t('pronunciation.feedbackSentenceGood')
      : t('pronunciation.feedbackWordGood');
  }
  return score.mode === 'sentence'
    ? t('pronunciation.feedbackSentenceBad')
    : t('pronunciation.feedbackWordBad');
}
