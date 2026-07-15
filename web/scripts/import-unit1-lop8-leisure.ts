/**
 * Append 5 sample items for underfilled games on Unit 1 / Lớp 8 (Leisure).
 * Does not delete existing questions. Re-run is safe if you change EXTERNAL_PREFIX.
 */
import '../lib/loadEnv';
import type { Prisma } from '@prisma/client';

import { parseGamePayload } from '../lib/admin/payloadSchemas';
import { prisma } from '../lib/db';

const EXTERNAL_PREFIX = 'U1-L8-LEISURE';

const GAMES_TO_FILL = [
  'pronunciation',
  'word_match',
  'look_and_write',
  'choose_and_circle',
  'read_and_complete',
  'read_and_match',
  'vocabulary_test',
  'vocabulary_check',
] as const;

type GameKey = (typeof GAMES_TO_FILL)[number];

const PLACEHOLDER = (label: string) =>
  `https://placehold.co/160x120/e8edf5/0d2b6e?text=${encodeURIComponent(label)}`;

function payloadsByGame(): Record<GameKey, unknown[]> {
  return {
    pronunciation: [
      {
        mode: 'word',
        modeLabel: 'Luyện từ',
        prompt: 'Đọc rõ từ vựng Unit 1',
        targetText: 'leisure',
        targetIpa: '/ˈleʒə(r)/',
        hint: 'thời gian rảnh',
      },
      {
        mode: 'word',
        modeLabel: 'Luyện từ',
        prompt: 'Chú ý âm /ʃ/',
        targetText: 'socialize',
        targetIpa: '/ˈsəʊʃəlaɪz/',
        hint: 'giao lưu xã hội',
      },
      {
        mode: 'word',
        modeLabel: 'Luyện từ',
        prompt: 'Nhấn trọng âm đúng',
        targetText: 'addicted',
        targetIpa: '/əˈdɪktɪd/',
        hint: 'nghiện / say mê',
      },
      {
        mode: 'word',
        modeLabel: 'Luyện từ',
        prompt: 'Chú ý âm /t/',
        targetText: 'detest',
        targetIpa: '/dɪˈtest/',
        hint: 'ghét cay ghét đắng',
      },
      {
        mode: 'sentence',
        modeLabel: 'Luyện câu',
        prompt: 'Đọc to và rõ ràng',
        targetText: 'I enjoy hanging out with my friends.',
        targetIpa: '',
        hint: 'hang out = đi chơi / tụ tập',
      },
    ],

    word_match: [
      { word: 'leisure', hint: 'thời gian rảnh', image: PLACEHOLDER('leisure') },
      { word: 'socialize', hint: 'giao lưu', image: PLACEHOLDER('socialize') },
      { word: 'detest', hint: 'ghét', image: PLACEHOLDER('detest') },
      { word: 'DIY', hint: 'tự làm đồ', image: PLACEHOLDER('DIY') },
      { word: 'hang out', hint: 'đi chơi cùng bạn', image: PLACEHOLDER('hang out') },
    ],

    look_and_write: [
      {
        title: 'Leisure activities A',
        instruction: 'Look at the pictures and write the words.',
        word_bank: ['leisure', 'socialize', 'detest'],
        items: [
          { order: 1, image: PLACEHOLDER('leisure'), answer: 'leisure' },
          { order: 2, image: PLACEHOLDER('socialize'), answer: 'socialize' },
          { order: 3, image: PLACEHOLDER('detest'), answer: 'detest' },
        ],
      },
      {
        title: 'Leisure activities B',
        instruction: 'Look and write the leisure words.',
        word_bank: ['DIY', 'communicate', 'balance'],
        items: [
          { order: 1, image: PLACEHOLDER('DIY'), answer: 'DIY' },
          { order: 2, image: PLACEHOLDER('communicate'), answer: 'communicate' },
          { order: 3, image: PLACEHOLDER('balance'), answer: 'balance' },
        ],
      },
      {
        title: 'Free-time verbs',
        instruction: 'Write the correct words.',
        word_bank: ['hang out', 'surf', 'craft'],
        items: [
          { order: 1, image: PLACEHOLDER('hang out'), answer: 'hang out' },
          { order: 2, image: PLACEHOLDER('surf'), answer: 'surf' },
          { order: 3, image: PLACEHOLDER('craft'), answer: 'craft' },
        ],
      },
      {
        title: 'Feelings about hobbies',
        instruction: 'Look and write.',
        word_bank: ['keen', 'fond', 'addicted'],
        items: [
          { order: 1, image: PLACEHOLDER('keen'), answer: 'keen' },
          { order: 2, image: PLACEHOLDER('fond'), answer: 'fond' },
          { order: 3, image: PLACEHOLDER('addicted'), answer: 'addicted' },
        ],
      },
      {
        title: 'Weekend plans',
        instruction: 'Write the words you see.',
        word_bank: ['club', 'shopping', 'relax'],
        items: [
          { order: 1, image: PLACEHOLDER('club'), answer: 'club' },
          { order: 2, image: PLACEHOLDER('shopping'), answer: 'shopping' },
          { order: 3, image: PLACEHOLDER('relax'), answer: 'relax' },
        ],
      },
    ],

    choose_and_circle: [
      {
        title: 'Circle the leisure word 1',
        instruction: 'Circle the correct word.',
        items: [
          { order: 1, image: PLACEHOLDER('leisure'), options: ['leisure', 'lesson'], answer: 'leisure' },
          { order: 2, image: PLACEHOLDER('detest'), options: ['detest', 'detect'], answer: 'detest' },
          { order: 3, image: PLACEHOLDER('DIY'), options: ['DIY', 'DVD'], answer: 'DIY' },
        ],
      },
      {
        title: 'Circle the leisure word 2',
        instruction: 'Look and circle the right word.',
        items: [
          {
            order: 1,
            image: PLACEHOLDER('socialize'),
            options: ['socialize', 'specialize'],
            answer: 'socialize',
          },
          {
            order: 2,
            image: PLACEHOLDER('balance'),
            options: ['balance', 'balloon'],
            answer: 'balance',
          },
          {
            order: 3,
            image: PLACEHOLDER('craft'),
            options: ['craft', 'crash'],
            answer: 'craft',
          },
        ],
      },
      {
        title: 'Circle the leisure word 3',
        instruction: 'Choose the correct option.',
        items: [
          {
            order: 1,
            image: PLACEHOLDER('hang out'),
            options: ['hang out', 'hang up'],
            answer: 'hang out',
          },
          {
            order: 2,
            image: PLACEHOLDER('addicted'),
            options: ['addicted', 'additional'],
            answer: 'addicted',
          },
          {
            order: 3,
            image: PLACEHOLDER('relax'),
            options: ['relax', 'relate'],
            answer: 'relax',
          },
        ],
      },
      {
        title: 'Circle the leisure word 4',
        instruction: 'Circle the word that matches the idea.',
        items: [
          {
            order: 1,
            image: PLACEHOLDER('communicate'),
            options: ['communicate', 'community'],
            answer: 'communicate',
          },
          { order: 2, image: PLACEHOLDER('club'), options: ['club', 'clap'], answer: 'club' },
          { order: 3, image: PLACEHOLDER('surf'), options: ['surf', 'serve'], answer: 'surf' },
        ],
      },
      {
        title: 'Circle the leisure word 5',
        instruction: 'Circle the correct free-time word.',
        items: [
          { order: 1, image: PLACEHOLDER('keen'), options: ['keen', 'keep'], answer: 'keen' },
          { order: 2, image: PLACEHOLDER('fond'), options: ['fond', 'find'], answer: 'fond' },
          {
            order: 3,
            image: PLACEHOLDER('shopping'),
            options: ['shopping', 'shipping'],
            answer: 'shopping',
          },
        ],
      },
    ],

    read_and_complete: [
      {
        title: 'Complete: Leisure A',
        instruction: 'Complete the sentences with words from the box.',
        word_bank: ['leisure', 'socialize', 'detest'],
        items: [
          {
            order: 1,
            sentence: 'In my ___ time, I like reading comics.',
            answer: 'leisure',
          },
          {
            order: 2,
            sentence: 'Teens often ___ with friends after school.',
            answer: 'socialize',
          },
          {
            order: 3,
            sentence: 'I ___ getting up early on Sundays.',
            answer: 'detest',
          },
        ],
      },
      {
        title: 'Complete: Leisure B',
        instruction: 'Fill in the blanks.',
        word_bank: ['hang out', 'addicted', 'DIY'],
        items: [
          {
            order: 1,
            sentence: 'We usually ___ at the park on Saturday.',
            answer: 'hang out',
          },
          {
            order: 2,
            sentence: 'He is ___ to online games.',
            answer: 'addicted',
          },
          {
            order: 3,
            sentence: 'Making a wooden box is a fun ___ project.',
            answer: 'DIY',
          },
        ],
      },
      {
        title: 'Complete: Leisure C',
        instruction: 'Use the word bank.',
        word_bank: ['balance', 'communicate', 'relax'],
        items: [
          {
            order: 1,
            sentence: 'You should keep a ___ between study and play.',
            answer: 'balance',
          },
          {
            order: 2,
            sentence: 'We ___ by messaging every evening.',
            answer: 'communicate',
          },
          {
            order: 3,
            sentence: 'Listening to music helps me ___.',
            answer: 'relax',
          },
        ],
      },
      {
        title: 'Complete: Leisure D',
        instruction: 'Complete each sentence.',
        word_bank: ['keen', 'fond', 'club'],
        items: [
          {
            order: 1,
            sentence: 'She is ___ on dancing.',
            answer: 'keen',
          },
          {
            order: 2,
            sentence: 'I am ___ of painting landscapes.',
            answer: 'fond',
          },
          {
            order: 3,
            sentence: 'He joined a football ___ last month.',
            answer: 'club',
          },
        ],
      },
      {
        title: 'Complete: Leisure E',
        instruction: 'Write the missing leisure words.',
        word_bank: ['surf', 'craft', 'shopping'],
        items: [
          {
            order: 1,
            sentence: 'Many students ___ the net for videos.',
            answer: 'surf',
          },
          {
            order: 2,
            sentence: 'She likes to make small ___ for gifts.',
            answer: 'craft',
          },
          {
            order: 3,
            sentence: 'Window ___ is looking at goods without buying.',
            answer: 'shopping',
          },
        ],
      },
    ],

    read_and_match: [
      {
        title: 'Match leisure ideas A',
        instruction: 'Match each sentence to the correct label.',
        items: [
          {
            order: 1,
            sentence: 'Free time for hobbies and rest.',
            image: PLACEHOLDER('A'),
            label: 'A',
            answer: 'A',
          },
          {
            order: 2,
            sentence: 'Meet and talk with other people.',
            image: PLACEHOLDER('B'),
            label: 'B',
            answer: 'B',
          },
          {
            order: 3,
            sentence: 'Hate something very strongly.',
            image: PLACEHOLDER('C'),
            label: 'C',
            answer: 'C',
          },
        ],
      },
      {
        title: 'Match leisure ideas B',
        instruction: 'Match the meanings.',
        items: [
          {
            order: 1,
            sentence: 'Spend time with friends casually.',
            image: PLACEHOLDER('A'),
            label: 'A',
            answer: 'A',
          },
          {
            order: 2,
            sentence: 'Unable to stop doing something.',
            image: PLACEHOLDER('B'),
            label: 'B',
            answer: 'B',
          },
          {
            order: 3,
            sentence: 'Make or fix things yourself.',
            image: PLACEHOLDER('C'),
            label: 'C',
            answer: 'C',
          },
        ],
      },
      {
        title: 'Match leisure ideas C',
        instruction: 'Match sentence and picture label.',
        items: [
          {
            order: 1,
            sentence: 'Keep study and free time equal.',
            image: PLACEHOLDER('A'),
            label: 'A',
            answer: 'A',
          },
          {
            order: 2,
            sentence: 'Share information with others.',
            image: PLACEHOLDER('B'),
            label: 'B',
            answer: 'B',
          },
          {
            order: 3,
            sentence: 'Feel calm and rest.',
            image: PLACEHOLDER('C'),
            label: 'C',
            answer: 'C',
          },
        ],
      },
      {
        title: 'Match leisure ideas D',
        instruction: 'Match each description.',
        items: [
          {
            order: 1,
            sentence: 'Really interested in an activity.',
            image: PLACEHOLDER('A'),
            label: 'A',
            answer: 'A',
          },
          {
            order: 2,
            sentence: 'Like something a lot.',
            image: PLACEHOLDER('B'),
            label: 'B',
            answer: 'B',
          },
          {
            order: 3,
            sentence: 'A group you join for a hobby.',
            image: PLACEHOLDER('C'),
            label: 'C',
            answer: 'C',
          },
        ],
      },
      {
        title: 'Match leisure ideas E',
        instruction: 'Match the leisure descriptions.',
        items: [
          {
            order: 1,
            sentence: 'Browse websites online.',
            image: PLACEHOLDER('A'),
            label: 'A',
            answer: 'A',
          },
          {
            order: 2,
            sentence: 'Handmade decorative objects.',
            image: PLACEHOLDER('B'),
            label: 'B',
            answer: 'B',
          },
          {
            order: 3,
            sentence: 'Look at products in a store.',
            image: PLACEHOLDER('C'),
            label: 'C',
            answer: 'C',
          },
        ],
      },
    ],

    vocabulary_test: [
      {
        title: 'Vocab test: Leisure 1',
        instruction: 'Look at the pictures and write the words.',
        word_bank: ['leisure', 'socialize', 'detest', 'DIY'],
        items: [
          { order: 1, image: PLACEHOLDER('leisure'), answer: 'leisure' },
          { order: 2, image: PLACEHOLDER('socialize'), answer: 'socialize' },
          { order: 3, image: PLACEHOLDER('detest'), answer: 'detest' },
          { order: 4, image: PLACEHOLDER('DIY'), answer: 'DIY' },
        ],
      },
      {
        title: 'Vocab test: Leisure 2',
        instruction: 'Write the correct words.',
        word_bank: ['hang out', 'addicted', 'balance', 'relax'],
        items: [
          { order: 1, image: PLACEHOLDER('hang out'), answer: 'hang out' },
          { order: 2, image: PLACEHOLDER('addicted'), answer: 'addicted' },
          { order: 3, image: PLACEHOLDER('balance'), answer: 'balance' },
          { order: 4, image: PLACEHOLDER('relax'), answer: 'relax' },
        ],
      },
      {
        title: 'Vocab test: Leisure 3',
        instruction: 'Complete the vocabulary check.',
        word_bank: ['communicate', 'keen', 'fond', 'club'],
        items: [
          { order: 1, image: PLACEHOLDER('communicate'), answer: 'communicate' },
          { order: 2, image: PLACEHOLDER('keen'), answer: 'keen' },
          { order: 3, image: PLACEHOLDER('fond'), answer: 'fond' },
          { order: 4, image: PLACEHOLDER('club'), answer: 'club' },
        ],
      },
      {
        title: 'Vocab test: Leisure 4',
        instruction: 'Look and write.',
        word_bank: ['surf', 'craft', 'shopping', 'window'],
        items: [
          { order: 1, image: PLACEHOLDER('surf'), answer: 'surf' },
          { order: 2, image: PLACEHOLDER('craft'), answer: 'craft' },
          { order: 3, image: PLACEHOLDER('shopping'), answer: 'shopping' },
          { order: 4, image: PLACEHOLDER('window'), answer: 'window' },
        ],
      },
      {
        title: 'Vocab test: Leisure 5',
        instruction: 'Write each leisure word.',
        word_bank: ['netiquette', 'satisfy', 'mind', 'hobby'],
        items: [
          { order: 1, image: PLACEHOLDER('netiquette'), answer: 'netiquette' },
          { order: 2, image: PLACEHOLDER('satisfy'), answer: 'satisfy' },
          { order: 3, image: PLACEHOLDER('mind'), answer: 'mind' },
          { order: 4, image: PLACEHOLDER('hobby'), answer: 'hobby' },
        ],
      },
    ],

    vocabulary_check: [
      {
        title: 'True/False: Leisure 1',
        instruction: 'Is the sentence correct for the word?',
        items: [
          {
            order: 1,
            image: PLACEHOLDER('leisure'),
            word: 'leisure',
            sentence: 'Leisure means free time for hobbies.',
            is_correct: true,
          },
          {
            order: 2,
            image: PLACEHOLDER('detest'),
            word: 'detest',
            sentence: 'Detest means to love something.',
            is_correct: false,
          },
          {
            order: 3,
            image: PLACEHOLDER('DIY'),
            word: 'DIY',
            sentence: 'DIY means doing projects yourself.',
            is_correct: true,
          },
        ],
      },
      {
        title: 'True/False: Leisure 2',
        instruction: 'Decide true or false.',
        items: [
          {
            order: 1,
            image: PLACEHOLDER('socialize'),
            word: 'socialize',
            sentence: 'Socialize means meet and talk with people.',
            is_correct: true,
          },
          {
            order: 2,
            image: PLACEHOLDER('hang out'),
            word: 'hang out',
            sentence: 'Hang out means to hang clothes outside.',
            is_correct: false,
          },
          {
            order: 3,
            image: PLACEHOLDER('addicted'),
            word: 'addicted',
            sentence: 'Addicted means you cannot stop doing something.',
            is_correct: true,
          },
        ],
      },
      {
        title: 'True/False: Leisure 3',
        instruction: 'Check each statement.',
        items: [
          {
            order: 1,
            image: PLACEHOLDER('balance'),
            word: 'balance',
            sentence: 'Balance can mean keeping things equal.',
            is_correct: true,
          },
          {
            order: 2,
            image: PLACEHOLDER('relax'),
            word: 'relax',
            sentence: 'Relax means to feel stressed.',
            is_correct: false,
          },
          {
            order: 3,
            image: PLACEHOLDER('communicate'),
            word: 'communicate',
            sentence: 'Communicate means to share information.',
            is_correct: true,
          },
        ],
      },
      {
        title: 'True/False: Leisure 4',
        instruction: 'True or false?',
        items: [
          {
            order: 1,
            image: PLACEHOLDER('keen'),
            word: 'keen',
            sentence: 'Keen on means very interested in.',
            is_correct: true,
          },
          {
            order: 2,
            image: PLACEHOLDER('fond'),
            word: 'fond',
            sentence: 'Fond of means you dislike something.',
            is_correct: false,
          },
          {
            order: 3,
            image: PLACEHOLDER('club'),
            word: 'club',
            sentence: 'A club is a group for a shared hobby.',
            is_correct: true,
          },
        ],
      },
      {
        title: 'True/False: Leisure 5',
        instruction: 'Decide if each sentence is right.',
        items: [
          {
            order: 1,
            image: PLACEHOLDER('surf'),
            word: 'surf',
            sentence: 'Surf the net means browse websites.',
            is_correct: true,
          },
          {
            order: 2,
            image: PLACEHOLDER('craft'),
            word: 'craft',
            sentence: 'A craft is always a big machine.',
            is_correct: false,
          },
          {
            order: 3,
            image: PLACEHOLDER('hobby'),
            word: 'hobby',
            sentence: 'A hobby is an activity you enjoy in free time.',
            is_correct: true,
          },
        ],
      },
    ],
  };
}

