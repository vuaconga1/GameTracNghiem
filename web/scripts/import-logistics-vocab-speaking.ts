/**
 * Extract Key Vocabulary from Logistics unit ebooks → scramble + pronunciation
 * + AI Speaking topic. Also enables vocabulary/speaking skills on each course.
 *
 * Usage:
 *   node scripts/run-with-env.mjs neon -- npx tsx scripts/import-logistics-vocab-speaking.ts
 *   node scripts/run-with-env.mjs local -- npx tsx scripts/import-logistics-vocab-speaking.ts
 *   … -- --dry-run   # extract only, print JSON
 */
import '../lib/loadEnv';
import type { Prisma } from '@prisma/client';
import path from 'path';
import { pathToFileURL } from 'url';

import { parseGamePayload } from '../lib/admin/payloadSchemas';
import { prisma } from '../lib/db';
import {
  extractVocabHotspots,
  isVocabHeadword,
  textItemToViewportBox,
  type PdfTextBox,
} from '../lib/ebook/vocabHotspots';
import { openEbookFile } from '../lib/ebookStorage';
import { LOGISTICS_COURSES, LOGISTICS_LEVEL, LOGISTICS_WEEK2_COURSES } from '../lib/logisticsUnits';
import {
  deriveEnabledGamesFromSkills,
  normalizeGameSkillsMap,
  SKILL_IDS,
} from '../lib/skillCatalog';
import { buildDefaultTopicInstructions } from '../lib/speaking/prompts';

const SCRAMBLE = 'scramble';
const PRON = 'pronunciation';
const EXTERNAL_PREFIX = 'LOG-VOCAB';
const dryRun = process.argv.includes('--dry-run');
const week2Only = process.argv.includes('--week2');
const week1Only = process.argv.includes('--week1');
const SEEDS = week2Only
  ? LOGISTICS_WEEK2_COURSES
  : week1Only
    ? LOGISTICS_COURSES
    : [...LOGISTICS_COURSES, ...LOGISTICS_WEEK2_COURSES];

type VocabItem = { word: string; hint: string };

