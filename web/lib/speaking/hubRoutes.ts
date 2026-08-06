import type { SpeakingActivityType } from '@/lib/speaking/config';

type SearchValue = string | string[] | undefined;

export const SPEAKING_HUB_ROUTES: Record<SpeakingActivityType, string> = {
  WORD_PRONUNCIATION: 'word-pronunciation',
  SENTENCE_READING: 'sentence-reading',
  GUIDED_ANSWER: 'guided-answer',
  REALTIME_CONVERSATION: 'conversation',
};

export function speakingHubPath(courseId: string): string {
  return `/speaking/${encodeURIComponent(courseId)}`;
}

export function speakingActivityPath(
  courseId: string,
  activityType: SpeakingActivityType,
): string {
  return `${speakingHubPath(courseId)}/${SPEAKING_HUB_ROUTES[activityType]}`;
}

export function speakingLoginHref(nextPath: string): string {
  const safePath =
    nextPath.startsWith('/') && !nextPath.startsWith('//') ? nextPath : '/';
  return `/login?next=${encodeURIComponent(safePath)}`;
}

function firstInternalValue(value: SearchValue): string | null {
  const first = Array.isArray(value) ? value[0] : value;
  if (!first || first.length > 512 || /[\u0000-\u001f\u007f]/.test(first)) {
    return null;
  }
  return first;
}

export function hasLegacySpeakingDeepLink(searchParams: {
  topicId?: SearchValue;
  previewSession?: SearchValue;
}): boolean {
  return Boolean(
    firstInternalValue(searchParams.topicId) ||
      firstInternalValue(searchParams.previewSession),
  );
}

/**
 * Preserve only the known player parameters. Values are encoded by
 * URLSearchParams and can never change the internal redirect destination.
 */
export function legacySpeakingConversationPath(
  courseId: string,
  searchParams: {
    topicId?: SearchValue;
    previewSession?: SearchValue;
    legacyRealtime?: SearchValue;
  },
): string {
  const query = new URLSearchParams();
  const topicId = firstInternalValue(searchParams.topicId);
  const previewSession = firstInternalValue(searchParams.previewSession);
  const legacyRealtime = firstInternalValue(searchParams.legacyRealtime);

  if (topicId) query.set('topicId', topicId);
  if (previewSession) query.set('previewSession', previewSession);
  if (legacyRealtime === '1') query.set('legacyRealtime', '1');

  const path = speakingActivityPath(courseId, 'REALTIME_CONVERSATION');
  const suffix = query.toString();
  return suffix ? `${path}?${suffix}` : path;
}
