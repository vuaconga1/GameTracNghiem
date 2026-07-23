/**
 * Import scramble vocab for Lớp 8 Unit 1–6 from Grade 8 HK1 (GS).pdf
 * Vocab cards are on each unit's "A. VOCABULARY" opener page (image-based).
 * Hint = Vietnamese meaning. image left empty.
 *
 * Usage:
 *   node scripts/run-with-env.mjs local -- npx tsx scripts/import-lop8-scramble-vocab.ts
 *   node scripts/run-with-env.mjs neon -- npx tsx scripts/import-lop8-scramble-vocab.ts
 */
import '../lib/loadEnv';
import type { Prisma } from '@prisma/client';

import { parseGamePayload } from '../lib/admin/payloadSchemas';
import { prisma } from '../lib/db';
import { findLop8CourseByUnit, LOP8_LEVEL } from '../lib/lop8Units';

const LEVEL = LOP8_LEVEL;
const GAME = 'scramble';
const EXTERNAL_PREFIX = 'GS8-SCRAMBLE';

type VocabItem = { word: string; hint: string };

/**
 * Extracted from Grade 8 HK1 (GS).pdf vocabulary opener pages
 * (Unit 1 p.1, Unit 2 p.18, Unit 3 p.36, Unit 4 p.52, Unit 5 p.70, Unit 6 p.89).
 * OCR + manual cleanup of Vietnamese diacritics.
 */
