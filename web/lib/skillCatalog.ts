import { ALL_GAME_KEYS, GAME_CATALOG } from '@/lib/gameCatalog';

export const SKILL_IDS = [
  'listening',
  'reading',
  'speaking',
  'writing',
  'vocabulary',
] as const;

export type SkillId = (typeof SKILL_IDS)[number];

/** Scalar for exclusive games; `quiz` may be `SkillId[]` for multi-skill. */
export type GameSkillAssignment = SkillId | SkillId[] | null;

export type GameSkillsMap = Record<string, GameSkillAssignment>;

export type SkillCatalogItem = {
  id: SkillId;
  /** Student card title, e.g. "Luyện kỹ năng nghe" */
  label: string;
  /** Admin select short label */
  shortLabel: string;
  icon: string;
  iconClass: string;
};

export const SKILL_CATALOG: SkillCatalogItem[] = [
  {
    id: 'listening',
    label: 'Luyện kỹ năng nghe',
    shortLabel: 'Nghe',
    icon: 'fas fa-headphones',
    iconClass: 'skill-listening',
  },
  {
    id: 'reading',
    label: 'Luyện kỹ năng đọc',
    shortLabel: 'Đọc',
    icon: 'fas fa-book-reader',
    iconClass: 'skill-reading',
  },
  {
    id: 'speaking',
    label: 'Luyện kỹ năng nói',
    shortLabel: 'Nói',
    icon: 'fas fa-microphone',
    iconClass: 'skill-speaking',
  },
  {
    id: 'writing',
    label: 'Luyện kỹ năng viết',
    shortLabel: 'Viết',
    icon: 'fas fa-pen',
    iconClass: 'skill-writing',
  },
  {
    id: 'vocabulary',
    label: 'Luyện từ vựng',
    shortLabel: 'Từ vựng',
    icon: 'fas fa-spell-check',
    iconClass: 'skill-vocabulary',
  },
];

/**
 * Default convention for migration / empty courses.
 * Listening has no default games (pronunciation stays exclusive to speaking).
 * Quiz defaults to vocabulary (may be multi-assigned later in admin).
 * Scramble → vocabulary; look_and_write omitted (hidden until admin assigns).
 */
export const DEFAULT_GAME_SKILL_MAP: Readonly<Record<string, SkillId>> = {
  read_and_complete: 'reading',
  read_and_match: 'reading',
  vocabulary_check: 'reading',
  choose_and_circle: 'reading',
  word_match: 'reading',
  vocabulary_test: 'reading',
  quiz: 'vocabulary',
  pronunciation: 'speaking',
  grammar: 'writing',
  scramble: 'vocabulary',
};

/** Games that may be assigned to multiple skills. Others stay exclusive (max one). */
export const MULTI_SKILL_GAME_KEYS = new Set<string>(['quiz', 'choose_and_circle']);

const SKILL_ID_SET = new Set<string>(SKILL_IDS);
const GAME_KEY_SET = new Set(ALL_GAME_KEYS);

export function isSkillId(value: unknown): value is SkillId {
  return typeof value === 'string' && SKILL_ID_SET.has(value);
}

export function parseSkillQuery(value: string | null | undefined): SkillId | null {
  if (!value) return null;
  return isSkillId(value) ? value : null;
}

/** Normalize assignment to ordered unique skill ids (empty = hidden). */
export function skillsForGame(assignment: GameSkillAssignment | undefined): SkillId[] {
  if (assignment == null) return [];
  if (Array.isArray(assignment)) {
    const seen = new Set<SkillId>();
    for (const item of assignment) {
      if (isSkillId(item)) seen.add(item);
    }
    return SKILL_IDS.filter((id) => seen.has(id));
  }
  return isSkillId(assignment) ? [assignment] : [];
}

export function gameAssignedToSkill(
  assignment: GameSkillAssignment | undefined,
  skillId: SkillId
): boolean {
  return skillsForGame(assignment).includes(skillId);
}

