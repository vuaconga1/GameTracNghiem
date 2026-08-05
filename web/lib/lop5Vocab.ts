/**
 * Global Success 5 core vocabulary with Vietnamese hints + IPA.
 * Source: numbered vocab cards (image + IPA) on
 * `PDF/Global Grade 5/Global success 5 Từ Vựng + Grammar.pdf`
 * — not Sentence Pattern / Phonics example sentences.
 */

export type Lop5VocabItem = {
  word: string;
  hint: string;
  ipa?: string;
};

export type Lop5UnitVocab = {
  unit: number;
  title: string;
  sound?: string;
  words: Lop5VocabItem[];
};

export const LOP5_UNIT_TITLES: Record<number, string> = {
  1: 'All about me!',
  2: 'Our homes',
  3: 'My foreign friends',
  4: 'Our free-time activities',
  5: 'My future job',
  6: 'Our school rooms',
  7: 'Our favourite school activities',
  8: 'In our classroom',
  9: 'Our outdoor activities',
  10: 'Our school trip',
  11: 'Family time',
  12: 'Our Tet holiday',
  13: 'Our special days',
  14: 'Staying healthy',
  15: 'Our health',
  16: 'Seasons and the weather',
  17: 'Stories for children',
  18: 'Means of transport',
  19: 'Places of interest',
  20: 'Our summer holiday',
};

export const LOP5_UNIT_COUNT = 20;

