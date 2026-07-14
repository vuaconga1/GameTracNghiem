import { describe, expect, it } from 'vitest';
import { applyAttachToPayload, planMediaAttaches } from './attachMedia';

describe('planMediaAttaches', () => {
  const questions = [
    { id: 'q1', payload: { word: 'table', image: '' } },
    { id: 'q2', payload: { word: 'apple', image: 'https://old' } },
    { id: 'q3', payload: { word: 'table', image: '' } }, // duplicate key → ambiguous
  ];

  it('attaches empty scramble image when unique match', () => {
    const plan = planMediaAttaches({
      game: 'scramble',
      kind: 'image',
      questions: [
        { id: 'q1', payload: { word: 'table', image: '' } },
        { id: 'q2', payload: { word: 'apple', image: '' } },
      ],
      filenames: ['Table.png', 'apple.jpg'],
    });
    expect(plan.actions.filter((a) => a.type === 'attach')).toHaveLength(2);
  });

  it('skips when image already filled', () => {
    const plan = planMediaAttaches({
      game: 'word_match',
      kind: 'image',
      questions: [{ id: 'q2', payload: { word: 'apple', image: 'https://old' } }],
      filenames: ['apple.png'],
    });
    expect(plan.actions[0]).toMatchObject({ type: 'skipped_filled', key: 'apple' });
  });

  it('lists unmatched multi-word file', () => {
    const plan = planMediaAttaches({
      game: 'scramble',
      kind: 'image',
      questions: [{ id: 'q1', payload: { word: 'table', image: '' } }],
      filenames: ['Table tennis.png'],
    });
    expect(plan.actions[0]).toMatchObject({ type: 'unmatched', reason: 'no_match' });
  });

  it('marks ambiguous when two questions share normalized key', () => {
    const plan = planMediaAttaches({
      game: 'scramble',
      kind: 'image',
      questions,
      filenames: ['table.png'],
    });
    expect(
      plan.actions.some((a) => a.type === 'unmatched' && a.reason === 'ambiguous_question')
    ).toBe(true);
  });

  it('maps pronunciation audio to referenceAudioUrl', () => {
    const plan = planMediaAttaches({
      game: 'pronunciation',
      kind: 'audio',
      questions: [{ id: 'p1', payload: { targetText: 'hang out', referenceAudioUrl: '' } }],
      filenames: ['hang-out.mp3'],
    });
    expect(plan.actions[0]).toMatchObject({
      type: 'attach',
      questionId: 'p1',
      field: 'referenceAudioUrl',
      key: 'hang out',
    });
  });

  it('rejects wrong kind extension', () => {
    const plan = planMediaAttaches({
      game: 'scramble',
      kind: 'image',
      questions: [{ id: 'q1', payload: { word: 'table', image: '' } }],
      filenames: ['table.mp3'],
    });
    expect(plan.actions[0]).toMatchObject({ type: 'unmatched', reason: 'wrong_kind' });
  });
});

describe('applyAttachToPayload', () => {
  it('writes image url into payload', () => {
    expect(applyAttachToPayload({ word: 'table', image: '' }, 'image', '/api/media/x.png')).toEqual({
      word: 'table',
      image: '/api/media/x.png',
    });
  });

  it('writes referenceAudioUrl into payload', () => {
    expect(
      applyAttachToPayload(
        { targetText: 'hang out', referenceAudioUrl: '' },
        'referenceAudioUrl',
        '/api/media/x.mp3'
      )
    ).toEqual({
      targetText: 'hang out',
      referenceAudioUrl: '/api/media/x.mp3',
    });
  });

  it('writes image into nested item and hint_image', () => {
    expect(
      applyAttachToPayload(
        {
          title: 'Leisure',
          items: [{ order: 1, answer: 'leisure', image: '' }],
        },
        'image',
        '/api/media/x.png',
        0
      )
    ).toEqual({
      title: 'Leisure',
      items: [{ order: 1, answer: 'leisure', image: '/api/media/x.png', hint_image: '/api/media/x.png' }],
    });
  });
});

describe('planMediaAttaches exercise games', () => {
  it('attaches look_and_write item image by answer', () => {
    const plan = planMediaAttaches({
      game: 'look_and_write',
      kind: 'image',
      questions: [
        {
          id: 'q1',
          payload: {
            title: 'Leisure',
            items: [
              { order: 1, answer: 'leisure', image: '' },
              { order: 2, answer: 'socialize', image: '' },
            ],
          },
        },
      ],
      filenames: ['leisure.png'],
    });
    expect(plan.actions[0]).toMatchObject({
      type: 'attach',
      questionId: 'q1',
      itemIndex: 0,
      key: 'leisure',
      field: 'image',
    });
  });

  it('matches vocabulary_check by word', () => {
    const plan = planMediaAttaches({
      game: 'vocabulary_check',
      kind: 'image',
      questions: [
        {
          id: 'q1',
          payload: {
            title: 'Check',
            items: [{ order: 1, word: 'leisure', sentence: 'x', image: '', is_correct: true }],
          },
        },
      ],
      filenames: ['leisure.png'],
    });
    expect(plan.actions[0]).toMatchObject({ type: 'attach', key: 'leisure', itemIndex: 0 });
  });

  it('skips filled nested image', () => {
    const plan = planMediaAttaches({
      game: 'choose_and_circle',
      kind: 'image',
      questions: [
        {
          id: 'q1',
          payload: {
            title: 'A',
            items: [{ order: 1, answer: 'leisure', image: 'https://old', options: ['a', 'b'] }],
          },
        },
      ],
      filenames: ['leisure.png'],
    });
    expect(plan.actions[0]).toMatchObject({ type: 'skipped_filled', key: 'leisure' });
  });

  it('marks ambiguous when two items share answer', () => {
    const plan = planMediaAttaches({
      game: 'vocabulary_test',
      kind: 'image',
      questions: [
        {
          id: 'q1',
          payload: {
            title: 'A',
            items: [
              { order: 1, answer: 'leisure', image: '' },
              { order: 2, answer: 'leisure', image: '' },
            ],
          },
        },
      ],
      filenames: ['leisure.png'],
    });
    expect(plan.actions[0]).toMatchObject({ type: 'unmatched', reason: 'ambiguous_question' });
  });
});
