import { expect, test, type Page, type Route } from '@playwright/test';

const baseUrlConfigured = Boolean(process.env.PLAYWRIGHT_BASE_URL?.trim());
const courseId = process.env.PLAYWRIGHT_COURSE_ID?.trim() || '';
const studentStorageState = process.env.PLAYWRIGHT_STUDENT_STORAGE_STATE?.trim();
const adminStorageState = process.env.PLAYWRIGHT_ADMIN_STORAGE_STATE?.trim();

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

async function blockCostlyProviders(page: Page) {
  await page.route('https://api.openai.com/**', (route) => route.abort('blockedbyclient'));
  await page.route('https://qstash.upstash.io/**', (route) =>
    route.abort('blockedbyclient'),
  );
}

function accessResult(
  activityType: string,
  input: {
    allowed: boolean;
    reason: string;
    used?: number;
    limit?: number;
    expiresAt?: string | null;
  },
) {
  const limit =
    input.limit ?? (activityType === 'REALTIME_CONVERSATION' ? 2 : 30);
  const used = input.used ?? 0;
  return {
    success: true,
    access: {
      allowed: input.allowed,
      reason: input.reason,
      courseId,
      activityType,
      timezone: 'Asia/Ho_Chi_Minh',
      config: {
        dailyLimit: limit,
        durationSeconds: activityType === 'REALTIME_CONVERSATION' ? 180 : 60,
        reservationTtlSeconds: 120,
        promptVersion: 'e2e-mock-v1',
      },
      quota: {
        activityType,
        used,
        reserved: 0,
        limit,
        remaining: Math.max(0, limit - used),
      },
      entitlementExpiresAt:
        input.expiresAt === undefined
          ? '2026-09-01T17:00:00.000Z'
          : input.expiresAt,
    },
  };
}

async function installFakeRealtimeBrowser(page: Page) {
  await page.addInitScript(() => {
    const track = { stop() {} };
    const stream = {
      getTracks: () => [track],
      getAudioTracks: () => [track],
    };
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: async () => stream },
    });

    class FakeDataChannel extends EventTarget {
      send() {}
      close() {}
    }

    class FakePeerConnection {
      iceGatheringState = 'complete';
      localDescription: RTCSessionDescriptionInit | null = null;
      ontrack: ((event: { streams: unknown[] }) => void) | null = null;
      private readonly channel = new FakeDataChannel();

      addTrack() {}
      addEventListener() {}
      removeEventListener() {}
      close() {}
      createDataChannel() {
        return this.channel;
      }
      async createOffer() {
        return {
          type: 'offer' as const,
          sdp: 'v=0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\n',
        };
      }
      async setLocalDescription(description: RTCSessionDescriptionInit) {
        this.localDescription = description;
      }
      async setRemoteDescription() {
        setTimeout(() => {
          this.channel.dispatchEvent(new Event('open'));
          this.channel.dispatchEvent(
            new MessageEvent('message', {
              data: JSON.stringify({ type: 'output_audio_buffer.started' }),
            }),
          );
        }, 10);
      }
    }

    Object.defineProperty(window, 'RTCPeerConnection', {
      configurable: true,
      value: FakePeerConnection,
    });
  });
}

async function installFakeDrillRecorder(page: Page) {
  await page.addInitScript(() => {
    const track = { stop() {} };
    const stream = {
      getTracks: () => [track],
      getAudioTracks: () => [track],
    };
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: async () => stream },
    });
    Object.defineProperty(window, 'AudioContext', {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(window, 'webkitAudioContext', {
      configurable: true,
      value: undefined,
    });

    class FakeMediaRecorder {
      static isTypeSupported() {
        return true;
      }
      state: RecordingState = 'inactive';
      readonly mimeType = 'audio/webm';
      ondataavailable: ((event: { data: Blob }) => void) | null = null;
      onstop: (() => void) | null = null;
      onerror: (() => void) | null = null;

      start() {
        this.state = 'recording';
      }
      stop() {
        if (this.state !== 'recording') return;
        this.state = 'inactive';
        this.ondataavailable?.({
          data: new Blob([new Uint8Array(64)], { type: this.mimeType }),
        });
        this.onstop?.();
      }
    }

    Object.defineProperty(window, 'MediaRecorder', {
      configurable: true,
      value: FakeMediaRecorder,
    });
  });
}