/** Empty / null enabledSkills → all five skills on. */
export function resolveEnabledSkillIds(
  enabledSkills: string[] | null | undefined
): SkillId[] {
  if (!enabledSkills || enabledSkills.length === 0) return [...SKILL_IDS];
  const seen = new Set<SkillId>();
  for (const raw of enabledSkills) {
    if (isSkillId(raw)) seen.add(raw);
  }
  return seen.size === 0 ? [...SKILL_IDS] : SKILL_IDS.filter((id) => seen.has(id));
}

export function normalizeEnabledSkillsInput(value: unknown): SkillId[] | null {
  if (!Array.isArray(value)) return null;
  const seen = new Set<SkillId>();
  for (const item of value) {
    const key = String(item || '').trim();
    if (isSkillId(key)) seen.add(key);
  }
  return SKILL_IDS.filter((id) => seen.has(id));
}

/**
 * Compact storage: null / single SkillId / SkillId[] (multi only when length > 1).
 */
export function compactSkillAssignment(
  skills: SkillId[],
  allowMulti: boolean
): GameSkillAssignment {
  if (skills.length === 0) return null;
  if (!allowMulti || skills.length === 1) return skills[0]!;
  return skills;
}

/**
 * Build gameSkills from legacy enabledGames using the approved convention.
 * - Non-empty enabledGames: only those keys get a skill; others omitted (hidden).
 * - Empty enabledGames: all catalog games that have a default skill.
 */
export function buildGameSkillsFromEnabledGames(
  enabledGames: string[] | null | undefined
): GameSkillsMap {
  const restrict =
    enabledGames && enabledGames.length > 0
      ? new Set(enabledGames.filter((key) => GAME_KEY_SET.has(key)))
      : null;

  const map: GameSkillsMap = {};
  for (const key of ALL_GAME_KEYS) {
    if (restrict && !restrict.has(key)) continue;
    const skill = DEFAULT_GAME_SKILL_MAP[key];
    if (skill) map[key] = skill;
  }
  return map;
}

/**
 * Move quiz:reading → vocabulary. Ensures vocabulary is enabled when
 * the previous enabledSkills list was the full legacy set (or already complete).
 */
export function migrateQuizReadingToVocabulary(
  gameSkills: GameSkillsMap,
  enabledSkills: string[] | null | undefined
): { gameSkills: GameSkillsMap; enabledSkills: SkillId[] } {
  const nextMap = { ...gameSkills };
  const quizSkills = skillsForGame(nextMap.quiz);
  const movedQuiz = quizSkills.includes('reading');
  if (movedQuiz) {
    const withoutReading = quizSkills.filter((id) => id !== 'reading');
    const nextSkills: SkillId[] = withoutReading.includes('vocabulary')
      ? withoutReading
      : [...withoutReading, 'vocabulary'];
    nextMap.quiz = compactSkillAssignment(nextSkills, true);
  }

  const previous = resolveEnabledSkillIds(enabledSkills);
  const hadFullLegacyFour =
    previous.length === 4 &&
    previous.includes('listening') &&
    previous.includes('reading') &&
    previous.includes('speaking') &&
    previous.includes('writing') &&
    !previous.includes('vocabulary');

  const set = new Set(previous);
  if (movedQuiz || hadFullLegacyFour) set.add('vocabulary');

  return {
    gameSkills: nextMap,
    enabledSkills: SKILL_IDS.filter((id) => set.has(id)),
  };
}

function parseAssignmentValue(
  rawSkill: unknown,
  allowMulti: boolean
): { ok: true; value: GameSkillAssignment } | { ok: false } {
  if (rawSkill === null || rawSkill === undefined || rawSkill === '' || rawSkill === 'hidden') {
    return { ok: true, value: null };
  }
  if (Array.isArray(rawSkill)) {
    if (allowMulti) {
      const skills = skillsForGame(rawSkill as SkillId[]);
      return { ok: true, value: compactSkillAssignment(skills, true) };
    }
    for (const item of rawSkill) {
      if (isSkillId(item)) return { ok: true, value: item };
    }
    return { ok: true, value: null };
  }
  if (isSkillId(rawSkill)) {
    return { ok: true, value: rawSkill };
  }
  return { ok: false };
}

