/**
 * Seed / import / image config for Global Success primary grades 2, 3, 4, 5.
 */
import { LOP2_UNIT_VOCAB } from './lop2Vocab';
import { LOP3_UNIT_VOCAB } from './lop3Vocab';
import { LOP4_UNIT_COUNT, LOP4_UNIT_TITLES, LOP4_UNIT_VOCAB } from './lop4Vocab';
import { LOP5_UNIT_TITLES, LOP5_UNIT_VOCAB } from './lop5Vocab';
import type { PrimaryUnitVocab } from './primaryGradeConfig';

export type PrimaryGradeId = 2 | 3 | 4 | 5;

export type PrimaryGradeSpec = {
  grade: PrimaryGradeId;
  levelName: string;
  unitCount: number;
  gsPrefix: string;
  imagesDir: string;
  ebookHints: string[];
  titles: Record<number, string>;
  getVocab: (unit: number) => PrimaryUnitVocab;
};

function titlesFromVocab(vocab: Record<number, { title: string }>): Record<number, string> {
  const out: Record<number, string> = {};
  for (const [k, v] of Object.entries(vocab)) {
    out[Number(k)] = v.title;
  }
  return out;
}

export const PRIMARY_GRADE_SPECS: Record<PrimaryGradeId, PrimaryGradeSpec> = {
  2: {
    grade: 2,
    levelName: 'Lớp 2',
    unitCount: 16,
    gsPrefix: 'GS2',
    imagesDir: '/images/courses/lop2',
    ebookHints: ['Global success 2', 'Global Success 2'],
    titles: titlesFromVocab(LOP2_UNIT_VOCAB),
    getVocab: (unit) => {
      const v = LOP2_UNIT_VOCAB[unit];
      if (!v) throw new Error(`Unknown Lớp 2 unit ${unit}`);
      return v;
    },
  },
  3: {
    grade: 3,
    levelName: 'Lớp 3',
    unitCount: 20,
    gsPrefix: 'GS3',
    imagesDir: '/images/courses/lop3',
    ebookHints: ['Global success 3', 'Global Success 3'],
    titles: titlesFromVocab(LOP3_UNIT_VOCAB),
    getVocab: (unit) => {
      const v = LOP3_UNIT_VOCAB[unit];
      if (!v) throw new Error(`Unknown Lớp 3 unit ${unit}`);
      return v;
    },
  },
  4: {
    grade: 4,
    levelName: 'Lớp 4',
    unitCount: LOP4_UNIT_COUNT,
    gsPrefix: 'GS4',
    imagesDir: '/images/courses/lop4',
    ebookHints: ['Global success 4', 'Global Success 4'],
    titles: { ...LOP4_UNIT_TITLES },
    getVocab: (unit) => {
      const v = LOP4_UNIT_VOCAB[unit];
      if (!v) throw new Error(`Unknown Lớp 4 unit ${unit}`);
      return v;
    },
  },
  5: {
    grade: 5,
    levelName: 'Lớp 5',
    unitCount: 20,
    gsPrefix: 'GS5',
    imagesDir: '/images/courses/lop5',
    ebookHints: ['Global success 5', 'Global Success 5'],
    titles: LOP5_UNIT_TITLES,
    getVocab: (unit) => {
      const v = LOP5_UNIT_VOCAB[unit];
      if (!v) throw new Error(`Unknown Lớp 5 unit ${unit}`);
      return v;
    },
  },
};

export function parsePrimaryGradeArg(argv: string[]): PrimaryGradeId[] {
  const raw = argv.find((a) => a.startsWith('--grade='))?.slice('--grade='.length);
  if (!raw || raw === 'all') return [2, 3, 4, 5];
  const grades = raw.split(',').map((s) => Number(s.trim())) as PrimaryGradeId[];
  for (const g of grades) {
    if (![2, 3, 4, 5].includes(g)) throw new Error(`Unsupported grade: ${g}`);
  }
  return grades;
}
