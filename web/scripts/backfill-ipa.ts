/**
 * Backfill missing IPA in primary vocab files (lop3–lop4).
 * Reuses existing IPA from sibling grades + wewin-vocab-by-grade-unit.txt,
 * then CMU pronouncing dictionary (ARPAbet → British-style IPA).
 *
 * Usage: npx tsx scripts/backfill-ipa.ts [--write]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dictionary as cmuDict } from 'cmu-pronouncing-dictionary';

import { LOP1_UNIT_VOCAB } from '../lib/lop1Vocab';
import { LOP2_UNIT_VOCAB } from '../lib/lop2Vocab';
import { LOP3_UNIT_VOCAB } from '../lib/lop3Vocab';
import { LOP4_UNIT_VOCAB } from '../lib/lop4Vocab';
import { LOP5_UNIT_VOCAB } from '../lib/lop5Vocab';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const WEWIN_VOCAB = path.resolve(ROOT, '../../../wewin-vocab-by-grade-unit.txt');

const ARPABET_TO_IPA: Record<string, string> = {
  AA: 'ɑː',
  AE: 'æ',
  AH: 'ʌ',
  AO: 'ɒ',
  AW: 'aʊ',
  AY: 'aɪ',
  B: 'b',
  CH: 'tʃ',
  D: 'd',
  DH: 'ð',
  EH: 'e',
  ER: 'ɜː',
  EY: 'eɪ',
  F: 'f',
  G: 'ɡ',
  HH: 'h',
  IH: 'ɪ',
  IY: 'iː',
  JH: 'dʒ',
  K: 'k',
  L: 'l',
  M: 'm',
  N: 'n',
  NG: 'ŋ',
  OW: 'əʊ',
  OY: 'ɔɪ',
  P: 'p',
  R: 'r',
  S: 's',
  SH: 'ʃ',
  T: 't',
  TH: 'θ',
  UH: 'ʊ',
  UW: 'uː',
  V: 'v',
  W: 'w',
  Y: 'j',
  Z: 'z',
  ZH: 'ʒ',
};

const VOWEL_PHONES = new Set([
  'AA', 'AE', 'AH', 'AO', 'AW', 'AY', 'EH', 'ER', 'EY', 'IH', 'IY', 'OW', 'OY', 'UH', 'UW',
]);

function britishizeIpa(ipa: string): string {
  return ipa
    .replace(/ɑːr/g, 'ɑː')
    .replace(/ɔːr/g, 'ɔː')
    .replace(/ɜːr/g, 'ɜː')
    .replace(/eər/g, 'eə')
    .replace(/ʊr/g, 'ʊə')
    .replace(/ɪr/g, 'ɪə');
}

/** British-style overrides matching existing WeWin cards. */
const WORD_OVERRIDES: Record<string, string> = {
  monday: '/ˈmʌndeɪ/',
  tuesday: '/ˈtjuːzdeɪ/',
  wednesday: '/ˈwenzdeɪ/',
  thursday: '/ˈθɜːzdeɪ/',
  friday: '/ˈfraɪdeɪ/',
  saturday: '/ˈsætədeɪ/',
  sunday: '/ˈsʌndeɪ/',
  maths: '/mæθs/',
  pe: '/ˌpiː ˈiː/',
  tv: '/ˌtiːˈviː/',
  week: '/wiːk/',
  day: '/deɪ/',
  vietnamese: '/ˌvjetnəˈmiːz/',
  english: '/ˈɪŋɡlɪʃ/',
  bangkok: '/ˈbæŋkɒk/',
  london: '/ˈlʌndən/',
  sydney: '/ˈsɪdni/',
  tokyo: '/ˈtəʊkiəʊ/',
  "t-shirt": '/ˈtiː ʃɜːt/',
  "ice-cream": '/ˈaɪskriːm/',
  "isn't": '/ˈɪznt/',
  "o'clock": '/əˈklɒk/',
  giraffes: '/dʒəˈrɑːfs/',
  hippos: '/ˈhɪpəʊz/',
  peacocks: '/ˈpiːkɒks/',
  crocodiles: '/ˈkrɒkədaɪlz/',
  october: '/ɒkˈtəʊbə(r)/',
  invite: '/ɪnˈvaɪt/',
  enjoy: '/ɪnˈdʒɔɪ/',
  art: '/ɑːt/',
  actor: '/ˈæktə(r)/',
  opposite: '/ˈɒpəzɪt/',
  bookshop: '/ˈbʊkʃɒp/',
  is: '/ɪz/',
  at: '/æt/',
  on: '/ɒn/',
  in: '/ɪn/',
  favourite: '/ˈfeɪvərɪt/',
  centre: '/ˈsentə/',
  yoghurt: '/ˈjɒɡət/',
};

