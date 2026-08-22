import { LOP1_UNIT_COUNT, LOP1_UNIT_TITLES } from '@/lib/lop1Units';
import { LOP2_UNIT_VOCAB } from '@/lib/lop2Vocab';
import { LOP3_UNIT_VOCAB } from '@/lib/lop3Vocab';
import { LOP4_UNIT_COUNT, LOP4_UNIT_TITLES } from '@/lib/lop4Units';
import { LOP5_UNIT_TITLES, LOP5_UNIT_COUNT } from '@/lib/lop5Vocab';
import { LOP6_UNIT_COUNT, LOP6_UNIT_TITLES } from '@/lib/lop6Units';
import { LOP7_UNIT_COUNT, LOP7_UNIT_TITLES } from '@/lib/lop7Units';
import { LOP8_UNIT_COUNT, LOP8_UNIT_TITLES } from '@/lib/lop8Units';
import { LOP9_UNIT_COUNT, LOP9_UNIT_TITLES } from '@/lib/lop9Units';
import { isSentenceCorrectionSpeakingGrade } from '@/lib/speaking/gradeBand';

export type SpeakingUnitTopic = {
  levelName: string;
  unit: number;
  unitTitle: string;
  topicTitle: string;
  questions: string[];
  durationSeconds: number;
};

const LOP2_UNIT_TITLES: Record<number, string> = Object.fromEntries(
  Object.values(LOP2_UNIT_VOCAB).map((item) => [item.unit, item.title]),
);
const LOP3_UNIT_TITLES: Record<number, string> = Object.fromEntries(
  Object.values(LOP3_UNIT_VOCAB).map((item) => [item.unit, item.title]),
);

