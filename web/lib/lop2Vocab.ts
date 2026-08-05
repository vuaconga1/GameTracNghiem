/**
 * Global Success 2 core vocabulary (~3–4 words / unit) with Vietnamese hints + IPA.
 * Source of words + IPA: numbered vocab cards (image + IPA) on
 * `PDF/Global Grade 2/Global success 2 Từ Vựng + Grammar.pdf`
 * — not Sentence Pattern / Phonics example sentences.
 */

export type Lop2VocabItem = {
  word: string;
  hint: string;
  ipa?: string;
};

export type Lop2UnitVocab = {
  unit: number;
  title: string;
  sound?: string;
  words: Lop2VocabItem[];
};

export const LOP2_UNIT_VOCAB: Record<number, Lop2UnitVocab> = {
  1: {
    unit: 1,
    title: 'At My Birthday Party',
    sound: '/p/',
    words: [
      { word: 'pasta', hint: 'mỳ Ý', ipa: "/ˈpæstə/" },
      { word: 'popcorn', hint: 'bỏng ngô', ipa: "/ˈpɒpkɔːrn/" },
      { word: 'pizza', hint: 'bánh pizza', ipa: "/ˈpiːtsə/" },
    ],
  },
  2: {
    unit: 2,
    title: 'In The Backyard',
    sound: '/k/',
    words: [
      { word: 'kite', hint: 'con diều', ipa: '/kaɪt/' },
      { word: 'bike', hint: 'xe đạp', ipa: '/baɪk/' },
      { word: 'kitten', hint: 'mèo con', ipa: "/ˈkɪtn/" },
    ],
  },
  3: {
    unit: 3,
    title: 'At The Seaside',
    sound: '/s/',
    words: [
      { word: 'sail', hint: 'đi thuyền / buồm', ipa: '/seɪl/' },
      { word: 'sand', hint: 'cát', ipa: '/sænd/' },
      { word: 'sea', hint: 'biển', ipa: '/siː/' },
    ],
  },
  4: {
    unit: 4,
    title: 'In The Countryside',
    sound: '/r/',
    words: [
      { word: 'rainbow', hint: 'cầu vồng', ipa: "/ˈreɪnbəʊ/" },
      { word: 'river', hint: 'sông', ipa: "/ˈrɪvər/" },
      { word: 'road', hint: 'con đường', ipa: '/roʊd/' },
    ],
  },
  5: {
    unit: 5,
    title: 'In The Classroom',
    sound: '/kw/',
    words: [
      { word: 'question', hint: 'câu hỏi', ipa: "/ˈkwestʃən/" },
      { word: 'square', hint: 'hình vuông', ipa: '/skwɛər/' },
      { word: 'quiz', hint: 'câu đố', ipa: '/kwɪz/' },
    ],
  },
  6: {
    unit: 6,
    title: 'On The Farm',
    sound: '/ɒks/',
    words: [
      { word: 'box', hint: 'cái hộp', ipa: '/bɒks/' },
      { word: 'fox', hint: 'con cáo', ipa: '/fɒks/' },
      { word: 'ox', hint: 'con bò u', ipa: '/ɒks/' },
    ],
  },
  7: {
    unit: 7,
    title: 'In The Kitchen',
    sound: '/dʒ/',
    words: [
      { word: 'juice', hint: 'nước ép', ipa: '/dʒuːs/' },
      { word: 'jelly', hint: 'thạch', ipa: "/ˈdʒɛli/" },
      { word: 'jam', hint: 'mứt', ipa: '/dʒæm/' },
    ],
  },
  8: {
    unit: 8,
    title: 'In The Village',
    sound: '/v/',
    words: [
      { word: 'village', hint: 'ngôi làng', ipa: "/ˈvɪlɪdʒ/" },
      { word: 'van', hint: 'xe tải nhỏ', ipa: '/væn/' },
      { word: 'volleyball', hint: 'bóng chuyền', ipa: "/ˈvɒlibɔːl/" },
    ],
  },
  9: {
    unit: 9,
    title: 'In The Grocery Store',
    sound: '/j/',
    words: [
      { word: 'yogurt', hint: 'sữa chua', ipa: "/ˈjoʊɡərt/" },
      { word: 'yams', hint: 'khoai mỡ', ipa: '/jæmz/' },
      { word: 'yo-yos', hint: 'những cái yo-yo', ipa: "/ˈjoʊjoʊz/" },
    ],
  },
  10: {
    unit: 10,
    title: 'At The Zoo',
    sound: '/z/',
    words: [
      { word: 'zoo', hint: 'sở thú', ipa: '/zuː/' },
      { word: 'zebu', hint: 'bò zebu', ipa: "/ˈziːbuː/" },
      { word: 'zebra', hint: 'ngựa vằn', ipa: "/ˈziːbrə/" },
    ],
  },
  11: {
    unit: 11,
    title: 'In The Playground',
    sound: '/aɪ/',
    words: [
      { word: 'slide', hint: 'cầu trượt', ipa: '/slaɪd/' },
      { word: 'ride', hint: 'đi / cưỡi', ipa: '/raɪd/' },
      { word: 'drive', hint: 'lái xe', ipa: '/draɪv/' },
    ],
  },
  12: {
    unit: 12,
    title: 'At The Cafe',
    sound: '/eɪ/',
    words: [
      { word: 'grapes', hint: 'nho', ipa: '/ɡreɪps/' },
      { word: 'cake', hint: 'bánh ngọt', ipa: '/keɪk/' },
      { word: 'table', hint: 'cái bàn', ipa: "/ˈteɪbl/" },
    ],
  },
  13: {
    unit: 13,
    title: 'In The Maths Class',
    sound: '/iː/',
    words: [
      { word: 'eleven', hint: 'mười một', ipa: "/ɪˈlevən/" },
      { word: 'thirteen', hint: 'mười ba', ipa: "/ˌθɜːrˈtiːn/" },
      { word: 'fourteen', hint: 'mười bốn', ipa: "/ˌfɔːrˈtiːn/" },
      { word: 'fifteen', hint: 'mười lăm', ipa: "/ˌfɪfˈtiːn/" },
    ],
  },
  14: {
    unit: 14,
    title: 'At Home',
    sound: '/ɜː/',
    words: [
      { word: 'brother', hint: 'anh / em trai', ipa: "/ˈbrʌðər/" },
      { word: 'sister', hint: 'chị / em gái', ipa: "/ˈsɪstər/" },
      { word: 'grandmother', hint: 'bà', ipa: "/ˈɡrændˌmʌðər/" },
    ],
  },
  15: {
    unit: 15,
    title: 'In The Clothes Shop',
    sound: '/ʃ/',
    words: [
      { word: 'shirts', hint: 'áo sơ mi', ipa: '/ʃɜːrts/' },
      { word: 'shoes', hint: 'giày', ipa: '/ʃuːz/' },
      { word: 'shorts', hint: 'quần đùi', ipa: '/ʃɔːrts/' },
    ],
  },
  16: {
    unit: 16,
    title: 'At The Campsite',
    sound: '/t/',
    words: [
      { word: 'tent', hint: 'cái lều', ipa: '/tent/' },
      { word: 'teapot', hint: 'ấm trà', ipa: "/ˈtiːpɒt/" },
      { word: 'blanket', hint: 'chăn', ipa: "/ˈblæŋkɪt/" },
    ],
  },
};

export function getLop2UnitVocab(unit: number): Lop2UnitVocab {
  const data = LOP2_UNIT_VOCAB[unit];
  if (!data) throw new Error(`Unknown Lớp 2 vocab unit: ${unit}`);
  return data;
}

export function slugifyLop2Word(word: string): string {
  return word
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
