import type { SessionPayload } from '@/lib/session';
import { prisma } from '@/lib/db';
import { canManageClasses } from '@/lib/userRoles';

function forbidden(message = 'Không có quyền truy cập'): Error & { status: number } {
  return Object.assign(new Error(message), { status: 403 });
}

function notFound(message = 'Không tìm thấy lớp học'): Error & { status: number } {
  return Object.assign(new Error(message), { status: 404 });
}

/** Admin and teacher can access every class (view, members, homework). */
export async function requireClassAccess(session: SessionPayload, classId: string) {
  const schoolClass = await prisma.schoolClass.findUnique({
    where: { id: classId },
    select: {
      id: true,
      name: true,
      createdByUserId: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!schoolClass) throw notFound();
  if (!canManageClasses(session.role)) {
    throw forbidden();
  }
  return schoolClass;
}

/** Both admin and teacher see the full class list. */
export function classListWhere(_session: SessionPayload) {
  return {};
}