const PRIMARY_QUESTIONS: Record<string, Record<number, string[]>> = {
  'Lớp 1': {
    1: [
      'What is your name?',
      'Do you like the playground?',
      'Do you have a ball?',
      'Can you ride a bike?',
      'Do you like books?',
    ],
    2: [
      'What is your name?',
      'Do you like cake?',
      'Do you have a cat?',
      'What colour is your cup?',
      'Do you like cars?',
    ],
    3: [
      'What is your name?',
      'Do you like apples?',
      'Do you have a bag?',
      'What colour is your hat?',
      'Do you like the market?',
    ],
    4: [
      'What is your name?',
      'Do you have a dog?',
      'Is your desk big?',
      'What colour is your door?',
      'Do you like ducks?',
    ],
    5: [
      'What is your name?',
      'Do you like fish?',
      'Do you like chips?',
      'Do you like chicken?',
      'Do you like milk?',
    ],
    6: [
      'What is your name?',
      'Do you have a pen?',
      'Do you have a pencil?',
      'What colour is red?',
      'Do you like your classroom?',
    ],
    7: [
      'What is your name?',
      'Do you like the garden?',
      'Can you see a goat?',
      'Is the gate big?',
      'Do you like flowers?',
    ],
    8: [
      'What is your name?',
      'Do you like the park?',
      'Can you see a horse?',
      'What colour is your hair?',
      'Do you like to play?',
    ],
    9: [
      'What is your name?',
      'Do you like the shop?',
      'Can you see a clock?',
      'Do you have a bag?',
      'What colour do you like?',
    ],
    10: [
      'What is your name?',
      'Do you like the zoo?',
      'Can you see a zebra?',
      'Do you like animals?',
      'What animal do you like?',
    ],
    11: [
      'What is your name?',
      'Do you go by bus?',
      'Is the bus big?',
      'Do you like the bus stop?',
      'Who do you go with?',
    ],
    12: [
      'What is your name?',
      'Do you like the lake?',
      'Can you see a duck?',
      'Do you like water?',
      'What colour is the lake?',
    ],
    13: [
      'What is your name?',
      'Do you like the canteen?',
      'Do you like rice?',
      'Do you like chicken?',
      'What do you eat at school?',
    ],
    14: [
      'What is your name?',
      'Do you like toys?',
      'Do you have a doll?',
      'Do you have a car?',
      'What toy do you like?',
    ],
    15: [
      'What is your name?',
      'Do you like football?',
      'Can you kick a ball?',
      'What colour is your ball?',
      'Do you like to play?',
    ],
    16: [
      'What is your name?',
      'Do you like your home?',
      'Do you have a bed?',
      'Who do you live with?',
      'What colour is your house?',
    ],
  },
  'Lớp 2': {
    1: [
      'What is your name?',
      'Do you like pizza?',
      'Do you like popcorn?',
      'Do you like pasta?',
      'What food do you like at a party?',
    ],
    2: [
      'What is your name?',
      'Do you like the backyard?',
      'Do you have a kite?',
      'Can you ride a bike?',
      'Do you like kittens?',
    ],
    3: [
      'What is your name?',
      'Do you like the sea?',
      'Do you like sand?',
      'Can you swim?',
      'What colour is the sea?',
    ],
    4: [
      'What is your name?',
      'Do you like the countryside?',
      'Can you see a river?',
      'Do you like rainbows?',
      'Is the road long?',
    ],
    5: [
      'What is your name?',
      'Do you like your classroom?',
      'Do you like quizzes?',
      'Can you see a square?',
      'Do you ask questions at school?',
    ],
    6: [
      'What is your name?',
      'Do you like the farm?',
      'Can you see a fox?',
      'Do you like animals?',
      'What animal do you like?',
    ],
    7: [
      'What is your name?',
      'Do you like the kitchen?',
      'Do you like cake?',
      'Can you help at home?',
      'What food do you like?',
    ],
    8: [
      'What is your name?',
      'Do you like the village?',
      'Is your village big?',
      'Do you have friends there?',
      'What do you see in the village?',
    ],
    9: [
      'What is your name?',
      'Do you like the grocery store?',
      'Do you buy apples?',
      'Do you have a bag?',
      'What food do you buy?',
    ],
    10: [
      'What is your name?',
      'Do you like the zoo?',
      'What animal do you like?',
      'Can you see a tiger?',
      'Do you like monkeys?',
    ],
    11: [
      'What is your name?',
      'Do you like the playground?',
      'Do you have a ball?',
      'Do you like to run?',
      'Who do you play with?',
    ],
    12: [
      'What is your name?',
      'Do you like the cafe?',
      'Do you like juice?',
      'Do you like cake?',
      'What do you drink?',
    ],
    13: [
      'What is your name?',
      'Do you like maths?',
      'Can you count to ten?',
      'What number do you like?',
      'Do you like school?',
    ],
    14: [
      'What is your name?',
      'Do you like your home?',
      'Do you have a bed?',
      'Who do you live with?',
      'What do you do at home?',
    ],
    15: [
      'What is your name?',
      'Do you like clothes?',
      'What colour is your T-shirt?',
      'Do you have a hat?',
      'What do you like to wear?',
    ],
    16: [
      'What is your name?',
      'Do you like camping?',
      'Do you like tents?',
      'Do you like the trees?',
      'What do you do outside?',
    ],
  },
  'Lớp 3': {
    1: [
      'What is your name?',
      'How do you say hello?',
      'How are you today?',
      'Who is your teacher?',
      'Can you say goodbye?',
    ],
    2: [
      'What is your name?',
      'How do you spell your name?',
      'What is your friend\'s name?',
      'Are you a student?',
      'Who is in your class?',
    ],
    3: [
      'What is your name?',
      'Who is your friend?',
      'Do you like to play?',
      'Are you happy at school?',
      'Do you share with your friends?',
    ],
    4: [
      'What is your name?',
      'What colour is your hair?',
      'How many hands do you have?',
      'Can you touch your nose?',
      'Are you strong?',
    ],
    5: [
      'What is your name?',
      'What is your hobby?',
      'Do you like drawing?',
      'Do you like singing?',
      'What do you like to do?',
    ],
    6: [
      'What is your name?',
      'Do you like your school?',
      'Where is your classroom?',
      'Who is your teacher?',
      'What do you do at school?',
    ],
    7: [
      'What is your name?',
      'Please sit down. Can you sit down?',
      'Can you open your book?',
      'Can you stand up?',
      'Do you listen to your teacher?',
    ],
    8: [
      'What is your name?',
      'Do you have a pencil?',
      'Do you have a book?',
      'What is in your bag?',
      'What colour is your ruler?',
    ],
    9: [
      'What is your name?',
      'What colour do you like?',
      'What colour is the sky?',
      'Is your bag red?',
      'What colour is your pencil?',
    ],
    10: [
      'What is your name?',
      'What do you do at break time?',
      'Do you like to run?',
      'Do you play football?',
      'Who do you play with?',
    ],
    11: [
      'What is your name?',
      'How many people are in your family?',
      'Who is in your family?',
      'Do you love your mum?',
      'What do you do with your family?',
    ],
    12: [
      'What is your name?',
      'What does your mum do?',
      'What does your dad do?',
      'Do you want to be a teacher?',
      'What job do you like?',
    ],
    13: [
      'What is your name?',
      'Is your house big?',
      'How many rooms are there?',
      'Do you like your house?',
      'Where do you live?',
    ],
    14: [
      'What is your name?',
      'Do you have a bed?',
      'What colour is your bedroom?',
      'Do you have a lamp?',
      'Where do you sleep?',
    ],
    15: [
      'What is your name?',
      'Do you like rice?',
      'What do you eat for lunch?',
      'Do you drink water?',
      'What food do you like?',
    ],
    16: [
      'What is your name?',
      'Do you have a pet?',
      'Do you like cats?',
      'Do you like dogs?',
      'What pet do you want?',
    ],
    17: [
      'What is your name?',
      'Do you like toys?',
      'What toy do you have?',
      'Do you like cars?',
      'Who do you play with?',
    ],
    18: [
      'What is your name?',
      'Do you like playing?',
      'Can you jump?',
      'Do you like dancing?',
      'What do you like doing?',
    ],
    19: [
      'What is your name?',
      'Do you like outdoor games?',
      'Can you ride a bike?',
      'Do you play in the park?',
      'What do you do outside?',
    ],
    20: [
      'What is your name?',
      'Do you like the zoo?',
      'What animal do you like?',
      'Can you see a tiger?',
      'Do you like monkeys?',
    ],
  },
  'Lớp 4': {
    1: [
      'What is your name?',
      'Who is your best friend?',
      'Where is your friend from?',
      'What do you like to do with your friends?',
      'Is your friend a boy or a girl?',
    ],
    2: [
      'What time do you get up?',
      'What time do you go to school?',
      'What do you do in the morning?',
      'What time do you have dinner?',
      'What time do you go to bed?',
    ],
    3: [
      'What do you do on Monday?',
      'What do you do on Saturday?',
      'Do you go to school on Sunday?',
      'What is your favourite day?',
      'What do you do at the weekend?',
    ],
    4: [
      'When is your birthday?',
      'Do you like birthday parties?',
      'What food do you like at a party?',
      'Who comes to your party?',
      'What present do you want?',
    ],
    5: [
      'What can you do?',
      'Can you swim?',
      'Can you ride a bike?',
      'Can you sing?',
      'What can your friend do?',
    ],
    6: [
      'What facilities are in your school?',
      'Do you have a library?',
      'Do you have a playground?',
      'Where do you play at school?',
      'What is your favourite place at school?',
    ],
    7: [
      'What subject do you have on Monday?',
      'What time does school start?',
      'How many lessons do you have a day?',
      'What is your favourite lesson?',
      'When do you have English?',
    ],
    8: [
      'What is your favourite subject?',
      'Do you like English?',
      'Do you like maths?',
      'Who is your favourite teacher?',
      'Why do you like this subject?',
    ],
    9: [
      'Do you like sports day?',
      'What sport do you like?',
      'Can you run fast?',
      'Do you like football?',
      'What do you do on sports day?',
    ],
    10: [
      'Where do you go in summer?',
      'Do you like the beach?',
      'What do you do in the summer holidays?',
      'Who do you go with?',
      'What is your favourite holiday activity?',
    ],
    11: [
      'Where do you live?',
      'Is your home a house or a flat?',
      'How many rooms are there?',
      'What is your favourite room?',
      'Who do you live with?',
    ],
    12: [
      'What does your mum do?',
      'What does your dad do?',
      'What job do you want?',
      'Do you want to be a teacher?',
      'Why do you like that job?',
    ],
    13: [
      'What do you look like?',
      'Is your hair long or short?',
      'What colour are your eyes?',
      'Is your friend tall?',
      'Who in your family looks like you?',
    ],
    14: [
      'What do you do every day?',
      'What do you do after school?',
      'Do you help at home?',
      'What do you do in the evening?',
      'What is your favourite daily activity?',
    ],
    15: [
      'What do you do at the weekend?',
      'Do you go out with your family?',
      'Where do you go on Sunday?',
      'Do you visit your grandparents?',
      'What is your favourite weekend activity?',
    ],
    16: [
      'What is the weather like today?',
      'Do you like sunny days?',
      'What do you do when it rains?',
      'What is your favourite weather?',
      'Is it hot or cold today?',
    ],
    17: [
      'Do you live in a city?',
      'What can you see in the city?',
      'Is there a park near your home?',
      'Where do you go in the city?',
      'What is your favourite place in the city?',
    ],
    18: [
      'Do you like shopping?',
      'What can you buy at the shopping centre?',
      'Who do you go shopping with?',
      'What do you want to buy?',
      'Is the shopping centre big?',
    ],
    19: [
      'What animal do you like?',
      'Where do tigers live?',
      'Do you like the zoo?',
      'Can you name three animals?',
      'What is your favourite animal, and why?',
    ],
  },
  'Lớp 5': {
    1: [
      'What is your name?',
      'How old are you?',
      'Where do you live?',
      'What do you like doing?',
      'Tell me one thing about you.',
    ],
    2: [
      'Where is your home?',
      'Is it a house or a flat?',
      'How many rooms are there?',
      'What is your favourite room?',
      'Who do you live with?',
    ],
    3: [
      'Do you have a friend from another country?',
      'Where is your friend from?',
      'What language does your friend speak?',
      'What do you do with your friend?',
      'Would you like to visit another country?',
    ],
    4: [
      'What do you do in your free time?',
      'Do you like reading?',
      'Do you play sports?',
      'What is your favourite free-time activity?',
      'Who do you spend free time with?',
    ],
    5: [
      'What job do you want in the future?',
      'Why do you like that job?',
      'Do you want to be a doctor or a teacher?',
      'What does your mum or dad do?',
      'What do you need to do for that job?',
    ],
    6: [
      'What rooms are in your school?',
      'Do you have a computer room?',
      'Where do you have English?',
      'What is your favourite school room?',
      'Where do you eat at school?',
    ],
    7: [
      'What school activity do you like?',
      'Do you like singing at school?',
      'Do you like sports at school?',
      'What do you do at break time?',
      'What is your favourite school event?',
    ],
    8: [
      'What is in your classroom?',
      'Where do you sit?',
      'Who sits next to you?',
      'What do you do in the classroom?',
      'Do you like your classroom? Why?',
    ],
    9: [
      'What outdoor activity do you like?',
      'Do you like riding a bike?',
      'Do you play football outside?',
      'Where do you play after school?',
      'What do you do in the park?',
    ],
    10: [
      'Where did you go on a school trip?',
      'Who did you go with?',
      'What did you see?',
      'Did you like the school trip?',
      'Where do you want to go next?',
    ],
    11: [
      'What do you do with your family?',
      'Do you have dinner together?',
      'Where do you go at the weekend?',
      'Who is in your family?',
      'What is your favourite family activity?',
    ],
    12: [
      'What do you do at Tet?',
      'Do you like lucky money?',
      'What food do you eat at Tet?',
      'Who do you visit at Tet?',
      'What is your favourite thing about Tet?',
    ],
    13: [
      'What special day do you like?',
      'What do you do on your birthday?',
      'Do you like Teachers\' Day?',
      'Who do you celebrate with?',
      'What is your favourite special day?',
    ],
    14: [
      'How do you stay healthy?',
      'Do you eat fruit every day?',
      'Do you play sports?',
      'How many hours do you sleep?',
      'What healthy food do you like?',
    ],
    15: [
      'How are you today?',
      'What do you do when you have a cold?',
      'Do you wash your hands?',
      'Who helps you when you are ill?',
      'How can we keep healthy?',
    ],
    16: [
      'What season is it now?',
      'What is the weather like today?',
      'Do you like summer or winter?',
      'What do you do on a rainy day?',
      'What is your favourite season, and why?',
    ],
    17: [
      'Do you like stories?',
      'What story do you like?',
      'Who is your favourite character?',
      'Do you read at home?',
      'Can you tell me a short story?',
    ],
    18: [
      'How do you go to school?',
      'Do you go by bike or by bus?',
      'What transport do you like?',
      'Is a plane faster than a car?',
      'How does your family travel?',
    ],
    19: [
      'What places do you like in your town?',
      'Do you like the park or the museum?',
      'Where do you go at the weekend?',
      'What can you see there?',
      'Where do you want to visit?',
    ],
    20: [
      'Where do you go in the summer holiday?',
      'Do you like the beach?',
      'What do you do in summer?',
      'Who do you go with?',
      'What is your favourite summer activity?',
    ],
  },
};

