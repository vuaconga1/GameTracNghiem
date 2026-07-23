/**
 * Fill targetIpa for Lớp 4 pronunciation questions imported from scramble.
 *
 * Usage:
 *   node scripts/run-with-env.mjs neon -- npx tsx scripts/fill-lop4-pronunciation-ipa.ts
 *   node scripts/run-with-env.mjs local -- npx tsx scripts/fill-lop4-pronunciation-ipa.ts
 */
import '../lib/loadEnv';
import type { Prisma } from '@prisma/client';

import { parseGamePayload } from '../lib/admin/payloadSchemas';
import { prisma } from '../lib/db';

const LEVEL = 'Lớp 4';
const EXTERNAL_PREFIX = 'GS4-PRON-FROM-SCRAMBLE';

/** British English IPA (Global Success style), keyed by exact targetText. */
const IPA_BY_WORD: Record<string, string> = {
  // Unit 1
  America: '/əˈmerɪkə/',
  Australia: '/ɒˈstreɪliə/',
  Britain: '/ˈbrɪtn/',
  Japan: '/dʒəˈpæn/',
  France: '/frɑːns/',
  Vietnam: '/ˌvjetˈnæm/',
  friend: '/frend/',
  boy: '/bɔɪ/',
  girl: '/ɡɜːl/',
  student: '/ˈstjuːdnt/',
  teacher: '/ˈtiːtʃə(r)/',
  classroom: '/ˈklɑːsruːm/',
  school: '/skuːl/',
  play: '/pleɪ/',
  study: '/ˈstʌdi/',
  like: '/laɪk/',
  family: '/ˈfæməli/',
  from: '/frɒm/',
  country: '/ˈkʌntri/',
  flag: '/flæɡ/',

  // Unit 2
  "o'clock": '/əˈklɒk/',
  thirty: '/ˈθɜːti/',
  fifteen: '/ˌfɪfˈtiːn/',
  'get up': '/ɡet ʌp/',
  'go to bed': '/ɡəʊ tə bed/',
  'get up at': '/ɡet ʌp ət/',
  'have breakfast': '/hæv ˈbrekfəst/',
  'go to school': '/ɡəʊ tə skuːl/',
  'have lunch': '/hæv lʌntʃ/',
  'go home': '/ɡəʊ həʊm/',
  'do homework': '/duː ˈhəʊmwɜːk/',
  'have dinner': '/hæv ˈdɪnə(r)/',
  'watch TV': '/wɒtʃ ˌtiːˈviː/',
  'listen to music': '/ˈlɪsn tə ˈmjuːzɪk/',
  'go to school at': '/ɡəʊ tə skuːl ət/',

  // Unit 3
  Monday: '/ˈmʌndeɪ/',
  Tuesday: '/ˈtjuːzdeɪ/',
  Wednesday: '/ˈwenzdeɪ/',
  Thursday: '/ˈθɜːzdeɪ/',
  Friday: '/ˈfraɪdeɪ/',
  Saturday: '/ˈsætədeɪ/',
  Sunday: '/ˈsʌndeɪ/',
  week: '/wiːk/',
  day: '/deɪ/',
  'every day': '/ˈevri deɪ/',
  'have English': '/hæv ˈɪŋɡlɪʃ/',
  'have PE': '/hæv ˌpiːˈiː/',
  'have music': '/hæv ˈmjuːzɪk/',
  'have art': '/hæv ɑːt/',
  'clean my room': '/kliːn maɪ ruːm/',
  'play football': '/pleɪ ˈfʊtbɔːl/',
  'play badminton': '/pleɪ ˈbædmɪntən/',
  'read books': '/riːd bʊks/',
  'on the weekend': '/ɒn ðə ˈwiːkend/',

  // Unit 4
  birthday: '/ˈbɜːθdeɪ/',
  party: '/ˈpɑːti/',
  invite: '/ɪnˈvaɪt/',
  guest: '/ɡest/',
  present: '/ˈpreznt/',
  gift: '/ɡɪft/',
  balloon: '/bəˈluːn/',
  cake: '/keɪk/',
  food: '/fuːd/',
  drink: '/drɪŋk/',
  decorate: '/ˈdekəreɪt/',
  'make a wish': '/meɪk ə wɪʃ/',
  'blow out': '/bləʊ aʊt/',
  sing: '/sɪŋ/',
  'play games': '/pleɪ ɡeɪmz/',
  'take photos': '/teɪk ˈfəʊtəʊz/',
  fun: '/fʌn/',
  thanks: '/θæŋks/',
  enjoy: '/ɪnˈdʒɔɪ/',
  'have a great time': '/hæv ə ɡreɪt taɪm/',

  // Unit 5
  can: '/kæn/',
  cook: '/kʊk/',
  draw: '/drɔː/',
  'play the guitar': '/pleɪ ðə ɡɪˈtɑː(r)/',
  'play the piano': '/pleɪ ðə piˈænəʊ/',
  'ride a bike': '/raɪd ə baɪk/',
  'ride a horse': '/raɪd ə hɔːs/',
  swim: '/swɪm/',
  'roller skate': '/ˈrəʊlə skeɪt/',
  'fly a kite': '/flaɪ ə kaɪt/',
  dance: '/dɑːns/',
  'plant trees': '/plɑːnt triːz/',
  'help parents': '/help ˈpeərənts/',
  'clean the room': '/kliːn ðə ruːm/',

  // Unit 6
  library: '/ˈlaɪbrəri/',
  playground: '/ˈpleɪɡraʊnd/',
  'computer room': '/kəmˈpjuːtə ruːm/',
  'music room': '/ˈmjuːzɪk ruːm/',
  'art room': '/ɑːt ruːm/',
  'science room': '/ˈsaɪəns ruːm/',
  gym: '/dʒɪm/',
  canteen: '/kænˈtiːn/',
  toilet: '/ˈtɔɪlət/',
  garden: '/ˈɡɑːdn/',
  gate: '/ɡeɪt/',
  stairs: '/steəz/',
  corridor: '/ˈkɒrɪdɔː(r)/',
  classmate: '/ˈklɑːsmeɪt/',
  blackboard: '/ˈblækbɔːd/',
  desk: '/desk/',
  chair: '/tʃeə(r)/',

  // Unit 7
  art: '/ɑːt/',
  English: '/ˈɪŋɡlɪʃ/',
  'history and geography': '/ˈhɪstri ənd dʒiˈɒɡrəfi/',
  maths: '/mæθs/',
  music: '/ˈmjuːzɪk/',
  science: '/ˈsaɪəns/',
  Vietnamese: '/ˌvjetnəˈmiːz/',
  timetable: '/ˈtaɪmteɪbl/',
  subject: '/ˈsʌbdʒɪkt/',
  lesson: '/ˈlesn/',
  'have Maths': '/hæv mæθs/',
  'have Music': '/hæv ˈmjuːzɪk/',
  'have Science': '/hæv ˈsaɪəns/',
  'have Art': '/hæv ɑːt/',

  // Unit 8
  IT: '/ˌaɪˈtiː/',
  PE: '/ˌpiːˈiː/',
  'English teacher': '/ˈɪŋɡlɪʃ ˈtiːtʃə(r)/',
  painter: '/ˈpeɪntə(r)/',
  'maths teacher': '/mæθs ˈtiːtʃə(r)/',
  writer: '/ˈraɪtə(r)/',
  because: '/bɪˈkɒz/',
  why: '/waɪ/',
  write: '/raɪt/',
  read: '/riːd/',
  'play sports': '/pleɪ spɔːts/',
  computer: '/kəmˈpjuːtə(r)/',
  interesting: '/ˈɪntrəstɪŋ/',
  useful: '/ˈjuːsfl/',
  favourite: '/ˈfeɪvərɪt/',

  // Unit 9
  December: '/dɪˈsembə(r)/',
  June: '/dʒuːn/',
  July: '/dʒuˈlaɪ/',
  November: '/nəʊˈvembə(r)/',
  October: '/ɒkˈtəʊbə(r)/',
  September: '/sepˈtembə(r)/',
  'sports day': '/spɔːts deɪ/',
  run: '/rʌn/',
  jump: '/dʒʌmp/',
  throw: '/θrəʊ/',
  race: '/reɪs/',
  team: '/tiːm/',
  'tug of war': '/ˌtʌɡ əv ˈwɔː(r)/',
  prize: '/praɪz/',
  cheer: '/tʃɪə(r)/',
  when: '/wen/',
  is: '/ɪz/',
  it: '/ɪt/',
  "isn't": '/ˈɪznt/',
  "isn't it": '/ˈɪznt ɪt/',

  // Unit 10
  beach: '/biːtʃ/',
  campsite: '/ˈkæmpsaɪt/',
  countryside: '/ˈkʌntrisaɪd/',
  Bangkok: '/ˌbæŋˈkɒk/',
  London: '/ˈlʌndən/',
  Sydney: '/ˈsɪdni/',
  Tokyo: '/ˈtəʊkiəʊ/',
  last: '/lɑːst/',
  yesterday: '/ˈjestədeɪ/',
  at: '/ət/',
  on: '/ɒn/',
  in: '/ɪn/',
  was: '/wɒz/',
  were: '/wɜː(r)/',
  where: '/weə(r)/',
  'come back': '/kʌm bæk/',
  visit: '/ˈvɪzɪt/',
  'go swimming': '/ɡəʊ ˈswɪmɪŋ/',
  'go camping': '/ɡəʊ ˈkæmpɪŋ/',

  // Unit 11
  live: '/lɪv/',
  street: '/striːt/',
  road: '/rəʊd/',
  'a busy street': '/ə ˈbɪzi striːt/',
  'a quiet village': '/ə ˈkwaɪət ˈvɪlɪdʒ/',
  'a noisy road': '/ə ˈnɔɪzi rəʊd/',
  'a big city': '/ə bɪɡ ˈsɪti/',

  // Unit 12
  farmer: '/ˈfɑːmə(r)/',
  policeman: '/pəˈliːsmən/',
  'office worker': '/ˈɒfɪs ˈwɜːkə(r)/',
  actor: '/ˈæktə(r)/',
  nurse: '/nɜːs/',
  'nursing home': '/ˈnɜːsɪŋ həʊm/',
  factory: '/ˈfæktri/',
  farm: '/fɑːm/',
  hospital: '/ˈhɒspɪtl/',

  // Unit 13
  'look like': '/lʊk laɪk/',
  tall: '/tɔːl/',
  short: '/ʃɔːt/',
  slim: '/slɪm/',
  'short hair': '/ʃɔːt heə(r)/',
  'long hair': '/lɒŋ heə(r)/',
  'round face': '/raʊnd feɪs/',
  'big eyes': '/bɪɡ aɪz/',

  // Unit 14
  'in the morning': '/ɪn ðə ˈmɔːnɪŋ/',
  'in the afternoon': '/ɪn ði ˌɑːftəˈnuːn/',
  'at noon': '/ət nuːn/',
  'in the evening': '/ɪn ði ˈiːvnɪŋ/',
  'do housework': '/duː ˈhaʊswɜːk/',
  'wash the clothes': '/wɒʃ ðə kləʊðz/',
  'clean the floor': '/kliːn ðə flɔː(r)/',
  'help with the cooking': '/help wɪð ðə ˈkʊkɪŋ/',
  'wash the dishes': '/wɒʃ ðə ˈdɪʃɪz/',

  // Unit 15
  'shopping centre': '/ˈʃɒpɪŋ ˌsentə(r)/',
  'sports centre': '/spɔːts ˌsentə(r)/',
  'swimming pool': '/ˈswɪmɪŋ puːl/',
  cinema: '/ˈsɪnəmə/',
  'a lot of': '/ə lɒt əv/',
  'cook meals': '/kʊk miːlz/',
  'play tennis': '/pleɪ ˈtenɪs/',
  'watch films': '/wɒtʃ fɪlmz/',
  'do yoga': '/duː ˈjəʊɡə/',
  'stay at home': '/steɪ ət həʊm/',
  together: '/təˈɡeðə(r)/',

  // Unit 16
  weather: '/ˈweðə(r)/',
  'last weekend': '/lɑːst ˈwiːkend/',
  sunny: '/ˈsʌni/',
  rainy: '/ˈreɪni/',
  windy: '/ˈwɪndi/',
  cloudy: '/ˈklaʊdi/',
  'food stall': '/fuːd stɔːl/',
  bookshop: '/ˈbʊkʃɒp/',
  supermarket: '/ˈsuːpəmɑːkɪt/',
  bakery: '/ˈbeɪkəri/',
  'water park': '/ˈwɔːtə pɑːk/',
  lovely: '/ˈlʌvli/',
  great: '/ɡreɪt/',

  // Unit 17
  stop: '/stɒp/',
  go: '/ɡəʊ/',
  'turn right': '/tɜːn raɪt/',
  'turn left': '/tɜːn left/',
  buy: '/baɪ/',
  'go straight': '/ɡəʊ streɪt/',
  'turn round': '/tɜːn raʊnd/',
  'get to': '/ɡet tuː/',
  'on the left': '/ɒn ðə left/',
  'on the right': '/ɒn ðə raɪt/',

  // Unit 18
  near: '/nɪə(r)/',
  opposite: '/ˈɒpəzɪt/',
  behind: '/bɪˈhaɪnd/',
  between: '/bɪˈtwiːn/',
  'excuse me': '/ɪkˈskjuːz miː/',
  'toy shop': '/tɔɪ ʃɒp/',
  skirt: '/skɜːt/',
  'T-shirt': '/ˈtiːʃɜːt/',
  'gift shop': '/ɡɪft ʃɒp/',
  thousand: '/ˈθaʊznd/',
  'shoe shop': '/ʃuː ʃɒp/',
  'ice-cream': '/ˈaɪskriːm/',

  // Unit 19
  giraffes: '/dʒəˈrɑːfs/',
  lions: '/ˈlaɪənz/',
  crocodiles: '/ˈkrɒkədaɪlz/',
  hippos: '/ˈhɪpəʊz/',
  peacocks: '/ˈpiːkɒks/',
  'dance beautifully': '/dɑːns ˈbjuːtɪfəli/',
  'run quickly': '/rʌn ˈkwɪkli/',
  'roar loudly': '/rɔː ˈlaʊdli/',
  'sing merrily': '/sɪŋ ˈmerɪli/',
  neck: '/nek/',
};