const PHRASE_OVERRIDES: Record<string, string> = {
  'every day': '/ˈevri deɪ/',
  'read books': '/riːd bʊks/',
  'watch tv': '/wɒtʃ ˌtiːˈviː/',
  'play games': '/pleɪ ɡeɪmz/',
  'have a great time': '/hæv ə ɡreɪt taɪm/',
  'clean my room': '/kliːn maɪ ruːm/',
  'have english': '/hæv ˈɪŋɡlɪʃ/',
  'have pe': '/hæv ˌpiː ˈiː/',
  'have music': '/hæv ˈmjuːzɪk/',
  'have art': '/hæv ɑːt/',
  'have maths': '/hæv mæθs/',
  'have science': '/hæv ˈsaɪəns/',
  'play football': '/pleɪ ˈfʊtbɔːl/',
  'play badminton': '/pleɪ ˈbædmɪntən/',
  'on the weekend': '/ɒn ðə ˌwiːkˈend/',
  'make a wish': '/meɪk ə wɪʃ/',
  'blow out': '/bləʊ aʊt/',
  'take photos': '/teɪk ˈfəʊtəʊz/',
  'play the guitar': '/pleɪ ðə ɡɪˈtɑː(r)/',
  'play the piano': '/pleɪ ðə piˈænəʊ/',
  'ride a bike': '/raɪd ə baɪk/',
  'ride a horse': '/raɪd ə hɔːs/',
  'fly a kite': '/flaɪ ə kaɪt/',
  'plant trees': '/plɑːnt triːz/',
  'help parents': '/help ˈpeərənts/',
  'clean the room': '/kliːn ðə ruːm/',
  'computer room': '/kəmˈpjuːtə ruːm/',
  'music room': '/ˈmjuːzɪk ruːm/',
  'art room': '/ɑːt ruːm/',
  'science room': '/ˈsaɪəns ruːm/',
  'english teacher': '/ˈɪŋɡlɪʃ ˈtiːtʃə(r)/',
  'maths teacher': '/mæθs ˈtiːtʃə(r)/',
  'play sports': '/pleɪ spɔːts/',
  'sports day': '/spɔːts deɪ/',
  'tug of war': '/ˌtʌɡ əv ˈwɔː(r)/',
  "isn't it": '/ˈɪznt ɪt/',
  'come back': '/kʌm bæk/',
  'go swimming': '/ɡəʊ ˈswɪmɪŋ/',
  'go camping': '/ɡəʊ ˈkæmpɪŋ/',
  'a busy street': '/ə ˈbɪzi striːt/',
  'a quiet village': '/ə ˈkwaɪət ˈvɪlɪdʒ/',
  'a noisy road': '/ə ˈnɔɪzi rəʊd/',
  'a big city': '/ə bɪɡ ˈsɪti/',
  'office worker': '/ˈɒfɪs ˌwɜːkə(r)/',
  'nursing home': '/ˈnɜːsɪŋ həʊm/',
  'look like': '/lʊk laɪk/',
  'short hair': '/ʃɔːt heə(r)/',
  'long hair': '/lɒŋ heə(r)/',
  'round face': '/raʊnd feɪs/',
  'big eyes': '/bɪɡ aɪz/',
  'in the morning': '/ɪn ðə ˈmɔːnɪŋ/',
  'in the afternoon': '/ɪn ði ˌɑːftəˈnuːn/',
  'at noon': '/æt nuːn/',
  'in the evening': '/ɪn ði ˈiːvnɪŋ/',
  'do housework': '/duː ˈhaʊswɜːk/',
  'wash the clothes': '/wɒʃ ðə kləʊðz/',
  'clean the floor': '/kliːn ðə flɔː(r)/',
  'help with the cooking': '/help wɪð ðə ˈkʊkɪŋ/',
  'wash the dishes': '/wɒʃ ðə ˈdɪʃɪz/',
  'shopping centre': '/ˈʃɒpɪŋ ˌsentə/',
  'sports centre': '/spɔːts ˌsentə/',
  'swimming pool': '/ˈswɪmɪŋ puːl/',
  'a lot of': '/ə lɒt əv/',
  'cook meals': '/kʊk miːlz/',
  'play tennis': '/pleɪ ˈtenɪs/',
  'watch films': '/wɒtʃ fɪlmz/',
  'do yoga': '/duː ˈjəʊɡə/',
  'stay at home': '/steɪ æt həʊm/',
  'last weekend': '/lɑːst ˌwiːkˈend/',
  'food stall': '/fuːd stɔːl/',
  'water park': '/ˈwɔːtə pɑːk/',
  'turn right': '/tɜːn raɪt/',
  'turn left': '/tɜːn left/',
  'go straight': '/ɡəʊ streɪt/',
  'turn round': '/tɜːn raʊnd/',
  'get to': '/ɡet tuː/',
  'on the left': '/ɒn ðə left/',
  'on the right': '/ɒn ðə raɪt/',
  'excuse me': '/ɪkˈskjuːs miː/',
  'toy shop': '/tɔɪ ʃɒp/',
  'gift shop': '/ɡɪft ʃɒp/',
  'shoe shop': '/ʃuː ʃɒp/',
  'dance beautifully': '/dɑːns ˈbjuːtɪfli/',
  'run quickly': '/rʌn ˈkwɪkli/',
  'roar loudly': '/rɔː ˈlaʊdli/',
  'sing merrily': '/sɪŋ ˈmerɪli/',
  'history and geography': '/ˈhɪstri ənd dʒiˈɒɡrəfi/',
};

