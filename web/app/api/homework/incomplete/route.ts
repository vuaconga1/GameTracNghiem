import { NextResponse } from 'next/server';

import { publicApiErrorMessage, requireSession } from '@/lib/auth';
import { notArchived } from '@/lib/admin/notArchived';
import {
  assignmentDisplayTitle,
  computeAssignmentProgress,
  courseKeysForAssignment,
  homeworkPlayHref,
  type ExperienceGrantSnapshot,
} from '@/lib/classHomework';
import { formatVnDateTime } from '@/lib/vnDateTime';
import { prisma } from '@/lib/db';
import { isStudentAccountRole, normalizeUserRole } from '@/lib/userRoles';

function errorResponse(err: unknown) {
  const status =
    typeof err === 'object' && err !== null && 'status' in err && typeof err.status === 'number'
      ? err.status
      : 500;
  return NextResponse.json(
    { success: false, message: publicApiErrorMessage(err) },
    { status }
  );
}

/** Incomplete homework for the logged-in student across all classes. */
export async function GET() {
  try {
    const session = await requireSession();
    if (!isStudentAccountRole(normalizeUserRole(session.role))) {
      return NextResponse.json({ success: true, items: [], count: 0 });
    }

    const memberships = await prisma.classMember.findMany({
      where: { userId: session.userId },
      select: {
        classId: true,
        class: { select: { id: true, name: true } },
      },
    });

    if (!memberships.length) {
      return NextResponse.json({ success: true, items: [], count: 0 });
    }

    const classIds = memberships.map((m) => m.classId);
    const assignments = await prisma.classAssignment.findMany({
      where: { classId: { in: classIds }, course: notArchived },
      orderBy: [{ deadlineAt: 'asc' }, { createdAt: 'asc' }],
    });

    if (!assignments.length) {
      return NextResponse.json({ success: true, items: [], count: 0 });
    }

    const courseKeySet = new Set<string>();
    for (const a of assignments) {
      for (const key of courseKeysForAssignment(a.courseName, a.levelName)) {
        courseKeySet.add(key);
      }
    }

    const grants = await prisma.experienceGrant.findMany({
      where: {
        userId: session.userId,
        course: { in: [...courseKeySet] },
        game: { in: [...new Set(assignments.map((a) => a.gameKey))] },
      },
      select: {
        course: true,
        game: true,
        correctCount: true,
        answeredCount: true,
        createdAt: true,
      },
    });

    const questionCounts = await prisma.question.groupBy({
      by: ['courseId', 'game'],
      where: {
        courseId: { in: [...new Set(assignments.map((a) => a.courseId))] },
        active: true,
        archivedAt: null,
      },
      _count: { _all: true },
    });
    const questionCountMap = new Map(
      questionCounts.map((row) => [`${row.courseId}|${row.game}`, row._count._all])
    );

    const classNameById = new Map(memberships.map((m) => [m.classId, m.class.name]));

    const incomplete = [];
    for (const assignment of assignments) {
      const keys = courseKeysForAssignment(assignment.courseName, assignment.levelName);
      const matching: ExperienceGrantSnapshot[] = grants
        .filter((g) => g.game === assignment.gameKey && keys.includes(g.course))
        .map((g) => ({
          correctCount: g.correctCount,
          answeredCount: g.answeredCount,
          createdAt: g.createdAt,
        }));

      const progress = computeAssignmentProgress({
        grants: matching,
        totalQuestions:
          questionCountMap.get(`${assignment.courseId}|${assignment.gameKey}`) || 0,
        deadlineAt: assignment.deadlineAt,
      });

      if (progress.status === 'done') continue;

      const href = homeworkPlayHref({
        courseId: assignment.courseId,
        gameKey: assignment.gameKey,
        skillId: assignment.skillId,
      });
      if (!href) continue;

      incomplete.push({
        assignmentId: assignment.id,
        classId: assignment.classId,
        className: classNameById.get(assignment.classId) || '',
        title: assignmentDisplayTitle({
          courseName: assignment.courseName,
          gameLabel: assignment.gameLabel,
          skillLabel: assignment.skillLabel,
        }),
        courseName: assignment.courseName,
        gameLabel: assignment.gameLabel,
        skillLabel: assignment.skillLabel,
        levelName: assignment.levelName,
        deadlineAt: assignment.deadlineAt.toISOString(),
        deadlineDisplay: formatVnDateTime(assignment.deadlineAt),
        href,
      });
    }

    return NextResponse.json({
      success: true,
      displayName: session.displayName,
      count: incomplete.length,
      items: incomplete,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