/** Parse stored JSON into a clean map (invalid keys/skills dropped). */
export function normalizeGameSkillsMap(value: unknown): GameSkillsMap {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const map: GameSkillsMap = {};
  for (const [rawKey, rawSkill] of Object.entries(value as Record<string, unknown>)) {
    const key = String(rawKey || '').trim();
    if (!GAME_KEY_SET.has(key)) continue;
    const allowMulti = MULTI_SKILL_GAME_KEYS.has(key);
    const parsed = parseAssignmentValue(rawSkill, allowMulti);
    if (!parsed.ok) continue;
    map[key] = parsed.value;
  }
  return map;
}

/**
 * Normalize PATCH body for gameSkills.
 * Exclusive games: at most one skill. Quiz may be SkillId[].
 * Returns null if input is not a plain object.
 */
export function normalizeGameSkillsInput(value: unknown): GameSkillsMap | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return normalizeGameSkillsMap(value);
}

/**
 * Resolve effective gameSkills for a course.
 * If stored map is missing/empty, seed from enabledGames convention (read-time fallback).
 */
export function resolveGameSkillsMap(
  gameSkills: unknown,
  enabledGames?: string[] | null
): GameSkillsMap {
  const normalized = normalizeGameSkillsMap(gameSkills);
  if (Object.keys(normalized).length > 0) return normalized;
  return buildGameSkillsFromEnabledGames(enabledGames);
}

/** Games assigned to a skill (ignores whether the skill is enabled). */
export function gameKeysForSkill(gameSkills: GameSkillsMap, skillId: SkillId): string[] {
  return ALL_GAME_KEYS.filter((key) => gameAssignedToSkill(gameSkills[key], skillId));
}

/**
 * Student-visible game keys: assigned to a skill whose skill id is enabled.
 */
export function resolveVisibleGameKeys(
  gameSkills: unknown,
  enabledSkills: string[] | null | undefined,
  enabledGamesFallback?: string[] | null
): string[] {
  const skills = new Set(resolveEnabledSkillIds(enabledSkills));
  const map = resolveGameSkillsMap(gameSkills, enabledGamesFallback);
  return ALL_GAME_KEYS.filter((key) => {
    const assigned = skillsForGame(map[key]);
    return assigned.some((skill) => skills.has(skill));
  });
}

export function isGameVisibleForCourse(
  gameSkills: unknown,
  enabledSkills: string[] | null | undefined,
  gameKey: string,
  enabledGamesFallback?: string[] | null
): boolean {
  return resolveVisibleGameKeys(gameSkills, enabledSkills, enabledGamesFallback).includes(
    gameKey
  );
}

export function visibleSkillsForCourse(
  enabledSkills: string[] | null | undefined
): SkillCatalogItem[] {
  const enabled = new Set(resolveEnabledSkillIds(enabledSkills));
  return SKILL_CATALOG.filter((skill) => enabled.has(skill.id));
}

export function gamesForSkillOnCourse(
  gameSkills: unknown,
  enabledSkills: string[] | null | undefined,
  skillId: SkillId,
  enabledGamesFallback?: string[] | null
) {
  const enabled = new Set(resolveEnabledSkillIds(enabledSkills));
  if (!enabled.has(skillId)) return [];
  const map = resolveGameSkillsMap(gameSkills, enabledGamesFallback);
  const keys = new Set(gameKeysForSkill(map, skillId));
  return GAME_CATALOG.filter((game) => keys.has(game.key));
}

/** Derive legacy enabledGames from skill assignment (for back-compat writes). */
export function deriveEnabledGamesFromSkills(
  gameSkills: unknown,
  enabledSkills: string[] | null | undefined,
  enabledGamesFallback?: string[] | null
): string[] {
  return resolveVisibleGameKeys(gameSkills, enabledSkills, enabledGamesFallback);
}
