import { GAME_CATALOG } from '@/lib/gameCatalog';
import { progressCourseKey, scoreLookupCourseKeys } from '@/lib/courseKey';
import { SKILL_CATALOG, type SkillId, isSkillId } from '@/lib/skillCatalog';
import { formatVnDateTime } from '@/lib/vnDateTime';

export type ExperienceGrantSnapshot = {
  correctCount: number;
  answeredCount: number;
  createdAt: Date;
};

export type AssignmentProgressRow = {
  status: 'done' | 'pending';
  statusLabel: 'Đã làm' | 'Chưa làm';
  correctCount: number | null;
  totalQuestions: number;
  correctDisplay: string;
  scoreOutOf10: number | null;
  scoreDisplay: string;
  attemptCount: number;
  submittedAt: Date | null;
  submittedAtDisplay: string;
  isLate: boolean | null;
};

export function gameLabelForKey(gameKey: string): string {
  return GAME_CATALOG.find((game) => game.key === gameKey)?.label || gameKey;
}

export function gameSlugForKey(gameKey: string): string | null {
  return GAME_CATALOG.find((game) => game.key === gameKey)?.slug || null;
}

export function skillLabelForId(skillId: string | null | undefined): string | null {
  if (!skillId || !isSkillId(skillId)) return null;
  return SKILL_CATALOG.find((skill) => skill.id === skillId)?.shortLabel || skillId;
}

export function assignmentDisplayTitle(params: {
  courseName: string;
  gameLabel: string;
  skillLabel?: string | null;
}): string {
  const skill = String(params.skillLabel || '').trim();
  if (skill) return `${params.courseName} → ${skill} · ${params.gameLabel}`;
  return `${params.courseName} → ${params.gameLabel}`;
}

export function homeworkPlayHref(params: {
  courseId: string;
  gameKey: string;
  skillId?: string | null;
}): string | null {
  const slug = gameSlugForKey(params.gameKey);
  if (!slug) return null;
  const base = `/games/${slug}/${params.courseId}`;
  if (params.skillId && isSkillId(params.skillId)) {
    return `${base}?skill=${params.skillId as SkillId}`;
  }
  return base;
}

export function scoreOutOf10(correctCount: number, totalQuestions: number): number {
  if (totalQuestions <= 0) return 0;
  return Math.round((correctCount / totalQuestions) * 100) / 10;
}

/** Highest score attempt: max correctCount, then earliest createdAt. */
export function pickBestGrant(
  grants: ExperienceGrantSnapshot[]
): ExperienceGrantSnapshot | null {
  if (!grants.length) return null;
  return [...grants].sort((a, b) => {
    if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount;
    return a.createdAt.getTime() - b.createdAt.getTime();
  })[0];
}

/** First completion time for late/on-time coloring. */
export function firstSubmissionAt(grants: ExperienceGrantSnapshot[]): Date | null {
  if (!grants.length) return null;
  return [...grants].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0]
    .createdAt;
}

export function computeAssignmentProgress(params: {
  grants: ExperienceGrantSnapshot[];
  totalQuestions: number;
  deadlineAt: Date;
}): AssignmentProgressRow {
  const attemptCount = params.grants.length;
  const best = pickBestGrant(params.grants);
  const submittedAt = firstSubmissionAt(params.grants);
  const totalQuestions = Math.max(0, params.totalQuestions);

  if (!best || !submittedAt) {
    return {
      status: 'pending',
      statusLabel: 'Chưa làm',
      correctCount: null,
      totalQuestions,
      correctDisplay: '—',
      scoreOutOf10: null,
      scoreDisplay: '—',
      attemptCount: 0,
      submittedAt: null,
      submittedAtDisplay: '—',
      isLate: null,
    };
  }

  const correctCount = best.correctCount;
  const score = scoreOutOf10(correctCount, totalQuestions || best.answeredCount || 1);
  const denom = totalQuestions > 0 ? totalQuestions : best.answeredCount;
  const isLate = submittedAt.getTime() > params.deadlineAt.getTime();

  return {
    status: 'done',
    statusLabel: 'Đã làm',
    correctCount,
    totalQuestions: denom,
    correctDisplay: `${correctCount}/${denom}`,
    scoreOutOf10: score,
    scoreDisplay: Number.isInteger(score) ? String(score) : score.toFixed(1),
    attemptCount,
    submittedAt,
    submittedAtDisplay: formatVnDateTime(submittedAt),
    isLate,
  };
}

export function courseKeysForAssignment(courseName: string, levelName: string): string[] {
  return scoreLookupCourseKeys(courseName, levelName);
}

export function progressKeyForAssignment(courseName: string, levelName: string): string {
  return progressCourseKey(courseName, levelName);
}
