import { adminErrorResponse } from '@/lib/admin/http';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { parseHoChiMinhDateBoundary } from '@/lib/speaking/dates';
import { assertSpeakingMutationRequest } from '@/lib/speaking/security';

const ENTITLEMENT_STATUSES = new Set([
  'ACTIVE',
  'EXPIRED',
  'SUSPENDED',
  'REVOKED',
]);

function stringList(value: unknown): string[] {
  const raw = Array.isArray(value) ? value : typeof value === 'string' ? value.split(/[\n,]/) : [];
  return [...new Set(raw.map((item) => String(item).trim()).filter(Boolean))];
}

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const url = new URL(req.url);
    const username = url.searchParams.get('username')?.trim();
    const courseId = url.searchParams.get('courseId')?.trim();
    const status = url.searchParams.get('status')?.trim().toUpperCase();
    const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || 100), 1), 200);

    const entitlements = await prisma.speakingEntitlement.findMany({
      where: {
        ...(courseId ? { courseId } : {}),
        ...(status && ENTITLEMENT_STATUSES.has(status) ? { status } : {}),
        ...(username
          ? {
              user: {
                username: { contains: username, mode: 'insensitive' },
              },
            }
          : {}),
      },
      orderBy: [{ createdAt: 'desc' }],
      take: limit,
      include: {
        user: { select: { id: true, username: true, displayName: true } },
        course: { select: { id: true, name: true, levelName: true } },
        createdBy: { select: { id: true, username: true, displayName: true } },
        revokedBy: { select: { id: true, username: true, displayName: true } },
      },
    });

    return Response.json({ success: true, entitlements });
  } catch (err) {
    return adminErrorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    assertSpeakingMutationRequest(req);
    const admin = await requireAdmin();
    const body = (await req.json().catch(() => ({}))) as {
      usernames?: unknown;
      userIds?: unknown;
      courseId?: unknown;
      startsOn?: unknown;
      expiresOn?: unknown;
      source?: unknown;
      note?: unknown;
    };
    const usernames = stringList(body.usernames);
    const userIds = stringList(body.userIds);
    if (usernames.length + userIds.length === 0) {
      return Response.json(
        { success: false, message: 'Nhập ít nhất một mã học sinh' },
        { status: 400 },
      );
    }
    if (usernames.length + userIds.length > 200) {
      return Response.json(
        { success: false, message: 'Mỗi lần chỉ cấp tối đa 200 học sinh' },
        { status: 400 },
      );
    }

    const startsOn = String(body.startsOn || '').trim();
    const expiresOn = String(body.expiresOn || '').trim();
    const startsAt = parseHoChiMinhDateBoundary(startsOn);
    const expiresAt = parseHoChiMinhDateBoundary(expiresOn);
    if (!startsAt || !expiresAt || expiresAt.getTime() <= startsAt.getTime()) {
      return Response.json(
        {
          success: false,
          message:
            'Ngày bắt đầu/kết thúc không hợp lệ; ngày kết thúc là mốc loại trừ và phải sau ngày bắt đầu',
        },
        { status: 400 },
      );
    }

    const courseIdRaw = String(body.courseId || '').trim();
    const courseId = courseIdRaw || null;
    if (courseId) {
      const course = await prisma.course.findFirst({
        where: { id: courseId, archivedAt: null },
        select: { id: true },
      });
      if (!course) {
        return Response.json(
          { success: false, message: 'Không tìm thấy khóa học' },
          { status: 404 },
        );
      }
    }

    const users = await prisma.user.findMany({
      where: {
        role: { in: ['WewinStudent', 'student'] },
        archivedAt: null,
        OR: [
          ...(usernames.length ? [{ username: { in: usernames } }] : []),
          ...(userIds.length ? [{ id: { in: userIds } }] : []),
        ],
      },
      select: { id: true, username: true },
    });
    const foundUsernames = new Set(users.map((user) => user.username));
    const foundUserIds = new Set(users.map((user) => user.id));
    const missing = [
      ...usernames.filter((username) => !foundUsernames.has(username)),
      ...userIds.filter((userId) => !foundUserIds.has(userId)),
    ];

    const overlapping = users.length
      ? await prisma.speakingEntitlement.findMany({
          where: {
            userId: { in: users.map((user) => user.id) },
            courseId,
            status: 'ACTIVE',
            startsAt: { lt: expiresAt },
            expiresAt: { gt: startsAt },
          },
          select: { userId: true },
        })
      : [];
    const skippedUserIds = new Set(overlapping.map((row) => row.userId));
    const source = String(body.source || 'ADMIN').trim().slice(0, 80) || 'ADMIN';
    const note = String(body.note || '').trim().slice(0, 1000) || null;
    const grantUsers = users.filter((user) => !skippedUserIds.has(user.id));

    const entitlements = await prisma.$transaction(
      grantUsers.map((user) =>
        prisma.speakingEntitlement.create({
          data: {
            userId: user.id,
            courseId,
            status: 'ACTIVE',
            startsAt,
            expiresAt,
            source,
            createdById: admin.userId,
            note,
          },
          select: {
            id: true,
            userId: true,
            courseId: true,
            status: true,
            startsAt: true,
            expiresAt: true,
          },
        }),
      ),
    );

    return Response.json({
      success: true,
      granted: entitlements.length,
      skippedExisting: users.length - grantUsers.length,
      missing,
      entitlements,
    });
  } catch (err) {
    return adminErrorResponse(err);
  }
}
