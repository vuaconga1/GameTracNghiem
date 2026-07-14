import { describe, expect, it } from 'vitest';
import {
  extensionOf,
  mediaKindFromFilename,
  normalizeMediaKey,
} from './normalizeMediaKey';

describe('normalizeMediaKey', () => {
  it('strips extension and lowercases', () => {
    expect(normalizeMediaKey('Table.PNG')).toBe('table');
  });

  it('normalizes dashes, underscores, and spaces to the same key', () => {
    expect(normalizeMediaKey('hang-out.mp3')).toBe('hang out');
    expect(normalizeMediaKey('hang_out')).toBe('hang out');
    expect(normalizeMediaKey('hang out')).toBe('hang out');
  });

  it('keeps multi-word names after stripping extension', () => {
    expect(normalizeMediaKey('Table tennis.png')).toBe('table tennis');
  });

  it('collapses whitespace', () => {
    expect(normalizeMediaKey('  hello   world.jpg  ')).toBe('hello world');
    expect(normalizeMediaKey('foo__bar--baz.wav')).toBe('foo bar baz');
  });

  it('strips path prefix', () => {
    expect(normalizeMediaKey('folder/sub/Table.PNG')).toBe('table');
    expect(normalizeMediaKey('folder\\sub\\hang-out.mp3')).toBe('hang out');
  });
});

describe('extensionOf', () => {
  it('returns lowercase extension without dot', () => {
    expect(extensionOf('photo.JPG')).toBe('jpg');
    expect(extensionOf('track.MP3')).toBe('mp3');
  });

  it('returns empty string when no extension', () => {
    expect(extensionOf('readme')).toBe('');
  });
});

describe('mediaKindFromFilename', () => {
  it('detects image files', () => {
    expect(mediaKindFromFilename('photo.jpg')).toBe('image');
  });

  it('detects audio files', () => {
    expect(mediaKindFromFilename('track.mp3')).toBe('audio');
  });

  it('returns null for unsupported extensions', () => {
    expect(mediaKindFromFilename('notes.txt')).toBe(null);
  });
});