test.describe('Speaking student UI', () => {
  test.use({
    storageState: studentStorageState || { cookies: [], origins: [] },
  });

  test.beforeEach(async ({ page }) => {
    test.skip(
      !baseUrlConfigured || !courseId,
      'Set PLAYWRIGHT_BASE_URL and PLAYWRIGHT_COURSE_ID.',
    );
    await blockCostlyProviders(page);
  });

  test('shows allowed, expired, and per-activity limit-isolated cards', async ({
    page,
  }) => {
    const decisions: Record<
      string,
      { allowed: boolean; reason: string; used?: number; limit?: number }
    > = {
      WORD_PRONUNCIATION: {
        allowed: false,
        reason: 'DAILY_LIMIT_REACHED',
        used: 30,
        limit: 30,
      },
      SENTENCE_READING: {
        allowed: true,
        reason: 'ALLOWED',
        used: 0,
        limit: 20,
      },
      GUIDED_ANSWER: {
        allowed: false,
        reason: 'COURSE_EXPIRED',
        used: 0,
        limit: 15,
      },
      REALTIME_CONVERSATION: {
        allowed: true,
        reason: 'ALLOWED',
        used: 1,
        limit: 2,
      },
    };
    await page.route('**/api/speaking/access?**', async (route) => {
      const activity =
        new URL(route.request().url()).searchParams.get('activityType') || '';
      await json(route, accessResult(activity, decisions[activity]));
    });

    await page.goto(`/speaking/${encodeURIComponent(courseId)}`);
    await expect(
      page.locator('[data-speaking-activity="WORD_PRONUNCIATION"]'),
    ).toHaveClass(/locked/);
    await expect(
      page.locator('a[data-speaking-activity="SENTENCE_READING"]'),
    ).toBeVisible();
    await expect(
      page.locator('a[data-speaking-activity="REALTIME_CONVERSATION"]'),
    ).toBeVisible();

    await page
      .locator('[data-speaking-activity="GUIDED_ANSWER"]')
      .click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('dialog')).toContainText(/hết hạn|expired/i);
  });

  test('runs two mocked 180-second Realtime turns and blocks the third', async ({
    page,
  }) => {
    test.skip(
      !studentStorageState,
      'Set PLAYWRIGHT_STUDENT_STORAGE_STATE for the authenticated conversation route.',
    );
    await installFakeRealtimeBrowser(page);

    let used = 0;
    let sessionSequence = 0;
    const startedSessions = new Set<string>();
    const startedDeadlines: Array<{ sessionId: string; durationMs: number }> = [];

    await page.route('**/api/speaking/access?**', async (route) => {
      const activity =
        new URL(route.request().url()).searchParams.get('activityType') || '';
      await json(
        route,
        accessResult(activity, {
          allowed: used < 2,
          reason: used < 2 ? 'ALLOWED' : 'DAILY_LIMIT_REACHED',
          used,
          limit: 2,
        }),
      );
    });
    await page.route('**/api/speaking/topics?**', (route) =>
      json(route, {
        success: true,
        topics: [{ id: 'topic-e2e', title: 'Mock topic', durationSeconds: 180 }],
      }),
    );
    await page.route('**/api/speaking/daily-usage?**', (route) =>
      json(route, {
        success: true,
        canStart: used < 2,
        status: used < 2 ? 'AVAILABLE' : 'CONSUMED',
        used,
        usedToday: used,
        reserved: 0,
        reservedToday: 0,
        limit: 2,
        dailyLimit: 2,
        remaining: Math.max(0, 2 - used),
        remainingToday: Math.max(0, 2 - used),
        nextAvailableAt:
          used >= 2 ? '2026-08-06T17:00:00.000Z' : null,
        reservedUntil: null,
        reservationActive: false,
        session: null,
      }),
    );
    await page.route('**/api/speaking/sessions', async (route) => {
      if (route.request().method() !== 'POST') return route.fallback();
      sessionSequence += 1;
      await json(route, {
        success: true,
        session: {
          id: `session-e2e-${sessionSequence}`,
          status: 'RESERVED',
          kind: 'STUDENT_PRACTICE',
        },
        topic: { id: 'topic-e2e', title: 'Mock topic', durationSeconds: 180 },
      });
    });
    await page.route('**/api/speaking/sessions/*/realtime', (route) =>
      json(route, {
        success: true,
        transport: 'unified-sdp',
        sdpAnswer: 'v=0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\n',
      }),
    );
    await page.route('**/api/speaking/sessions/*/started', async (route) => {
      const sessionId = route.request().url().split('/').at(-2) || '';
      if (!startedSessions.has(sessionId)) {
        startedSessions.add(sessionId);
        used += 1;
      }
      const requestedAt = Date.now();
      const mustEndAt = new Date(requestedAt + 180_000);
      startedDeadlines.push({
        sessionId,
        durationMs: mustEndAt.getTime() - requestedAt,
      });
      await json(route, {
        success: true,
        alreadyStarted: startedDeadlines.filter(
          (entry) => entry.sessionId === sessionId,
        ).length > 1,
        session: {
          id: sessionId,
          status: 'ACTIVE',
          startedAt: new Date(requestedAt).toISOString(),
          mustEndAt: mustEndAt.toISOString(),
          usageCountedAt: new Date(requestedAt).toISOString(),
        },
      });
    });
    await page.route('**/api/speaking/sessions/*/finish', (route) =>
      json(route, {
        success: true,
        points: 10,
        scored: true,
        session: {
          status: 'FINISHING',
          endedAt: new Date().toISOString(),
        },
      }),
    );
    await page.route('**/api/speaking/analytics', (route) =>
      json(route, { success: true }),
    );

    await page.goto(
      `/speaking/${encodeURIComponent(courseId)}/conversation`,
    );
    for (let turn = 0; turn < 2; turn += 1) {
      const prepareActions = page.locator(
        '.speaking-prepare .speaking-actions button',
      );
      await expect(prepareActions).toHaveCount(2);
      await prepareActions.nth(0).click();
      await prepareActions.nth(1).click();
      await expect(page.locator('.speaking-live-status')).toBeVisible();
      await expect.poll(() => startedSessions.size).toBe(turn + 1);
      await page.locator('.speaking-live button.danger').click();
      if (turn === 0) {
        await expect(page.locator('.speaking-prepare')).toBeVisible();
      }
    }

    await expect(page.locator('.speaking-blocked')).toBeVisible();
    expect(startedSessions.size).toBe(2);
    expect(startedDeadlines).toHaveLength(2);
    expect(startedDeadlines.every((entry) => entry.durationMs === 180_000)).toBe(
      true,
    );
  });

  test('retries a failed mocked drill assessment and renders success feedback', async ({
    page,
  }) => {
    test.skip(
      !studentStorageState ||
        process.env.PLAYWRIGHT_DRILL_READY !== 'true',
      'Set PLAYWRIGHT_STUDENT_STORAGE_STATE and PLAYWRIGHT_DRILL_READY=true after seeding an entitled student and enabling WORD_PRONUNCIATION.',
    );
    await installFakeDrillRecorder(page);
    let attempts = 0;

    await page.route('**/api/speaking/drills?**', (route) =>
      json(route, {
        success: true,
        maxDurationSeconds: 60,
        exercises: [
          {
            id: 'drill-e2e-1',
            activityType: 'WORD_PRONUNCIATION',
            targetText: 'environment',
            sampleAnswers: [],
            keywords: [],
            hints: [],
            reference: null,
          },
        ],
      }),
    );
    await page.route('**/api/speaking/analytics', (route) =>
      json(route, { success: true }),
    );
    await page.route('**/api/speaking/drills/attempts', async (route) => {
      attempts += 1;
      if (attempts === 1) {
        await json(
          route,
          {
            success: false,
            counted: false,
            message: 'Mock assessment temporarily unavailable',
          },
          503,
        );
        return;
      }
      await json(route, {
        success: true,
        idempotent: false,
        points: 193,
        attempt: {
          id: 'attempt-e2e-1',
          transcript: 'environment',
          score: 92,
          feedback: {
            label: 'Practice feedback',
            praise: 'Clear word',
            improvement: 'Keep the final sound',
            disclaimer: 'Mocked assessment',
          },
        },
      });
    });

    await page.goto(
      `/speaking/${encodeURIComponent(courseId)}/word-pronunciation`,
    );
    await page.locator('.speaking-drill-mic-button').click();
    await expect(
      page.locator('.speaking-drill-mic-button.is-stop'),
    ).toBeVisible({ timeout: 5_000 });
    await page.locator('.speaking-drill-mic-button.is-stop').click();

    const submit = page.locator(
      '.speaking-drill-actions button.admin-btn.primary',
    );
    await submit.click();
    await expect(page.getByRole('alert')).toContainText(
      'Mock assessment temporarily unavailable',
    );
    await submit.click();

    await expect(page.locator('.speaking-drill-feedback')).toBeVisible();
    await expect(page.locator('.speaking-drill-score')).toContainText('92');
    expect(attempts).toBe(2);
  });
});

