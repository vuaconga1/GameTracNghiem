import { localizeExerciseTitle } from '@/features/games/localizeExerciseTitle';

import type { PronunciationMode } from './types';

export type ModeConfig = {
  /** i18n key under exerciseTitles.* */
  labelKey: string;
  icon: string;
  color: string;
  bg: string;
};

export const MODE_LABEL_KEYS: Record<string, string> = {
  phoneme: 'exerciseTitles.practiceWord',
  word: 'exerciseTitles.practiceWord',
  sentence: 'exerciseTitles.practiceSentence',
  stress: 'exerciseTitles.wordStress',
};

/** @deprecated Prefer MODE_LABEL_KEYS + t(); kept for legacy string compares. */
export const MODE_MAP: Record<string, string> = {
  phoneme: 'Luyện từ',
  word: 'Luyện từ',
  sentence: 'Luyện câu',
  stress: 'Trọng âm',
};

export const MODES: Record<string, ModeConfig> = {
  phoneme: {
    labelKey: 'exerciseTitles.practiceWord',
    icon: 'fa-solid fa-bolt',
    color: '#1e5bb8',
    bg: '#e8f0fe',
  },
  word: {
    labelKey: 'exerciseTitles.practiceWord',
    icon: 'fa-solid fa-bolt',
    color: '#1e5bb8',
    bg: '#e8f0fe',
  },
  sentence: {
    labelKey: 'exerciseTitles.practiceSentence',
    icon: 'fa-solid fa-book-open',
    color: '#7c3aed',
    bg: '#f3e8ff',
  },
  stress: {
    labelKey: 'exerciseTitles.wordStress',
    icon: 'fa-solid fa-chart-simple',
    color: '#d97706',
    bg: '#fff7ed',
  },
};

export const PRON_PRIMARY = '#0d2b6e';
export const PRON_PRIMARY_LIGHT = '#e8eef8';

export function modeConfig(mode: PronunciationMode): ModeConfig {
  return MODES[mode] || MODES.phoneme;
}

export function modeLabelKey(mode: PronunciationMode): string {
  return MODE_LABEL_KEYS[mode] || MODE_LABEL_KEYS.phoneme;
}

export function modeLabel(
  mode: PronunciationMode,
  customLabel?: string,
  t?: (key: string, params?: Record<string, string | number>) => string,
): string {
  if (customLabel) {
    return t ? localizeExerciseTitle(t, customLabel, customLabel) : customLabel;
  }
  if (t) return t(modeLabelKey(mode));
  return MODE_MAP[mode] || 'Word practice';
}

export function getModeWordCardStyle(mode: PronunciationMode): {
  background: string;
  border: string;
} {
  const cfg = modeConfig(mode);
  return {
    background: `linear-gradient(135deg, ${cfg.bg} 0%, #ffffff 100%)`,
    border: `2px solid ${cfg.color}28`,
  };
}
