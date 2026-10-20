import 'server-only';

import { cookies, headers } from 'next/headers';

import { accessAudienceForRole } from '@/lib/gradeAccessReport';
import { globalSuccessGrade, vnWeekStartDate } from '@/lib/guestAccessWeek';
import { GUEST_VISITOR_COOKIE, GUEST_VISITOR_HEADER, isGuestVisitorId } from '@/lib/guestVisitor';
import { optionalSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

async function readGuestVisitorKey(): Promise<string | null> {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(GUEST_VISITOR_COOKIE)?.value;
  if (isGuestVisitorId(fromCookie)) return fromCookie;

  const headerStore = await headers();
  const fromHeader = headerStore.get(GUEST_VISITOR_HEADER);
  return isGuestVisitorId(fromHeader) ? fromHeader : null;
}

function isUniqueConstraint(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: string }).code === 'P2002'
  );
}

/**
 * Count one visitor once per Global Success grade per Vietnam week:
 * guests by browser cookie, students and teachers by account. Admins are skipped.
 */
export async function recordGradeAccessVisit(levelName: string): Promise<void> {
  try {
    const grade = globalSuccessGrade(levelName);
    if (!grade) return;

    const session = await optionalSession();
    let audience;
    let visitorKey: string | null;
    if (session) {
      audience = accessAudienceForRole(session.role);
      visitorKey = session.userId;
    } else {
      audience = 'guest' as const;
      visitorKey = await readGuestVisitorKey();
    }
    if (!audience || !visitorKey) return;

    await prisma.gradeAccessVisit.create({
      data: {
        audience,
        visitorKey,
        grade,
        weekStart: vnWeekStartDate(),
      },
    });
  } catch (err) {
    if (isUniqueConstraint(err)) return;
    console.error('grade access visit', err);
  }
}