const UNIT_VOCAB: Record<number, VocabItem[]> = {
  1: [
    { word: 'liberal democracy', hint: 'nền dân chủ tự do' },
    { word: 'balance', hint: 'sự cân bằng; giữ thăng bằng' },
    { word: 'bracelet', hint: 'vòng tay' },
    { word: 'crazy', hint: 'điên rồ' },
    { word: 'cruel', hint: 'độc ác' },
    { word: 'detest', hint: 'ghét cay ghét đắng' },
    { word: 'DIY', hint: 'đồ tự làm / tự tay làm' },
    { word: 'fancy', hint: 'thích; sang trọng' },
    { word: 'fold', hint: 'gấp' },
    { word: 'fond', hint: 'yêu thích' },
    { word: 'keen', hint: 'say mê, hứng thú' },
    { word: 'keep in touch', hint: 'giữ liên lạc' },
    { word: 'kit', hint: 'bộ dụng cụ' },
    { word: 'leisure', hint: 'thời gian rảnh' },
    { word: 'message', hint: 'tin nhắn' },
    { word: 'muscle', hint: 'cơ bắp' },
    { word: 'origami', hint: 'nghệ thuật gấp giấy' },
    { word: 'outdoors', hint: 'ngoài trời' },
    { word: 'prefer', hint: 'thích hơn' },
    { word: 'puzzle', hint: 'trò chơi xếp hình; câu đố' },
    { word: 'resort', hint: 'khu nghỉ dưỡng' },
    { word: 'snowboarding', hint: 'môn trượt ván trên tuyết' },
    { word: 'stay in shape', hint: 'giữ dáng; giữ cơ thể khỏe mạnh' },
  ],
  2: [
    { word: 'catch', hint: 'bắt; chụp' },
    { word: 'cattle', hint: 'gia súc' },
    { word: 'combine harvester', hint: 'máy gặt đập liên hợp' },
    { word: 'crop', hint: 'mùa màng; cây trồng' },
    { word: 'cultivate', hint: 'canh tác' },
    { word: 'dry', hint: 'phơi khô; khô' },
    { word: 'feed', hint: 'cho ăn' },
    { word: 'ferry', hint: 'phà' },
    { word: 'harvest', hint: 'thu hoạch' },
    { word: 'herd', hint: 'đàn' },
    { word: 'hospitable', hint: 'hiếu khách' },
    { word: 'lighthouse', hint: 'hải đăng' },
    { word: 'load', hint: 'chất hàng; hàng hóa' },
    { word: 'milk', hint: 'vắt sữa; sữa' },
    { word: 'orchard', hint: 'vườn cây ăn quả' },
    { word: 'paddy field', hint: 'ruộng lúa' },
    { word: 'picturesque', hint: 'đẹp như tranh' },
    { word: 'plough', hint: 'cày' },
    { word: 'speciality', hint: 'đặc sản' },
    { word: 'stretch', hint: 'dải; kéo dài' },
    { word: 'unload', hint: 'dỡ hàng' },
    { word: 'vast', hint: 'rộng lớn' },
    { word: 'well-trained', hint: 'được huấn luyện tốt' },
  ],
  3: [
    { word: 'account', hint: 'tài khoản' },
    { word: 'browse', hint: 'duyệt; lướt' },
    { word: 'bully', hint: 'kẻ bắt nạt; bắt nạt' },
    { word: 'bullying', hint: 'sự bắt nạt' },
    { word: 'concentrate', hint: 'tập trung' },
    { word: 'connect', hint: 'kết nối' },
    { word: 'craft', hint: 'đồ thủ công; làm thủ công' },
    { word: 'enjoyable', hint: 'thú vị; dễ chịu' },
    { word: 'expectation', hint: 'kỳ vọng; sự mong đợi' },
    { word: 'focused', hint: 'tập trung' },
    { word: 'forum', hint: 'diễn đàn' },
    { word: 'log', hint: 'đăng nhập; ghi lại' },
    { word: 'mature', hint: 'trưởng thành' },
    { word: 'media', hint: 'truyền thông' },
    { word: 'midterm', hint: 'kỳ thi giữa kỳ' },
    { word: 'notification', hint: 'thông báo' },
    { word: 'peer', hint: 'bạn cùng lứa; đồng trang lứa' },
    { word: 'pressure', hint: 'áp lực' },
    { word: 'schoolwork', hint: 'bài vở; việc học ở trường' },
    { word: 'session', hint: 'buổi học; phiên' },
    { word: 'stress', hint: 'căng thẳng' },
    { word: 'stressful', hint: 'gây căng thẳng' },
    { word: 'upload', hint: 'tải lên' },
  ],
  4: [
    { word: 'communal house', hint: 'nhà rông; nhà sinh hoạt cộng đồng' },
    { word: 'costume', hint: 'trang phục' },
    { word: 'crop', hint: 'cây trồng; mùa vụ' },
    { word: 'ethnic', hint: 'thuộc dân tộc' },
    { word: 'feature', hint: 'đặc điểm' },
    { word: 'flute', hint: 'sáo' },
    { word: 'folk', hint: 'dân gian' },
    { word: 'gong', hint: 'cồng; chiêng' },
    { word: 'harvest', hint: 'mùa gặt; thu hoạch' },
    { word: 'highland', hint: 'vùng cao' },
    { word: 'livestock', hint: 'gia súc' },
    { word: 'ethnic minority', hint: 'dân tộc thiểu số' },
    { word: 'overlook', hint: 'nhìn ra; trông ra' },
    { word: 'post', hint: 'cột' },
    { word: 'raise', hint: 'nuôi; trồng' },
    { word: 'soil', hint: 'đất' },
    { word: 'staircase', hint: 'cầu thang' },
    { word: 'statue', hint: 'tượng' },
    { word: 'stilt house', hint: 'nhà sàn' },
    { word: 'terraced', hint: 'bậc thang' },
    { word: 'weave', hint: 'dệt' },
    { word: 'wooden', hint: 'bằng gỗ' },
  ],
  5: [
    { word: 'acrobatics', hint: 'môn nhào lộn' },
    { word: 'admire', hint: 'ngưỡng mộ' },
    { word: 'bad spirit', hint: 'tà ma; linh hồn xấu' },
    { word: 'bamboo pole', hint: 'cây nêu' },
    { word: 'carp', hint: 'cá chép' },
    { word: 'coastal', hint: 'thuộc vùng biển' },
    { word: 'ceremony', hint: 'nghi lễ' },
    { word: 'chase away', hint: 'xua đuổi' },
    { word: 'contestant', hint: 'thí sinh' },
    { word: 'decorative', hint: 'trang trí' },
    { word: 'family bonding', hint: 'sự gắn kết gia đình' },
    { word: 'family reunion', hint: 'sum họp gia đình' },
    { word: 'festival goer', hint: 'người đi hội' },
    { word: 'lantern', hint: 'đèn lồng' },
    { word: 'longevity', hint: 'sự trường thọ' },
    { word: 'martial arts', hint: 'võ thuật' },
    { word: 'monk', hint: 'nhà sư' },
    { word: 'offering', hint: 'lễ vật' },
    { word: 'ornamental tree', hint: 'cây cảnh' },
    { word: 'pray', hint: 'cầu nguyện' },
    { word: 'release', hint: 'thả ra; phóng sinh' },
    { word: 'table manners', hint: 'phép lịch sự trên bàn ăn' },
    { word: 'worship', hint: 'thờ cúng' },
    { word: 'young rice', hint: 'gạo non; cốm' },
  ],
  6: [
    { word: 'dogsled', hint: 'xe chó kéo' },
    { word: 'experience', hint: 'trải nghiệm; kinh nghiệm' },
    { word: 'greet', hint: 'chào hỏi' },
    { word: 'greeting', hint: 'lời chào' },
    { word: 'habit', hint: 'thói quen' },
    { word: 'in the habit of', hint: 'có thói quen' },
    { word: 'hurry', hint: 'vội; sự vội vã' },
    { word: 'in a hurry', hint: 'đang vội' },
    { word: 'igloo', hint: 'lều tuyết' },
    { word: 'impact', hint: 'tác động; ảnh hưởng' },
    { word: 'independent', hint: 'độc lập' },
    { word: 'interact', hint: 'tương tác' },
    { word: 'interaction', hint: 'sự tương tác' },
    { word: 'lifestyle', hint: 'lối sống' },
    { word: 'make craft', hint: 'làm đồ thủ công' },
    { word: 'maintain', hint: 'duy trì; bảo dưỡng' },
    { word: 'musher', hint: 'người điều khiển xe chó kéo' },
    { word: 'nomadic', hint: 'du mục' },
    { word: 'offline', hint: 'ngoại tuyến' },
    { word: 'online', hint: 'trực tuyến' },
    { word: 'online learning', hint: 'học trực tuyến' },
    { word: 'revive', hint: 'làm sống lại; phục hồi' },
    { word: 'serve', hint: 'phục vụ; phục vụ món ăn' },
    { word: 'staple', hint: 'lương thực chính' },
    { word: 'street food', hint: 'đồ ăn đường phố' },
    { word: 'tribal', hint: 'thuộc bộ lạc' },
  ],
};

