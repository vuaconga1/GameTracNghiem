import { requireAdminOrTeacher } from '@/lib/auth';
import { adminErrorResponse } from '@/lib/admin/http';
import { requireClassAccess } from '@/lib/classAccess';
import { notArchived } from '@/lib/admin/notArchived';
import {
  gameLabelForKey,
  skillLabelForId,
} from '@/lib/classHomework';
import { ALL_GAME_KEYS } from '@/lib/gameCatalog';
import { isSkillId } from '@/lib/skillCatalog';
import { parseHoChiMinhDateTime } from '@/lib/vnDateTime';
import { prisma } from '@/lib/db';

type Params = { params: Promise<{ id: string }> };

type AssignmentInput = {
  courseId?: unknown;
  gameKey?: unknown;
  skillId?: unknown;
  deadlineAt?: unknown;
};

export async function POST(req: Request, { params }: Params) {
  try {
    const session = await requireAdminOrTeacher();
    const { id } = await params;
    await requireClassAccess(session, id);
    const body = await req.json();

    const rawItems: AssignmentInput[] = Array.isArray(body.assignments)
      ? body.assignments
      : [body];

    if (!rawItems.length) {
      return Response.json(
        { success: false, message: 'Vui lòng chọn ít nhất một bài tập' },
        { status: 400 }
      );
    }

    const prepared: Array<{
      courseId: string;
      gameKey: string;
      skillId: string | null;
      deadlineAt: Date;
      levelName: string;
      courseName: string;
      gameLabel: string;
      skillLabel: string | null;
    }> = [];

    for (const item of rawItems) {
      const courseId = String(item.courseId || '').trim();
      const gameKey = String(item.gameKey || '').trim();
      const skillRaw = String(item.skillId || '').trim();
      const skillId = skillRaw && isSkillId(skillRaw) ? skillRaw : null;
      const deadlineAt = parseHoChiMinhDateTime(item.deadlineAt);

      if (!courseId || !gameKey || !deadlineAt) {
        return Response.json(
          {
            success: false,
            message: 'Mỗi bài tập cần khóa học, game và hạn nộp (giờ Việt Nam)',
          },
          { status: 400 }
        );
      }
      if (!ALL_GAME_KEYS.includes(gameKey)) {
        return Response.json(
          { success: false, message: `Game không hợp lệ: ${gameKey}` },
          { status: 400 }
        );
      }

      const course = await prisma.course.findFirst({
        where: { id: courseId, ...notArchived },
        select: { id: true, name: true, levelName: true },
      });
      if (!course) {
        return Response.json(
          { success: false, message: 'Không tìm thấy khóa/unit' },
          { status: 400 }
        );
      }

      prepared.push({
        courseId: course.id,
        gameKey,
        skillId,
        deadlineAt,
        levelName: course.levelName,
        courseName: course.name,
        gameLabel: gameLabelForKey(gameKey),
        skillLabel: skillLabelForId(skillId),
      });
    }

    const created = await prisma.$transaction(
      prepared.map((item) =>
        prisma.classAssignment.create({
          data: {
            classId: id,
            courseId: item.courseId,
            gameKey: item.gameKey,
            skillId: item.skillId,
            levelName: item.levelName,
            courseName: item.courseName,
            gameLabel: item.gameLabel,
            skillLabel: item.skillLabel,
            deadlineAt: item.deadlineAt,
            createdByUserId: session.userId,
          },
        })
      )
    );

    return Response.json({
      success: true,
      items: created.map((a) => ({
        id: a.id,
        courseId: a.courseId,
        gameKey: a.gameKey,
        skillId: a.skillId,
        levelName: a.levelName,
        courseName: a.courseName,
        gameLabel: a.gameLabel,
        skillLabel: a.skillLabel,
        deadlineAt: a.deadlineAt.toISOString(),
        createdAt: a.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    return adminErrorResponse(err);
  }
}
