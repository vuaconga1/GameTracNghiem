import type { TranscriptScoreResult } from './scoreTranscript';
import { getWordSyllables, stressedSyllableText, unstressedSyllableText } from './syllables';
import type { PronunciationMode } from './types';

export type ScoreRing = {
  value: number;
  label: string;
  color: string;
};

export function extractIpaHighlight(targetIpa: string): string {
  if (!targetIpa) return '';
  const matched = targetIpa.match(/\/([^/]+)\//);
  return matched ? matched[0] : targetIpa;
}

export function wordScoreRings(score: TranscriptScoreResult): ScoreRing[] {
  const color = score.isCorrect ? '#22c55e' : '#ef4444';
  return [{ value: score.accuracy, label: 'Độ chính xác', color }];
}

export function sentenceScoreRingsFromResult(score: TranscriptScoreResult): ScoreRing[] {
  const accuracyColor = score.isCorrect ? '#22c55e' : '#ef4444';
  return [
    { value: score.accuracy, label: 'Độ chính xác', color: accuracyColor },
    { value: score.fluency ?? score.accuracy, label: 'Trôi chảy', color: '#0d2b6e' },
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
  if (mode === 'sentence') return 'sentence';
  if (mode === 'stress') return 'stress';
  return 'phoneme';
}

export function stressSyllablesForDisplay(word: string) {
  return getWordSyllables(word);
}

export function feedbackMessage(score: TranscriptScoreResult): string {
  if (score.isCorrect) {
    return score.mode === 'sentence'
      ? 'Phát âm câu khá tốt! Hãy tiếp tục luyện tập.'
      : 'Phát âm rất chuẩn! Hãy tiếp tục luyện tập.';
  }
  return score.mode === 'sentence'
    ? 'Chưa khớp câu mẫu — đọc chậm và rõ từng từ.'
    : 'Chưa chuẩn — nghe mẫu rồi thử lại nhé.';
}
