import { expect, test, type Page } from '@playwright/test';

const baseUrlConfigured = Boolean(process.env.PLAYWRIGHT_BASE_URL?.trim());
const courseId = process.env.PLAYWRIGHT_COURSE_ID?.trim() || '';

async function blockCostlyProviders(page: Page) {
  await page.route('https://api.openai.com/**', (route) => route.abort('blockedbyclient'));
  await page.route('https://qstash.upstash.io/**', (route) =>
    route.abort('blockedbyclient'),
  );
}

function accessDecision(
  activityType: string,
  reason: 'LOGIN_REQUIRED' | 'ALLOWED' | 'COURSE_EXPIRED',
) {
  const allowed = reason === 'ALLOWED';
  return {
    success: true,
    access: {
      allowed,
      reason,
      courseId,
      activityType,
      timezone: 'Asia/Ho_Chi_Minh',
      config: allowed
        ? {
            dailyLimit: activityType === 'REALTIME_CONVERSATION' ? 2 : 30,
            durationSeconds: activityType === 'REALTIME_CONVERSATION' ? 180 : 60,
            reservationTtlSeconds: 120,
            promptVersion: 'e2e-mock-v1',
          }
        : null,
      quota: allowed
        ? {
            activityType,
            used: 0,
            reserved: 0,
            limit: activityType === 'REALTIME_CONVERSATION' ? 2 : 30,
            remaining: activityType === 'REALTIME_CONVERSATION' ? 2 : 30,
          }
        : null,
      entitlementExpiresAt: allowed ? '2026-09-01T17:00:00.000Z' : null,
    },
  };
}

test.beforeEach(async ({ page }) => {
  test.skip(
    !baseUrlConfigured,
    'Set PLAYWRIGHT_BASE_URL to a running local/disposable app.',
  );
  await blockCostlyProviders(page);
});

test('Guest can browse and play locally without server writes', async ({ page }) => {
  test.skip(!courseId, 'Set PLAYWRIGHT_COURSE_ID to a seeded disposable course.');
  const writes: string[] = [];
  page.on('request', (request) => {
    if (
      !['GET', 'HEAD', 'OPTIONS'].includes(request.method()) &&
      /\/api\/(progress|score\/submit|experience\/sessions)/.test(request.url())
    ) {
      writes.push(`${request.method()} ${request.url()}`);
    }
  });

  const courseResponse = await page.goto(`/courses/${encodeURIComponent(courseId)}`);
  expect(courseResponse?.ok()).toBe(true);
  await expect(page.locator('main')).toBeVisible();

  await page.route(`**/api/games/quiz/${encodeURIComponent(courseId)}`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        course: { id: courseId, name: 'Guest E2E Unit', levelName: 'Lớp 8' },
        questions: [
          {
            id: 'guest-question-1',
            index: 0,
            type: 'multiple_choice',
            typeLabel: 'Multiple choice',
            skill: 'vocabulary',
            exercise: 'Guest demo',
            question: 'Choose hello.',
            answer: 'hello',
            fillMode: false,
            accept: ['hello'],
            options: ['hello', 'goodbye'],
          },
        ],
        statuses: [],
        playSessionId: null,
        gameScore: 0,
      }),
    }),
  );

  await page.goto(
    `/games/quiz/${encodeURIComponent(courseId)}` +
      '?skill=vocabulary&type=multiple_choice&exercise=Guest%20demo',
  );
  await expect(page.locator('#listPanel')).toBeVisible();
  await page.locator('#listPanel .game-actions .btn-primary').click();
  await expect(page.locator('#questionPanel')).toBeVisible();
  await page.locator('#questionPanel .option-btn').first().click();
  await expect(page.locator('#questionPanel .feedback.show')).toBeVisible();

  expect(writes).toEqual([]);
});

test('locked Speaking opens login modal and rejects an unsafe next redirect', async ({
  page,
}) => {
  test.skip(!courseId, 'Set PLAYWRIGHT_COURSE_ID to a seeded disposable course.');
  await page.route('**/api/speaking/access?**', async (route) => {
    const activityType =
      new URL(route.request().url()).searchParams.get('activityType') || '';
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(accessDecision(activityType, 'LOGIN_REQUIRED')),
    });
  });

  await page.goto(`/speaking/${encodeURIComponent(courseId)}`);
  const realtimeCard = page.locator(
    '[data-speaking-activity="REALTIME_CONVERSATION"]',
  );
  await expect(realtimeCard).toBeEnabled();
  await realtimeCard.click();

  const modal = page.getByRole('dialog');
  await expect(modal).toBeVisible();
  const loginLink = modal.locator('a[href^="/login?next="]');
  await expect(loginLink).toHaveAttribute(
    'href',
    `/login?next=${encodeURIComponent(
      `/speaking/${encodeURIComponent(courseId)}/conversation`,
    )}`,
  );

  await page.route('**/api/auth/login', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    }),
  );
  await page.goto('/login?next=%2F%2Fevil.example');
  await page.locator('#loginUsername').fill('guest-e2e');
  await page.locator('#loginPassword').fill('not-a-real-password');
  await page.locator('#loginSubmit').click();
  await expect(page).toHaveURL((url) => url.pathname === '/');
  expect(page.url()).not.toContain('evil.example');
});