type VocabRecord = Record<number, { words: Array<{ word: string; hint: string; ipa?: string }> }>;

function normKey(word: string): string {
  return word.trim().toLowerCase();
}

function isValidIpa(ipa: string): boolean {
  const inner = ipa.replace(/^\/|\/$/g, '').trim();
  if (!inner || inner === '—' || inner === '-') return false;
  if (inner.length <= 1) return false;
  if (/^[a-zA-Z]$/.test(inner)) return false;
  return true;
}

function collectExistingIpa(...records: VocabRecord[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const record of records) {
    for (const unit of Object.values(record)) {
      for (const item of unit.words) {
        const ipa = String(item.ipa || '').trim();
        if (!isValidIpa(ipa)) continue;
        map.set(normKey(item.word), ipa.startsWith('/') ? ipa : `/${ipa}/`);
      }
    }
  }
  return map;
}

function parseWewinVocabIpa(filePath: string, gradeLabel: string): Map<string, string> {
  const map = new Map<string, string>();
  if (!fs.existsSync(filePath)) return map;
  const txt = fs.readFileSync(filePath, 'utf8');
  const gradeBlock = txt.split(/={10,}/).find((b) => b.includes(`LỚP / CẤP: ${gradeLabel}`));
  if (!gradeBlock) return map;
  const lineRe = /^\s*\d+\.\s+(.+?)\s+(\/\S+\/|\(—\))\s+\[PS\]/gm;
  let m: RegExpExecArray | null;
  while ((m = lineRe.exec(gradeBlock))) {
    const word = m[1].trim();
    const ipa = m[2].trim();
    if (ipa.startsWith('/')) map.set(normKey(word), ipa);
  }
  return map;
}

function arpabetToIpa(phones: string[]): string {
  type Tok = { ipa: string; isVowel: boolean; stress?: string };
  const tokens: Tok[] = [];
  for (const phone of phones) {
    const stress = phone.match(/(\d)$/)?.[1];
    const base = phone.replace(/\d$/, '');
    const ipa = ARPABET_TO_IPA[base];
    if (!ipa) return '';
    tokens.push({ ipa, isVowel: VOWEL_PHONES.has(base), stress });
  }

  const primary = tokens.findIndex((t) => t.stress === '1');
  const vowels = tokens.filter((t) => t.isVowel).length;
  let stressAt = -1;
  if (primary >= 0 && vowels > 1) {
    stressAt = primary;
    while (stressAt > 0 && !tokens[stressAt - 1].isVowel) stressAt -= 1;
  }

  let out = '';
  for (let i = 0; i < tokens.length; i++) {
    if (i === stressAt) out += 'ˈ';
    out += tokens[i].ipa;
  }
  return out ? britishizeIpa(`/${out}/`) : '';
}

