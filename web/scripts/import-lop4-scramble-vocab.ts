/**
 * Import scramble vocab for Lớp 4 Unit 1–19 from Global Success 4 PDF
 * (page N = Unit N). Hint = Vietnamese meaning. No image URLs.
 *
 * Usage:
 *   node scripts/run-with-env.mjs neon -- npx tsx scripts/import-lop4-scramble-vocab.ts
 *   node scripts/run-with-env.mjs local -- npx tsx scripts/import-lop4-scramble-vocab.ts
 */
import '../lib/loadEnv';
import type { Prisma } from '@prisma/client';

import { parseGamePayload } from '../lib/admin/payloadSchemas';
import { prisma } from '../lib/db';
import { findLop4CourseByUnit, LOP4_LEVEL } from '../lib/lop4Units';

const LEVEL = LOP4_LEVEL;
const GAME = 'scramble';
const EXTERNAL_PREFIX = 'GS4-SCRAMBLE';

type VocabItem = { word: string; hint: string };

/** Extracted from PDF pages 1–19 (main vocab tables only). */
const UNIT_VOCAB: Record<number, VocabItem[]> = {
  1: [
    { word: 'America', hint: 'nước Mỹ' },
    { word: 'Australia', hint: 'nước Úc' },
    { word: 'Britain', hint: 'nước Anh' },
    { word: 'Japan', hint: 'Nhật Bản' },
    { word: 'France', hint: 'nước Pháp' },
    { word: 'Vietnam', hint: 'Việt Nam' },
    { word: 'friend', hint: 'bạn' },
    { word: 'boy', hint: 'cậu bé' },
    { word: 'girl', hint: 'cô bé' },
    { word: 'student', hint: 'học sinh' },
    { word: 'teacher', hint: 'giáo viên' },
    { word: 'classroom', hint: 'phòng học' },
    { word: 'school', hint: 'trường học' },
    { word: 'play', hint: 'chơi' },
    { word: 'study', hint: 'học' },
    { word: 'like', hint: 'thích' },
    { word: 'family', hint: 'gia đình' },
    { word: 'from', hint: 'đến từ' },
    { word: 'country', hint: 'đất nước' },
    { word: 'flag', hint: 'lá cờ' },
  ],
  2: [
    { word: "o'clock", hint: 'giờ đúng' },
    { word: 'thirty', hint: 'ba mươi' },
    { word: 'fifteen', hint: 'mười lăm' },
    { word: 'get up', hint: 'thức dậy' },
    { word: 'go to bed', hint: 'đi ngủ' },
    { word: 'get up at', hint: 'thức dậy lúc' },
    { word: 'have breakfast', hint: 'ăn sáng' },
    { word: 'go to school', hint: 'đi học' },
    { word: 'have lunch', hint: 'ăn trưa' },
    { word: 'go home', hint: 'về nhà' },
    { word: 'do homework', hint: 'làm bài tập về nhà' },
    { word: 'have dinner', hint: 'ăn tối' },
    { word: 'watch TV', hint: 'xem ti vi' },
    { word: 'listen to music', hint: 'nghe nhạc' },
    { word: 'go to school at', hint: 'đi học lúc' },
  ],
  3: [
    { word: 'Monday', hint: 'thứ Hai' },
    { word: 'Tuesday', hint: 'thứ Ba' },
    { word: 'Wednesday', hint: 'thứ Tư' },
    { word: 'Thursday', hint: 'thứ Năm' },
    { word: 'Friday', hint: 'thứ Sáu' },
    { word: 'Saturday', hint: 'thứ Bảy' },
    { word: 'Sunday', hint: 'chủ nhật' },
    { word: 'week', hint: 'tuần' },
    { word: 'day', hint: 'ngày' },
    { word: 'every day', hint: 'mỗi ngày' },
    { word: 'have English', hint: 'học Tiếng Anh' },
    { word: 'have PE', hint: 'học Thể dục' },
    { word: 'have music', hint: 'học Âm nhạc' },
    { word: 'have art', hint: 'học Mỹ thuật' },
    { word: 'clean my room', hint: 'dọn phòng' },
    { word: 'play football', hint: 'chơi bóng đá' },
    { word: 'play badminton', hint: 'chơi cầu lông' },
    { word: 'read books', hint: 'đọc sách' },
    { word: 'watch TV', hint: 'xem ti vi' },
    { word: 'on the weekend', hint: 'vào cuối tuần' },
  ],
  4: [
    { word: 'birthday', hint: 'sinh nhật' },
    { word: 'party', hint: 'bữa tiệc' },
    { word: 'invite', hint: 'mời' },
    { word: 'guest', hint: 'khách mời' },
    { word: 'present', hint: 'món quà' },
    { word: 'gift', hint: 'món quà' },
    { word: 'balloon', hint: 'quả bóng bay' },
    { word: 'cake', hint: 'bánh kem' },
    { word: 'food', hint: 'đồ ăn' },
    { word: 'drink', hint: 'đồ uống' },
    { word: 'decorate', hint: 'trang trí' },
    { word: 'make a wish', hint: 'ước điều ước' },
    { word: 'blow out', hint: 'thổi tắt' },
    { word: 'sing', hint: 'hát' },
    { word: 'play games', hint: 'chơi trò chơi' },
    { word: 'take photos', hint: 'chụp ảnh' },
    { word: 'fun', hint: 'vui vẻ, thú vị' },
    { word: 'thanks', hint: 'cảm ơn' },
    { word: 'enjoy', hint: 'thích thú, tận hưởng' },
    { word: 'have a great time', hint: 'có khoảng thời gian tuyệt vời' },
  ],
  5: [
    { word: 'can', hint: 'có thể' },
    { word: 'cook', hint: 'nấu ăn' },
    { word: 'draw', hint: 'vẽ' },
    { word: 'play the guitar', hint: 'chơi đàn ghi-ta' },
    { word: 'play the piano', hint: 'chơi đàn pi-a-nô' },
    { word: 'ride a bike', hint: 'đi xe đạp' },
    { word: 'ride a horse', hint: 'cưỡi ngựa' },
    { word: 'swim', hint: 'bơi' },
    { word: 'roller skate', hint: 'trượt pa-tin' },
    { word: 'play football', hint: 'chơi bóng đá' },
    { word: 'play badminton', hint: 'chơi cầu lông' },
    { word: 'fly a kite', hint: 'thả diều' },
    { word: 'sing', hint: 'hát' },
    { word: 'dance', hint: 'nhảy múa' },
    { word: 'plant trees', hint: 'trồng cây' },
    { word: 'help parents', hint: 'giúp bố mẹ' },
    { word: 'clean the room', hint: 'dọn phòng' },
    { word: 'read books', hint: 'đọc sách' },
    { word: 'take photos', hint: 'chụp ảnh' },
    { word: 'watch TV', hint: 'xem ti vi' },
  ],
  6: [
    { word: 'school', hint: 'trường học' },
    { word: 'classroom', hint: 'phòng học' },
    { word: 'library', hint: 'thư viện' },
    { word: 'playground', hint: 'sân chơi' },
    { word: 'computer room', hint: 'phòng máy tính' },
    { word: 'music room', hint: 'phòng âm nhạc' },
    { word: 'art room', hint: 'phòng mỹ thuật' },
    { word: 'science room', hint: 'phòng khoa học' },
    { word: 'gym', hint: 'phòng thể chất' },
    { word: 'canteen', hint: 'nhà ăn' },
    { word: 'toilet', hint: 'nhà vệ sinh' },
    { word: 'garden', hint: 'vườn' },
    { word: 'gate', hint: 'cổng trường' },
    { word: 'stairs', hint: 'cầu thang' },
    { word: 'corridor', hint: 'hành lang' },
    { word: 'classmate', hint: 'bạn cùng lớp' },
    { word: 'teacher', hint: 'giáo viên' },
    { word: 'blackboard', hint: 'bảng đen' },
    { word: 'desk', hint: 'bàn' },
    { word: 'chair', hint: 'ghế' },
  ],
  7: [
    { word: 'art', hint: 'Mỹ thuật' },
    { word: 'English', hint: 'Tiếng Anh' },
    { word: 'history and geography', hint: 'Lịch sử và Địa lí' },
    { word: 'maths', hint: 'Toán' },
    { word: 'music', hint: 'Âm nhạc' },
    { word: 'science', hint: 'Khoa học' },
    { word: 'Vietnamese', hint: 'Tiếng Việt' },
    { word: 'Monday', hint: 'Thứ Hai' },
    { word: 'Tuesday', hint: 'Thứ Ba' },
    { word: 'Wednesday', hint: 'Thứ Tư' },
    { word: 'Thursday', hint: 'Thứ Năm' },
    { word: 'Friday', hint: 'Thứ Sáu' },
    { word: 'timetable', hint: 'thời khóa biểu' },
    { word: 'subject', hint: 'môn học' },
    { word: 'lesson', hint: 'tiết học' },
    { word: 'have English', hint: 'học Tiếng Anh' },
    { word: 'have Maths', hint: 'học Toán' },
    { word: 'have Music', hint: 'học Âm nhạc' },
    { word: 'have Science', hint: 'học Khoa học' },
    { word: 'have Art', hint: 'học Mỹ thuật' },
  ],
  8: [
    { word: 'IT', hint: 'Công nghệ thông tin' },
    { word: 'PE', hint: 'Thể dục' },
    { word: 'English teacher', hint: 'giáo viên Tiếng Anh' },
    { word: 'painter', hint: 'họa sĩ' },
    { word: 'maths teacher', hint: 'giáo viên Toán' },
    { word: 'writer', hint: 'nhà văn' },
    { word: 'because', hint: 'bởi vì' },
    { word: 'why', hint: 'tại sao' },
    { word: 'like', hint: 'thích' },
    { word: 'write', hint: 'viết' },
    { word: 'read', hint: 'đọc' },
    { word: 'draw', hint: 'vẽ' },
    { word: 'play sports', hint: 'chơi thể thao' },
    { word: 'computer', hint: 'máy tính' },
    { word: 'lesson', hint: 'tiết học' },
    { word: 'interesting', hint: 'thú vị' },
    { word: 'fun', hint: 'vui' },
    { word: 'useful', hint: 'hữu ích' },
    { word: 'favourite', hint: 'yêu thích nhất' },
    { word: 'subject', hint: 'môn học' },
  ],
  9: [
    { word: 'December', hint: 'tháng Mười hai' },
    { word: 'June', hint: 'tháng Sáu' },
    { word: 'July', hint: 'tháng Bảy' },
    { word: 'November', hint: 'tháng Mười một' },
    { word: 'October', hint: 'tháng Mười' },
    { word: 'September', hint: 'tháng Chín' },
    { word: 'sports day', hint: 'ngày hội thể thao' },
    { word: 'run', hint: 'chạy' },
    { word: 'jump', hint: 'nhảy' },
    { word: 'throw', hint: 'ném' },
    { word: 'race', hint: 'cuộc đua' },
    { word: 'team', hint: 'đội' },
    { word: 'tug of war', hint: 'kéo co' },
    { word: 'prize', hint: 'giải thưởng' },
    { word: 'cheer', hint: 'cổ vũ' },
    { word: 'when', hint: 'khi nào' },
    { word: 'is', hint: 'là' },
    { word: 'it', hint: 'nó' },
    { word: "isn't", hint: 'không phải là' },
    { word: "isn't it", hint: 'không phải sao' },
  ],
  10: [
    { word: 'beach', hint: 'bãi biển' },
    { word: 'campsite', hint: 'khu cắm trại' },
    { word: 'countryside', hint: 'nông thôn' },
    { word: 'Bangkok', hint: 'Băng Cốc' },
    { word: 'London', hint: 'Luân Đôn' },
    { word: 'Sydney', hint: 'Xi-đni' },
    { word: 'Tokyo', hint: 'Tô-ki-ô' },
    { word: 'last', hint: 'trước đây' },
    { word: 'yesterday', hint: 'hôm qua' },
    { word: 'at', hint: 'tại, ở' },
    { word: 'on', hint: 'vào' },
    { word: 'in', hint: 'trong' },
    { word: 'was', hint: 'đã là' },
    { word: 'were', hint: 'đã là' },
    { word: 'where', hint: 'ở đâu' },
    { word: 'come back', hint: 'trở về' },
    { word: 'visit', hint: 'thăm' },
    { word: 'go swimming', hint: 'đi bơi' },
    { word: 'go camping', hint: 'đi cắm trại' },
    { word: 'have a great time', hint: 'có khoảng thời gian tuyệt vời' },
  ],
  11: [
    { word: 'live', hint: 'sống' },
    { word: 'street', hint: 'đường phố' },
    { word: 'road', hint: 'con đường' },
    { word: 'in', hint: 'trong, ở' },
    { word: 'at', hint: 'tại (số nhà)' },
    { word: 'a busy street', hint: 'một con đường nhộn nhịp' },
    { word: 'a quiet village', hint: 'một ngôi làng yên tĩnh' },
    { word: 'a noisy road', hint: 'một con đường ồn ào' },
    { word: 'a big city', hint: 'một thành phố lớn' },
  ],
  12: [
    { word: 'farmer', hint: 'nông dân' },
    { word: 'policeman', hint: 'cảnh sát' },
    { word: 'office worker', hint: 'nhân viên văn phòng' },
    { word: 'actor', hint: 'diễn viên' },
    { word: 'nurse', hint: 'y tá' },
    { word: 'nursing home', hint: 'viện điều dưỡng' },
    { word: 'factory', hint: 'nhà máy' },
    { word: 'school', hint: 'trường học' },
    { word: 'farm', hint: 'nông trại' },
    { word: 'hospital', hint: 'bệnh viện' },
  ],
  13: [
    { word: 'look like', hint: 'trông như thế nào' },
    { word: 'tall', hint: 'cao' },
    { word: 'short', hint: 'thấp' },
    { word: 'slim', hint: 'mảnh khảnh' },
    { word: 'short hair', hint: 'tóc ngắn' },
    { word: 'long hair', hint: 'tóc dài' },
    { word: 'round face', hint: 'khuôn mặt tròn' },
    { word: 'big eyes', hint: 'mắt to' },
  ],
  14: [
    { word: 'in the morning', hint: 'vào buổi sáng' },
    { word: 'in the afternoon', hint: 'vào buổi chiều' },
    { word: 'at noon', hint: 'vào buổi trưa' },
    { word: 'in the evening', hint: 'vào buổi tối' },
    { word: 'do housework', hint: 'làm việc nhà' },
    { word: 'watch TV', hint: 'xem ti vi' },
    { word: 'wash the clothes', hint: 'giặt áo quần' },
    { word: 'clean the floor', hint: 'lau nhà' },
    { word: 'help with the cooking', hint: 'giúp đỡ việc nấu ăn' },
    { word: 'wash the dishes', hint: 'rửa chén, bát' },
  ],
  15: [
    { word: 'gym', hint: 'phòng tập gym' },
    { word: 'shopping centre', hint: 'trung tâm mua sắm' },
    { word: 'sports centre', hint: 'trung tâm thể thao' },
    { word: 'swimming pool', hint: 'hồ bơi' },
    { word: 'cinema', hint: 'rạp chiếu phim' },
    { word: 'a lot of', hint: 'nhiều' },
    { word: 'cook meals', hint: 'nấu ăn' },
    { word: 'play tennis', hint: 'chơi quần vợt' },
    { word: 'watch films', hint: 'xem phim' },
    { word: 'do yoga', hint: 'tập yo-ga' },
    { word: 'stay at home', hint: 'ở nhà' },
    { word: 'together', hint: 'cùng nhau' },
  ],
  16: [
    { word: 'weather', hint: 'thời tiết' },
    { word: 'last weekend', hint: 'cuối tuần vừa qua' },
    { word: 'yesterday', hint: 'ngày hôm qua' },
    { word: 'sunny', hint: 'có nắng' },
    { word: 'rainy', hint: 'có mưa' },
    { word: 'windy', hint: 'có gió' },
    { word: 'cloudy', hint: 'có mây' },
    { word: 'food stall', hint: 'quầy hàng thực phẩm' },
    { word: 'bookshop', hint: 'hiệu sách' },
    { word: 'supermarket', hint: 'siêu thị' },
    { word: 'bakery', hint: 'hiệu bánh' },
    { word: 'water park', hint: 'công viên nước' },
    { word: 'lovely', hint: 'vui vẻ, đáng yêu' },
    { word: 'great', hint: 'tuyệt vời' },
  ],
  17: [
    { word: 'stop', hint: 'dừng lại' },
    { word: 'go', hint: 'đi' },
    { word: 'turn right', hint: 'rẽ phải' },
    { word: 'turn left', hint: 'rẽ trái' },
    { word: 'buy', hint: 'mua' },
    { word: 'go straight', hint: 'đi thẳng' },
    { word: 'turn round', hint: 'quay ngược lại' },
    { word: 'get to', hint: 'đến (địa điểm)' },
    { word: 'on the left', hint: 'bên trái' },
    { word: 'on the right', hint: 'bên phải' },
  ],
  18: [
    { word: 'near', hint: 'gần' },
    { word: 'opposite', hint: 'đối diện' },
    { word: 'behind', hint: 'phía sau' },
    { word: 'between', hint: 'ở giữa' },
    { word: 'excuse me', hint: 'xin lỗi (để hỏi thăm)' },
    { word: 'toy shop', hint: 'cửa hàng đồ chơi' },
    { word: 'skirt', hint: 'chân váy' },
    { word: 'T-shirt', hint: 'áo thun' },
    { word: 'gift shop', hint: 'cửa hàng quà tặng' },
    { word: 'thousand', hint: 'nghìn' },
    { word: 'shoe shop', hint: 'hiệu giày' },
    { word: 'ice-cream', hint: 'kem' },
    { word: 'bookshop', hint: 'hiệu sách' },
    { word: 'bakery', hint: 'tiệm bánh' },
  ],
  19: [
    { word: 'giraffes', hint: 'hươu cao cổ' },
    { word: 'lions', hint: 'sư tử' },
    { word: 'crocodiles', hint: 'cá sấu' },
    { word: 'hippos', hint: 'hà mã' },
    { word: 'peacocks', hint: 'con công' },
    { word: 'dance beautifully', hint: 'nhảy/múa đẹp' },
    { word: 'run quickly', hint: 'chạy nhanh' },
    { word: 'roar loudly', hint: 'gầm to' },
    { word: 'sing merrily', hint: 'hát hay' },
    { word: 'neck', hint: 'cái cổ' },
  ],
};

async function importUnit(unit: number, words: VocabItem[]) {
  const course = await findLop4CourseByUnit(prisma, unit);
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

  // Also archive any leftover active scramble rows for this course (clean slate)
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
