/**
 * Global Success 1 core vocabulary (4 words / unit) with Vietnamese hints + IPA.
 * Source: Student's Book units; cross-checked with Grade 1 vocab summaries.
 */

export type Lop1VocabItem = {
  word: string;
  hint: string;
  ipa?: string;
};

export type Lop1UnitVocab = {
  unit: number;
  title: string;
  /** Phonics focus letter/sound for pronunciation grouping. */
  sound: string;
  words: Lop1VocabItem[];
};

export const LOP1_UNIT_VOCAB: Record<number, Lop1UnitVocab> = {
  1: {
    unit: 1,
    title: 'In The School Playground',
    sound: '/b/',
    words: [
      { word: 'Bill', hint: 'bạn Bill', ipa: '/bɪl/' },
      { word: 'ball', hint: 'quả bóng', ipa: '/bɔːl/' },
      { word: 'book', hint: 'quyển sách', ipa: '/bʊk/' },
      { word: 'bike', hint: 'xe đạp', ipa: '/baɪk/' },
    ],
  },
  2: {
    unit: 2,
    title: 'In The Dining Room',
    sound: '/k/',
    words: [
      { word: 'cake', hint: 'bánh ngọt', ipa: '/keɪk/' },
      { word: 'car', hint: 'xe ô tô', ipa: '/kɑː/' },
      { word: 'cat', hint: 'con mèo', ipa: '/kæt/' },
      { word: 'cup', hint: 'cái tách', ipa: '/kʌp/' },
    ],
  },
  3: {
    unit: 3,
    title: 'At The Street Market',
    sound: '/æ/',
    words: [
      { word: 'apple', hint: 'quả táo', ipa: '/ˈæpl/' },
      { word: 'bag', hint: 'cái túi', ipa: '/bæg/' },
      { word: 'can', hint: 'cái lon', ipa: '/kæn/' },
      { word: 'hat', hint: 'cái mũ', ipa: '/hæt/' },
    ],
  },
  4: {
    unit: 4,
    title: 'In The Bedroom',
    sound: '/d/',
    words: [
      { word: 'desk', hint: 'bàn học', ipa: '/desk/' },
      { word: 'dog', hint: 'con chó', ipa: '/dɒɡ/' },
      { word: 'door', hint: 'cửa', ipa: '/dɔː/' },
      { word: 'duck', hint: 'con vịt', ipa: '/dʌk/' },
    ],
  },
  5: {
    unit: 5,
    title: 'At The Fish And Chip Shop',
    sound: '/ɪ/',
    words: [
      { word: 'chicken', hint: 'thịt gà', ipa: '/ˈtʃɪkɪn/' },
      { word: 'chips', hint: 'khoai tây chiên', ipa: '/tʃɪps/' },
      { word: 'fish', hint: 'cá', ipa: '/fɪʃ/' },
      { word: 'milk', hint: 'sữa', ipa: '/mɪlk/' },
    ],
  },
  6: {
    unit: 6,
    title: 'In The Classroom',
    sound: '/e/',
    words: [
      { word: 'bell', hint: 'cái chuông', ipa: '/bel/' },
      { word: 'pen', hint: 'bút mực', ipa: '/pen/' },
      { word: 'pencil', hint: 'bút chì', ipa: '/ˈpensl/' },
      { word: 'red', hint: 'màu đỏ', ipa: '/red/' },
    ],
  },
  7: {
    unit: 7,
    title: 'In The Garden',
    sound: '/ɡ/',
    words: [
      { word: 'garden', hint: 'khu vườn', ipa: '/ˈɡɑːdn/' },
      { word: 'gate', hint: 'cổng', ipa: '/ɡeɪt/' },
      { word: 'girl', hint: 'bé gái', ipa: '/ɡɜːl/' },
      { word: 'goat', hint: 'con dê', ipa: '/ɡəʊt/' },
    ],
  },
  8: {
    unit: 8,
    title: 'In The Park',
    sound: '/h/',
    words: [
      { word: 'hair', hint: 'tóc', ipa: '/heə/' },
      { word: 'hand', hint: 'bàn tay', ipa: '/hænd/' },
      { word: 'head', hint: 'đầu', ipa: '/hed/' },
      { word: 'horse', hint: 'con ngựa', ipa: '/hɔːs/' },
    ],
  },
  9: {
    unit: 9,
    title: 'In The Shop',
    sound: '/ɒ/',
    words: [
      { word: 'clocks', hint: 'những chiếc đồng hồ', ipa: '/klɒks/' },
      { word: 'locks', hint: 'những ổ khóa', ipa: '/lɒks/' },
      { word: 'mops', hint: 'những cây lau nhà', ipa: '/mɒps/' },
      { word: 'pots', hint: 'những cái nồi', ipa: '/pɒts/' },
    ],
  },
  10: {
    unit: 10,
    title: 'At The Zoo',
    sound: '/m/',
    words: [
      { word: 'mango', hint: 'quả xoài', ipa: '/ˈmæŋɡəʊ/' },
      { word: 'monkey', hint: 'con khỉ', ipa: '/ˈmʌŋki/' },
      { word: 'mother', hint: 'mẹ', ipa: '/ˈmʌðə/' },
      { word: 'mouse', hint: 'con chuột', ipa: '/maʊs/' },
    ],
  },
  11: {
    unit: 11,
    title: 'At The Bus Stop',
    sound: '/ʌ/',
    words: [
      { word: 'bus', hint: 'xe buýt', ipa: '/bʌs/' },
      { word: 'run', hint: 'chạy', ipa: '/rʌn/' },
      { word: 'sun', hint: 'mặt trời', ipa: '/sʌn/' },
      { word: 'truck', hint: 'xe tải', ipa: '/trʌk/' },
    ],
  },
  12: {
    unit: 12,
    title: 'At The Lake',
    sound: '/l/',
    words: [
      { word: 'lake', hint: 'hồ', ipa: '/leɪk/' },
      { word: 'leaf', hint: 'chiếc lá', ipa: '/liːf/' },
      { word: 'lemons', hint: 'những quả chanh', ipa: '/ˈlemənz/' },
      { word: 'Lucy', hint: 'bạn Lucy', ipa: '/ˈluːsi/' },
    ],
  },
  13: {
    unit: 13,
    title: 'In The School Canteen',
    sound: '/n/',
    words: [
      { word: 'bananas', hint: 'những quả chuối', ipa: '/bəˈnɑːnəz/' },
      { word: 'noodles', hint: 'mì / bún', ipa: '/ˈnuːdlz/' },
      { word: 'nuts', hint: 'các loại hạt', ipa: '/nʌts/' },
      { word: 'Nick', hint: 'bạn Nick', ipa: '/nɪk/' },
    ],
  },
  14: {
    unit: 14,
    title: 'In The Toy Shop',
    sound: '/t/',
    words: [
      { word: 'teddy bear', hint: 'gấu bông', ipa: '/ˈtedi beə/' },
      { word: 'tiger', hint: 'con hổ', ipa: '/ˈtaɪɡə/' },
      { word: 'top', hint: 'con quay', ipa: '/tɒp/' },
      { word: 'turtle', hint: 'con rùa', ipa: '/ˈtɜːtl/' },
    ],
  },
  15: {
    unit: 15,
    title: 'At The Football Match',
    sound: '/f/',
    words: [
      { word: 'face', hint: 'khuôn mặt', ipa: '/feɪs/' },
      { word: 'father', hint: 'bố', ipa: '/ˈfɑːðə/' },
      { word: 'foot', hint: 'bàn chân', ipa: '/fʊt/' },
      { word: 'football', hint: 'bóng đá', ipa: '/ˈfʊtbɔːl/' },
    ],
  },
  16: {
    unit: 16,
    title: 'At Home',
    sound: '/w/',
    words: [
      { word: 'wash', hint: 'rửa / giặt', ipa: '/wɒʃ/' },
      { word: 'water', hint: 'nước', ipa: '/ˈwɔːtə/' },
      { word: 'window', hint: 'cửa sổ', ipa: '/ˈwɪndəʊ/' },
      { word: 'Wendy', hint: 'bạn Wendy', ipa: '/ˈwendi/' },
    ],
  },
};

export function getLop1UnitVocab(unit: number): Lop1UnitVocab {
  const data = LOP1_UNIT_VOCAB[unit];
  if (!data) {
    throw new Error(`Unknown Lớp 1 vocab unit: ${unit}`);
  }
  return data;
}

export function slugifyLop1Word(word: string): string {
  return word
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
