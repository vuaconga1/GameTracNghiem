import { z } from 'zod';

import type { SpeakingActivityType } from '@/lib/speaking/config';

export const SPEAKING_DRILL_GAME = 'speaking_drill';

export const SPEAKING_DRILL_KINDS = ['word', 'sentence', 'guided'] as const;
export type SpeakingDrillKind = (typeof SPEAKING_DRILL_KINDS)[number];
export type SpeakingDrillActivityType = Exclude<
  SpeakingActivityType,
  'REALTIME_CONVERSATION'
>;

const text = z.string().trim().min(1).max(1_000);
const shortText = z.string().trim().min(1).max(300);
const stringList = z.array(shortText).max(20).default([]);

export const speakingDrillReferenceSchema = z
  .object({
    text: z.string().trim().max(1_000).optional(),
    audioUrl: z.string().trim().url().max(2_000).optional(),
    imageUrl: z.string().trim().url().max(2_000).optional(),
  })
  .strict();

const sharedFields = {
  acceptedAnswers: stringList,
  sampleAnswers: stringList,
  keywords: stringList,
  hints: stringList,
  reference: speakingDrillReferenceSchema.optional(),
};

export const wordDrillPayloadSchema = z
  .object({
    kind: z.literal('word'),
    targetText: shortText,
    ...sharedFields,
  })
  .strict();

export const sentenceDrillPayloadSchema = z
  .object({
    kind: z.literal('sentence'),
    targetText: text,
    ...sharedFields,
  })
  .strict();

export const guidedDrillPayloadSchema = z
  .object({
    kind: z.literal('guided'),
    questionText: text,
    ...sharedFields,
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      value.acceptedAnswers.length === 0 &&
      value.sampleAnswers.length === 0 &&
      value.keywords.length === 0
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['sampleAnswers'],
        message:
          'Guided answer needs an accepted answer, sample answer, or keyword',
      });
    }
  });

export const speakingDrillPayloadSchema = z.discriminatedUnion('kind', [
  wordDrillPayloadSchema,
  sentenceDrillPayloadSchema,
  guidedDrillPayloadSchema,
]);

export type WordDrillPayload = z.output<typeof wordDrillPayloadSchema>;
export type SentenceDrillPayload = z.output<
  typeof sentenceDrillPayloadSchema
>;
export type GuidedDrillPayload = z.output<typeof guidedDrillPayloadSchema>;
export type SpeakingDrillPayload = z.output<
  typeof speakingDrillPayloadSchema
>;

export const guidedAssessmentSchema = z
  .object({
    score: z.number().int().min(0).max(100),
    relevanceScore: z.number().int().min(0).max(100),
    completenessScore: z.number().int().min(0).max(100),
    languageScore: z.number().int().min(0).max(100),
    praise: z.string().trim().min(1).max(280),
    improvement: z.string().trim().min(1).max(280),
  })
  .strict();

export type GuidedAssessment = z.output<typeof guidedAssessmentSchema>;

const KIND_TO_ACTIVITY: Record<
  SpeakingDrillKind,
  SpeakingDrillActivityType
> = {
  word: 'WORD_PRONUNCIATION',
  sentence: 'SENTENCE_READING',
  guided: 'GUIDED_ANSWER',
};

export function activityForDrillKind(
  kind: SpeakingDrillKind,
): SpeakingDrillActivityType {
  return KIND_TO_ACTIVITY[kind];
}

export function isSpeakingDrillActivityType(
  value: unknown,
): value is SpeakingDrillActivityType {
  return (
    value === 'WORD_PRONUNCIATION' ||
    value === 'SENTENCE_READING' ||
    value === 'GUIDED_ANSWER'
  );
}

export function parseSpeakingDrillPayload(
  payload: unknown,
  activityType?: SpeakingDrillActivityType,
): SpeakingDrillPayload {
  const parsed = speakingDrillPayloadSchema.parse(payload);
  if (
    activityType !== undefined &&
    activityForDrillKind(parsed.kind) !== activityType
  ) {
    throw new Error('Speaking drill kind does not match activity type');
  }
  return parsed;
}

export type StudentSpeakingDrill = {
  id: string;
  kind: SpeakingDrillKind;
  targetText?: string;
  questionText?: string;
  sampleAnswers: string[];
  hints: string[];
  reference?: z.output<typeof speakingDrillReferenceSchema>;
};

/** Keep author-only accepted answers and keywords out of student content. */
export function toStudentSpeakingDrill(
  id: string,
  payload: SpeakingDrillPayload,
): StudentSpeakingDrill {
  return {
    id,
    kind: payload.kind,
    ...('targetText' in payload ? { targetText: payload.targetText } : {}),
    ...('questionText' in payload
      ? { questionText: payload.questionText }
      : {}),
    sampleAnswers: payload.sampleAnswers,
    hints: payload.hints,
    ...(payload.reference ? { reference: payload.reference } : {}),
  };
}