/** Keep glossary headwords; drop Key Sentence Structures / dialogue TTS lines. */
function isGameVocabWord(word: string): boolean {
  const w = word.replace(/\s+/g, ' ').trim();
  if (!isVocabHeadword(w)) return false;
  if (/[\[\]]/.test(w)) return false;
  if (/[?]/.test(w)) return false;
  if (/["“”]/.test(w)) return false;
  if (w.split(/\s+/).length > 6) return false;
  if (w.length > 48) return false;
  if (
    /^(thank you|i am a|is space|do you have|please confirm|today\.|how can|english for)\b/i.test(
      w
    )
  ) {
    return false;
  }
  if (
    /\b(objectives|focus question|call to action|q\s*&\s*a|simple steps|review question)\b/i.test(
      w
    )
  ) {
    return false;
  }
  if (/^(student\s+[ab]\b|step\s+\d|level\s+\d\b)/i.test(w)) return false;
  // Sentence-like: starts with verb/aux or has end punctuation mid-phrase.
  if (/[.!]$/.test(w) && w.split(/\s+/).length >= 3) return false;
  return true;
}

function cleanHint(raw: string): string {
  return raw
    .replace(/\s+/g, ' ')
    .replace(/\b(Example|Pattern)\s*:.*$/i, '')
    .replace(/\s*[|].*$/, '')
    .trim()
    .slice(0, 180);
}

function guessHint(pageText: string, word: string): string {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const lines = pageText.split(/\n/).map((l) => l.trim()).filter(Boolean);
  const idx = lines.findIndex((l) => l.toLowerCase() === word.toLowerCase());
  if (idx >= 0) {
    const after = lines.slice(idx + 1, idx + 6);
    const meaningIdx = after.findIndex((l) => /^meaning\s*:?/i.test(l));
    if (meaningIdx >= 0) {
      const parts: string[] = [];
      for (let i = meaningIdx; i < after.length; i++) {
        const line = after[i].replace(/^meaning\s*:?\s*/i, '').trim();
        if (!line) continue;
        if (/^(example|pattern)\s*:?/i.test(line)) break;
        if (isVocabHeadword(line) && i > meaningIdx) break;
        parts.push(line);
        if (/[.!?]$/.test(line)) break;
      }
      const joined = cleanHint(parts.join(' '));
      if (joined.length >= 3) return joined;
    }
  }

  const patterns = [
    new RegExp(`${escaped}\\s*(?:\\n|\\r)?\\s*Meaning\\s*:?\\s*([^\\n]{3,160})`, 'i'),
    new RegExp(`${escaped}\\s*[:：]\\s*([^\\n]{3,160})`, 'i'),
  ];
  for (const re of patterns) {
    const m = pageText.match(re);
    if (m?.[1]) {
      const hint = cleanHint(m[1]);
      if (hint.length >= 3) return hint;
    }
  }
  return '';
}

async function bufferFromOpened(opened: {
  body: Buffer | ReadableStream;
  contentLength?: number;
}): Promise<Buffer> {
  if (Buffer.isBuffer(opened.body)) return opened.body;
  const reader = (opened.body as ReadableStream).getReader();
  const chunks: Uint8Array[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  return Buffer.concat(chunks.map((c) => Buffer.from(c)));
}

async function loadPdfjs() {
  const pdfjsPath = path.join(
    process.cwd(),
    'node_modules',
    'pdfjs-dist',
    'legacy',
    'build',
    'pdf.mjs'
  );
  return import(pathToFileURL(pdfjsPath).href);
}

async function extractVocabItems(bytes: Buffer): Promise<VocabItem[]> {
  const pdfjs = await loadPdfjs();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(bytes), useSystemFonts: true })
    .promise;
  // Logistics decks are short; scan all pages so vocab before skill-lesson start is included.
  const byLower = new Map<string, VocabItem>();

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1 });
    const textContent = await page.getTextContent();
    const boxes: PdfTextBox[] = [];
    for (const item of textContent.items as Array<{
      str?: string;
      transform?: number[];
      width?: number;
      height?: number;
    }>) {
      if (!item?.str || !item.transform) continue;
      const box = textItemToViewportBox(
        item.str,
        item.transform,
        item.width ?? 0,
        item.height ?? 0,
        viewport.transform
      );
      if (box) boxes.push(box);
    }

    const hotspots = extractVocabHotspots(boxes, viewport.width, viewport.height);
    const plain = boxes
      .map((b) => b.str.trim())
      .filter(Boolean)
      .join('\n');

    for (const spot of hotspots) {
      const word = spot.word.replace(/\s+/g, ' ').trim();
      if (!isGameVocabWord(word)) continue;
      const lower = word.toLowerCase();
      if (byLower.has(lower)) continue;
      byLower.set(lower, { word, hint: guessHint(plain, word) });
    }
  }

  return [...byLower.values()];
}

function slugWord(word: string) {
  return word
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
}

async function ensureSkills(courseId: string) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { gameSkills: true, enabledSkills: true, enabledGames: true },
  });
  if (!course) return;

  const map = normalizeGameSkillsMap(course.gameSkills);
  map.scramble = 'vocabulary';
  map.pronunciation = 'speaking';
  // Hide empty quiz for logistics vocabulary until content exists.
  if (map.quiz === 'vocabulary') map.quiz = null;

  // Logistics practice: vocabulary + speaking only.
  const enabledSkills = SKILL_IDS.filter((id) => id === 'vocabulary' || id === 'speaking');
  const enabledGames = deriveEnabledGamesFromSkills(map, enabledSkills, course.enabledGames);

  await prisma.course.update({
    where: { id: courseId },
    data: {
      gameSkills: map as Prisma.InputJsonValue,
      enabledSkills,
      enabledGames,
    },
  });
}

async function ensureSpeakingSkillLesson(courseId: string) {
  const vocab = await prisma.courseSkillLesson.findUnique({
    where: { courseId_skillId: { courseId, skillId: 'vocabulary' } },
  });
  if (!vocab) return;
  await prisma.courseSkillLesson.upsert({
    where: { courseId_skillId: { courseId, skillId: 'speaking' } },
    create: {
      courseId,
      skillId: 'speaking',
      pageStart: vocab.pageStart,
      pageEnd: vocab.pageEnd,
    },
    update: {
      pageStart: vocab.pageStart,
      pageEnd: vocab.pageEnd,
    },
  });
}

