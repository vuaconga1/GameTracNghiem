import { getLop1UnitVocab } from '@/lib/lop1Vocab';
import { lop1VocabImagePath } from '@/lib/lop1VocabImages';
import { LOP1_LEVEL } from '@/lib/lop1Units';
import { lop2VocabImagePath } from '@/lib/lop2VocabImages';
import { lop3VocabImagePath } from '@/lib/lop3VocabImages';
import { lop4VocabImagePath } from '@/lib/lop4VocabImages';
import { lop5VocabImagePath } from '@/lib/lop5VocabImages';
import type { LogisticsVocabCard } from '@/lib/logisticsVocabDeck';
import { getCourseVocabDeck as getLogisticsVocabDeck } from '@/lib/logisticsVocabDeck';
import { parseUnitNumber } from '@/lib/primaryGradeConfig';
import { PRIMARY_GRADE_SPECS, type PrimaryGradeId } from '@/lib/primaryGradeSpecs';
import { resolvePrimaryVocabAudioUrl } from '@/lib/primaryVocabAudio';
import { resolveVocabAudioUrl } from '@/lib/vocabAudio';

export type CourseVocabCard = {
  word: string;
  meaning: string;
  /** Logistics-style example sentence (optional). */
  example?: string;
  ipa?: string;
  imageUrl?: string;
  audioUrl?: string;
  icon?: string;
  accent?: LogisticsVocabCard['accent'];
  layout: 'logistics' | 'primary';
};

function primaryGradeFromLevel(levelName: string): 1 | PrimaryGradeId | null {
  const trimmed = String(levelName || '').trim();
  if (trimmed === LOP1_LEVEL) return 1;
  for (const grade of [2, 3, 4, 5] as const) {
    if (PRIMARY_GRADE_SPECS[grade].levelName === trimmed) return grade;
  }
  return null;
}

function loadPrimaryUnit(grade: 1 | PrimaryGradeId, unit: number) {
  if (grade === 1) return getLop1UnitVocab(unit);
  return PRIMARY_GRADE_SPECS[grade].getVocab(unit);
}

function imagePathFor(grade: 1 | PrimaryGradeId, unit: number, word: string): string {
  if (grade === 1) return lop1VocabImagePath(unit, word);
  if (grade === 2) return lop2VocabImagePath(unit, word);
  if (grade === 3) return lop3VocabImagePath(unit, word);
  if (grade === 4) return lop4VocabImagePath(unit, word);
  return lop5VocabImagePath(unit, word);
}

export function getPrimaryCourseVocabDeck(input: {
  levelName: string;
  courseName: string;
}): CourseVocabCard[] | null {
  const grade = primaryGradeFromLevel(input.levelName);
  if (!grade) return null;
  const unit = parseUnitNumber(input.courseName);
  if (!unit) return null;

  try {
    const vocab = loadPrimaryUnit(grade, unit);
    return vocab.words.map((item) => ({
      word: item.word,
      meaning: item.hint,
      ipa: item.ipa || '',
      imageUrl: imagePathFor(grade, unit, item.word),
      audioUrl:
        resolvePrimaryVocabAudioUrl({
          levelName: input.levelName,
          unit,
          word: item.word,
        }) || undefined,
      layout: 'primary' as const,
    }));
  } catch {
    return null;
  }
}

export function resolveCourseVocabDeck(input: {
  id: string;
  name: string;
  levelName: string;
}): CourseVocabCard[] | null {
  const logistics = getLogisticsVocabDeck(input.id);
  if (logistics?.length) {
    return logistics.map((card) => ({
      word: card.word,
      meaning: card.meaning,
      example: card.example,
      icon: card.icon,
      accent: card.accent,
      audioUrl: resolveVocabAudioUrl(card.word) || undefined,
      layout: 'logistics' as const,
    }));
  }
  return getPrimaryCourseVocabDeck({
    levelName: input.levelName,
    courseName: input.name,
  });
}
