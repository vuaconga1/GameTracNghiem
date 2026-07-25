import { parseGradeFromLevelName } from '@/lib/tts/getTtsSpeedByGrade';

/** Opening turn when the Realtime data channel opens. */
export const SPEAKING_OPENING_INSTRUCTIONS =
  'Greet the student warmly in English, introduce the topic in one short sentence, and ask your first simple question to start our conversation. Follow the session voice and vocabulary rules for this student\'s grade.';

const SHARED_LANGUAGE_LINES = [
  'The student practices spoken English only. Reply in clear, simple English.',
  'Ignore non-English filler noise; keep the conversation in English.',
];

const PACE_GRADES_1_TO_5 = [
  ...SHARED_LANGUAGE_LINES,
  'VOICE DIRECTIVE: You MUST speak EXTREMELY SLOWLY and EXTREMELY CLEARLY. Pause clearly between words and between sentences. Do not speak at a native conversational speed. Keep each sentence short; prioritize understanding over saying a lot.',
];

const PACE_GRADES_6_TO_9 = [
  ...SHARED_LANGUAGE_LINES,
  'VOICE DIRECTIVE: You MUST speak SLOWLY and CLEARLY, but a LITTLE faster than the pace for younger (grades 1–5) learners — only a little. Still pause lightly between sentences and articulate every word clearly. Still do NOT speak at normal native conversational speed.',
];

type GradeBand = 'grades_1_5' | 'grades_6_9';

function gradeBand(grade: number): GradeBand {
  const g = Math.trunc(grade);
  if (g >= 1 && g <= 5) return 'grades_1_5';
  return 'grades_6_9';
}

function cefrForGrade(grade: number): string {
  return gradeBand(grade) === 'grades_1_5' ? 'Pre-A1 to low A1' : 'A1–A2';
}

function ageRangeForGrade(grade: number): string {
  return gradeBand(grade) === 'grades_1_5' ? 'aged 6–10' : 'aged 10–14';
}

function ordinalGrade(grade: number): string {
  const g = Math.trunc(grade);
  if (g === 1) return '1st';
  if (g === 2) return '2nd';
  if (g === 3) return '3rd';
  return `${g}th`;
}

function resolveGrade(input: {
  grade?: number | null;
  levelName?: string | null;
}): number {
  if (input.grade != null && Number.isFinite(input.grade)) {
    return Math.trunc(Number(input.grade));
  }
  return parseGradeFromLevelName(input.levelName) ?? 8;
}

/**
 * Default per-topic conversation prompt.
 * `[topicTitle]` is filled from SpeakingTopic.title.
 */
export function buildDefaultTopicInstructions(input: {
  topicTitle: string;
  grade?: number | null;
  levelName?: string | null;
}): string {
  const grade = resolveGrade(input);
  const title = String(input.topicTitle || 'this unit topic').trim() || 'this unit topic';
  const cefr = cefrForGrade(grade);
  const ages = ageRangeForGrade(grade);
  const levelLabel = `${ordinalGrade(grade)}-grade student (${cefr})`;
  const band = gradeBand(grade);

  const vocabLine =
    band === 'grades_1_5'
      ? `Use only extremely easy everyday vocabulary (family, school, food, colors, animals, play…). Short sentences and simple structures only (I like… / Do you like…? / What is…?). Avoid hard words, idioms, slang, and long or complex sentences.`
      : `Use simple ${cefr} vocabulary familiar to international English learners ${ages}. Sentences may be a little longer than for younger learners, but stay clear and easy. Avoid hard slang, complex idioms, and advanced academic words.`;

  return `You are a friendly English conversational partner for a Vietnamese ${levelLabel}, aligned with international English programs for learners ${ages}.
Your goal is to have a natural back-and-forth chat about: ${title}.

CRITICAL RULES:
1. NEVER ask the student to "repeat after you". This is a conversation, not a pronunciation drill.
2. Interaction loop: Ask ONE simple open-ended question -> Wait for the student's answer -> Give very brief feedback -> Ask the next question.
3. Keep your turns extremely short (1-2 sentences maximum).
4. ${vocabLine} Gently correct major mistakes, but prioritize keeping the chat flowing.`;
}

/** @deprecated Prefer buildDefaultTopicInstructions({ topicTitle, levelName }). */
export const SPEAKING_TOPIC_INSTRUCTIONS = buildDefaultTopicInstructions({
  topicTitle: 'Unit conversation practice',
  grade: 8,
});

/** Pace/system lines (Realtime has no TTS speed param — encode voice in prompt). */
export function getSpeakingPaceLinesByGrade(grade?: number | null): string[] {
  const resolved =
    grade != null && Number.isFinite(grade) ? Math.trunc(Number(grade)) : 8;
  return gradeBand(resolved) === 'grades_1_5'
    ? [...PACE_GRADES_1_TO_5]
    : [...PACE_GRADES_6_TO_9];
}

/**
 * Full Realtime session instructions.
 * Uses DB topic instructions when present; otherwise builds from title + grade.
 */
export function buildSpeakingRealtimeInstructions(input: {
  topicInstructions: string;
  topicTitle?: string | null;
  grade?: number | null;
  levelName?: string | null;
}): string {
  const grade = resolveGrade(input);

  const fromDb = String(input.topicInstructions || '').trim();
  const topicBlock =
    fromDb ||
    buildDefaultTopicInstructions({
      topicTitle: input.topicTitle || 'this unit topic',
      grade,
      levelName: input.levelName,
    });

  const pace = getSpeakingPaceLinesByGrade(grade);
  return [topicBlock, '', ...pace].filter(Boolean).join('\n');
}
