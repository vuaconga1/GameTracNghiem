/**
 * Dev-only seed: demo user, sample course, sample questions for ported games.
 * Password `123123` is for local development only — never use in production.
 */
import '../lib/loadEnv';
import bcrypt from 'bcryptjs';

import { prisma } from '../lib/db';

const SEED_GAMES = [
  'grammar',
  'quiz',
  'pronunciation',
  'scramble',
  'word_match',
  'look_and_write',
  'choose_and_circle',
  'read_and_complete',
  'read_and_match',
  'vocabulary_test',
  'vocabulary_check',
] as const;

async function main() {
  const passwordHash = await bcrypt.hash('123123', 10);

  const user = await prisma.user.upsert({
    where: { username: 'demo' },
    update: { passwordHash, displayName: 'Học sinh Demo', role: 'student' },
    create: {
      username: 'demo',
      passwordHash,
      displayName: 'Học sinh Demo',
      role: 'student',
    },
  });

  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      passwordHash,
      displayName: 'Quản trị viên',
      role: 'admin',
    },
    create: {
      username: 'admin',
      passwordHash,
      displayName: 'Quản trị viên',
      role: 'admin',
    },
  });

  await prisma.classLevel.upsert({
    where: { levelName: 'Cấp Lớp 8' },
    update: { active: true },
    create: { levelName: 'Cấp Lớp 8', active: true },
  });

  const course = await prisma.course.upsert({
    where: { id: 'seed-course-everyup' },
    update: {
      name: 'EveryUp',
      levelName: 'Cấp Lớp 8',
      active: true,
    },
    create: {
      id: 'seed-course-everyup',
      name: 'EveryUp',
      levelName: 'Cấp Lớp 8',
      active: true,
    },
  });

  await prisma.question.deleteMany({
    where: { courseId: course.id, game: { in: [...SEED_GAMES] } },
  });

  await prisma.question.createMany({
    data: [
      {
        courseId: course.id,
        game: 'grammar',
        level: 'Cấp Lớp 8',
        sortOrder: 1,
        payload: {
          source: '',
          prefix: 'She',
          suffix: 'to school every day.',
          hint: 'go / goes',
          answers: ['goes'],
        },
      },
      {
        courseId: course.id,
        game: 'grammar',
        level: 'Cấp Lớp 8',
        sortOrder: 2,
        payload: {
          source: '',
          prefix: 'They',
          suffix: 'football yesterday.',
          hint: 'play / played',
          answers: ['played'],
        },
      },
      {
        courseId: course.id,
        game: 'quiz',
        level: 'Cấp Lớp 8',
        sortOrder: 1,
        payload: {
          type: 'multiple_choice',
          typeLabel: 'Chọn đáp án',
          question: 'She _____ to school every day.',
          answer: 'goes',
          options: ['go', 'goes', 'going', 'went'],
        },
      },
      {
        courseId: course.id,
        game: 'quiz',
        level: 'Cấp Lớp 8',
        sortOrder: 2,
        payload: {
          type: 'fill_blank',
          typeLabel: 'Điền từ',
          question: 'They _____ football yesterday.',
          answer: 'played',
          fillMode: true,
          accept: ['played'],
        },
      },
      {
        courseId: course.id,
        game: 'pronunciation',
        level: 'Cấp Lớp 8',
        sortOrder: 1,
        payload: {
          mode: 'phoneme',
          modeLabel: 'Luyện âm',
          prompt: 'Chú ý âm cuối từ',
          targetText: 'world',
          targetIpa: '/wɜːrld/',
        },
      },
      {
        courseId: course.id,
        game: 'pronunciation',
        level: 'Cấp Lớp 8',
        sortOrder: 2,
        payload: {
          mode: 'sentence',
          modeLabel: 'Luyện câu',
          prompt: 'Đọc to và rõ ràng',
          targetText: 'Nice to meet you',
        },
      },
      {
        courseId: course.id,
        game: 'scramble',
        level: 'Cấp Lớp 8',
        sortOrder: 1,
        payload: { word: 'PENCIL', hint: 'Đồ dùng học tập' },
      },
      {
        courseId: course.id,
        game: 'scramble',
        level: 'Cấp Lớp 8',
        sortOrder: 2,
        payload: { word: 'APPLE', hint: 'Quả táo' },
      },
      {
        courseId: course.id,
        game: 'word_match',
        level: 'Cấp Lớp 8',
        sortOrder: 1,
        payload: { word: 'cat', hint: 'con mèo' },
      },
      {
        courseId: course.id,
        game: 'word_match',
        level: 'Cấp Lớp 8',
        sortOrder: 2,
        payload: { word: 'book', hint: 'cuốn sách' },
      },
      {
        courseId: course.id,
        game: 'look_and_write',
        level: 'Cấp Lớp 8',
        sortOrder: 1,
        payload: {
          title: 'Animals',
          instruction: 'Look at the pictures and write the words.',
          word_bank: ['cat', 'dog', 'bird'],
          items: [
            { order: 1, image: '', answer: 'cat' },
            { order: 2, image: '', answer: 'dog' },
            { order: 3, image: '', answer: 'bird' },
          ],
        },
      },
      {
        courseId: course.id,
        game: 'choose_and_circle',
        level: 'Cấp Lớp 8',
        sortOrder: 1,
        payload: {
          title: 'Family words',
          instruction: 'Look at the picture and circle the correct word.',
          items: [
            { order: 1, image: '', options: ['brother', 'sister'], answer: 'brother' },
            { order: 2, image: '', options: ['mother', 'sister'], answer: 'sister' },
          ],
        },
      },
      {
        courseId: course.id,
        game: 'read_and_complete',
        level: 'Cấp Lớp 8',
        sortOrder: 1,
        payload: {
          title: 'My family',
          instruction: 'Complete the sentences with words from the box.',
          word_bank: ['mother', 'father', 'brother'],
          items: [
            { order: 1, sentence: 'This is my ___.', answer: 'mother' },
            { order: 2, sentence: 'He is my ___.', answer: 'father' },
            { order: 3, sentence: 'Tom is my ___.', answer: 'brother' },
          ],
        },
      },
      {
        courseId: course.id,
        game: 'read_and_match',
        level: 'Cấp Lớp 8',
        sortOrder: 1,
        payload: {
          title: 'At the zoo',
          instruction: 'Match each sentence to the correct picture.',
          items: [
            { order: 1, sentence: 'The lion is big.', image: '', label: 'A', answer: 'A' },
            { order: 2, sentence: 'The bird can fly.', image: '', label: 'B', answer: 'B' },
          ],
        },
      },
      {
        courseId: course.id,
        game: 'vocabulary_test',
        level: 'Cấp Lớp 8',
        sortOrder: 1,
        payload: {
          title: 'My toys',
          instruction: 'Look at the pictures and write the words.',
          word_bank: ['ball', 'doll'],
          items: [
            { order: 1, image: '', answer: 'ball' },
            { order: 2, image: '', answer: 'doll' },
          ],
        },
      },
      {
        courseId: course.id,
        game: 'vocabulary_check',
        level: 'Cấp Lớp 8',
        sortOrder: 1,
        payload: {
          title: 'True or false',
          instruction: 'Look at the picture and word. Is the sentence correct?',
          items: [
            {
              order: 1,
              image: '',
              word: 'cat',
              sentence: 'This is a cat.',
              is_correct: true,
            },
            {
              order: 2,
              image: '',
              word: 'dog',
              sentence: 'This is a bird.',
              is_correct: false,
            },
          ],
        },
      },
    ],
  });

  console.log('Seeded demo / 123123 (student), admin / 123123 (admin), course', course.name);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