async function main() {
  const course = await prisma.course.findFirst({
    where: { name: 'Unit 1', levelName: 'Lớp 8', archivedAt: null },
  });
  if (!course) {
    throw new Error('Không tìm thấy khóa Unit 1 / Lớp 8');
  }

  const existingByGame = await prisma.question.groupBy({
    by: ['game'],
    where: { courseId: course.id, archivedAt: null },
    _count: { _all: true },
  });
  const countMap = Object.fromEntries(existingByGame.map((g) => [g.game, g._count._all]));

  const allPayloads = payloadsByGame();
  const toCreate: Prisma.QuestionCreateManyInput[] = [];

  for (const game of GAMES_TO_FILL) {
    const current = countMap[game] ?? 0;
    if (current > 5) {
      console.log(`skip ${game}: already ${current} (>5)`);
      continue;
    }

    const maxSort = await prisma.question.aggregate({
      where: { courseId: course.id, game, archivedAt: null },
      _max: { sortOrder: true },
    });
    let sortOrder = (maxSort._max.sortOrder ?? 0) + 1;

    const payloads = allPayloads[game];
    if (payloads.length !== 5) {
      throw new Error(`${game}: expected 5 payloads, got ${payloads.length}`);
    }

    for (let i = 0; i < payloads.length; i++) {
      const parsed = parseGamePayload(game, payloads[i]);
      toCreate.push({
        courseId: course.id,
        game,
        level: course.levelName,
        sortOrder: sortOrder++,
        active: true,
        externalId: `${EXTERNAL_PREFIX}-${game}-${i + 1}`,
        payload: parsed as Prisma.InputJsonValue,
      });
    }
    console.log(`prepare ${game}: +5 (was ${current})`);
  }

  if (toCreate.length === 0) {
    console.log('Nothing to import.');
    return;
  }

  // Avoid duplicate re-import of the same externalIds
  const externalIds = toCreate.map((row) => row.externalId!).filter(Boolean);
  const already = await prisma.question.findMany({
    where: { courseId: course.id, externalId: { in: externalIds } },
    select: { externalId: true },
  });
  const alreadySet = new Set(already.map((r) => r.externalId));
  const filtered = toCreate.filter((row) => !alreadySet.has(row.externalId ?? null));

  if (filtered.length === 0) {
    console.log('All rows already imported (same externalId).');
    return;
  }

  const result = await prisma.question.createMany({ data: filtered });
  console.log(`Inserted ${result.count} questions into ${course.name} / ${course.levelName}`);

  const after = await prisma.question.groupBy({
    by: ['game'],
    where: { courseId: course.id, archivedAt: null },
    _count: { _all: true },
  });
  console.log('counts after:', Object.fromEntries(after.map((g) => [g.game, g._count._all])));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
