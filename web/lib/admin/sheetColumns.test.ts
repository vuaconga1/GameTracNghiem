import { describe, expect, it } from 'vitest';

import {
  nextSheetSequence,
  payloadToValues,
  pipeJoin,
  pipeSplit,
  questionToSheetRow,
  valuesToPayload,
} from './sheetColumns';

describe('sheetColumns helpers', () => {
  it('joins and splits pipe lists', () => {
    expect(pipeJoin(['goes', 'go'])).toBe('goes|go');
    expect(pipeSplit('goes | go')).toEqual(['goes', 'go']);
  });

  it('maps grammar row to payload', () => {
    const payload = valuesToPayload(
      'grammar',
      {
        prefix: 'She',
        suffix: 'school.',
        hint: 'go/goes',
        answers: 'goes|go',
        source: '',
      },
      []
    );
    expect(payload).toEqual({
      source: '',
      prefix: 'She',
      suffix: 'school.',
      hint: 'go/goes',
      answers: ['goes', 'go'],
    });
  });

  it('hydrates sheet row from question', () => {
    const row = questionToSheetRow('grammar', {
      id: 'q1',
      sortOrder: 2,
      externalId: '1',
      active: true,
      payload: {
        prefix: 'She',
        suffix: 'school.',
        answers: ['goes'],
      },
    });
    expect(row.values.prefix).toBe('She');
    expect(row.values.answers).toBe('goes');
    expect(row.dirty).toBe(false);
  });

  it('preserves referenceAudioUrl on pronunciation sheet round-trip', () => {
    const payload = {
      mode: 'word',
      prompt: 'x',
      targetText: 'leisure',
      targetIpa: '',
      referenceAudioUrl: '/api/media/abc.mp3',
      hint: '',
    };
    const values = payloadToValues('pronunciation', payload);
    expect(values.referenceAudioUrl).toBe('/api/media/abc.mp3');
    const back = valuesToPayload('pronunciation', values, []);
    expect(back.referenceAudioUrl).toBe('/api/media/abc.mp3');
  });

  it('computes next sheet sequence for Mã', () => {
    expect(nextSheetSequence([])).toBe(1);
    expect(
      nextSheetSequence([
        { externalId: '11', sortOrder: 11 },
        { externalId: '3', sortOrder: 3 },
      ])
    ).toBe(12);
  });
});
