export type Lop4WordMatchItem = {
  word: string;
  hint: string;
  cropKey: 'A' | 'B' | 'C' | 'D' | 'E';
};

export type Lop4ReadAndCompleteItem = {
  sentence: string;
  answer: string;
};

export type Lop4QuizItem = {
  type: 'fill_blank' | 'multiple_choice';
  typeLabel: string;
  question: string;
  answer: string;
  options?: string[];
  accept?: string[];
  fillMode?: boolean;
};

export type Lop4WorkbookUnit = {
  unit: number;
  page: number;
  title: string;
  wordMatch: {
    title: string;
    instruction: string;
    items: Lop4WordMatchItem[];
  };
  readAndComplete: {
    title: string;
    instruction: string;
    wordBank: string[];
    items: Lop4ReadAndCompleteItem[];
  };
  quiz: {
    title: string;
    instruction: string;
    items: Lop4QuizItem[];
  };
};

export const WORD_MATCH_PAGE_CROP_BOXES = [
  { key: 'A', left: 552, top: 104, width: 122, height: 88 },
  { key: 'B', left: 552, top: 193, width: 122, height: 88 },
  { key: 'C', left: 552, top: 282, width: 122, height: 88 },
  { key: 'D', left: 552, top: 372, width: 122, height: 88 },
  { key: 'E', left: 552, top: 460, width: 122, height: 88 },
] as const;

const workbook = (unit: number, title: string, item: Omit<Lop4WorkbookUnit, 'unit' | 'page' | 'title'>) => ({
  unit,
  page: unit,
  title,
  ...item,
});

