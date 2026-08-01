import { afterEach, describe, expect, it, vi } from 'vitest';

describe('speakEnglish', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('speaks trimmed English text via speechSynthesis', async () => {
    const speak = vi.fn();
    const cancel = vi.fn();
    const Utterance = vi.fn(function MockUtterance(this: { text: string }, text: string) {
      this.text = text;
    });
    vi.stubGlobal('speechSynthesis', { speak, cancel });
    vi.stubGlobal('SpeechSynthesisUtterance', Utterance);

    const { speakEnglish } = await import('./speakEnglish');
    speakEnglish('  Documentation  ');

    expect(cancel).toHaveBeenCalled();
    expect(Utterance).toHaveBeenCalledWith('Documentation');
    expect(speak).toHaveBeenCalledTimes(1);
  });
});
