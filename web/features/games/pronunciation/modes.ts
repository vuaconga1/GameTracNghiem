import type { PronunciationMode } from './types';

export type ModeConfig = {
  label: string;
  icon: string;
  color: string;
  bg: string;
};

export const MODE_MAP: Record<string, string> = {
  phoneme: 'Luyện âm',
  sentence: 'Luyện câu',
  stress: 'Trọng âm',
};

export const MODES: Record<string, ModeConfig> = {
  phoneme: { label: 'Luyện âm', icon: 'fa-solid fa-bolt', color: '#1e5bb8', bg: '#e8f0fe' },
  sentence: { label: 'Luyện câu', icon: 'fa-solid fa-book-open', color: '#7c3aed', bg: '#f3e8ff' },
  stress: { label: 'Trọng âm', icon: 'fa-solid fa-chart-simple', color: '#d97706', bg: '#fff7ed' },
};

export const PRON_PRIMARY = '#0d2b6e';
export const PRON_PRIMARY_LIGHT = '#e8eef8';

export function modeConfig(mode: PronunciationMode): ModeConfig {
  return MODES[mode] || MODES.phoneme;
}

export function modeLabel(mode: PronunciationMode, customLabel?: string): string {
  if (customLabel) return customLabel;
  return MODE_MAP[mode] || MODES.phoneme.label;
}

export function getModeWordCardStyle(mode: PronunciationMode): { background: string; border: string } {
  const cfg = modeConfig(mode);
  return {
    background: `linear-gradient(135deg, ${cfg.bg} 0%, #ffffff 100%)`,
    border: `2px solid ${cfg.color}28`,
  };
}