async function replaceQuestions(
  courseId: string,
  game: string,
  prefix: string,
  items: VocabItem[],
  toPayload: (item: VocabItem, index: number) => Record<string, unknown>
) {
  await prisma.question.updateMany({
    where: { courseId, game, archivedAt: null },
    data: { archivedAt: new Date(), active: false },
  });

  let created = 0;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const payload = parseGamePayload(game, toPayload(item, i));
    const externalId = `${prefix}-${String(i + 1).padStart(2, '0')}-${slugWord(item.word)}`;
    await prisma.question.create({
      data: {
        courseId,
        game,
        active: true,
        sortOrder: i + 1,
        externalId,
        payload: payload as Prisma.InputJsonValue,
      },
    });
    created += 1;
  }
  return created;
}

async function upsertSpeakingTopic(courseId: string, title: string, levelName: string) {
  const instructions = buildDefaultTopicInstructions({
    topicTitle: title,
    grade: 9,
    levelName,
  });

  const existing = await prisma.speakingTopic.findFirst({
    where: { courseId, title, archivedAt: null },
    select: { id: true },
  });

  if (existing) {
    await prisma.speakingTopic.update({
      where: { id: existing.id },
      data: { instructions, durationSeconds: 300, active: true, sortOrder: 1 },
    });
    return 'updated';
  }

  await prisma.speakingTopic.create({
    data: {
      courseId,
      title,
      instructions,
      durationSeconds: 300,
      active: true,
      sortOrder: 1,
    },
  });
  return 'created';
}

async function processCourse(seed: (typeof SEEDS)[number]) {
  const course = await prisma.course.findFirst({
    where: {
      OR: [{ id: seed.id }, { name: seed.name, levelName: LOGISTICS_LEVEL }],
      active: true,
      archivedAt: null,
    },
    select: {
      id: true,
      name: true,
      levelName: true,
      ebookFileId: true,
      skillLessons: { select: { skillId: true, pageStart: true, pageEnd: true } },
    },
  });

  if (!course) {
    console.warn(`Skip: không thấy course ${seed.name}`);
    return null;
  }
  if (!course.ebookFileId) {
    console.warn(`Skip: ${course.name} không có ebook`);
    return null;
  }

  const ebook = await prisma.ebook.findUnique({ where: { id: course.ebookFileId } });
  if (!ebook) {
    console.warn(`Skip: ebook missing for ${course.name}`);
    return null;
  }

  const opened = await openEbookFile(ebook.storageKey);
  if (!opened) {
    console.warn(`Skip: không mở được file ${ebook.storageKey}`);
    return null;
  }
  const bytes = await bufferFromOpened(opened);

  const items = await extractVocabItems(bytes);
  console.log(`\n${course.name}: ${items.length} từ`);
  for (const item of items.slice(0, 8)) {
    console.log(`  - ${item.word}${item.hint ? ` — ${item.hint}` : ''}`);
  }
  if (items.length > 8) console.log(`  … +${items.length - 8} từ`);

  if (dryRun) {
    return { course: course.name, count: items.length, items };
  }

  if (items.length === 0) {
    console.warn(`  Không trích được từ — bỏ qua import`);
    return { course: course.name, count: 0 };
  }

  await ensureSkills(course.id);
  await ensureSpeakingSkillLesson(course.id);

  const scramblePrefix = `${EXTERNAL_PREFIX}-${seed.key}-SCR`;
  const pronPrefix = `${EXTERNAL_PREFIX}-${seed.key}-PRON`;

  const scrambleCount = await replaceQuestions(
    course.id,
    SCRAMBLE,
    scramblePrefix,
    items,
    (item) => ({ word: item.word, hint: item.hint, image: '' })
  );

  const pronCount = await replaceQuestions(
    course.id,
    PRON,
    pronPrefix,
    items,
    (item) => ({
      mode: 'word',
      targetText: item.word,
      targetIpa: '',
      hint: item.hint,
      exercise: 'Logistics vocabulary',
      referenceAudioUrl: '',
    })
  );

  const speakingAction = await upsertSpeakingTopic(
    course.id,
    seed.speakingTitle,
    course.levelName
  );

  console.log(
    `  → scramble ${scrambleCount}, pronunciation ${pronCount}, speaking ${speakingAction}`
  );
  return {
    course: course.name,
    count: items.length,
    scrambleCount,
    pronCount,
    speakingAction,
  };
}

async function main() {
  const reports = [];
  console.log(`Importing ${SEEDS.length} logistics course(s)${dryRun ? ' (dry-run)' : ''}…`);
  for (const seed of SEEDS) {
    reports.push(await processCourse(seed));
  }
  console.log('\nDone.', dryRun ? '(dry-run)' : '');
  console.log(JSON.stringify(reports.filter(Boolean), null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
