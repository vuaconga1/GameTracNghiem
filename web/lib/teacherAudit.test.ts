import { describe, expect, it } from 'vitest';

import {
  TEACHER_AUDIT_ASSIGN,
  TEACHER_AUDIT_LOGIN,
  teacherAssignmentAuditRows,
  teacherLoginAuditRow,
  type TeacherAuditActor,
} from './teacherAudit';

const teacher: TeacherAuditActor = {
  userId: 't1',
  username: 'gv.an',
  displayName: 'Cô An',
  role: 'teacher',
};

describe('teacherAudit', () => {
  it('records a login only for the teacher role', () => {
    expect(teacherLoginAuditRow(teacher)).toMatchObject({
      action: TEACHER_AUDIT_LOGIN,
      actorUserId: 't1',
      actorUsername: 'gv.an',
      actorDisplayName: 'Cô An',
    });
    expect(teacherLoginAuditRow({ ...teacher, role: 'admin' })).toBeNull();
    expect(teacherLoginAuditRow({ ...teacher, role: 'WewinStudent' })).toBeNull();
  });

  it('records one row per homework item only after a teacher assigns', () => {
    const deadline = new Date('2026-10-21T02:57:00.000Z');
    const rows = teacherAssignmentAuditRows(teacher, [
      {
        assignmentId: 'a1',
        classId: 'c1',
        className: 'Com Business 1.1',
        levelName: 'Lớp 8',
        courseName: 'Unit 1',
        skillLabel: 'Đọc',
        gameLabel: 'Quiz',
        deadlineAt: deadline,
      },
    ]);

    expect(rows).toEqual([
      {
        action: TEACHER_AUDIT_ASSIGN,
        actorUserId: 't1',
        actorUsername: 'gv.an',
        actorDisplayName: 'Cô An',
        classId: 'c1',
        className: 'Com Business 1.1',
        assignmentId: 'a1',
        levelName: 'Lớp 8',
        courseName: 'Unit 1',
        skillLabel: 'Đọc',
        gameLabel: 'Quiz',
        deadlineAt: deadline,
      },
    ]);
    expect(
      teacherAssignmentAuditRows({ ...teacher, role: 'admin' }, [
        {
          assignmentId: 'a1',
          classId: 'c1',
          className: 'Com Business 1.1',
          levelName: 'Lớp 8',
          courseName: 'Unit 1',
          skillLabel: null,
          gameLabel: 'Quiz',
          deadlineAt: deadline,
        },
      ]),
    ).toEqual([]);
  });
});