const SECONDARY_QUESTIONS: Record<string, Record<number, string[]>> = {
  'Lớp 6': {
    1: [
      'What is your new school like?',
      'What is your favourite subject, and why?',
      'Who is your new friend at school?',
      'What do you do at break time?',
      'How is secondary school different from primary school?',
    ],
    2: [
      'What type of home do you live in?',
      'How many rooms are there in your house?',
      'What is your favourite room, and why?',
      'What do you do at home after school?',
      'If you could change one thing in your home, what would it be?',
    ],
    3: [
      'Who is your best friend?',
      'What does your friend look like?',
      'What do you like doing together?',
      'How did you become friends?',
      'What makes a good friend?',
    ],
    4: [
      'What is your neighbourhood like?',
      'What places are near your house?',
      'Where do you go in your neighbourhood?',
      'Do you like living there? Why?',
      'What would make your neighbourhood better?',
    ],
    5: [
      'Which natural wonder of Viet Nam do you know?',
      'Have you visited a famous place in Viet Nam?',
      'What can people see and do there?',
      'Why should people protect nature?',
      'Where in Viet Nam would you like to visit next?',
    ],
    6: [
      'What do you usually do at Tet?',
      'What food do you eat at Tet?',
      'Who do you visit during Tet?',
      'What is your favourite Tet tradition?',
      'How is Tet different from a normal holiday?',
    ],
  },
  'Lớp 7': {
    1: [
      'What are your hobbies?',
      'When did you start this hobby?',
      'How often do you do it?',
      'Who do you share this hobby with?',
      'What new hobby would you like to try?',
    ],
    2: [
      'What does healthy living mean to you?',
      'How do you stay healthy every day?',
      'What healthy food do you like?',
      'How much sport or exercise do you do?',
      'What is one habit you want to change?',
    ],
    3: [
      'Have you ever helped in your community?',
      'What kind of volunteer work do you like?',
      'Why is community service important?',
      'Who can we help in our neighbourhood?',
      'What project would you like to do at school?',
    ],
    4: [
      'What kind of music do you like?',
      'Do you play a musical instrument?',
      'What art or craft do you enjoy?',
      'Who is your favourite singer or artist?',
      'Why are music and arts important for students?',
    ],
    5: [
      'What is your favourite food and drink?',
      'What do you usually eat for breakfast?',
      'Do you like Vietnamese food or international food more?',
      'Can you cook a simple dish?',
      'What would you eat at a school party?',
    ],
    6: [
      'Have you visited another school?',
      'What was interesting about that school?',
      'How is it different from your school?',
      'What club or activity would you join there?',
      'If a visitor came to your school, what would you show them?',
    ],
  },
  'Lớp 8': {
    1: [
      'What do you like doing in your leisure time?',
      'How much time do you spend on your phone or games?',
      'Do you prefer indoor or outdoor activities?',
      'Who do you spend free time with?',
      'If you had a free Saturday, what would you do?',
    ],
    2: [
      'Have you ever been to the countryside?',
      'What is life like in the countryside?',
      'What can people do there that they cannot do in the city?',
      'Would you like to live in the countryside? Why?',
      'What problems can people have in rural areas?',
    ],
    3: [
      'What is a typical teenager\'s day like?',
      'What do teenagers in your class care about?',
      'How do you get on with your parents?',
      'What pressure do teens have at school?',
      'What advice would you give a shy teenager?',
    ],
    4: [
      'Which ethnic groups of Viet Nam do you know?',
      'What traditional clothes or food have you seen?',
      'Why should we learn about ethnic cultures?',
      'Have you visited a cultural village or festival?',
      'What tradition would you like to try?',
    ],
    5: [
      'What customs or traditions does your family have?',
      'What do you do during a traditional festival?',
      'Are there any customs you find unusual?',
      'Should young people keep old traditions? Why?',
      'What new custom would you like to start?',
    ],
    6: [
      'How would you describe your lifestyle?',
      'Is your lifestyle healthy or busy?',
      'How is city life different from country life?',
      'Has your lifestyle changed since last year?',
      'What lifestyle do you want in the future?',
    ],
  },
  'Lớp 9': {
    1: [
      'What is special about your local environment?',
      'What traditional craft or product is your area known for?',
      'How can we protect local culture?',
      'Have tourism changed your neighbourhood?',
      'What local place would you show a visitor?',
    ],
    2: [
      'What do you like about city life?',
      'What problems do big cities have?',
      'How do people travel in your city?',
      'Would you rather live in a city or in the countryside?',
      'How can cities become greener and safer?',
    ],
    3: [
      'What does healthy living mean for teens?',
      'How does school stress affect students?',
      'What do you do to look after your body and mind?',
      'Do teens in your class sleep and eat well?',
      'What change would make students healthier?',
    ],
    4: [
      'What do you remember about your childhood?',
      'How was school different in the past?',
      'Who tells you stories about the past?',
      'Why is it important to remember history?',
      'What past experience taught you something useful?',
    ],
    5: [
      'What is an experience you will never forget?',
      'Have you ever tried something for the first time?',
      'What did you learn from a mistake?',
      'Would you like to have more new experiences? Why?',
      'What experience do you want this year?',
    ],
    6: [
      'How have Vietnamese lifestyles changed?',
      'What did people do for fun in the past?',
      'How has technology changed daily life?',
      'What old lifestyle habit should we keep?',
      'What will Vietnamese life be like in 20 years?',
    ],
  },
};

