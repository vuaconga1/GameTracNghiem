import { describe, expect, it } from 'vitest';

import { appendTranscriptLine, type TranscriptLine } from '@/lib/speaking/appendTranscriptLine';

function line(role: 'user' | 'assistant', text: string, at = 1): TranscriptLine {
  return { role, text, at };
}

describe('appendTranscriptLine', () => {
  it('skips exact duplicate user text that arrives after an assistant line', () => {
    const prev = [
      line('user', 'I play table tennis after school.'),
      line('assistant', 'Oh.'),
    ];
    const next = appendTranscriptLine(prev, 'user', 'I play table tennis after school.');
    expect(next).toEqual(prev);
  });

  it('merges longer completed user text into an earlier user line after assistant started', () => {
    const prev = [
      line('user', 'I play table'),
      line('assistant', 'Oh.'),
    ];
    const next = appendTranscriptLine(prev, 'user', 'I play table tennis after school.');
    expect(next).toEqual([
      line('user', 'I play table tennis after school.'),
      line('assistant', 'Oh.'),
    ]);
  });

  it('appends a genuinely new user turn after assistant', () => {
    const prev = [
      line('user', 'I like football.'),
      line('assistant', 'Nice!'),
    ];
    const next = appendTranscriptLine(prev, 'user', 'I also like reading.');
    expect(next).toHaveLength(3);
    expect(next[2]).toMatchObject({ role: 'user', text: 'I also like reading.' });
  });
});