export const LOP4_WORKBOOK_UNITS: Lop4WorkbookUnit[] = [
  workbook(1, 'My Friends', {
    wordMatch: {
      title: 'Unit 1 - Match the countries',
      instruction: 'Match the countries with the workbook pictures.',
      items: [
        { word: 'America', hint: 'Workbook exercise 2', cropKey: 'C' },
        { word: 'Japan', hint: 'Workbook exercise 2', cropKey: 'A' },
        { word: 'Viet Nam', hint: 'Workbook exercise 2', cropKey: 'E' },
        { word: 'Australia', hint: 'Workbook exercise 2', cropKey: 'B' },
        { word: 'Singapore', hint: 'Workbook exercise 2', cropKey: 'D' },
      ],
    },
    readAndComplete: {
      title: 'Unit 1 - Fill in the blanks',
      instruction: 'Complete the passage using the workbook word bank.',
      wordBank: ['Viet Nam', 'Australia', 'Singapore', 'America', 'Japan'],
      items: [
        { sentence: 'Hello! My name is Linda. I am from (1) _____.', answer: 'Viet Nam' },
        { sentence: 'Tom is from (2) _____. He likes kangaroos very much.', answer: 'Australia' },
        { sentence: 'Mai is from (3) _____. She speaks Vietnamese.', answer: 'Viet Nam' },
        { sentence: 'Ken is from (4) _____. He loves sushi.', answer: 'Japan' },
        { sentence: 'Lily is from (5) _____. It is a small but modern country.', answer: 'Singapore' },
      ],
    },
    quiz: {
      title: 'Unit 1 - Complete the words',
      instruction: 'Type the missing letters to complete each workbook word.',
      items: [
        { type: 'fill_blank', typeLabel: 'Complete the word', question: 'Complete the word: V__t N__m', answer: 'Viet Nam', fillMode: true, accept: ['Vietnam'] },
        { type: 'fill_blank', typeLabel: 'Complete the word', question: 'Complete the word: A__er__ca', answer: 'America', fillMode: true },
        { type: 'fill_blank', typeLabel: 'Complete the word', question: 'Complete the word: J__p__n', answer: 'Japan', fillMode: true },
        { type: 'fill_blank', typeLabel: 'Complete the word', question: 'Complete the word: S__ng__p__re', answer: 'Singapore', fillMode: true },
        { type: 'fill_blank', typeLabel: 'Complete the word', question: 'Complete the word: Au__tr__l__a', answer: 'Australia', fillMode: true },
      ],
    },
  }),
  workbook(2, 'Time And Daily Routines', {
    wordMatch: {
      title: 'Unit 2 - Match the activities',
      instruction: 'Match the activities with the workbook pictures.',
      items: [
        { word: 'get up', hint: 'Workbook exercise 2', cropKey: 'E' },
        { word: 'have breakfast', hint: 'Workbook exercise 2', cropKey: 'B' },
        { word: 'go to school', hint: 'Workbook exercise 2', cropKey: 'C' },
        { word: 'go to bed', hint: 'Workbook exercise 2', cropKey: 'A' },
        { word: 'thirty', hint: 'Workbook exercise 2', cropKey: 'D' },
      ],
    },
    readAndComplete: {
      title: 'Unit 2 - Fill in the blanks',
      instruction: 'Complete the passage using the workbook word bank.',
      wordBank: ['go to bed', 'seven', 'get up', 'have breakfast', 'go to school'],
      items: [
        { sentence: 'Every day, I (1) _____ at six o’clock.', answer: 'get up' },
        { sentence: 'Then I (2) _____ at 6:30.', answer: 'have breakfast' },
        { sentence: 'I (3) _____ at seven fifteen.', answer: 'go to school' },
        { sentence: 'In the evening, I do my homework and then I (4) _____ at nine o’clock.', answer: 'go to bed' },
        { sentence: 'My favorite time of the day is (5) _____ o’clock in the morning.', answer: 'seven' },
      ],
    },
    quiz: {
      title: 'Unit 2 - Complete the words',
      instruction: 'Type the missing letters to complete each workbook word.',
      items: [
        { type: 'fill_blank', typeLabel: 'Complete the word', question: 'Complete the word: o’cl__ck', answer: "o'clock", fillMode: true, accept: ["o' clock"] },
        { type: 'fill_blank', typeLabel: 'Complete the word', question: 'Complete the word: f__ft__en', answer: 'fifteen', fillMode: true },
        { type: 'fill_blank', typeLabel: 'Complete the word', question: 'Complete the word: th__rt__', answer: 'thirty', fillMode: true },
        { type: 'fill_blank', typeLabel: 'Complete the word', question: 'Complete the word: f__rt__-f__ve', answer: 'forty-five', fillMode: true, accept: ['forty five'] },
        { type: 'fill_blank', typeLabel: 'Complete the word', question: 'Complete the word: br__akf__st', answer: 'breakfast', fillMode: true },
      ],
    },
  }),
  workbook(3, 'My Week', {
    wordMatch: {
      title: 'Unit 3 - Match the activities',
      instruction: 'Match the activities with the workbook pictures.',
      items: [
        { word: 'do housework', hint: 'Workbook exercise 2', cropKey: 'B' },
        { word: 'listen to music', hint: 'Workbook exercise 2', cropKey: 'A' },
        { word: 'study at school', hint: 'Workbook exercise 2', cropKey: 'C' },
        { word: 'Friday', hint: 'Workbook exercise 2', cropKey: 'D' },
        { word: 'Sunday', hint: 'Workbook exercise 2', cropKey: 'E' },
      ],
    },
    readAndComplete: {
      title: 'Unit 3 - Fill in the blanks',
      instruction: 'Complete the passage using the workbook word bank.',
      wordBank: ['Monday', 'Wednesday', 'Friday', 'Sunday', 'housework'],
      items: [
        { sentence: 'I go to school on (1) _____, (2) _____ and (3) _____.', answer: 'Monday' },
        { sentence: 'I go to school on (1) Monday, (2) _____ and (3) Friday.', answer: 'Wednesday' },
        { sentence: 'I go to school on (1) Monday, (2) Wednesday and (3) _____.', answer: 'Friday' },
        { sentence: 'On (4) _____, I don’t go to school, so I stay at home and relax.', answer: 'Sunday' },
        { sentence: 'I also help my parents do (5) _____ on that day.', answer: 'housework' },
      ],
    },
    quiz: {
      title: 'Unit 3 - Complete the words',
      instruction: 'Type the missing letters to complete each workbook word.',
      items: [
        { type: 'fill_blank', typeLabel: 'Complete the word', question: 'Complete the word: M__nd__y', answer: 'Monday', fillMode: true },
        { type: 'fill_blank', typeLabel: 'Complete the word', question: 'Complete the word: T__esd__y', answer: 'Tuesday', fillMode: true },
        { type: 'fill_blank', typeLabel: 'Complete the word', question: 'Complete the word: W__dn__sd__y', answer: 'Wednesday', fillMode: true },
        { type: 'fill_blank', typeLabel: 'Complete the word', question: 'Complete the word: Th__rsd__y', answer: 'Thursday', fillMode: true },
        { type: 'fill_blank', typeLabel: 'Complete the word', question: 'Complete the word: S__nd__y', answer: 'Sunday', fillMode: true },
      ],
    },
  }),
  workbook(4, 'My Birthday Party', {
    wordMatch: {
      title: 'Unit 4 - Match the food and drinks',
      instruction: 'Match the food and drinks with the workbook pictures.',
      items: [
        { word: 'grapes', hint: 'Workbook exercise 2', cropKey: 'A' },
        { word: 'chips', hint: 'Workbook exercise 2', cropKey: 'C' },
        { word: 'juice', hint: 'Workbook exercise 2', cropKey: 'D' },
        { word: 'water', hint: 'Workbook exercise 2', cropKey: 'E' },
        { word: 'lemonade', hint: 'Workbook exercise 2', cropKey: 'B' },
      ],
    },
    readAndComplete: {
      title: 'Unit 4 - Fill in the blanks',
      instruction: 'Complete the passage using the workbook word bank.',
      wordBank: ['chips', 'friends', 'party', 'March', 'lemonade'],
      items: [
        { sentence: 'Hello! My name is Anna. My birthday is in (1) _____.', answer: 'March' },
        { sentence: 'So I have a big (2) _____ at home.', answer: 'party' },
        { sentence: 'I invite my (3) _____ to come and celebrate with me.', answer: 'friends' },
        { sentence: 'At the party, we eat (4) _____ and drink (5) _____.', answer: 'chips' },
        { sentence: 'At the party, we eat chips and drink (5) _____.', answer: 'lemonade' },
      ],
    },
    quiz: {
      title: 'Unit 4 - Complete the words',
      instruction: 'Type the missing letters to complete each workbook word.',
      items: [
        { type: 'fill_blank', typeLabel: 'Complete the word', question: 'Complete the word: J__nu__ry', answer: 'January', fillMode: true },
        { type: 'fill_blank', typeLabel: 'Complete the word', question: 'Complete the word: F__bru__ry', answer: 'February', fillMode: true },
        { type: 'fill_blank', typeLabel: 'Complete the word', question: 'Complete the word: M__rch', answer: 'March', fillMode: true },
        { type: 'fill_blank', typeLabel: 'Complete the word', question: 'Complete the word: A__r__l', answer: 'April', fillMode: true },
        { type: 'fill_blank', typeLabel: 'Complete the word', question: 'Complete the word: l__m__n__de', answer: 'lemonade', fillMode: true },
      ],
    },
  }),
  workbook(5, 'Things We Can Do', {
    wordMatch: {
      title: 'Unit 5 - Match the activities',
      instruction: 'Match the activities with the workbook pictures.',
      items: [
        { word: 'swim', hint: 'Workbook exercise 2', cropKey: 'D' },
        { word: 'cook', hint: 'Workbook exercise 2', cropKey: 'C' },
        { word: 'draw', hint: 'Workbook exercise 2', cropKey: 'E' },
        { word: 'ride a horse', hint: 'Workbook exercise 2', cropKey: 'A' },
        { word: 'play the piano', hint: 'Workbook exercise 2', cropKey: 'B' },
      ],
    },
    readAndComplete: {
      title: 'Unit 5 - Fill in the blanks',
      instruction: 'Complete the passage using the workbook word bank.',
      wordBank: ['swim', 'draw', 'piano', 'bike', 'cook'],
      items: [
        { sentence: 'I can (1) _____ very well, so I often make food for my family.', answer: 'cook' },
        { sentence: 'I also like to (2) _____ pictures in my free time.', answer: 'draw' },
        { sentence: 'After school, I can ride a (3) _____ with my friends.', answer: 'bike' },
        { sentence: 'I can play the (4) _____, too.', answer: 'piano' },
        { sentence: 'But I can’t (5) _____, so I want to learn it.', answer: 'swim' },
      ],
    },
    quiz: {
      title: 'Unit 5 - Complete the words',
      instruction: 'Type the missing letters to complete each workbook word.',
      items: [
        { type: 'fill_blank', typeLabel: 'Complete the word', question: 'Complete the word: c__ok', answer: 'cook', fillMode: true },
        { type: 'fill_blank', typeLabel: 'Complete the word', question: 'Complete the word: dr__w', answer: 'draw', fillMode: true },
        { type: 'fill_blank', typeLabel: 'Complete the word', question: 'Complete the word: pl__y th__ g__it__r', answer: 'play the guitar', fillMode: true },
        { type: 'fill_blank', typeLabel: 'Complete the word', question: 'Complete the word: sw__m', answer: 'swim', fillMode: true },
        { type: 'fill_blank', typeLabel: 'Complete the word', question: 'Complete the word: r__de __ b__ke', answer: 'ride a bike', fillMode: true },
      ],
    },
  }),
  workbook(6, 'Our School Facilities', {
    wordMatch: {
      title: 'Unit 6 - Match the places',
      instruction: 'Match the places with the workbook pictures.',
      items: [
        { word: 'city', hint: 'Workbook exercise 2', cropKey: 'B' },
        { word: 'mountains', hint: 'Workbook exercise 2', cropKey: 'D' },
        { word: 'computer room', hint: 'Workbook exercise 2', cropKey: 'A' },
        { word: 'garden', hint: 'Workbook exercise 2', cropKey: 'C' },
        { word: 'playground', hint: 'Workbook exercise 2', cropKey: 'E' },
      ],
    },
    readAndComplete: {
      title: 'Unit 6 - Fill in the blanks',
      instruction: 'Complete the passage using the workbook word bank.',
      wordBank: ['computer room', 'mountains', 'garden', 'city', 'playground'],
      items: [
        { sentence: 'Hello! My school is in the (1) _____. It is big and modern.', answer: 'city' },
        { sentence: 'There is a (2) _____ where we play after class.', answer: 'playground' },
        { sentence: 'We also have a (3) _____ to learn IT.', answer: 'computer room' },
        { sentence: 'Behind the school, there is a small (4) _____ with many flowers.', answer: 'garden' },
        { sentence: 'From my classroom, I can see the (5) _____ far away.', answer: 'mountains' },
      ],
    },
    quiz: {
      title: 'Unit 6 - Complete the words',
      instruction: 'Type the missing letters to complete each workbook word.',
      items: [
        { type: 'fill_blank', typeLabel: 'Complete the word', question: 'Complete the word: c__y', answer: 'city', fillMode: true },
        { type: 'fill_blank', typeLabel: 'Complete the word', question: 'Complete the word: m__nt__ns', answer: 'mountains', fillMode: true },
        { type: 'fill_blank', typeLabel: 'Complete the word', question: 'Complete the word: v__l__g__', answer: 'village', fillMode: true },
        { type: 'fill_blank', typeLabel: 'Complete the word', question: 'Complete the word: c__mp__t__r r__m', answer: 'computer room', fillMode: true },
        { type: 'fill_blank', typeLabel: 'Complete the word', question: 'Complete the word: pl__ygr__nd', answer: 'playground', fillMode: true },
      ],
    },
  }),
  workbook(7, 'Our Timetables', {
    wordMatch: {
      title: 'Unit 7 - Match the subjects',
      instruction: 'Match the subjects with the workbook pictures.',
      items: [
        { word: 'Maths', hint: 'Workbook exercise 2', cropKey: 'B' },
        { word: 'English', hint: 'Workbook exercise 2', cropKey: 'E' },
        { word: 'Music', hint: 'Workbook exercise 2', cropKey: 'C' },
        { word: 'Science', hint: 'Workbook exercise 2', cropKey: 'D' },
        { word: 'Art', hint: 'Workbook exercise 2', cropKey: 'A' },
      ],
    },
    readAndComplete: {
      title: 'Unit 7 - Fill in the blanks',
      instruction: 'Complete the passage using the workbook word bank.',
      wordBank: ['Maths', 'English', 'Music', 'Monday', 'Science'],
      items: [
        { sentence: 'Today is (1) _____, so I go to school.', answer: 'Monday' },
        { sentence: 'In the morning, I have (2) _____ and (3) _____.', answer: 'Maths' },
        { sentence: 'In the morning, I have Maths and (3) _____.', answer: 'English' },
        { sentence: 'In the afternoon, I have (4) _____. We do experiments and learn about the world.', answer: 'Science' },
        { sentence: 'After that, I have (5) _____. I sing songs and play instruments.', answer: 'Music' },
      ],
    },
    quiz: {
      title: 'Unit 7 - Complete the words',
      instruction: 'Type the missing letters to complete each workbook word.',
      items: [
        { type: 'fill_blank', typeLabel: 'Complete the word', question: 'Complete the word: M__ths', answer: 'Maths', fillMode: true, accept: ['Math'] },
        { type: 'fill_blank', typeLabel: 'Complete the word', question: 'Complete the word: En__l__sh', answer: 'English', fillMode: true },
        { type: 'fill_blank', typeLabel: 'Complete the word', question: 'Complete the word: M__s__c', answer: 'Music', fillMode: true },
        { type: 'fill_blank', typeLabel: 'Complete the word', question: 'Complete the word: Sc__en__e', answer: 'Science', fillMode: true },
        { type: 'fill_blank', typeLabel: 'Complete the word', question: 'Complete the word: V__etn__m__se', answer: 'Vietnamese', fillMode: true },
      ],
    },
  }),
  workbook(8, 'My Favourite Subjects', {
    wordMatch: {
      title: 'Unit 8 - Match the words',
      instruction: 'Match the words with the workbook pictures.',
      items: [
        { word: 'English', hint: 'Workbook exercise 2', cropKey: 'B' },
        { word: 'Maths', hint: 'Workbook exercise 2', cropKey: 'D' },
        { word: 'Art', hint: 'Workbook exercise 2', cropKey: 'A' },
        { word: 'painter', hint: 'Workbook exercise 2', cropKey: 'E' },
        { word: 'teacher', hint: 'Workbook exercise 2', cropKey: 'C' },
      ],
    },
    readAndComplete: {
      title: 'Unit 8 - Fill in the blanks',
      instruction: 'Complete the passage using the workbook word bank.',
      wordBank: ['English', 'Maths', 'Art', 'teacher', 'painter'],
      items: [
        { sentence: 'My favourite subject is (1) _____ because I like drawing pictures.', answer: 'Art' },
        { sentence: 'I want to be a (2) _____ in the future.', answer: 'painter' },
        { sentence: 'My friend Nam likes (3) _____ because he enjoys learning numbers.', answer: 'Maths' },
        { sentence: 'He wants to be a Maths (4) _____.', answer: 'teacher' },
        { sentence: 'Hoa likes (5) _____ because she wants to speak with people from other countries.', answer: 'English' },
      ],
    },
    quiz: {
      title: 'Unit 8 - Complete the words',
      instruction: 'Type the missing letters to complete each workbook word.',
      items: [
        { type: 'fill_blank', typeLabel: 'Complete the word', question: 'Complete the word: En__l__sh', answer: 'English', fillMode: true },
        { type: 'fill_blank', typeLabel: 'Complete the word', question: 'Complete the word: M__ths', answer: 'Maths', fillMode: true, accept: ['Math'] },
        { type: 'fill_blank', typeLabel: 'Complete the word', question: 'Complete the word: Sc__en__e', answer: 'Science', fillMode: true },
        { type: 'fill_blank', typeLabel: 'Complete the word', question: 'Complete the word: p__nt__r', answer: 'painter', fillMode: true },
        { type: 'fill_blank', typeLabel: 'Complete the word', question: 'Complete the word: t__ach__r', answer: 'teacher', fillMode: true },
      ],
    },
  }),
  workbook(9, 'Our Sports Day', {
    wordMatch: {
      title: 'Unit 9 - Match the words',
      instruction: 'Match the words with the workbook pictures.',
      items: [
        { word: 'July', hint: 'Workbook exercise 2', cropKey: 'D' },
        { word: 'December', hint: 'Workbook exercise 2', cropKey: 'B' },
        { word: 'sports day', hint: 'Workbook exercise 2', cropKey: 'E' },
        { word: 'running race', hint: 'Workbook exercise 2', cropKey: 'A' },
        { word: 'football match', hint: 'Workbook exercise 2', cropKey: 'C' },
      ],
    },
    readAndComplete: {
      title: 'Unit 9 - Fill in the blanks',
      instruction: 'Complete the passage using the workbook word bank.',
      wordBank: ['September', 'sports day', 'run', 'jump', 'play'],
      items: [
        { sentence: 'Every year, my school has a big (1) _____.', answer: 'sports day' },
        { sentence: 'On that day, I (2) _____ very fast in the race with my friends.', answer: 'run' },
        { sentence: 'I also (3) _____ high and try my best in all the games.', answer: 'jump' },
        { sentence: 'After the activities, we (4) _____ football together and have a lot of fun.', answer: 'play' },
        { sentence: 'Our sports day is in (5) _____, so I always look forward to that month.', answer: 'September' },
      ],
    },
    quiz: {
      title: 'Unit 9 - Complete the words',
      instruction: 'Type the missing letters to complete each workbook word.',
      items: [
        { type: 'fill_blank', typeLabel: 'Complete the word', question: 'Complete the word: J__n__', answer: 'June', fillMode: true },
        { type: 'fill_blank', typeLabel: 'Complete the word', question: 'Complete the word: J__l__', answer: 'July', fillMode: true },
        { type: 'fill_blank', typeLabel: 'Complete the word', question: 'Complete the word: A__g__st', answer: 'August', fillMode: true },
        { type: 'fill_blank', typeLabel: 'Complete the word', question: 'Complete the word: S__pt__mb__r', answer: 'September', fillMode: true },
        { type: 'fill_blank', typeLabel: 'Complete the word', question: 'Complete the word: D__c__mb__r', answer: 'December', fillMode: true },
      ],
    },
  }),
  workbook(10, 'Our Summer Holidays', {
    wordMatch: {
      title: 'Unit 10 - Match the words',
      instruction: 'Match the words with the workbook pictures.',
      items: [
        { word: 'beach', hint: 'Workbook exercise 2', cropKey: 'B' },
        { word: 'campsite', hint: 'Workbook exercise 2', cropKey: 'A' },
        { word: 'London', hint: 'Workbook exercise 2', cropKey: 'C' },
        { word: 'last weekend', hint: 'Workbook exercise 2', cropKey: 'D' },
        { word: 'yesterday', hint: 'Workbook exercise 2', cropKey: 'E' },
      ],
    },
    readAndComplete: {
      title: 'Unit 10 - Fill in the blanks',
      instruction: 'Complete the passage using the workbook word bank.',
      wordBank: ['beach', 'London', 'countryside', 'yesterday', 'last summer'],
      items: [
        { sentence: '(1) _____, I had a wonderful holiday with my family, so I still remember it very clearly.', answer: 'last summer' },
        { sentence: 'We first visited (2) _____, where I saw many famous places and busy streets.', answer: 'London' },
        { sentence: 'After that, we went to the (3) _____ to enjoy the quiet life and fresh air.', answer: 'countryside' },
        { sentence: 'At the end of the trip, we relaxed at the (4) _____ and swam in the sea together.', answer: 'beach' },
        { sentence: '(5) _____, I looked at the photos from that trip and felt very happy.', answer: 'yesterday' },
      ],
    },
    quiz: {
      title: 'Unit 10 - Complete the words',
      instruction: 'Type the missing letters to complete each workbook word.',
      items: [
        { type: 'fill_blank', typeLabel: 'Complete the word', question: 'Complete the word: b__a__h', answer: 'beach', fillMode: true },
        { type: 'fill_blank', typeLabel: 'Complete the word', question: 'Complete the word: c__mp__it__', answer: 'campsite', fillMode: true },
        { type: 'fill_blank', typeLabel: 'Complete the word', question: 'Complete the word: c__untr__s__d__', answer: 'countryside', fillMode: true },
        { type: 'fill_blank', typeLabel: 'Complete the word', question: 'Complete the word: L__nd__n', answer: 'London', fillMode: true },
        { type: 'fill_blank', typeLabel: 'Complete the word', question: 'Complete the word: y__st__rd__y', answer: 'yesterday', fillMode: true },
      ],
    },
  }),
  workbook(11, 'My Home', {
    wordMatch: { title: 'Unit 11 - No picture-match import', instruction: 'No dedicated workbook picture-match exercise for this unit.', items: [] },
    readAndComplete: {
      title: 'Unit 11 - Fill in the blanks',
      instruction: 'Complete the passage using the workbook word bank.',
      wordBank: ['big', 'quiet', 'live', 'busy', 'street'],
      items: [
        { sentence: 'My name is Nam. I (1) _____ in a (2) _____ house on Tran Hung Dao (3) _____.', answer: 'live' },
        { sentence: 'My name is Nam. I live in a (2) _____ house on Tran Hung Dao Street.', answer: 'big' },
        { sentence: 'My name is Nam. I live in a big house on Tran Hung Dao (3) _____.', answer: 'street' },
        { sentence: 'My street is very (4) _____ in the morning,', answer: 'busy' },
        { sentence: 'but it is (5) _____ at night.', answer: 'quiet' },
      ],
    },
    quiz: {
      title: 'Unit 11 - Multiple choice',
      instruction: 'Choose the correct answer from the workbook.',
      items: [
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'Where do you live?', answer: 'I live on Tran Hung Dao Street.', options: ['I live noisy.', 'I live on Tran Hung Dao Street.', 'I busy.'] },
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'What’s the street like?', answer: 'It’s a busy street.', options: ['It’s a big.', 'It’s a busy street.', 'It live street.'] },
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'The village is very _____.', answer: 'quiet', options: ['noisy', 'quiet', 'busy'] },
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'I _____ in a small house.', answer: 'live', options: ['live', 'big', 'street'] },
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'The street is very _____ with many cars.', answer: 'busy', options: ['quiet', 'busy', 'big'] },
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'My house is on a _____.', answer: 'street', options: ['street', 'live', 'noisy'] },
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'The elephant is very _____.', answer: 'big', options: ['busy', 'big', 'quiet'] },
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'What’s the village like?', answer: 'It is a quiet village.', options: ['It’s a quiet village.', 'I live village.', 'It noisy.'] },
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'The street is very _____ at night.', answer: 'quiet', options: ['quiet', 'busy', 'big'] },
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'I live _____ 81 Tran Hung Dao Street.', answer: 'at', options: ['in', 'at', 'on'] },
      ],
    },
  }),
  workbook(12, 'Jobs', {
    wordMatch: { title: 'Unit 12 - No picture-match import', instruction: 'No dedicated workbook picture-match exercise for this unit.', items: [] },
    readAndComplete: {
      title: 'Unit 12 - Fill in the blanks',
      instruction: 'Complete the passage using the workbook word bank.',
      wordBank: ['nurse', 'farm', 'works', 'factory', 'office'],
      items: [
        { sentence: 'My father is a farmer. He (1) _____ on a (2) _____.', answer: 'works' },
        { sentence: 'My father is a farmer. He works on a (2) _____.', answer: 'farm' },
        { sentence: 'My mother is a (3) _____. She works at a hospital.', answer: 'nurse' },
        { sentence: 'My brother is an office worker. He works in an (4) _____.', answer: 'office' },
        { sentence: 'My uncle works in a (5) _____.', answer: 'factory' },
      ],
    },
    quiz: {
      title: 'Unit 12 - Multiple choice',
      instruction: 'Choose the correct answer from the workbook.',
      items: [
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'What does he do?', answer: 'He’s a policeman.', options: ['He works at a hospital.', 'He’s a policeman.', 'He’s work policeman.'] },
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'What does your mother do?', answer: 'She’s a nurse.', options: ['She’s a nurse.', 'She work at hospital.', 'She a nurse.'] },
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'A farmer works on a _____.', answer: 'farm', options: ['hospital', 'farm', 'factory'] },
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'A nurse works at a _____.', answer: 'hospital', options: ['hospital', 'farm', 'office'] },
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'He works in a _____.', answer: 'factory', options: ['farmer', 'factory', 'nurse'] },
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'What does she do?', answer: 'She’s an office worker.', options: ['She works at a farm.', 'She’s an office worker.', 'She work office.'] },
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'A policeman works in a _____.', answer: 'city', options: ['farm', 'hospital', 'city'] },
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'Where does he work?', answer: 'He works on a farm.', options: ['He’s a farmer.', 'He works on a farm.', 'He farm.'] },
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'An office worker works in an _____.', answer: 'office', options: ['office', 'hospital', 'farm'] },
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'Where does she work?', answer: 'She works at a nursing home.', options: ['She’s a nurse.', 'She works at a nursing home.', 'She nursing home.'] },
      ],
    },
  }),
  workbook(13, 'Appearance', {
    wordMatch: { title: 'Unit 13 - No picture-match import', instruction: 'No dedicated workbook picture-match exercise for this unit.', items: [] },
    readAndComplete: {
      title: 'Unit 13 - Fill in the blanks',
      instruction: 'Complete the passage using the workbook word bank.',
      wordBank: ['eyes', 'slim', 'tall', 'long', 'round'],
      items: [
        { sentence: 'My best friend is very friendly and kind. He is quite (1) _____ and not short like me.', answer: 'tall' },
        { sentence: 'He has (2) _____ black hair that looks very nice.', answer: 'long' },
        { sentence: 'His face is (3) _____, and he has big brown (4) _____.', answer: 'round' },
        { sentence: 'His face is round, and he has big brown (4) _____.', answer: 'eyes' },
        { sentence: 'He is also (5) _____, so he looks healthy.', answer: 'slim' },
      ],
    },
    quiz: {
      title: 'Unit 13 - Multiple choice',
      instruction: 'Choose the correct answer from the workbook.',
      items: [
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'What does your brother look like?', answer: 'He is tall and slim.', options: ['He is tall and slim.', 'He works in a factory.', 'He is work tall.'] },
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'My sister has _____ hair and a very pretty face.', answer: 'long', options: ['long', 'tall', 'big'] },
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'The boy in the picture is very _____, but his brother is short.', answer: 'tall', options: ['tall', 'long', 'eyes'] },
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'She has a _____ face and big brown eyes.', answer: 'round', options: ['round', 'tall', 'slim'] },
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'My father is not tall. He is quite _____ and a little big.', answer: 'short', options: ['short', 'long', 'eyes'] },
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'The girl is very beautiful because she has _____ hair and bright eyes.', answer: 'long', options: ['long', 'tall', 'round'] },
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'What does your teacher look like?', answer: 'She has long hair and a round face.', options: ['She has long hair and a round face.', 'She works at a school.', 'She is work long hair.'] },
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'The baby has a _____ face and very small eyes.', answer: 'round', options: ['round', 'tall', 'slim'] },
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'My cousin is very _____, so she looks healthy and active.', answer: 'slim', options: ['slim', 'eyes', 'hair'] },
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'He has big _____ and a friendly face, so everyone likes him.', answer: 'eyes', options: ['eyes', 'tall', 'long'] },
      ],
    },
  }),
  workbook(14, 'Daily Activities', {
    wordMatch: { title: 'Unit 14 - No picture-match import', instruction: 'No dedicated workbook picture-match exercise for this unit.', items: [] },
    readAndComplete: {
      title: 'Unit 14 - Fill in the blank',
      instruction: 'Complete the paragraph using the workbook word bank.',
      wordBank: ['morning', 'noon', 'afternoon', 'evening', 'clean'],
      items: [
        { sentence: 'Every day, I wake up in the (1) _____.', answer: 'morning' },
        { sentence: 'I (2) _____ the floor and help my mom.', answer: 'clean' },
        { sentence: 'At (3) _____, I have lunch.', answer: 'noon' },
        { sentence: 'In the (4) _____, I wash the clothes.', answer: 'afternoon' },
        { sentence: 'In the (5) _____, I watch TV.', answer: 'evening' },
      ],
    },
    quiz: {
      title: 'Unit 14 - Multiple choice',
      instruction: 'Choose the correct answer from the workbook.',
      items: [
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'I clean the floor _____ the morning.', answer: 'in', options: ['on', 'in', 'at'] },
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'She helps with the cooking _____ noon.', answer: 'at', options: ['at', 'in', 'on'] },
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'We wash the clothes _____ the afternoon.', answer: 'in', options: ['in', 'on', 'at'] },
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'He watches TV _____ the evening.', answer: 'in', options: ['at', 'in', 'on'] },
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'What do you do in the morning? - I _____.', answer: 'wash the dishes', options: ['wash the dishes', 'watches TV', 'watching TV'] },
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'When do you wash the dishes? - I do it _____ the evening.', answer: 'in', options: ['on', 'in', 'at'] },
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'She _____ the floor in the morning.', answer: 'cleans', options: ['clean', 'cleans', 'cleaning'] },
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'What do you do in the afternoon? - I _____.', answer: 'wash the clothes', options: ['wash the clothes', 'washes the clothes', 'washing clothes'] },
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'When do you help with the cooking?', answer: 'I help in the afternoon.', options: ['I help in the afternoon.', 'I helping in the afternoon.', 'I helps in the afternoon.'] },
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'He _____ TV at night.', answer: 'watches', options: ['watch', 'watches', 'watching'] },
      ],
    },
  }),
  workbook(15, "My Family's Weekends", {
    wordMatch: { title: 'Unit 15 - No picture-match import', instruction: 'No dedicated workbook picture-match exercise for this unit.', items: [] },
    readAndComplete: {
      title: 'Unit 15 - Fill in the blanks',
      instruction: 'Complete the passage using the workbook word bank.',
      wordBank: ['plays', 'cooks', 'cinema', 'shopping centre', 'sports centre'],
      items: [
        { sentence: 'On Saturdays, my family has many activities. My father goes to the (1) _____ to play sports.', answer: 'sports centre' },
        { sentence: 'My mother goes to the (2) _____ to buy food and clothes.', answer: 'shopping centre' },
        { sentence: 'In the evening, we sometimes go to the (3) ____ together.', answer: 'cinema' },
        { sentence: 'On Sundays, we stay at home. My brother (4) _____ tennis in the yard,', answer: 'plays' },
        { sentence: 'and my mother (5) _____ delicious meals for the family.', answer: 'cooks' },
      ],
    },
    quiz: {
      title: 'Unit 15 - Multiple choice',
      instruction: 'Choose the correct answer from the workbook.',
      items: [
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'Where does your father go on Saturdays?', answer: 'He goes to the cinema.', options: ['He go to the cinema.', 'He goes to the cinema.', 'He going to the cinema'] },
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'She _____ to the shopping centre on Saturdays.', answer: 'goes', options: ['go', 'goes', 'going'] },
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'Where does he go on Saturdays?', answer: 'He goes to the sports centre.', options: ['He goes to the sports centre.', 'He go to the sports centre.', 'He going to the sports centre'] },
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'What does she do on Sundays?', answer: 'She plays tennis.', options: ['She play tennis', 'She plays tennis.', 'She playing tennis'] },
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'He _____ films on Sundays.', answer: 'watches', options: ['watch', 'watches', 'watching'] },
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'My mother _____ meals on Sundays.', answer: 'cooks', options: ['cook', 'cooks', 'cooking'] },
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'Where does she go on Saturdays?', answer: 'She goes to the swimming pool.', options: ['She goes to the swimming pool.', 'She go to the swimming pool.', 'She going to the swimming pool'] },
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'What does he do on Sundays?', answer: 'He does yoga.', options: ['He do yoga', 'He does yoga.', 'He doing yoga'] },
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'They go to the _____ on Saturdays.', answer: 'cinema', options: ['cinema', 'cook meals', 'do yoga'] },
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'He _____ tennis on Sundays.', answer: 'plays', options: ['play', 'plays', 'playing'] },
      ],
    },
  }),
  workbook(16, 'Weather', {
    wordMatch: { title: 'Unit 16 - No picture-match import', instruction: 'No dedicated workbook picture-match exercise for this unit.', items: [] },
    readAndComplete: {
      title: 'Unit 16 - Fill in the blanks',
      instruction: 'Complete the passage using the workbook word bank.',
      wordBank: ['sunny', 'rainy', 'bakery', 'bookshop', 'water park'],
      items: [
        { sentence: 'On Saturday, the weather was (1) _____, so I went to the (2) _____ and had a lot of fun.', answer: 'sunny' },
        { sentence: 'On Saturday, the weather was sunny, so I went to the (2) _____ and had a lot of fun.', answer: 'water park' },
        { sentence: 'On Sunday, it was (3) _____, so I stayed inside.', answer: 'rainy' },
        { sentence: 'I went to the (4) _____ to read books.', answer: 'bookshop' },
        { sentence: 'Then I went to the (5) _____ to buy some bread.', answer: 'bakery' },
      ],
    },
    quiz: {
      title: 'Unit 16 - Multiple choice',
      instruction: 'Choose the correct answer from the workbook.',
      items: [
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'The weather is _____ today.', answer: 'sunny', options: ['rainy', 'sunny', 'cloudy'] },
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'It is _____. I need an umbrella.', answer: 'rainy', options: ['windy', 'rainy', 'sunny'] },
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'What was the weather like last weekend? - It _____ sunny.', answer: 'was', options: ['is', 'was', 'are'] },
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'The sky is full of clouds. It is _____.', answer: 'cloudy', options: ['cloudy', 'sunny', 'windy'] },
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'Do you want to go to the _____?', answer: 'bakery', options: ['bakery', 'weather', 'cloudy'] },
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'I buy books at the _____.', answer: 'bookshop', options: ['food stall', 'bookshop', 'water park'] },
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'It is _____. The trees are moving.', answer: 'windy', options: ['rainy', 'windy', 'sunny'] },
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'Do you want to go to the water park? - _____.', answer: 'Great', options: ['Sorry', 'Great', 'No'] },
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'I buy bread at the _____.', answer: 'bakery', options: ['bakery', 'bookshop', 'weather'] },
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'What was the weather like yesterday? - It _____ rainy.', answer: 'was', options: ['was', 'is', 'are'] },
      ],
    },
  }),
  workbook(17, 'In The City', {
    wordMatch: { title: 'Unit 17 - No picture-match import', instruction: 'No dedicated workbook picture-match exercise for this unit.', items: [] },
    readAndComplete: {
      title: 'Unit 17 - Fill in the blanks',
      instruction: 'Complete the directions using the workbook word bank.',
      wordBank: ['cross', 'stop', 'straight', 'left', 'right'],
      items: [
        { sentence: 'First, go (1) _____ on this road.', answer: 'straight' },
        { sentence: 'Then turn (2) _____ at the corner.', answer: 'left' },
        { sentence: 'Next, turn (3) _____ near the park.', answer: 'right' },
        { sentence: '(4) _____ the street carefully.', answer: 'cross' },
        { sentence: 'When you see the sign, (5) _____.', answer: 'stop' },
      ],
    },
    quiz: {
      title: 'Unit 17 - Multiple choice',
      instruction: 'Choose the correct answer from the workbook.',
      items: [
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'Go _____ to the bank.', answer: 'straight', options: ['straight', 'apple', 'book'] },
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'Turn _____ at the corner.', answer: 'left', options: ['banana', 'left', 'school'] },
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'The sign says “_____”.', answer: 'stop', options: ['go', 'stop', 'run'] },
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'You can _____ the street here.', answer: 'cross', options: ['cross', 'read', 'eat'] },
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'Turn _____ to go to the café.', answer: 'right', options: ['right', 'book', 'cloudy'] },
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'What does it say? - It says “_____”.', answer: 'go', options: ['left', 'stop', 'go'] },
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'Go straight and turn _____.', answer: 'left', options: ['rainy', 'left', 'pen'] },
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'I _____ to the park.', answer: 'go straight', options: ['get', 'go straight', 'pencil'] },
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'Turn _____ to go back.', answer: 'round', options: ['round', 'book', 'school'] },
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'You must _____ at the red light.', answer: 'stop', options: ['go', 'stop', 'run'] },
      ],
    },
  }),
  workbook(18, 'At The Shopping Centre', {
    wordMatch: { title: 'Unit 18 - No picture-match import', instruction: 'No dedicated workbook picture-match exercise for this unit.', items: [] },
    readAndComplete: {
      title: 'Unit 18 - Fill in the blanks',
      instruction: 'Complete the passage using the workbook word bank.',
      wordBank: ['skirt', 'T-shirt', 'thousand', 'gift shop', 'bookshop'],
      items: [
        { sentence: 'First, we go to the (1) _____ to buy a present.', answer: 'gift shop' },
        { sentence: 'Then we go to the (2) _____ to look at books.', answer: 'bookshop' },
        { sentence: 'I see a nice (3) _____ for my sister.', answer: 'skirt' },
        { sentence: 'My mum buys a (4) _____ for me.', answer: 'T-shirt' },
        { sentence: 'It is fifty (5) _____ dong.', answer: 'thousand' },
      ],
    },
    quiz: {
      title: 'Unit 18 - Multiple choice',
      instruction: 'Choose the correct answer from the workbook.',
      items: [
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'The bookshop is _____ the gift shop.', answer: 'near', options: ['near', 'eat', 'play'] },
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'The bakery is _____ the bookshop and the café.', answer: 'between', options: ['behind', 'between', 'run'] },
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'The bank is _____ the post office.', answer: 'opposite', options: ['opposite', 'pencil', 'cloudy'] },
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'Where’s the gift shop? - It’s _____ the tree.', answer: 'near', options: ['near', 'play', 'read'] },
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'The toy shop is _____ the café.', answer: 'behind', options: ['behind', 'banana', 'sunny'] },
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'How much is the skirt? - It’s _____ thousand dong.', answer: 'sixty', options: ['sixty', 'play', 'go'] },
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'I want to buy a _____.', answer: 'T-shirt', options: ['T-shirt', 'cloudy', 'run'] },
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'The bookshop is _____ the toy shop.', answer: 'opposite', options: ['opposite', 'eat', 'jump'] },
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'How much is the T-shirt? - It’s _____ thousand dong.', answer: 'eighty', options: ['eighty', 'play', 'read'] },
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'The gift shop is _____ the tree.', answer: 'near', options: ['near', 'run', 'close'] },
      ],
    },
  }),
  workbook(19, 'The Animal World', {
    wordMatch: { title: 'Unit 19 - No picture-match import', instruction: 'No dedicated workbook picture-match exercise for this unit.', items: [] },
    readAndComplete: {
      title: 'Unit 19 - Fill in the blanks',
      instruction: 'Complete the passage using the workbook word bank.',
      wordBank: ['sing', 'lions', 'giraffes', 'roar', 'run'],
      items: [
        { sentence: '(1) _____ are very tall animals.', answer: 'giraffes' },
        { sentence: '(2) _____ are strong and scary.', answer: 'lions' },
        { sentence: 'They can (3) _____ loudly.', answer: 'roar' },
        { sentence: 'Some animals can (4) _____ very fast.', answer: 'run' },
        { sentence: 'Birds can (5) _____ merrily in the trees.', answer: 'sing' },
      ],
    },
    quiz: {
      title: 'Unit 19 - Multiple choice',
      instruction: 'Choose the correct answer from the workbook.',
      items: [
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'These animals are _____.', answer: 'hippos', options: ['lions', 'giraffes', 'hippos'] },
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'The lion can _____ loudly.', answer: 'roar', options: ['sing', 'roar', 'dance'] },
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'Peacocks can _____ beautifully.', answer: 'dance', options: ['run', 'dance', 'eat'] },
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'What are these animals? - They’re _____.', answer: 'crocodiles', options: ['crocodiles', 'book', 'pen'] },
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'Hippos live in the _____.', answer: 'water', options: ['water', 'sky', 'tree'] },
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'The bird can _____ merrily.', answer: 'sing', options: ['roar', 'sing', 'run'] },
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'Why do you like lions? - Because they _____ loudly.', answer: 'roar', options: ['dance', 'roar', 'sing'] },
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'The cheetah can _____ quickly.', answer: 'run', options: ['run', 'sing', 'dance'] },
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'What are these animals? - They’re _____.', answer: 'crocodiles', options: ['giraffes', 'cloudy', 'crocodiles'] },
        { type: 'multiple_choice', typeLabel: 'Choose the answer', question: 'Why do you like birds? - Because they _____ merrily.', answer: 'sing', options: ['roar', 'sing', 'run'] },
      ],
    },
  }),
];

export function getLop4WorkbookUnit(unit: number): Lop4WorkbookUnit {
  const item = LOP4_WORKBOOK_UNITS.find((entry) => entry.unit === unit);
  if (!item) {
    throw new Error(`Unknown workbook unit: ${unit}`);
  }
  return item;
}

export function lop4WordMatchImagePath(unit: number, cropKey: Lop4WordMatchItem['cropKey']): string {
  return `/images/games/lop4-word-match/u${String(unit).padStart(2, '0')}-${cropKey.toLowerCase()}.png`;
}