async function importUnit(unit: number, words: VocabItem[]) {
  const course = await findLop8CourseByUnit(prisma, unit);
  if (!course) {
    throw new Error(`Không tìm thấy khóa ${LEVEL} / Unit ${unit}`);
  }
  const courseName = course.name;
  const prefix = `${EXTERNAL_PREFIX}-U${unit}-`;

  await prisma.question.updateMany({
    where: {
      courseId: course.id,
      game: GAME,
      archivedAt: null,
      OR: [{ externalId: { startsWith: prefix } }, { externalId: null }],
    },
    data: { archivedAt: new Date(), active: false },
  });

  await prisma.question.updateMany({
    where: { courseId: course.id, game: GAME, archivedAt: null },
    data: { archivedAt: new Date(), active: false },
  });

  let created = 0;
  for (let i = 0; i < words.length; i++) {
    const { word, hint } = words[i];
    const payload = parseGamePayload(GAME, { word, hint, image: '' });
    const externalId = `${prefix}${String(i + 1).padStart(2, '0')}-${word
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')}`;

    await prisma.question.create({
      data: {
        courseId: course.id,
        game: GAME,
        active: true,
        sortOrder: i + 1,
        externalId,
        payload: payload as Prisma.InputJsonValue,
      },
    });
    created += 1;
  }

  console.log(`${LEVEL} ${courseName}: ${created} từ`);
  return created;
}

async function main() {
  const units = Object.keys(UNIT_VOCAB)
    .map(Number)
    .sort((a, b) => a - b);

  let total = 0;
  for (const unit of units) {
    total += await importUnit(unit, UNIT_VOCAB[unit]);
  }

  console.log(`\nDone: ${units.length} unit(s), ${total} scramble words.`);
  for (const unit of units) {
    console.log(`  Unit ${unit}: ${UNIT_VOCAB[unit].length}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
