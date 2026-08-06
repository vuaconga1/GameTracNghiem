import { describe, expect, it } from 'vitest';

import { scoreDeterministicDrill } from '@/lib/speaking/drillScoring';
import { parseSpeakingDrillPayload } from '@/lib/speaking/drillSchemas';

describe('deterministic short-drill scoring', () => {
  const payload = parseSpeakingDrillPayload({
    kind: 'sentence',
    targetText: 'We should protect the environment',
  });

  if (payload.kind !== 'sentence') throw new Error('test payload mismatch');

  it('scores completeness, order, similarity, and pace deterministically', () => {
    const exact = scoreDeterministicDrill({
      payload,
      transcript: 'We should protect the environment.',
      durationMs: 3_000,
      locale: 'en',
    });
    const incomplete = scoreDeterministicDrill({
      payload,
      transcript: 'environment protect',
      durationMs: 8_000,
      locale: 'en',
    });

    expect(exact.score).toBeGreaterThan(90);
    expect(exact.details).toMatchObject({
      scoringMethod: 'transcript_practice_v1',
      completeness: 100,
      order: 100,
      similarity: 100,
    });
    expect(incomplete.score).toBeLessThan(exact.score);
    expect(incomplete.details.order).toBeLessThan(
      incomplete.details.completeness,
    );
  });

  it('labels feedback as transcript practice without accent claims', () => {
    const result = scoreDeterministicDrill({
      payload,
      transcript: 'We protect environment',
      durationMs: 2_500,
      locale: 'vi',
    });
    expect(result.feedback.label).toBe('Phản hồi luyện tập');
    expect(result.feedback.praise).toBeTruthy();
    expect(result.feedback.improvement).toBeTruthy();
    expect(`${result.feedback.praise} ${result.feedback.improvement}`).not.toMatch(
      /accent|giọng chuẩn|âm vị/i,
    );
    expect(result.feedback.disclaimer).toMatch(/không đánh giá âm vị/);
  });
});