const LEVEL_TITLES: Record<string, Record<number, string>> = {
  'Lớp 1': LOP1_UNIT_TITLES,
  'Lớp 2': LOP2_UNIT_TITLES,
  'Lớp 3': LOP3_UNIT_TITLES,
  'Lớp 4': LOP4_UNIT_TITLES,
  'Lớp 5': LOP5_UNIT_TITLES,
  'Lớp 6': LOP6_UNIT_TITLES,
  'Lớp 7': LOP7_UNIT_TITLES,
  'Lớp 8': LOP8_UNIT_TITLES,
  'Lớp 9': LOP9_UNIT_TITLES,
};

const LEVEL_UNIT_COUNT: Record<string, number> = {
  'Lớp 1': LOP1_UNIT_COUNT,
  'Lớp 2': Object.keys(LOP2_UNIT_TITLES).length,
  'Lớp 3': Object.keys(LOP3_UNIT_TITLES).length,
  'Lớp 4': LOP4_UNIT_COUNT,
  'Lớp 5': LOP5_UNIT_COUNT,
  'Lớp 6': LOP6_UNIT_COUNT,
  'Lớp 7': LOP7_UNIT_COUNT,
  'Lớp 8': LOP8_UNIT_COUNT,
  'Lớp 9': LOP9_UNIT_COUNT,
};

