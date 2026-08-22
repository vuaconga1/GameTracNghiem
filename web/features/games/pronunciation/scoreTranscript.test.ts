import { describe, expect, it } from 'vitest';

import {
  alignHeardText,
  normalizeSpeechText,
  pickHeardText,
  scoreTranscript,
  PASS_THRESHOLD,
} from './scoreTranscript';

describe('normalizeSpeechText', () => {
  it('lowercases, strips punctuation, and collapses spaces', () => {
    expect(normalizeSpeechText('  Nice, to meet you!  ')).toBe('nice to meet you');
  });
});

describe('alignHeardText', () => {
  it('strips hesitation fillers around a word', () => {
    expect(alignHeardText('heart', 'um heart')).toBe('heart');
  });

  it('keeps the closer token when Whisper appends junk', () => {
    expect(alignHeardText('father', 'fart it')).toBe('fart');
  });

  it('does not rewrite a single unrelated word', () => {
    expect(alignHeardText('heart', 'alright')).toBe('alright');
  });
});

describe('pickHeardText', () => {
  it('prefers the alternative closest to the target word', () => {
    expect(pickHeardText('heart', ['alright', 'heart', 'art'])).toBe('heart');
  });
});

describe('scoreTranscript — word mode', () => {
  it('scores perfect match as 100 and correct', () => {
    const result = scoreTranscript('leisure', 'leisure', 'phoneme');
    expect(result.accuracy).toBe(100);
    expect(result.isCorrect).toBe(true);
    expect(result.mode).toBe('word');
    expect(result.wordScores).toBeUndefined();
  });

  it('treats word mode same as phoneme', () => {
    const result = scoreTranscript('world', 'world', 'word');
    expect(result.isCorrect).toBe(true);
    expect(result.mode).toBe('word');
  });

  it('fails clearly wrong transcript below threshold', () => {
    const result = scoreTranscript('leisure', 'banana', 'phoneme');
    expect(result.accuracy).toBeLessThan(PASS_THRESHOLD);
    expect(result.isCorrect).toBe(false);
  });

  it('passes after stripping a filler before the target word', () => {
    const result = scoreTranscript('heart', 'um heart', 'phoneme');
    expect(result.transcript).toBe('heart');
    expect(result.isCorrect).toBe(true);
  });
});

describe('scoreTranscript — sentence mode', () => {
  it('returns per-word scores and accuracy for exact sentence', () => {
    const result = scoreTranscript('Nice to meet you', 'Nice to meet you', 'sentence');
    expect(result.mode).toBe('sentence');
    expect(result.isCorrect).toBe(true);
    expect(result.accuracy).toBe(100);
    expect(result.wordScores).toEqual([
      { word: 'Nice', score: 100 },
      { word: 'to', score: 100 },
      { word: 'meet', score: 100 },
      { word: 'you', score: 100 },
    ]);
    expect(result.fluency).toBe(100);
  });

  it('marks mismatched words lower and may fail', () => {
    const result = scoreTranscript('Nice to meet you', 'Nice to see them', 'sentence');
    expect(result.wordScores?.[0]?.score).toBe(100);
    expect(result.wordScores?.[2]?.score).toBeLessThan(80);
    expect(result.accuracy).toBeLessThan(100);
  });
});
