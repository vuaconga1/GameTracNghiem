/**
 * Sample question payloads for vocabulary starter games.
 * Add to seed-dev.ts SEED_GAMES and createMany when ready to seed locally.
 */
export const VOCABULARY_TEST_SAMPLE = {
  game: 'vocabulary_test' as const,
  sortOrder: 1,
  payload: {
    title: 'My toys',
    instruction: 'Look at the pictures and write the words.',
    word_bank: ['ball', 'doll', 'kite', 'train'],
    items: [
      {
        order: 1,
        image: 'https://placehold.co/120x120?text=Ball',
        answer: 'ball',
      },
      {
        order: 2,
        image: 'https://placehold.co/120x120?text=Doll',
        answer: 'doll',
      },
      {
        order: 3,
        image: 'https://placehold.co/120x120?text=Kite',
        answer: 'kite',
      },
      {
        order: 4,
        image: 'https://placehold.co/120x120?text=Train',
        answer: 'train',
      },
    ],
  },
};

export const VOCABULARY_CHECK_SAMPLE = {
  game: 'vocabulary_check' as const,
  sortOrder: 1,
  payload: {
    title: 'True or false',
    instruction: 'Look at the picture and word. Is the sentence correct?',
    items: [
      {
        order: 1,
        image: 'https://placehold.co/72x72?text=Cat',
        word: 'cat',
        sentence: 'This is a cat.',
        is_correct: true,
      },
      {
        order: 2,
        image: 'https://placehold.co/72x72?text=Dog',
        word: 'dog',
        sentence: 'This is a bird.',
        is_correct: false,
      },
      {
        order: 3,
        image: 'https://placehold.co/72x72?text=Book',
        word: 'book',
        sentence: 'I read a book.',
        is_correct: true,
      },
    ],
  },
};
