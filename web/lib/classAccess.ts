import type { SessionPayload } from '@/lib/session';
import { prisma } from '@/lib/db';

function forbidden(message = 'Không có quyền truy cập'): Error & { status: number } {
  return Object.assign(new Error(message), { status: 403 });
}

function notFound(message = 'Không tìm thấy lớp học'): Error & { status: number } {
  return Object.assign(new Error(message), { status: 404 });
}

/** Admin sees all classes; teacher only classes they created. */
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
  if (session.role !== 'admin' && schoolClass.createdByUserId !== session.userId) {
    throw forbidden();
  }
  return schoolClass;
}

export function classListWhere(session: SessionPayload) {
  if (session.role === 'admin') return {};
  return { createdByUserId: session.userId };
}
