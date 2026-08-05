/**
 * Global Success 3 core vocabulary with Vietnamese hints + IPA.
 * Source: numbered vocab cards (image + IPA) on
 * `PDF/Global Grade 3/Global success 3 Từ Vựng + Grammar.pdf`
 * — not Sentence Pattern / Phonics example sentences.
 */

export type Lop3VocabItem = {
  word: string;
  hint: string;
  ipa?: string;
};

export type Lop3UnitVocab = {
  unit: number;
  title: string;
  sound?: string;
  words: Lop3VocabItem[];
};

export const LOP3_UNIT_VOCAB: Record<number, Lop3UnitVocab> = {
  1: {
    unit: 1,
    title: 'Hello',
    words: [
      { word: 'hello', hint: 'xin chào', ipa: '/həˈləʊ/' },
      { word: 'hi', hint: 'chào (thân mật)', ipa: '/haɪ/' },
      { word: 'nice to meet you', hint: 'rất vui được gặp bạn', ipa: '/naɪs tuː miːt juː/' },
      { word: 'goodbye', hint: 'tạm biệt', ipa: '/ˌɡʊdˈbaɪ/' },
      { word: 'name', hint: 'tên', ipa: '/neɪm/' },
      { word: 'teacher', hint: 'giáo viên', ipa: '/ˈtiːtʃə(r)/' },
      { word: 'student', hint: 'học sinh', ipa: '/ˈstjuːdənt/' },
      { word: 'meet', hint: 'gặp', ipa: '/miːt/' },
      { word: 'morning', hint: 'buổi sáng', ipa: '/ˈmɔːnɪŋ/' },
      { word: 'afternoon', hint: 'buổi chiều', ipa: '/ˌɑːftəˈnuːn/' },
    ],
  },
  2: {
    unit: 2,
    title: 'Our Names',
    words: [
      { word: 'name', hint: 'tên', ipa: '/neɪm/' },
      { word: 'spell', hint: 'đánh vần', ipa: '/spel/' },
      { word: 'friends', hint: 'các bạn', ipa: '/frendz/' },
      { word: 'my', hint: 'của tôi', ipa: '/maɪ/' },
      { word: 'your', hint: 'của bạn', ipa: '/jɔː(r)/' },
      { word: 'I\'m', hint: 'tôi là', ipa: '/aɪm/' },
      { word: 'friend', hint: 'bạn', ipa: '/frend/' },
      { word: 'our', hint: 'của chúng tôi', ipa: '/aʊə(r)/' },
      { word: 'names', hint: 'những cái tên' },
      { word: 'we', hint: 'chúng tôi', ipa: '/wiː/' },
    ],
  },
  3: {
    unit: 3,
    title: 'Our Friends',
    words: [
      { word: 'name', hint: 'tên', ipa: '/neɪm/' },
      { word: 'friends', hint: 'các bạn', ipa: '/frendz/' },
      { word: 'play', hint: 'chơi', ipa: '/pleɪ/' },
      { word: 'this', hint: 'cái này', ipa: '/ðɪs/' },
      { word: 'happy', hint: 'vui vẻ', ipa: '/ˈhæpi/' },
      { word: 'these', hint: 'những cái này', ipa: '/ðiːz/' },
      { word: 'share', hint: 'chia sẻ', ipa: '/ʃeə(r)/' },
      { word: 'friendship', hint: 'tình bạn', ipa: '/ˈfrendʃɪp/' },
      { word: 'class', hint: 'lớp', ipa: '/klɑːs/' },
      { word: 'work', hint: 'làm việc / công việc', ipa: '/wɜːk/' },
    ],
  },
  4: {
    unit: 4,
    title: 'Our Bodies',
    words: [
      { word: 'hair', hint: 'tóc', ipa: '/heə(r)/' },
      { word: 'hand', hint: 'bàn tay', ipa: '/hænd/' },
      { word: 'body', hint: 'cơ thể', ipa: '/ˈbɒdi/' },
      { word: 'face', hint: 'khuôn mặt', ipa: '/feɪs/' },
      { word: 'strong', hint: 'mạnh', ipa: '/strɒŋ/' },
      { word: 'open', hint: 'mở', ipa: '/ˈəʊpən/' },
      { word: 'nose', hint: 'mũi', ipa: '/nəʊz/' },
      { word: 'parts', hint: 'các bộ phận', ipa: '/pɑːts/' },
      { word: 'eye', hint: 'mắt', ipa: '/aɪ/' },
      { word: 'move', hint: 'di chuyển', ipa: '/muːv/' },
    ],
  },
  5: {
    unit: 5,
    title: 'My Hobbies',
    words: [
      { word: 'sing', hint: 'hát', ipa: '/sɪŋ/' },
      { word: 'play', hint: 'chơi', ipa: '/pleɪ/' },
      { word: 'run', hint: 'chạy', ipa: '/rʌn/' },
      { word: 'draw', hint: 'vẽ', ipa: '/drɔː/' },
      { word: 'listen', hint: 'nghe', ipa: '/ˈlɪsən/' },
      { word: 'paint', hint: 'tô màu', ipa: '/peɪnt/' },
      { word: 'ride', hint: 'đi / cưỡi', ipa: '/raɪd/' },
      { word: 'hobbies', hint: 'các sở thích', ipa: '/ˈhɒbiz/' },
      { word: 'read', hint: 'đọc', ipa: '/riːd/' },
      { word: 'dance', hint: 'nhảy, múa', ipa: '/dɑːns/' },
    ],
  },
  6: {
    unit: 6,
    title: 'Our School',
    words: [
      { word: 'classroom', hint: 'lớp học', ipa: '/ˈklɑːsruːm/' },
      { word: 'gym', hint: 'phòng tập', ipa: '/dʒɪm/' },
      { word: 'library', hint: 'thư viện', ipa: '/ˈlaɪbrəri/' },
      { word: 'art room', hint: 'phòng mỹ thuật', ipa: '/ɑːt ruːm/' },
      { word: 'music room', hint: 'phòng âm nhạc', ipa: '/ˈmjuːzɪk ruːm/' },
      { word: 'school', hint: 'trường học', ipa: '/skuːl/' },
      { word: 'teacher', hint: 'giáo viên', ipa: '/ˈtiːtʃə(r)/' },
      { word: 'school yard', hint: 'sân trường', ipa: '/skuːl jɑːd/' },
      { word: 'computer room', hint: 'phòng máy tính', ipa: '/kəmˈpjuːtə ruːm/' },
      { word: 'school garden', hint: 'vườn trường', ipa: '/skuːl ˈɡɑːdn/' },
    ],
  },
  7: {
    unit: 7,
    title: 'Classroom instructions',
    words: [
      { word: 'open your book', hint: 'mở sách ra', ipa: '/ˈəʊpən jɔː(r) bʊk/' },
      { word: 'stand up', hint: 'đứng lên', ipa: '/ˌstænd ˈʌp/' },
      { word: 'don\'t talk', hint: 'đừng nói chuyện', ipa: '/dəʊnt tɔːk/' },
      { word: 'come in', hint: 'vào', ipa: '/kʌm ɪn/' },
      { word: 'sit down', hint: 'ngồi xuống', ipa: '/sɪt daʊn/' },
      { word: 'look at the board', hint: 'nhìn bảng', ipa: '/lʊk æt ðə bɔːd/' },
      { word: 'listen to the teacher', hint: 'nghe cô/thầy', ipa: '/ˈlɪsən tuː ðə ˈtiːtʃə(r)/' },
      { word: 'close your book', hint: 'đóng sách lại', ipa: '/kləʊz jɔː(r) bʊk/' },
      { word: 'don\'t draw on the desk', hint: 'đừng vẽ lên bàn', ipa: '/dəʊnt drɔː ɒn ðə desk/' },
      { word: 'line up', hint: 'xếp hàng', ipa: '/laɪn ʌp/' },
    ],
  },
  8: {
    unit: 8,
    title: 'My school things',
    words: [
      { word: 'school bag', hint: 'cặp sách', ipa: '/ˈskuːl bæɡ/' },
      { word: 'pencil', hint: 'bút chì', ipa: '/ˈpensl/' },
      { word: 'pen', hint: 'bút mực', ipa: '/pen/' },
      { word: 'ruler', hint: 'thước kẻ', ipa: '/ˈruːlə(r)/' },
      { word: 'book', hint: 'sách', ipa: '/bʊk/' },
      { word: 'notebook', hint: 'vở', ipa: '/ˈnəʊtbʊk/' },
      { word: 'eraser', hint: 'cục tẩy', ipa: '/ɪˈreɪzə(r)/' },
      { word: 'pencil case', hint: 'hộp bút', ipa: '/ˈpensl keɪs/' },
      { word: 'sharpener', hint: 'cái gọt bút chì', ipa: '/ˈʃɑːpnə(r)/' },
      { word: 'school things', hint: 'đồ dùng học tập', ipa: '/ˈskuːl θɪŋz/' },
    ],
  },
  9: {
    unit: 9,
    title: 'Colours',
    words: [
      { word: 'red', hint: 'màu đỏ', ipa: '/red/' },
      { word: 'blue', hint: 'màu xanh dương', ipa: '/bluː/' },
      { word: 'yellow', hint: 'màu vàng', ipa: '/ˈjeləʊ/' },
      { word: 'green', hint: 'màu xanh lá', ipa: '/ɡriːn/' },
      { word: 'orange', hint: 'màu cam', ipa: '/ˈɒrɪndʒ/' },
      { word: 'purple', hint: 'màu tím', ipa: '/ˈpɜːpl/' },
      { word: 'brown', hint: 'màu nâu', ipa: '/braʊn/' },
      { word: 'black', hint: 'màu đen', ipa: '/blæk/' },
      { word: 'white', hint: 'màu trắng', ipa: '/waɪt/' },
      { word: 'pink', hint: 'màu hồng', ipa: '/pɪŋk/' },
    ],
  },
  10: {
    unit: 10,
    title: 'Break time activities',
    words: [
      { word: 'playing chess', hint: 'chơi cờ vua', ipa: '/ˈpleɪɪŋ tʃes/' },
      { word: 'playing basketball', hint: 'chơi bóng rổ', ipa: '/ˈpleɪɪŋ ˈbæskɪtbɔːl/' },
      { word: 'skating', hint: 'trượt pa-tin', ipa: '/ˈskeɪtɪŋ/' },
      { word: 'skipping rope', hint: 'nhảy dây', ipa: '/ˈskɪpɪŋ rəʊp/' },
      { word: 'playing football', hint: 'chơi bóng đá', ipa: '/ˈpleɪɪŋ ˈfʊtbɔːl/' },
      { word: 'chatting', hint: 'tán gẫu', ipa: '/ˈtʃætɪŋ/' },
      { word: 'drawing', hint: 'vẽ', ipa: '/ˈdrɔːɪŋ/' },
      { word: 'reading a book', hint: 'đọc sách', ipa: '/ˈriːdɪŋ ə bʊk/' },
      { word: 'running', hint: 'chạy', ipa: '/ˈrʌnɪŋ/' },
    ],
  },
  11: {
    unit: 11,
    title: 'My family',
    words: [
      { word: 'grandfather', hint: 'ông', ipa: '/ˈɡrænfɑːðə(r)/' },
      { word: 'grandmother', hint: 'grandmother', ipa: '/ˈɡrænmʌðə(r)/' },
      { word: 'father', hint: 'bố', ipa: '/ˈfɑːðə(r)/' },
      { word: 'mother', hint: 'mẹ', ipa: '/ˈmʌðə(r)/' },
      { word: 'brother', hint: 'anh/em trai', ipa: '/ˈbrʌðə(r)/' },
      { word: 'sister', hint: 'chị/em gái', ipa: '/ˈsɪstə(r)/' },
      { word: 'uncle', hint: 'chú / bác', ipa: '/ˈʌŋkl/' },
      { word: 'aunt', hint: 'cô / dì', ipa: '/ɑːnt/' },
      { word: 'cousin', hint: 'anh chị em họ', ipa: '/ˈkʌzn/' },
      { word: 'family', hint: 'gia đình', ipa: '/ˈfæməli/' },
    ],
  },
  12: {
    unit: 12,
    title: 'Jobs',
    words: [
      { word: 'doctor', hint: 'bác sĩ', ipa: '/ˈdɒktə(r)/' },
      { word: 'teacher', hint: 'giáo viên', ipa: '/ˈtiːtʃə(r)/' },
      { word: 'police officer', hint: 'cảnh sát', ipa: '/pəˈliːs ˈɒfɪsə(r)/' },
      { word: 'driver', hint: 'tài xế', ipa: '/ˈdraɪvə(r)/' },
      { word: 'farmer', hint: 'nông dân', ipa: '/ˈfɑːmə(r)/' },
      { word: 'firefighter', hint: 'lính cứu hoả', ipa: '/ˈfaɪəfaɪtə(r)/' },
      { word: 'nurse', hint: 'y tá', ipa: '/nɜːs/' },
      { word: 'worker', hint: 'công nhân', ipa: '/ˈwɜːkə(r)/' },
      { word: 'artist', hint: 'hoạ sĩ', ipa: '/ˈɑːtɪst/' },
      { word: 'chef', hint: 'đầu bếp', ipa: '/ʃef/' },
    ],
  },
  13: {
    unit: 13,
    title: 'My house',
    words: [
      { word: 'house', hint: 'ngôi nhà', ipa: '/haʊs/' },
      { word: 'living room', hint: 'phòng khách', ipa: '/ˈlɪvɪŋ ruːm/' },
      { word: 'kitchen', hint: 'nhà bếp', ipa: '/ˈkɪtʃɪn/' },
      { word: 'bedroom', hint: 'phòng ngủ', ipa: '/ˈbedruːm/' },
      { word: 'bathroom', hint: 'nhà tắm', ipa: '/ˈbɑːθruːm/' },
      { word: 'garden', hint: 'vườn', ipa: '/ˈɡɑːdn/' },
      { word: 'roof', hint: 'mái nhà', ipa: '/ruːf/' },
      { word: 'window', hint: 'cửa sổ', ipa: '/ˈwɪndəʊ/' },
      { word: 'in/on/under', hint: 'trong / trên / dưới', ipa: '/ɪn/ɒn/ˈʌndə(r)/' },
      { word: 'rooms', hint: 'các phòng', ipa: '/ruːmz/' },
    ],
  },
  14: {
    unit: 14,
    title: 'My bedroom',
    words: [
      { word: 'bed', hint: 'giường', ipa: '/bed/' },
      { word: 'desk', hint: 'bàn học', ipa: '/desk/' },
      { word: 'chair', hint: 'ghế', ipa: '/tʃeə(r)/' },
      { word: 'poster', hint: 'áp phích', ipa: '/ˈpəʊstə(r)/' },
      { word: 'ball', hint: 'quả bóng', ipa: '/bɔːl/' },
      { word: 'books', hint: 'những quyển sách', ipa: '/bʊks/' },
      { word: 'teddy bear', hint: 'gấu bông', ipa: '/ˈtedi beə(r)/' },
      { word: 'toys', hint: 'đồ chơi', ipa: '/tɔɪz/' },
      { word: 'on/in/under', hint: 'trên / trong / dưới', ipa: '/ɒn/ɪn/ˈʌndə(r)/' },
      { word: 'room', hint: 'phòng', ipa: '/ruːm/' },
    ],
  },
  15: {
    unit: 15,
    title: 'At the dining table',
    words: [
      { word: 'chicken', hint: 'thịt gà', ipa: '/ˈtʃɪkɪn/' },
      { word: 'fish', hint: 'cá', ipa: '/fɪʃ/' },
      { word: 'meat', hint: 'thịt', ipa: '/miːt/' },
      { word: 'rice', hint: 'cơm, gạo', ipa: '/raɪs/' },
      { word: 'soup', hint: 'súp', ipa: '/suːp/' },
      { word: 'water', hint: 'nước', ipa: '/ˈwɔːtə(r)/' },
      { word: 'Would you like...?', hint: 'Bạn có muốn ... không?', ipa: '/wʊd juː laɪk/' },
      { word: 'pass', hint: 'đưa / chuyền', ipa: '/pɑːs/' },
      { word: 'on/in/under', hint: 'trên / trong / dưới', ipa: '/ɒn/ɪn/ˈʌndə(r)/' },
      { word: 'dining room', hint: 'phòng ăn', ipa: '/ˈdaɪnɪŋ ruːm/' },
    ],
  },
  16: {
    unit: 16,
    title: 'My pets',
    words: [
      { word: 'dog', hint: 'chó', ipa: '/dɒɡ/' },
      { word: 'cat', hint: 'mèo', ipa: '/kæt/' },
      { word: 'rabbit', hint: 'thỏ', ipa: '/ˈræbɪt/' },
      { word: 'bird', hint: 'chim', ipa: '/bɜːd/' },
      { word: 'hamster', hint: 'chuột hamster', ipa: '/ˈhæmstə(r)/' },
      { word: 'goldfish', hint: 'cá vàng', ipa: '/ˈɡəʊldfɪʃ/' },
      { word: 'Do you have...?', hint: 'Bạn có ... không?', ipa: '/duː juː hæv/' },
      { word: 'look at', hint: 'nhìn', ipa: '/lʊk æt/' },
      { word: 'on/in/under', hint: 'trên / trong / dưới', ipa: '/ɒn/ɪn/ˈʌndə(r)/' },
      { word: 'pet shop', hint: 'cửa hàng thú cưng', ipa: '/pet ʃɒp/' },
    ],
  },
  17: {
    unit: 17,
    title: 'Our toys',
    words: [
      { word: 'teddy bear', hint: 'gấu bông', ipa: '/ˈtedi beə(r)/' },
      { word: 'car', hint: 'ô tô', ipa: '/kɑː(r)/' },
      { word: 'ball', hint: 'quả bóng', ipa: '/bɔːl/' },
      { word: 'kite', hint: 'diều', ipa: '/kaɪt/' },
      { word: 'robot', hint: 'rô-bốt', ipa: '/ˈrəʊbɒt/' },
      { word: 'doll', hint: 'búp bê', ipa: '/dɒl/' },
      { word: 'Do you have...?', hint: 'Bạn có ... không?', ipa: '/duː juː hæv/' },
      { word: 'look at', hint: 'nhìn', ipa: '/lʊk æt/' },
      { word: 'on/in/under', hint: 'trên / trong / dưới', ipa: '/ɒn/ɪn/ˈʌndə(r)/' },
      { word: 'toy shop', hint: 'cửa hàng đồ chơi', ipa: '/tɔɪ ʃɒp/' },
    ],
  },
  18: {
    unit: 18,
    title: 'Playing and doing',
    words: [
      { word: 'running', hint: 'chạy', ipa: '/ˈrʌnɪŋ/' },
      { word: 'jumping', hint: 'nhảy', ipa: '/ˈdʒʌmpɪŋ/' },
      { word: 'throwing', hint: 'ném', ipa: '/ˈθrəʊɪŋ/' },
      { word: 'skipping rope', hint: 'nhảy dây', ipa: '/ˈskɪpɪŋ rəʊp/' },
      { word: 'stretching', hint: 'duỗi người', ipa: '/ˈstretʃɪŋ/' },
      { word: 'doing', hint: 'đang làm', ipa: '/ˈduːɪŋ/' },
      { word: 'Would you like...?', hint: 'Bạn có muốn ... không?', ipa: '/wʊd juː laɪk/' },
      { word: 'look at', hint: 'nhìn', ipa: '/lʊk æt/' },
      { word: 'in/on/under', hint: 'trong / trên / dưới', ipa: '/ɪn/ɒn/ˈʌndə(r)/' },
      { word: 'activity', hint: 'hoạt động', ipa: '/ækˈtɪvəti/' },
    ],
  },
  19: {
    unit: 19,
    title: 'Outdoor activities',
    words: [
      { word: 'skating', hint: 'trượt pa-tin', ipa: '/ˈskeɪtɪŋ/' },
      { word: 'skipping', hint: 'nhảy dây', ipa: '/ˈskɪpɪŋ/' },
      { word: 'flying a kite', hint: 'thả diều', ipa: '/ˈflaɪɪŋ ə kaɪt/' },
      { word: 'playing football', hint: 'chơi bóng đá', ipa: '/ˈpleɪɪŋ ˈfʊtbɔːl/' },
      { word: 'running', hint: 'chạy', ipa: '/ˈrʌnɪŋ/' },
      { word: 'swimming', hint: 'bơi', ipa: '/ˈswɪmɪŋ/' },
      { word: 'cycling', hint: 'đạp xe', ipa: '/ˈsaɪklɪŋ/' },
      { word: 'walking', hint: 'đi bộ', ipa: '/ˈwɔːkɪŋ/' },
      { word: 'in/on/under', hint: 'trong / trên / dưới', ipa: '/ɪn/ɒn/ˈʌndə(r)/' },
      { word: 'activity', hint: 'hoạt động', ipa: '/ækˈtɪvəti/' },
    ],
  },
  20: {
    unit: 20,
    title: 'At the zoo',
    words: [
      { word: 'elephant', hint: 'voi', ipa: '/ˈelɪfənt/' },
      { word: 'monkey', hint: 'khỉ', ipa: '/ˈmʌŋki/' },
      { word: 'lion', hint: 'lion', ipa: '/ˈlaɪən/' },
      { word: 'tiger', hint: 'hổ', ipa: '/ˈtaɪɡə(r)/' },
      { word: 'giraffe', hint: 'hươu cao cổ', ipa: '/dʒɪˈrɑːf/' },
      { word: 'zebra', hint: 'zebra', ipa: '/ˈzebrə/' },
      { word: 'camel', hint: 'lạc đà', ipa: '/ˈkæməl/' },
      { word: 'zoo garden', hint: 'vườn thú', ipa: '/zuː ˈɡɑːdn/' },
      { word: 'picnic', hint: 'dã ngoại', ipa: '/ˈpɪknɪk/' },
      { word: 'zoo picture', hint: 'tranh sở thú', ipa: '/zuː ˈpɪktʃə(r)/' },
    ],
  },
};

export function getLop3UnitVocab(unit: number): Lop3UnitVocab {
  const data = LOP3_UNIT_VOCAB[unit];
  if (!data) throw new Error(`Unknown Lớp 3 vocab unit: ${unit}`);
  return data;
}

export function slugifyLop3Word(word: string): string {
  return word
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
