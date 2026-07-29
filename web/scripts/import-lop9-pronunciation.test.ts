import { describe, expect, it } from 'vitest';

import {
  buildPronunciationRows,
  theoryBlurb,
} from './import-lop9-pronunciation';

describe('import-lop9-pronunciation helpers', () => {
  it('builds grouped pronunciation rows with theory only on first item', () => {
    const rows = buildPronunciationRows(
      {
        index: 1,
        ipa: 'æ',
        title: 'Âm /æ/',
        heading: '1. SOUND /æ/',
        slug: 'AE',
        words: [
          { word: 'bat', ipa: '/bæt/', meaning: 'con dơi' },
          { word: 'cat', ipa: '/kæt/', meaning: 'con mèo' },
        ],
        theory: ['1.1. Cách phát âm âm /æ/', 'Bước 1: Mở miệng rộng.'],
      },
      ['VOWEL REVISION: Sound /æ/; /ɑː/ and /e/'],
      true,
    );

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      mode: 'phoneme',
      exercise: 'Âm /æ/',
      exerciseKey: 'AE',
      targetText: 'bat',
      targetIpa: '/bæt/',
      hint: 'con dơi',
    });
    expect(rows[0]?.theoryText).toContain('1.1. Cách phát âm âm /æ/');
    expect(rows[1]).toMatchObject({
      exercise: 'Âm /æ/',
      exerciseKey: 'AE',
      targetText: 'cat',
      targetIpa: '/kæt/',
      hint: 'con mèo',
      theoryText: '',
    });
  });

  it('strips vocab-table noise from inline theory text', () => {
    const text = theoryBlurb(
      {
        index: 2,
        ipa: 'ɑː',
        title: 'Âm /ɑː/',
        heading: '2. SOUND /ɑː/',
        slug: 'AA',
        words: [],
        theory: [
          '2.1. Cách phát âm âm /ɑː/',
          'Bước 1: Phần miệng mở rộng một cách tự nhiên.',
          'Các em luyện phát âm các ví dụ sau:',
          'large',
          'adj',
          '/lɑːdʒ/',
          'to lớn, rộng',
          '2.2. Dấu hiệu nhận biết âm /a:/',
          '2.2.1. Khi nguyên âm “a” đứng ở đầu một từ',
        ],
      },
      ['VOWEL REVISION: Sound /æ/; /ɑː/ and /e/'],
      false,
    );

    expect(text).toContain('2.1. Cách phát âm âm /ɑː/');
    expect(text).toContain('2.2. Dấu hiệu nhận biết âm /a:/');
    expect(text).not.toContain('large');
    expect(text).not.toContain('/lɑːdʒ/');
    expect(text).not.toContain('adj');
  });
});