function normalizeKey(word: string): string {
  return String(word || '').trim();
}

function lookupIpa(word: string): string | null {
  const key = normalizeKey(word);
  if (IPA_BY_WORD[key]) return IPA_BY_WORD[key];
  // case-insensitive fallback
  const found = Object.entries(IPA_BY_WORD).find(
    ([w]) => w.toLowerCase() === key.toLowerCase(),
  );
  return found ? found[1] : null;
}

async function main() {
  const rows = await prisma.question.findMany({
    where: {
      game: 'pronunciation',
      archivedAt: null,
      active: true,
      externalId: { startsWith: EXTERNAL_PREFIX },
      course: { levelName: LEVEL, archivedAt: null },
    },
    select: {
      id: true,
      payload: true,
      course: { select: { name: true } },
    },
  });

  let updated = 0;
  const missing: string[] = [];

  for (const row of rows) {
    const payload = (row.payload ?? {}) as Record<string, unknown>;
    const word = normalizeKey(String(payload.targetText || ''));
    if (!word) continue;

    const ipa = lookupIpa(word);
    if (!ipa) {
      missing.push(`${row.course.name}: ${word}`);
      continue;
    }

    const next = parseGamePayload('pronunciation', {
      ...payload,
      targetIpa: ipa,
    });

    await prisma.question.update({
      where: { id: row.id },
      data: { payload: next as Prisma.InputJsonValue },
    });
    updated += 1;
  }

  console.log(`Updated IPA: ${updated}/${rows.length}`);
  if (missing.length) {
    console.warn('Missing IPA for:');
    for (const m of [...new Set(missing)].sort()) console.warn(`  - ${m}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