export const SPEAKING_TOPIC_LEVELS = Object.keys(LEVEL_TITLES);

export function parseUnitNumberFromCourseName(courseName: string): number | null {
  const match = /^Unit\s+(\d+)/i.exec(String(courseName || '').trim());
  if (!match) return null;
  const unit = Number(match[1]);
  return Number.isInteger(unit) && unit > 0 ? unit : null;
}

export function unitTitleFromCourseName(
  courseName: string,
  fallback = 'this unit',
): string {
  const match = /^Unit\s+\d+\s*:\s*(.+)$/i.exec(String(courseName || '').trim());
  const title = match?.[1]?.trim();
  return title || fallback;
}

function fallbackQuestions(unitTitle: string, primary: boolean): string[] {
  const topic = unitTitle.replace(/[!]/g, '').trim() || 'this unit';
  if (primary) {
    return [
      'What is your name?',
      `Do you like ${topic.toLowerCase()}?`,
      'What colour do you like?',
      'What do you like to play?',
      'Who is your friend?',
    ];
  }
  return [
    `What do you know about ${topic.toLowerCase()}?`,
    `What do you like most about ${topic.toLowerCase()}?`,
    'What do you usually do after school?',
    'Who do you talk about this with?',
    'What would you like to try next?',
  ];
}

