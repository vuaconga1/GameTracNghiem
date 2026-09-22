import { prisma } from '@/lib/db';
import {
  computeAssignmentProgress,
  courseKeysForAssignment,
  type ExperienceGrantSnapshot,
} from '@/lib/classHomework';
import { notArchived } from '@/lib/admin/notArchived';

type MemberUser = {
  id: string;
  displayName: string;
  username: string;
};

type AssignmentRow = {
  id: string;
  courseId: string;
  gameKey: string;
  skillId: string | null;
  levelName: string;
  courseName: string;
  gameLabel: string;
  skillLabel: string | null;
  deadlineAt: Date;
  createdAt: Date;
};

export async function loadClassProgress(classId: string) {
  const [members, assignments] = await Promise.all([
    prisma.classMember.findMany({
      where: { classId, user: notArchived },
      include: {
        user: {
          select: { id: true, displayName: true, username: true },
        },
      },
      orderBy: { user: { displayName: 'asc' } },
    }),
    prisma.classAssignment.findMany({
      where: { classId },
      orderBy: [{ deadlineAt: 'asc' }, { createdAt: 'asc' }],
    }),
  ]);

  const memberUsers: MemberUser[] = members.map((m) => m.user);
  const assignmentRows: AssignmentRow[] = assignments;

  if (!memberUsers.length || !assignmentRows.length) {
    return {
      members: memberUsers,
      assignments: assignmentRows.map((a) => ({
        ...a,
        deadlineAt: a.deadlineAt.toISOString(),
        createdAt: a.createdAt.toISOString(),
        rows: [] as ReturnType<typeof buildEmptyRows>,
      })),
    };
  }

  const userIds = memberUsers.map((u) => u.id);
  const courseIds = [...new Set(assignmentRows.map((a) => a.courseId))];

  const questionCounts = await prisma.question.groupBy({
    by: ['courseId', 'game'],
    where: {
      courseId: { in: courseIds },
      active: true,
      archivedAt: null,
    },
    _count: { _all: true },
  });

  const questionCountMap = new Map<string, number>();
  for (const row of questionCounts) {
    questionCountMap.set(`${row.courseId}|${row.game}`, row._count._all);
  }

  const courseKeySet = new Set<string>();
  for (const assignment of assignmentRows) {
    for (const key of courseKeysForAssignment(assignment.courseName, assignment.levelName)) {
      courseKeySet.add(key);
    }
  }

  const grants = await prisma.experienceGrant.findMany({
    where: {
      userId: { in: userIds },
      course: { in: [...courseKeySet] },
      game: { in: [...new Set(assignmentRows.map((a) => a.gameKey))] },
    },
    select: {
      userId: true,
      course: true,
      game: true,
      correctCount: true,
      answeredCount: true,
      createdAt: true,
    },
  });

  const grantsByUserGame = new Map<string, ExperienceGrantSnapshot[]>();
  for (const grant of grants) {
    for (const assignment of assignmentRows) {
      if (grant.game !== assignment.gameKey) continue;
      const keys = courseKeysForAssignment(assignment.courseName, assignment.levelName);
      if (!keys.includes(grant.course)) continue;
      const mapKey = `${grant.userId}|${assignment.id}`;
      const list = grantsByUserGame.get(mapKey) || [];
      list.push({
        correctCount: grant.correctCount,
        answeredCount: grant.answeredCount,
        createdAt: grant.createdAt,
      });
      grantsByUserGame.set(mapKey, list);
    }
  }

  return {
    members: memberUsers,
    assignments: assignmentRows.map((assignment) => {
      const totalQuestions =
        questionCountMap.get(`${assignment.courseId}|${assignment.gameKey}`) || 0;
      return {
        id: assignment.id,
        courseId: assignment.courseId,
        gameKey: assignment.gameKey,
        skillId: assignment.skillId,
        levelName: assignment.levelName,
        courseName: assignment.courseName,
        gameLabel: assignment.gameLabel,
        skillLabel: assignment.skillLabel,
        deadlineAt: assignment.deadlineAt.toISOString(),
        createdAt: assignment.createdAt.toISOString(),
        totalQuestions,
        rows: memberUsers.map((user) => {
          const progress = computeAssignmentProgress({
            grants: grantsByUserGame.get(`${user.id}|${assignment.id}`) || [],
            totalQuestions,
            deadlineAt: assignment.deadlineAt,
          });
          return {
            userId: user.id,
            displayName: user.displayName,
            username: user.username,
            ...progress,
            submittedAt: progress.submittedAt?.toISOString() ?? null,
          };
        }),
      };
    }),
  };
}

function buildEmptyRows() {
  return [] as Array<{
    userId: string;
    displayName: string;
    username: string;
  }>;
}