export const LOP5_UNIT_VOCAB: Record<number, Lop5UnitVocab> = {
  1: {
    unit: 1,
    title: LOP5_UNIT_TITLES[1],
    words: [
      { word: 'city', hint: 'thành phố', ipa: '/ˈsɪti/' },
      { word: 'class', hint: 'lớp học', ipa: '/klɑːs/' },
      { word: 'countryside', hint: 'nông thôn', ipa: '/ˈkʌntrisaɪd/' },
      { word: 'dolphin', hint: 'cá heo', ipa: '/ˈdɒlfɪn/' },
      { word: 'pink', hint: 'màu hồng', ipa: '/pɪŋk/' },
      { word: 'sandwich', hint: 'bánh mì kẹp', ipa: '/ˈsænwɪtʃ/' },
      { word: 'table tennis', hint: 'bóng bàn', ipa: '/ˈteɪbl tenɪs/' },
    ],
  },
  2: {
    unit: 2,
    title: LOP5_UNIT_TITLES[2],
    words: [
      { word: 'building', hint: 'toà nhà', ipa: '/ˈbɪldɪŋ/' },
      { word: 'flat', hint: 'căn hộ', ipa: '/flæt/' },
      { word: 'house', hint: 'căn nhà', ipa: '/haʊs/' },
      { word: 'tower', hint: 'toà tháp', ipa: '/ˈtaʊə/' },
      { word: 'twenty-three', hint: 'hai mươi ba', ipa: '/ˈtwenti θriː/' },
      { word: 'thirty-eight', hint: 'ba mươi tám', ipa: '/ˈθɜːti eɪt/' },
      { word: 'ninety-three', hint: 'chín mươi ba', ipa: '/ˈnaɪnti θriː/' },
      { word: 'one one six', hint: 'một một sáu (số nhà 116)', ipa: '/wʌn wʌn sɪks/' },
    ],
  },
  3: {
    unit: 3,
    title: LOP5_UNIT_TITLES[3],
    words: [
      { word: 'active', hint: 'năng động', ipa: '/ˈæktɪv/' },
      { word: 'American', hint: 'người Mỹ / thuộc Mỹ', ipa: '/əˈmerɪkən/' },
      { word: 'Australian', hint: 'người Úc / thuộc Úc', ipa: '/ɒˈstreɪliən/' },
      { word: 'clever', hint: 'thông minh', ipa: '/ˈklevə/' },
      { word: 'friendly', hint: 'thân thiện', ipa: '/ˈfrendli/' },
      { word: 'helpful', hint: 'hay giúp đỡ', ipa: '/ˈhelpfl/' },
      { word: 'Malaysian', hint: 'người Malaysia', ipa: '/məˈleɪʒn/' },
      { word: 'Japanese', hint: 'người Nhật / thuộc Nhật', ipa: '/ˌdʒæpəˈniːz/' },
    ],
  },
  4: {
    unit: 4,
    title: LOP5_UNIT_TITLES[4],
    words: [
      { word: 'always', hint: 'luôn luôn', ipa: '/ˈɔːlweɪz/' },
      { word: 'go for a walk', hint: 'đi dạo', ipa: '/ˌɡəʊ fə ə ˈwɔːk/' },
      { word: 'often', hint: 'thường xuyên', ipa: '/ˈɒftən/' },
      { word: 'play the violin', hint: 'chơi violin', ipa: '/pleɪ ðə ˌvaɪəˈlɪn/' },
      { word: 'sometimes', hint: 'thỉnh thoảng', ipa: '/ˈsʌmtaɪmz/' },
      { word: 'surf the Internet', hint: 'lướt Internet', ipa: '/sɜːf ði ˈɪntənet/' },
      { word: 'usually', hint: 'thường thường', ipa: '/ˈjuːʒuəli/' },
      { word: 'water the flowers', hint: 'tưới hoa', ipa: '/ˌwɔːtə ðə ˈflaʊəz/' },
    ],
  },
  5: {
    unit: 5,
    title: LOP5_UNIT_TITLES[5],
    words: [
      { word: 'firefighter', hint: 'lính cứu hoả', ipa: '/ˈfaɪəfaɪtə/' },
      { word: 'gardener', hint: 'người làm vườn', ipa: '/ˈɡɑːdnə/' },
      { word: 'grow flowers', hint: 'trồng hoa', ipa: '/ɡrəʊ ˈflaʊəz/' },
      { word: 'report the news', hint: 'đưa tin', ipa: '/rɪˈpɔːt ðə njuːz/' },
      { word: 'reporter', hint: 'phóng viên', ipa: '/rɪˈpɔːtə/' },
      { word: 'teach children', hint: 'dạy trẻ em', ipa: '/tiːtʃ ˈtʃɪldrən/' },
      { word: 'writer', hint: 'nhà văn', ipa: '/ˈraɪtə/' },
      { word: 'write stories', hint: 'viết truyện', ipa: '/raɪt ˈstɔːriz/' },
    ],
  },
  6: {
    unit: 6,
    title: LOP5_UNIT_TITLES[6],
    words: [
      { word: 'first floor', hint: 'tầng một', ipa: '/fɜːst flɔː/' },
      { word: 'go along', hint: 'đi dọc theo', ipa: '/ɡəʊ əˈlɒŋ/' },
      { word: 'downstairs', hint: 'tầng dưới / xuống dưới', ipa: '/daʊnˈsteəz/' },
      { word: 'past', hint: 'qua / ngang qua', ipa: '/pɑːst/' },
      { word: 'upstairs', hint: 'tầng trên / lên trên', ipa: '/ʌpˈsteəz/' },
      { word: 'ground floor', hint: 'tầng trệt', ipa: '/ɡraʊnd flɔː/' },
      { word: 'second floor', hint: 'tầng hai', ipa: '/ˈsekənd flɔː/' },
      { word: 'third floor', hint: 'tầng ba', ipa: '/θɜːd flɔː/' },
    ],
  },
  7: {
    unit: 7,
    title: LOP5_UNIT_TITLES[7],
    words: [
      { word: 'do projects', hint: 'làm dự án', ipa: '/duː ˈprɒdʒekts/' },
      { word: 'fun', hint: 'vui', ipa: '/fʌn/' },
      { word: 'good for group work', hint: 'tốt cho làm nhóm', ipa: '/ɡʊd fɔː ˈɡruːp wɜːk/' },
      { word: 'interesting', hint: 'thú vị', ipa: '/ˈɪntrəstɪŋ/' },
      { word: 'play games', hint: 'chơi trò chơi', ipa: '/pleɪ ɡeɪmz/' },
      { word: 'read books', hint: 'đọc sách', ipa: '/riːd bʊks/' },
      { word: 'solve maths problems', hint: 'giải bài toán', ipa: '/sɒlv mæθs ˈprɒbləmz/' },
      { word: 'useful', hint: 'hữu ích', ipa: '/ˈjuːsfl/' },
    ],
  },
  8: {
    unit: 8,
    title: LOP5_UNIT_TITLES[8],
    words: [
      { word: 'above', hint: 'phía trên', ipa: '/əˈbʌv/' },
      { word: 'beside', hint: 'bên cạnh', ipa: '/bɪˈsaɪd/' },
      { word: 'crayon', hint: 'bút màu', ipa: '/ˈkreɪən/' },
      { word: 'glue stick', hint: 'keo hồ', ipa: '/ɡluː stɪk/' },
      { word: 'in front of', hint: 'phía trước', ipa: '/ɪn frʌnt əv/' },
      { word: 'pencil sharpener', hint: 'cái gọt bút chì', ipa: '/ˈpensl ˈʃɑːpnə/' },
      { word: 'set square', hint: 'ê-ke', ipa: '/ˈset skweə/' },
      { word: 'under', hint: 'dưới', ipa: '/ˈʌndə/' },
    ],
  },
  9: {
    unit: 9,
    title: LOP5_UNIT_TITLES[9],
    words: [
      { word: 'aquarium', hint: 'thuỷ cung', ipa: '/əˈkweəriəm/' },
      { word: 'campsite', hint: 'khu cắm trại', ipa: '/ˈkæmpsaɪt/' },
      { word: 'dance', hint: 'dance', ipa: '/dɑːns/' },
      { word: 'around', hint: 'xung quanh', ipa: '/əˈraʊnd/' },
      { word: 'funfair', hint: 'hội chợ vui chơi', ipa: '/ˈfʌnfeə/' },
      { word: 'listen (to music)', hint: 'nghe (nhạc)', ipa: '/ˈlɪsn (tuː ˈmjuːzɪk)/' },
      { word: 'play (chess)', hint: 'chơi (cờ)', ipa: '/pleɪ (tʃes)/' },
      { word: 'theatre', hint: 'nhà hát', ipa: '/ˈθɪətə/' },
      { word: 'watch (the fish)', hint: 'xem (cá)', ipa: '/wɒtʃ (ðə fɪʃ)/' },
    ],
  },
  10: {
    unit: 10,
    title: LOP5_UNIT_TITLES[10],
    words: [
      { word: 'Bai Dinh Pagoda', hint: 'chùa Bái Đính', ipa: '/baɪ dɪnh pəˈɡəʊdə/' },
      { word: 'Ba Na Hills', hint: 'Bà Nà Hills', ipa: '/ˈbaː nɑː hɪlz/' },
      { word: 'Hoan Kiem Lake', hint: 'hồ Hoàn Kiếm', ipa: '/hwɑːn kiəm leɪk/' },
      { word: 'plant trees', hint: 'trồng cây', ipa: '/plɑːnt triːz/' },
      { word: 'play games', hint: 'chơi trò chơi', ipa: '/pleɪ ɡeɪmz/' },
      { word: 'Suoi Tien Theme Park', hint: 'Công viên Suối Tiên', ipa: '/suɔɪ tiən θiːm pɑːk/' },
      { word: 'visit the buildings', hint: 'tham quan các toà nhà', ipa: '/ˈvɪzɪt ðə ˈbɪldɪŋz/' },
      { word: 'walk around the lake', hint: 'đi quanh hồ', ipa: '/wɔːk əˈraʊnd ðə leɪk/' },
    ],
  },
  11: {
    unit: 11,
    title: LOP5_UNIT_TITLES[11],
    words: [
      { word: 'buy souvenirs', hint: 'mua quà lưu niệm', ipa: '/baɪ ˌsuːvəˈnɪə(r)/' },
      { word: 'collect seashells', hint: 'nhặt vỏ sò', ipa: '/kəˈlekt ˈsiːʃelz/' },
      { word: 'eat seafood', hint: 'ăn hải sản', ipa: '/iːt ˈsiːfuːd/' },
      { word: 'see some interesting places', hint: 'xem vài nơi thú vị', ipa: '/siː sʌm ˈɪntrəstɪŋ ˈpleɪsɪz/' },
      { word: 'take a boat trip around the bay', hint: 'đi thuyền quanh vịnh', ipa: '/teɪk ə ˈbəʊt trɪp əˈraʊnd ðə beɪ/' },
      { word: 'walk on the beach', hint: 'đi bộ trên bãi biển', ipa: '/wɔːk ɒn ðə biːtʃ/' },
    ],
  },
  12: {
    unit: 12,
    title: LOP5_UNIT_TITLES[12],
    words: [
      { word: 'buy roses', hint: 'mua hoa hồng', ipa: '/baɪ ˈrəʊzɪz/' },
      { word: 'buy a branch of peach blossoms', hint: 'mua một cành đào', ipa: '/baɪ ə brɑːntʃ əv piːtʃ ˈblɒsəmz/' },
      { word: 'decorate the house', hint: 'trang trí nhà', ipa: '/ˈdekəreɪt ðə haʊs/' },
      { word: 'do the shopping', hint: 'đi mua sắm', ipa: '/duː ðə ˈʃɒpɪŋ/' },
      { word: 'fireworks show', hint: 'buổi bắn pháo hoa', ipa: '/ˈfaɪəwɜːks ʃəʊ/' },
      { word: 'flower festival', hint: 'lễ hội hoa', ipa: '/ˈflaʊə ˈfestɪvl/' },
      { word: 'make banh chung', hint: 'gói bánh chưng', ipa: '/meɪk bæŋ tʃʊŋ/' },
      { word: 'make spring rolls', hint: 'làm nem / chả giò', ipa: '/meɪk sprɪŋ rəʊlz/' },
      { word: 'New Year party', hint: 'tiệc năm mới', ipa: '/njuː jɪə ˈpɑːti/' },
    ],
  },
  13: {
    unit: 13,
    title: LOP5_UNIT_TITLES[13],
    words: [
      { word: 'apple juice', hint: 'nước táo', ipa: '/ˈæpl dʒuːs/' },
      { word: 'at Mid-Autumn Festival', hint: 'vào Tết Trung thu', ipa: '/ət ˌmɪd ˈɔːtəm ˈfestɪvl/' },
      { word: 'burgers', hint: 'bánh burger', ipa: '/ˈbɜːɡəz/' },
      { word: 'on Children\'s Day', hint: 'vào Ngày Thiếu nhi', ipa: '/ɒn ˈtʃɪldrənz deɪ/' },
      { word: 'on Sports Day', hint: 'vào Ngày hội thể thao', ipa: '/ɒn ˈspɔːts deɪ/' },
      { word: 'on Teachers\' Day', hint: 'vào Ngày Nhà giáo', ipa: '/ɒn ˈtiːtʃəz deɪ/' },
      { word: 'milk tea', hint: 'trà sữa', ipa: '/mɪlk tiː/' },
      { word: 'pizza', hint: 'bánh pizza', ipa: '/ˈpiːtsə/' },
    ],
  },
  14: {
    unit: 14,
    title: LOP5_UNIT_TITLES[14],
    words: [
      { word: 'do morning exercise', hint: 'tập thể dục buổi sáng', ipa: '/duː ˈmɔːnɪŋ ˈeksəsaɪz/' },
      { word: 'do yoga', hint: 'tập yoga', ipa: '/duː ˈjəʊɡə/' },
      { word: 'drink fresh juice', hint: 'uống nước ép tươi', ipa: '/drɪŋk freʃ dʒuːs/' },
      { word: 'eat healthy food', hint: 'ăn đồ ăn lành mạnh', ipa: '/iːt ˈhelθi fuːd/' },
      { word: 'eat vegetables', hint: 'ăn rau', ipa: '/iːt ˈvedʒtəblz/' },
      { word: 'every day', hint: 'mỗi ngày', ipa: '/ˈevri deɪ/' },
      { word: 'once a week', hint: 'một lần/tuần', ipa: '/wʌns ə wiːk/' },
      { word: 'play sports', hint: 'chơi thể thao', ipa: '/pleɪ spɔːts/' },
      { word: 'three times a week', hint: 'ba lần/tuần', ipa: '/θriː taɪmz ə wiːk/' },
      { word: 'twice a week', hint: 'hai lần/tuần', ipa: '/twaɪs ə wiːk/' },
    ],
  },
  15: {
    unit: 15,
    title: LOP5_UNIT_TITLES[15],
    words: [
      { word: 'drink warm water', hint: 'uống nước ấm', ipa: '/drɪŋk wɔːm ˈwɔːtə/' },
      { word: 'go to the dentist', hint: 'đi khám răng', ipa: '/ɡəʊ tə ðə ˈdentɪst/' },
      { word: 'have a rest', hint: 'nghỉ ngơi', ipa: '/ˌhæv ə ˈrest/' },
      { word: 'headache', hint: 'đau đầu', ipa: '/ˈhedeɪk/' },
      { word: 'sore throat', hint: 'đau họng', ipa: '/sɔː θrəʊt/' },
      { word: 'stomach ache', hint: 'đau bụng', ipa: '/ˈstʌmək eɪk/' },
      { word: 'take some medicine', hint: 'uống thuốc', ipa: '/teɪk sʌm ˈmedsn/' },
      { word: 'toothache', hint: 'đau răng', ipa: '/ˈtuːθeɪk/' },
    ],
  },
  16: {
    unit: 16,
    title: LOP5_UNIT_TITLES[16],
    words: [
      { word: 'autumn', hint: 'mùa thu', ipa: '/ˈɔːtəm/' },
      { word: 'cold', hint: 'cảm lạnh', ipa: '/kəʊld/' },
      { word: 'cool', hint: 'mát', ipa: '/kuːl/' },
      { word: 'hot', hint: 'nóng', ipa: '/hɒt/' },
      { word: 'jeans', hint: 'quần jean', ipa: '/dʒiːnz/' },
      { word: 'jumper', hint: 'áo len', ipa: '/ˈdʒʌmpə/' },
      { word: 'spring', hint: 'mùa xuân', ipa: '/sprɪŋ/' },
      { word: 'summer', hint: 'mùa hè', ipa: '/ˈsʌmə/' },
      { word: 'trousers', hint: 'quần dài', ipa: '/ˈtraʊzəz/' },
      { word: 'warm blouse', hint: 'áo blouse ấm', ipa: '/wɔːm blaʊz/' },
      { word: 'winter', hint: 'mùa đông', ipa: '/ˈwɪntə/' },
    ],
  },
  17: {
    unit: 17,
    title: LOP5_UNIT_TITLES[17],
    words: [
      { word: 'ant', hint: 'kiến', ipa: '/ænt/' },
      { word: 'cook well', hint: 'nấu ăn giỏi', ipa: '/kʊk wel/' },
      { word: 'crow', hint: 'quạ', ipa: '/krəʊ/' },
      { word: 'dwarfs', hint: 'những chú lùn', ipa: '/dwɔːfs/' },
      { word: 'fox', hint: 'fox', ipa: '/fɒks/' },
      { word: 'grasshopper', hint: 'châu chấu', ipa: '/ˈɡrɑːshɒpə/' },
      { word: 'hare', hint: 'thỏ rừng', ipa: '/heə/' },
      { word: 'run fast', hint: 'chạy nhanh', ipa: '/rʌn fɑːst/' },
      { word: 'sing beautifully', hint: 'hát hay', ipa: '/sɪŋ ˈbjuːtɪfli/' },
      { word: 'tortoise', hint: 'rùa', ipa: '/ˈtɔːtəs/' },
      { word: 'Snow White', hint: 'Nàng Bạch Tuyết', ipa: '/snəʊ waɪt/' },
      { word: 'work hard', hint: 'làm việc chăm chỉ', ipa: '/wɜːk hɑːd/' },
    ],
  },
  18: {
    unit: 18,
    title: LOP5_UNIT_TITLES[18],
    words: [
      { word: 'by bicycle', hint: 'bằng xe đạp', ipa: '/baɪ ˈbaɪsɪkl/' },
      { word: 'by bus', hint: 'bằng xe buýt', ipa: '/baɪ bʌs/' },
      { word: 'by taxi', hint: 'bằng taxi', ipa: '/baɪ ˈtæksi/' },
      { word: 'on foot', hint: 'đi bộ', ipa: '/ɒn fʊt/' },
      { word: 'Dragon Bridge', hint: 'Cầu Rồng', ipa: '/ˈdræɡən brɪdʒ/' },
      { word: 'Ha Noi Opera House', hint: 'Nhà hát lớn Hà Nội', ipa: '/hɑː ˈnɔɪ ˈɒprə haʊs/' },
      { word: 'Ho Chi Minh City Museum', hint: 'Bảo tàng TP. Hồ Chí Minh', ipa: '/həʊ tʃiː mɪn ˈsɪti mjuːˈziːəm/' },
      { word: 'Ngo Mon Square', hint: 'Quảng trường Ngọ Môn', ipa: '/ŋəʊ mɒn skweə/' },
    ],
  },
  19: {
    unit: 19,
    title: LOP5_UNIT_TITLES[19],
    words: [
      { word: 'beautiful', hint: 'đẹp', ipa: '/ˈbjuːtɪfl/' },
      { word: 'exciting', hint: 'thú vị, sôi động', ipa: '/ɪkˈsaɪtɪŋ/' },
      { word: 'fantastic', hint: 'tuyệt vời', ipa: '/fænˈtæstɪk/' },
      { word: 'peaceful', hint: 'yên bình', ipa: '/ˈpiːsfl/' },
      { word: 'twenty-nine', hint: 'hai mươi chín', ipa: '/ˈtwenti naɪn/' },
      { word: 'forty', hint: 'bốn mươi', ipa: '/ˈfɔːti/' },
      { word: 'one hundred', hint: 'một trăm', ipa: '/wʌn ˈhʌndrəd/' },
      { word: 'one hundred and twenty-nine', hint: 'một trăm hai mươi chín', ipa: '/wʌn ˈhʌndrəd ənd ˈtwenti naɪn/' },
    ],
  },
  20: {
    unit: 20,
    title: LOP5_UNIT_TITLES[20],
    words: [
      { word: 'Dam Sen Aquarium', hint: 'Thuỷ cung Đầm Sen', ipa: '/dæm sen əˈkweəriəm/' },
      { word: 'go camping', hint: 'đi cắm trại', ipa: '/ɡəʊ ˈkæmpɪŋ/' },
      { word: 'Huong River', hint: 'sông Hương', ipa: '/huəŋ ˈrɪvə/' },
      { word: 'join a music club', hint: 'tham gia CLB âm nhạc', ipa: '/dʒɔɪn ə ˈmjuːzɪk klʌb/' },
      { word: 'Phong Nha Cave', hint: 'động Phong Nha', ipa: '/fɔŋ ɲɑː keɪv/' },
      { word: 'Phu Quoc Island', hint: 'đảo Phú Quốc', ipa: '/fuː kwɔk ˈaɪlənd/' },
      { word: 'practise swimming', hint: 'luyện bơi', ipa: '/ˈpræktɪs ˈswɪmɪŋ/' },
      { word: 'visit an eco-farm', hint: 'thăm trang trại sinh thái', ipa: '/ˈvɪzɪt ən ˈiːkəʊ fɑːm/' },
    ],
  },
};

export function getLop5UnitVocab(unit: number): Lop5UnitVocab {
  const data = LOP5_UNIT_VOCAB[unit];
  if (!data) throw new Error(`Unknown Lớp 5 vocab unit: ${unit}`);
  return data;
}

export function slugifyLop5Word(word: string): string {
  return word
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