export function speakingTopicTitleForUnit(input: {
  levelName: string;
  unitTitle: string;
}): string {
  const unitTitle = input.unitTitle.trim() || 'this unit';
  if (isSentenceCorrectionSpeakingGrade({ levelName: input.levelName })) {
    return unitTitle;
  }
  return `Chat about ${unitTitle.toLowerCase()}`;
}

export function speakingTopicForUnit(input: {
  levelName: string;
  unit: number;
  courseName?: string | null;
}): SpeakingUnitTopic {
  const titles = LEVEL_TITLES[input.levelName] || {};
  const unitTitle =
    titles[input.unit] ||
    unitTitleFromCourseName(input.courseName || '', `Unit ${input.unit}`);
  const primary = isSentenceCorrectionSpeakingGrade({
    levelName: input.levelName,
  });
  const catalog = primary ? PRIMARY_QUESTIONS : SECONDARY_QUESTIONS;
  const questions =
    catalog[input.levelName]?.[input.unit] ||
    fallbackQuestions(unitTitle, primary);

  return {
    levelName: input.levelName,
    unit: input.unit,
    unitTitle,
    topicTitle: speakingTopicTitleForUnit({
      levelName: input.levelName,
      unitTitle,
    }),
    questions,
    durationSeconds: primary ? 180 : 180,
  };
}

export function listCataloguedSpeakingUnits(): SpeakingUnitTopic[] {
  const items: SpeakingUnitTopic[] = [];
  for (const [levelName, count] of Object.entries(LEVEL_UNIT_COUNT)) {
    for (let unit = 1; unit <= count; unit += 1) {
      items.push(speakingTopicForUnit({ levelName, unit }));
    }
  }
  return items;
}