function cmuLookup(word: string): string {
  const key = word.toLowerCase().replace(/[^a-z'-]/g, '');
  if (!key) return '';
  const raw = (cmuDict as Record<string, string>)[key];
  if (!raw) return '';
  const phones = raw.split(' ');
  return arpabetToIpa(phones);
}

function lookupIpa(word: string, existing: Map<string, string>, preferFresh = false): string {
  if (word === 'IT') return '/ˌaɪ ˈtiː/';
  if (word === 'PE') return '/ˌpiː ˈiː/';
  const key = normKey(word);
  if (!preferFresh && existing.has(key)) return existing.get(key)!;
  if (WORD_OVERRIDES[key]) return WORD_OVERRIDES[key];
  if (PHRASE_OVERRIDES[key]) return PHRASE_OVERRIDES[key];

  const tokens = word.split(/\s+/);
  if (tokens.length > 1) {
    const parts: string[] = [];
    for (const token of tokens) {
      const part = lookupIpa(token, existing, preferFresh);
      if (!part) return '';
      parts.push(part.replace(/^\//, '').replace(/\/$/, ''));
    }
    return `/${parts.join(' ')}/`;
  }

  const cmu = cmuLookup(word);
  if (cmu) return cmu;
  return '';
}

function needsIpaRefresh(word: string, ipa: string, unitNum: string, forceUnitsFrom: number | null): boolean {
  if (!isValidIpa(ipa)) return true;
  if (forceUnitsFrom !== null && Number(unitNum) >= forceUnitsFrom) return true;
  return false;
}

function patchVocabFile(
  relPath: string,
  record: VocabRecord,
  existing: Map<string, string>,
  forceUnitsFrom: number | null = null,
): number {
  const abs = path.join(ROOT, relPath);
  const lines = fs.readFileSync(abs, 'utf8').split('\n');
  let patched = 0;
  let currentUnit = -1;

  const pending = new Map<string, string>();
  for (const [unitNum, unit] of Object.entries(record)) {
    for (const item of unit.words) {
      const current = String(item.ipa || '').trim();
      if (current && !needsIpaRefresh(item.word, current, unitNum, forceUnitsFrom)) continue;
      const preferFresh = forceUnitsFrom !== null && Number(unitNum) >= forceUnitsFrom;
      const ipa = lookupIpa(item.word, existing, preferFresh);
      if (!ipa || !isValidIpa(ipa)) {
        console.warn(`  [MISS] unit ${unitNum}: ${item.word}`);
        continue;
      }
      pending.set(`${unitNum}|${item.word}|${item.hint}`, ipa);
      existing.set(normKey(item.word), ipa);
      patched += 1;
    }
  }

  const unitRe = /^\s*(\d+):\s*\{/;
  const wordLineNoIpaRe =
    /^(\s*)\{\s*word:\s*(?:"([^"]*)"|'([^']*)'),\s*hint:\s*(?:"([^"]*)"|'([^']*)')\s*\},?\s*$/;
  const wordLineIpaRe =
    /^(\s*)\{\s*word:\s*(?:"([^"]*)"|'([^']*)'),\s*hint:\s*(?:"([^"]*)"|'([^']*)'),\s*ipa:\s*(?:"([^"]*)"|'([^']*)')\s*\},?\s*$/;

  for (let i = 0; i < lines.length; i++) {
    const unitMatch = lines[i].match(unitRe);
    if (unitMatch) currentUnit = Number(unitMatch[1]);

    const wordMatch = lines[i].match(wordLineIpaRe) ?? lines[i].match(wordLineNoIpaRe);
    if (!wordMatch) continue;

    const word = wordMatch[2] ?? wordMatch[3] ?? '';
    const hint = wordMatch[4] ?? wordMatch[5] ?? '';
    const currentIpa = wordMatch[6] ?? wordMatch[7] ?? '';
    if (currentIpa && !needsIpaRefresh(word, currentIpa, String(currentUnit), forceUnitsFrom)) continue;

    const ipa = pending.get(`${currentUnit}|${word}|${hint}`);
    if (!ipa) continue;

    const indent = wordMatch[1];
    const quote = wordMatch[2] !== undefined ? '"' : "'";
    const w = quote === '"' ? word.replace(/\\/g, '\\\\').replace(/"/g, '\\"') : word;
    const h = quote === '"' ? hint.replace(/\\/g, '\\\\').replace(/"/g, '\\"') : hint;
    lines[i] = `${indent}{ word: ${quote}${w}${quote}, hint: ${quote}${h}${quote}, ipa: ${quote}${ipa}${quote} },`;
  }

  if (patched > 0 && process.argv.includes('--write')) {
    fs.writeFileSync(abs, lines.join('\n'), 'utf8');
  }
  return patched;
}

const existing = collectExistingIpa(
  LOP1_UNIT_VOCAB,
  LOP2_UNIT_VOCAB,
  LOP3_UNIT_VOCAB,
  LOP4_UNIT_VOCAB,
  LOP5_UNIT_VOCAB,
);
for (const [k, v] of parseWewinVocabIpa(WEWIN_VOCAB, 'Lớp 4')) existing.set(k, v);
for (const [k, v] of Object.entries(WORD_OVERRIDES)) existing.set(k, v);
for (const [k, v] of Object.entries(PHRASE_OVERRIDES)) existing.set(k, v);

const write = process.argv.includes('--write');
console.log(write ? 'Writing IPA backfill…' : 'Dry run (pass --write to apply)…');

const forceLop4 = process.argv.includes('--force-lop4');

const n3 = patchVocabFile('lib/lop3Vocab.ts', LOP3_UNIT_VOCAB as VocabRecord, existing);
const n4 = patchVocabFile('lib/lop4Vocab.ts', LOP4_UNIT_VOCAB as VocabRecord, existing, forceLop4 ? 3 : null);
console.log(`Patched Lớp 3: ${n3}, Lớp 4: ${n4}`);