test.describe('Speaking admin controls', () => {
  test.use({
    storageState: adminStorageState || { cookies: [], origins: [] },
  });

  test('updates flags, grants pilot entitlement, and creates a drill via mocked APIs', async ({
    page,
  }) => {
    test.skip(
      !baseUrlConfigured || !courseId || !adminStorageState,
      'Set PLAYWRIGHT_BASE_URL, PLAYWRIGHT_COURSE_ID, and PLAYWRIGHT_ADMIN_STORAGE_STATE.',
    );
    await blockCostlyProviders(page);
    const mutations: string[] = [];
    const course = { id: courseId, name: 'Pilot Unit', levelName: 'Lớp 8' };

    await page.route('**/api/admin/courses?**', (route) =>
      json(route, { success: true, items: [course] }),
    );
    await page.route('**/api/admin/speaking/**', async (route) => {
      const url = new URL(route.request().url());
      const path = url.pathname;
      const method = route.request().method();
      if (!['GET', 'HEAD'].includes(method)) mutations.push(`${method} ${path}`);

      if (path.endsWith('/topics')) return json(route, { success: true, topics: [] });
      if (path.endsWith('/sessions')) {
        return json(route, { success: true, sessions: [] });
      }
      if (path.endsWith('/usages')) return json(route, { success: true, usages: [] });
      if (path.endsWith('/config')) {
        if (method === 'PUT') return json(route, { success: true });
        return json(route, {
          success: true,
          emergencyDisabled: false,
          models: {
            realtime: 'mock-realtime',
            transcription: 'mock-transcription',
            guided: 'mock-guided',
          },
          configs: [
            {
              activityType: 'REALTIME_CONVERSATION',
              enabled: false,
              dailyLimit: 2,
              durationSeconds: 180,
              reservationTtlSeconds: 120,
              promptVersion: 'v1',
            },
          ],
        });
      }
      if (path.endsWith('/entitlements')) {
        if (method === 'POST') {
          return json(route, {
            success: true,
            granted: 1,
            skippedExisting: 0,
            missing: [],
          });
        }
        return json(route, { success: true, entitlements: [] });
      }
      if (path.endsWith('/drills')) {
        if (method === 'POST') return json(route, { success: true });
        return json(route, { success: true, items: [] });
      }
      return json(route, { success: true });
    });

    await page.goto('/admin/speaking');
    await page.getByRole('button', { name: 'Cấu hình' }).click();
    await expect(page.getByText('REALTIME_CONVERSATION')).toBeVisible();
    await page.locator('input[type="checkbox"]').check();
    await page.getByRole('button', { name: 'Lưu' }).click();

    await page.getByRole('button', { name: 'Cấp quyền' }).click();
    await page.getByLabel('Mã học sinh').fill('WeWIN01-HV-E2E');
    await page.getByRole('button', { name: 'Cấp quyền rõ ràng' }).click();
    await expect(page.getByText(/Đã cấp 1 quyền/)).toBeVisible();

    await page.getByRole('button', { name: 'Bài drill' }).click();
    await page.getByRole('button', { name: 'Tạo bài' }).click();

    expect(mutations).toEqual(
      expect.arrayContaining([
        'PUT /api/admin/speaking/config',
        'POST /api/admin/speaking/entitlements',
        'POST /api/admin/speaking/drills',
      ]),
    );
  });
});
