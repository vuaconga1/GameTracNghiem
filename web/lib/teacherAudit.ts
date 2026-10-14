import { prisma } from '@/lib/db';
import { TEACHER_AUDIT_ASSIGN, TEACHER_AUDIT_LOGIN } from '@/lib/teacherAuditActions';
import { isTeacherUserRole } from '@/lib/userRoles';

export { TEACHER_AUDIT_ASSIGN, TEACHER_AUDIT_LOGIN };

export type TeacherAuditActor = {
  userId: string;
  username: string;
  displayName: string;
  role: string;
};

export type TeacherAssignmentAuditItem = {
  assignmentId: string;
  classId: string;
  className: string;
  levelName: string;
  courseName: string;
  skillLabel: string | null;
  gameLabel: string;
  deadlineAt: Date;
};

type AuditRow = {
  action: string;
  actorUserId: string;
  actorUsername: string;
  actorDisplayName: string;
  classId?: string;
  className?: string;
  assignmentId?: string;
  levelName?: string;
  courseName?: string;
  skillLabel?: string | null;
  gameLabel?: string;
  deadlineAt?: Date;
};

export function teacherLoginAuditRow(actor: TeacherAuditActor): AuditRow | null {
  if (!isTeacherUserRole(actor.role)) return null;
  return {
    action: TEACHER_AUDIT_LOGIN,
    actorUserId: actor.userId,
    actorUsername: actor.username,
    actorDisplayName: actor.displayName,
  };
}

export function teacherAssignmentAuditRows(
  actor: TeacherAuditActor,
  items: TeacherAssignmentAuditItem[],
): AuditRow[] {
  if (!isTeacherUserRole(actor.role) || items.length === 0) return [];
  return items.map((item) => ({
    action: TEACHER_AUDIT_ASSIGN,
    actorUserId: actor.userId,
    actorUsername: actor.username,
    actorDisplayName: actor.displayName,
    classId: item.classId,
    className: item.className,
    assignmentId: item.assignmentId,
    levelName: item.levelName,
    courseName: item.courseName,
    skillLabel: item.skillLabel,
    gameLabel: item.gameLabel,
    deadlineAt: item.deadlineAt,
  }));
}

async function writeRows(rows: AuditRow[]): Promise<void> {
  if (!rows.length) return;
  try {
    await prisma.teacherAuditLog.createMany({ data: rows });
  } catch (err) {
    console.error('teacher audit log failed', err);
  }
}

export async function recordTeacherLogin(actor: TeacherAuditActor): Promise<void> {
  const row = teacherLoginAuditRow(actor);
  if (!row) return;
  await writeRows([row]);
}

export async function recordTeacherHomeworkAssigned(
  actor: TeacherAuditActor,
  items: TeacherAssignmentAuditItem[],
): Promise<void> {
  await writeRows(teacherAssignmentAuditRows(actor, items));
}
