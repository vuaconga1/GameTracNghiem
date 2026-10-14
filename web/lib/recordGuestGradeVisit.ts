import 'server-only';

import { cookies, headers } from 'next/headers';

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

/** Count one guest browser once per Global Success grade per Vietnam week. */
export async function recordGuestGradeVisit(levelName: string): Promise<void> {
  try {
    const grade = globalSuccessGrade(levelName);
    if (!grade) return;
    if (await optionalSession()) return;

    const visitorKey = await readGuestVisitorKey();
    if (!visitorKey) return;

    await prisma.guestGradeVisit.create({
      data: {
        visitorKey,
        grade,
        weekStart: vnWeekStartDate(),
      },
    });
  } catch (err) {
    if (isUniqueConstraint(err)) return;
    console.error('guest grade visit', err);
  }
}
