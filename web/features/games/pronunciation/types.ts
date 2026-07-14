export type PronunciationMode = 'phoneme' | 'sentence' | 'stress' | string;

export type PronunciationQuestion = {
  id: string;
  index: number;
  mode: PronunciationMode;
  modeLabel: string;
  prompt: string;
  targetText: string;
  targetIpa: string;
  referenceAudioUrl: string;
  hint: string;
};

export type PronunciationGameResponse = {
  success: boolean;
  course?: {
    id: string;
    name: string;
    levelName: string;
  };
  questions?: PronunciationQuestion[];
  statuses?: import('@/lib/gameCatalog').ProgressStatus[];
  message?: string;
};

export type RecordState = 'idle' | 'recording' | 'done';
