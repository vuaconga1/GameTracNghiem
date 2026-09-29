/**
 * Correct Lớp 8 reading-quiz answer keys that were guessed as option A,
 * plus a few merged options and the Lớp 9 "raduate" typo.
 *
 * Usage:
 *   node scripts/run-with-env.mjs neon -- npx tsx scripts/fix-lop8-reading-answers.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import '../lib/loadEnv';
import type { Prisma } from '@prisma/client';

import { prisma } from '../lib/db';

const CONTENT_PATH = resolve(process.cwd(), 'scripts/data/lop8-reading-content.json');
const LOP9_PATH = resolve(process.cwd(), 'scripts/data/lop9-reading-content.json');

type Fix = {
  /** Normalized question text currently stored. */
  q: string;
  answer: string;
  options?: string[];
  question?: string;
};

function norm(value: string): string {
  return String(value || '')
    .replace(/<[^>]+>/g, '')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

const FIXES: Fix[] = [
  // Unit 2 — countryside / comparatives
  { q: 'Farmers often leave the rice in the sun to _______.', answer: 'dry' },
  { q: 'They _______ the buffalo-drawn cart with hay.', answer: 'loaded' },
  { q: 'Farmers always need extra help with the _______.', answer: 'harvest' },
  { q: "I am _______ on visiting my grandparents' on the weekend.", answer: 'keen' },
  { q: 'We are looking forward to a bumper _______.', answer: 'crop' },
  { q: '_______ is often the hardest but the most important time to people living in the countryside.', answer: 'Harvest time' },
  {
    q: 'It is _______ in the city than it is in the country.',
    answer: 'noisier',
    options: ['noisily', 'more noisier', 'noisier', 'noisy'],
  },
  { q: 'City drivers have to drive _______ than country ones.', answer: 'more carefully' },
  { q: 'My house is _______ hers.', answer: 'cheaper than' },
  {
    q: 'Tom is _______ than David.',
    answer: 'more handsome',
    options: ['handsome', 'the more handsome', 'more handsome', 'the most handsome'],
  },
  { q: 'He did the test _______ I did.', answer: 'worse than' },
  { q: 'My sister dances _______ than me.', answer: 'better' },
  {
    q: 'He drives _______ his brother.',
    answer: 'more carefully than',
    options: ['more careful than', 'more carefully', 'more carefully than', 'as careful as'],
  },
  { q: 'Things in the city are _______ than in the country.', answer: 'more modern' },

  // Unit 3 — social media / connectors
  { q: 'The teacher asks the whole class to _______ on studying to prepare well for the midterm exam.', answer: 'focus' },
  { q: 'Ally tries to overcome the _______ from her family by studying hard to get the best results.', answer: 'pressure' },
  { q: 'After school, we sometimes post a few questions on the _______ for discussion.', answer: 'forum' },
  { q: 'I take pride in my positive attitude. I always stay _______, even in the worst situations.', answer: 'calm' },
  { q: 'We feel pressured because there are only two days left until our _______ exam.', answer: 'midterm' },
  { q: 'My father is an engineer, _______ he often has to work away from home.', answer: 'so' },
  { q: 'Ann is very sensitive; _______, you shouldn’t comment on his new shoes.', answer: 'therefore' },
  { q: 'She wants to _______ the club to connect with new friends.', answer: 'join' },
  { q: 'We _______ the school website to find the school activities.', answer: 'browse' },
  { q: 'This year the Mid-Autumn Festival falls on the next Sunday, _______ I can go home and reunite with my family.', answer: 'so' },
  { q: 'I have never joined in a carnival, _______ I am very curious about it.', answer: 'but' },
  { q: 'My mother is occupied in her job, _______ she tries to make time for me.', answer: 'but' },
  { q: 'I am learning English _______ I want to get a good job after school.', answer: 'because' },
  { q: 'Do you want to join us _______ do you want to leave now?', answer: 'or' },
  { q: 'I love cats, _______ my mother doesn’t allow me to have one.', answer: 'but' },
  { q: 'Mary wants to go abroad, _______ she saves money from now.', answer: 'so' },
  { q: 'They used to be friends, _______ now they are not.', answer: 'but' },
  {
    q: 'You can take a seat, _______ you can go around and take a look. It’s up to you.',
    answer: 'or',
    options: ['and', 'or', 'but', 'so'],
  },

  // Unit 4 — ethnic groups / quantifiers / questions
  { q: 'My Son sanctuary has been recognized by UNESCO as a world _______.', answer: 'heritage site' },
  { q: 'We are going to cook Vietnamese food including _______ and _______.', answer: 'fried rice/ beef noodle soup' },
  { q: '______ dances the best in your family?', answer: 'Who' },
  { q: 'Xoe and Sap are _____ of Thai ethnic minority people.', answer: 'folk dances' },
  { q: 'We spent hours in _______ house to talk with local people.', answer: 'communal' },
  { q: 'She wore a _______ costume of bright pink silk.', answer: 'traditional' },
  {
    q: 'You can visit Gia Lai to enjoy the gong _______.',
    answer: 'festival',
    options: ['special', 'different', 'communal', 'festival'],
  },
  { q: 'We can _______ the sea from here.', answer: 'overlook' },
  { q: 'The Nung mostly live in _______ though they also live in earthen houses.', answer: 'stilt houses' },
  { q: 'Sa Pa is famous for the _______ located in the mountainous area.', answer: 'terraced fields' },
  { q: 'Lahu, Mang, and Brau are ________ minorities in Viet Nam.', answer: 'ethnic' },
  { q: 'The ethnic Khmer live in the _____ of Vietnam.', answer: 'Mekong Delta' },
  { q: 'I’ve got ______ cakes to give away. Would you like one?', answer: 'a few' },
  { q: 'I’ll make a tuna _______ for you.', answer: 'sandwich' },
  { q: 'Vietnamese people are used to using _______ when having meals.', answer: 'chopsticks' },
  { q: 'In our area, ______ not much land for growing crops.', answer: 'there is' },
  { q: 'How ______ ethnic groups in Viet Nam do you know?', answer: 'many' },
  { q: 'How_______ milk is there in the carton?', answer: 'much' },
  { q: 'Do you have _______ about ethnic minority groups in Viet Nam?', answer: 'any books' },
  { q: '_________ your grandmother like folk _________?', answer: 'Does – music' },
  { q: '______ stilt houses stand on wood, bamboo, and _________?', answer: 'Do – leaves' },
  { q: '______ do you usually eat lunch? - At noon.', answer: 'When' },
  { q: '______ do you wash clothes? - Every week.', answer: 'How often' },
  { q: '______ usually gets up the earliest in your family?', answer: 'Who' },
  { q: '______ do you think of this hotel? - It\'s pretty good.', answer: 'What' },
  { q: '______ do you work at that company? - Because it’s near my house.', answer: 'Why' },
  {
    q: '______ is it from the centre to the Museum of Ethnology? ~ It’s about senven kimoleters.',
    answer: 'How far',
    question: '______ is it from the centre to the Museum of Ethnology? ~ It’s about seven kilometers.',
  },
  { q: '______ can I buy some milk? - At the supermarket.', answer: 'Where' },
  { q: '______ much do you weigh?', answer: 'How' },
  { q: "______ hat is this? - It's my brother's.", answer: 'Whose' },
  { q: '______ do you like your tea? - I like it with cream and sugar.', answer: 'How' },
  { q: '______ is that woman? - I think she is a teacher.', answer: 'Who' },
  { q: 'Do you know ______ language is spoken in Kenya?', answer: 'what' },
  { q: '______ is your blood type?', answer: 'What' },
  { q: '______ do you play tennis? - For exercise.', answer: 'Why' },
  { q: '______ tall are you?', answer: 'How' },
  { q: '______ do you expect me to do?', answer: 'What' },
  { q: '______ does it cost to visit this bamboo village?', answer: 'How much' },

  // Unit 5 — customs / articles
  { q: 'The Vietnamese often prepare ________ to worship their ancestors during Tet holiday.', answer: 'offerings' },
  { q: 'Tet’s ________ is the longest holiday which may last up to seven to nine days.', answer: 'celebration' },
  { q: 'As ________ dress of Vienamese, Ao dai is worn by men and women.', answer: 'traditional', question: 'As ________ dress of Vietnamese, Ao dai is worn by men and women.' },
  { q: 'On New Year’s Eve, the young often go out to watch the firework ________.', answer: 'performance' },
  { q: 'In Japan, take ________ your shoes at the entrance to all home, and most businesses and hotels.', answer: 'off' },
  { q: 'Shaking hands is the most popular way ________ greeting in Britain.', answer: 'of' },
  { q: 'It’s considered good manners ________ younger generations in the family to invite elders to eat before starting a meal.', answer: 'for' },
  { q: 'How many people were there at the family ___________ last weekend?', answer: 'reunion' },
  { q: 'We should ___________ children’s awareness of our customs and traditions.', answer: 'raise' },
  { q: 'Joe broke with ___________ when he went to an art college.', answer: 'tradition' },
  { q: 'We ___________ the Spring Festival on the 15th of January in the lunar calendar.', answer: 'hold' },
  { q: 'It’s the ___________ in that country for women to get married in white.', answer: 'custom' },
  { q: 'Taking care of the family is _________ considered women’s duty in many Eastern countries.', answer: 'traditionally' },
  { q: 'People ______ bamboo poles with small bells and lanterns.', answer: 'decorate' },
  { q: 'People in Hanoi ________ to give Ong Cong Ong Tao a ride to Heaven.', answer: 'release carps' },
  { q: 'Many people visit ________ to take pictures with the blooming flowers.', answer: 'flower villages' },
  { q: 'The ________ opened with a fanfare of trumpets.', answer: 'ceremony' },
  { q: 'Thousands of ________ come here every year.', answer: 'festival goer' },
  { q: 'The Vietnamese New Year ________ from the first day of the first month of the Lunar calendar for at least three days.', answer: 'take place' },
  { q: 'They ________ presents under the Christmas trees on Christmas day.', answer: 'place' },
  { q: 'I put a bag of red beans under my pillow to ________ away bad luck.', answer: 'chase' },
  { q: 'Organising the festivals is one way for us to ________ our traditions.', answer: 'maintain' },
  { q: 'Kung Fu and Karate are my favorite ________.', answer: 'martial arts' },
  { q: 'Many young people don’t ___________ the tradition of living with their parents when they are eighteen.', answer: 'follow' },
  { q: 'You are under no _________ to buy any stuff here.', answer: 'obligation' },
  { q: 'Whether you have meals at home or in a restaurant, some basic table __________ should never be forgotten.', answer: 'manners' },
  { q: 'Is there ________ boat race at the festival?', answer: 'a' },
  { q: 'It takes more than ________ hour to drive to Can Gio.', answer: 'an' },
  { q: "There isn't ________ airport near where we live.", answer: 'an' },
  { q: '________ lion dance is called shishi-mai in Japan.', answer: 'The' },
  { q: 'Is he going on _______ business next week?', answer: 'Ø' },
  { q: 'We might be able to catch _______ last train if we hurried.', answer: 'the' },
  { q: '_______ used razor blade is useless.', answer: 'A' },
  { q: 'My aunt has _______ interesting novel.', answer: 'an' },
  { q: 'A video lab is _______ useful means for language learning.', answer: 'a' },
  { q: 'Today is ________ fine day. Let\'s go to ________ park.', answer: 'a - the' },
  { q: 'She lives in ________ village on ________ east coast.', answer: 'a – the' },
  { q: '________ man over there is ________ Australian.', answer: 'The – an' },
  { q: 'Harry is a sailor. He spends most of his life at _______ sea.', answer: 'x' },
  { q: 'There are billions of stars in _______ space.', answer: 'x' },
  { q: 'We often watch _______ television', answer: 'x' },
  { q: 'We had _______ dinner in a restaurant.', answer: 'x' },
  { q: 'Where can _______ people buy everything they need?', answer: 'x' },
  { q: 'Her parents are now working in _______ Europe.', answer: 'x' },
  { q: 'He majors in _______ English.', answer: 'x' },
  { q: 'Paris is splendid by _______ night.', answer: 'x' },
  {
    q: 'Sửa mạo từ: We are travelling to Spain in a summer. The boat race takes place in a morning. Rich are always true.',
    answer: 'We are travelling to Spain in the summer. The boat race takes place in the morning. The rich are always true.',
  },

  // Unit 6 — lifestyles / future
  { q: "It's a simple _______ to prepare, consisting mainly of rice and vegetables.", answer: 'dish' },
  { q: 'The hotel restaurant is known for its excellent French _______.', answer: 'cuisine' },
  { q: 'She was given the _______ of Employee of the Month for her hard work.', answer: 'title' },
  { q: 'Sticking out one’s ___________ was a way of greeting in traditional Tibetan culture.', answer: 'tongue' },
  { q: 'This beach looks amazing! I think we _____________ this place!', answer: 'will love' },
  { q: 'I _____________ you to the airport tomorrow if you need someone to give you a lift.', answer: 'will take' },
  {
    q: 'My plane _____________ at Manchester airport at 8 p.m tomorrow evening.',
    answer: 'lands',
    options: ['lands', 'will land', 'is landing', 'landed'],
  },
  { q: 'We have some ideas for what we want to do while we are here in Scotland. If the weather is nice, we _____________ a mountain on one of the days.', answer: 'are going to climb' },
  { q: 'What shall I do today? I think I _____________ to the beach while the Sun is out!', answer: 'will go' },
  {
    q: "I'm sorry but I cannot come to the meal tonight. I _____________ work at 8 p.m. tonight, so I _____________ arrive at the restaurant on time!",
    answer: 'finish – will not be able to',
    options: ['finish – will not be able to', 'will finish – will be', 'finishes – will can', 'finished – will be can'],
  },
  {
    q: '___________ hands is probably the most common way of greeting around the world.',
    answer: 'Shaking',
    options: ['Shook', 'Shakes', 'Shaking', 'Shake'],
  },
  { q: "If you tell me your secret, I promise I _____________ anyone!", answer: "won't tell" },
  { q: 'The 1,100-mile race from Anchorage to Nome allows _______ to drop injured, sick or tired dogs.', answer: 'mushers' },
  { q: 'We enjoyed a(n) _______ picnic lunch on the lawn.', answer: 'leisurely' },
  { q: 'The Aborigines are the _______ inhabitants of Australia.', answer: 'native' },
  { q: 'The city _______ seems to suit her — she\'s certainly looking very well.', answer: 'lifestyle' },
  { q: 'What do you often do in your _______ time?', answer: 'leisure' },
  { q: 'People should avoid the _______ of dumping waste into the sea.', answer: 'practice' },
  { q: 'They learned the _______ of weaving.', answer: 'craft' },
  { q: "I can recognize your handwriting anywhere — it's _______ .", answer: 'unique' },
  { q: 'The novel was written by the _______ local writer.', answer: 'best-known' },
  { q: 'A(n) _______ diet is essential for healthy growth.', answer: 'balanced' },
  { q: '_______ learning has become increasingly popular since the COVID-19 outbreak.', answer: 'Online' },
  { q: 'They had no means _______ communication.', answer: 'of' },
  { q: 'He became internationally famous _______ his novels.', answer: 'for' },
  { q: "Why don 't you come _______ to Nha Trang in the summer?", answer: 'over', question: "Why don't you come _______ to Nha Trang in the summer?" },
  { q: '- ‘"Here’s my phone number”. – Thanks. I’ll give you a call if I _____ some help tomorrow.”', answer: 'need' },
  { q: 'The patient will not recover unless he _______ an operation.', answer: 'undergoes' },
  { q: 'If it _______ convenient, let’s go out for dinner tonight.', answer: 'is' },
  { q: 'If we meet at 9:00, we ___________ plenty of time to talk.', answer: 'will have' },
  { q: 'If you learn online, you will find it difficult ___________.', answer: 'to concentrate' },
  { q: 'Linh and Quan have similar ___________ about online learning.', answer: 'ideas' },
  { q: 'Thais greet other people by ___________ “sawadee”.', answer: 'saying' },
  { q: 'What is the ___________ food in your area? - It’s rice.', answer: 'staple' },
  { q: 'Many students like studying online because it’s ___________.', answer: 'convenient' },
  { q: 'India has a ___________ range of cuisines.', answer: 'vast' },
  { q: 'Sushi comes from ___________.', answer: 'Japan' },
  { q: 'The dogsled is still used as a ___________ of transport in Alaska today.', answer: 'means' },
  { q: 'Buying street food is a common ___________ in our country.', answer: 'practice' },
  {
    q: '48 Are there any ___________ of modem technology on lifestyles?',
    answer: 'impacts',
    question: 'Are there any ___________ of modern technology on lifestyles?',
  },
  { q: 'I ____________ the patty tomorrow.', answer: 'will attend', question: 'I ____________ the party tomorrow.' },
  { q: "They ____________hiking next weekend.", answer: "won't go" },
  { q: 'If it rains tomorrow, I ____________ indoors and read a book.', answer: 'will stay' },

  // Synonyms / antonyms whose key was the first option
  { q: 'You can enjoy great Vietnamese seafood in Ha Long Bay.', answer: 'like' },
  { q: 'Nomadic people live in a ger. It keeps them cool in summer and warm in winter.', answer: 'circular tent' },
  { q: 'The nomads move two or three times a year to look for new pastures', answer: 'grasslands' },
  { q: 'life in the city is more exciting than in the country.', answer: 'interesting' },
  { q: 'That village is very peaceful, so we like to live there.', answer: 'quiet' },
  { q: 'City people seem to react more quickly to changes than country people.', answer: 'slowly' },
  { q: 'A buffalo ploughs better than a horse.', answer: 'worse' },
  { q: 'Life in the city is more convenient and exciting than life in the country.', answer: 'more inconvenient' },
  { q: 'Mary is into making crafts. She should participate in the arts and crafts club at school.', answer: 'not take part in' },
  { q: 'YouTube is one of the most popular social media sites nowadays.', answer: 'uncommon' },
  { q: 'Teen social media addiction can negatively impact offline relationships, as teens may become socially isolated and have difficulty engaging in face-to-face interactions due to their preoccupation with online interactions.', answer: 'positively' },
  { q: 'He is the offspring of a chemist and a nurse. His intelligence is inherited from them.', answer: 'ancestor' },
  { q: 'Anna broke with the family tradition and chose to be a singer instead of being a teacher.', answer: 'followed' },
  { q: 'A tradition is something special and is passed down through the generations.', answer: 'common' },
  { q: 'When we have finished eating, we place our chopsticks on top of our rice bowl.', answer: 'started' },
  { q: 'Please turn on the lights so that I can see what I\'m doing.', answer: 'switch on' },
  { q: 'Online learning has become increasingly popular due to the pandemic.', answer: 'Virtual' },
  { q: 'My boss was furious when I accidentally deleted the important files.', answer: 'extremely angry' },
  { q: 'My grandmother is fond of gardening and spends most of her time tending to her plants.', answer: 'bored with' },
  { q: 'Walking is a common form of exercise that many people enjoy.', answer: 'unusual' },
  { q: 'I prefer to have a light breakfast in the morning, like a bowl of cereal or a piece of toast.', answer: 'big' },
  { q: 'I usually prefer to go offline during the weekend to spend more time with my family.', answer: 'online' },
  { q: 'The Grand Canyon is a vast and stunning natural wonder that attracts millions of visitors each year.', answer: 'limited' },
];

const byQuestion = new Map(FIXES.map((fix) => [norm(fix.q), fix]));

function pickOption(options: string[], wanted: string): string | null {
  const target = norm(wanted);
  return options.find((option) => norm(option) === target) ?? null;
}

type QuizLike = {
  question: string;
  answer: string;
  options?: string[];
  accept?: string[];
};

function applyFix(item: QuizLike, fix: Fix): boolean {
  const options = fix.options ?? item.options ?? [];
  if (!options.length) {
    const changed = item.answer !== fix.answer || (fix.question != null && item.question !== fix.question);
    item.answer = fix.answer;
    item.accept = [fix.answer];
    if (fix.question) item.question = fix.question;
    return changed;
  }
  const answer = pickOption(options, fix.answer);
  if (!answer) return false;
  const changed =
    item.answer !== answer ||
    (fix.options != null && JSON.stringify(item.options) !== JSON.stringify(fix.options)) ||
    (fix.question != null && item.question !== fix.question);
  item.options = options;
  item.answer = answer;
  item.accept = [answer];
  if (fix.question) item.question = fix.question;
  return changed;
}

function patchContentFile(path: string, itemsOf: (data: unknown) => QuizLike[]): number {
  const data = JSON.parse(readFileSync(path, 'utf8')) as unknown;
  const items = itemsOf(data);
  let changed = 0;
  const seen = new Set<string>();
  for (const item of items) {
    const fix = byQuestion.get(norm(item.question));
    if (!fix) continue;
    seen.add(norm(fix.q));
    if (applyFix(item, fix)) changed += 1;
  }
  const missing = FIXES.filter((fix) => !seen.has(norm(fix.q))).map((fix) => fix.q);
  if (missing.length) {
    console.log(`Not found in ${path}:`);
    for (const q of missing) console.log('  - ' + q);
  }
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n', 'utf8');
  return changed;
}

async function patchDatabase(): Promise<number> {
  const rows = await prisma.question.findMany({
    where: { game: 'quiz', archivedAt: null },
    select: { id: true, payload: true },
  });
  let changed = 0;
  for (const row of rows) {
    const payload = row.payload as QuizLike;
    if (!payload || typeof payload.question !== 'string') continue;
    const fix = byQuestion.get(norm(payload.question));
    if (!fix) continue;
    const next: QuizLike = {
      ...payload,
      options: [...(payload.options ?? [])],
      accept: [...(payload.accept ?? [])],
    };
    const options = fix.options ?? next.options ?? [];
    const canApply = options.length === 0 || options.some((option) => norm(option) === norm(fix.answer));
    if (!canApply) {
      console.log('DB option missing for: ' + payload.question);
      continue;
    }
    if (!applyFix(next, fix)) continue;
    if (JSON.stringify(payload) === JSON.stringify(next)) continue;
    await prisma.question.update({
      where: { id: row.id },
      data: { payload: next as Prisma.InputJsonValue },
    });
    changed += 1;
  }
  return changed;
}

async function main() {
  const contentChanged = patchContentFile(CONTENT_PATH, (data) => {
    const units = (data as { units: Record<string, QuizLike[]> }).units;
    return Object.values(units).flat();
  });
  const lop9 = JSON.parse(readFileSync(LOP9_PATH, 'utf8')) as {
    units: Record<string, QuizLike[]>;
  };
  let lop9Changed = 0;
  for (const items of Object.values(lop9.units)) {
    for (const item of items) {
      if (/\braduate\b/.test(item.question)) {
        item.question = item.question.replace(/\braduate\b/g, 'graduate');
        lop9Changed += 1;
      }
    }
  }
  writeFileSync(LOP9_PATH, JSON.stringify(lop9, null, 2) + '\n', 'utf8');

  const dbChanged = await patchDatabase();
  const dbTypo = await prisma.question.findMany({
    where: { game: 'quiz', archivedAt: null },
    select: { id: true, payload: true },
  });
  let typoRows = 0;
  for (const row of dbTypo) {
    const payload = row.payload as QuizLike;
    if (!payload?.question || !/\b(?:g{2,}graduate|g{2,}graduated|raduate)\b/.test(payload.question)) continue;
    payload.question = payload.question
      .replace(/\bg{2,}graduated\b/g, 'graduated')
      .replace(/\bg{2,}graduate\b/g, 'graduate')
      .replace(/\braduate\b/g, 'graduate');
    await prisma.question.update({
      where: { id: row.id },
      data: { payload: payload as Prisma.InputJsonValue },
    });
    typoRows += 1;
  }

  console.log(`JSON answer rows changed: ${contentChanged}`);
  console.log(`Lop9 typo rows: ${lop9Changed}`);
  console.log(`DB answer rows changed: ${dbChanged}`);
  console.log(`DB raduate rows: ${typoRows}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
