'use client';

import dynamic from 'next/dynamic';

import { DataLoading } from '@/components/DataLoading';

const loading = () => <DataLoading />;

export const LazyGrammarGame = dynamic(
  () =>
    import('@/features/games/grammar/GrammarGame').then((m) => m.GrammarGame),
  { ssr: false, loading },
);

export const LazyQuizGame = dynamic(
  () => import('@/features/games/quiz/QuizGame').then((m) => m.QuizGame),
  { ssr: false, loading },
);

export const LazyPronunciationGame = dynamic(
  () =>
    import('@/features/games/pronunciation/PronunciationGame').then(
      (m) => m.PronunciationGame,
    ),
  { ssr: false, loading },
);

export const LazyScrambleGame = dynamic(
  () =>
    import('@/features/games/scramble/ScrambleGame').then((m) => m.ScrambleGame),
  { ssr: false, loading },
);

export const LazyLookAndWriteGame = dynamic(
  () =>
    import('@/features/games/look-and-write/LookAndWriteGame').then(
      (m) => m.LookAndWriteGame,
    ),
  { ssr: false, loading },
);

export const LazyChooseAndCircleGame = dynamic(
  () =>
    import('@/features/games/choose-and-circle/ChooseAndCircleGame').then(
      (m) => m.ChooseAndCircleGame,
    ),
  { ssr: false, loading },
);

export const LazyReadAndCompleteGame = dynamic(
  () =>
    import('@/features/games/read-and-complete/ReadAndCompleteGame').then(
      (m) => m.ReadAndCompleteGame,
    ),
  { ssr: false, loading },
);

export const LazyReadAndMatchGame = dynamic(
  () =>
    import('@/features/games/read-and-match/ReadAndMatchGame').then(
      (m) => m.ReadAndMatchGame,
    ),
  { ssr: false, loading },
);

export const LazyVocabularyCheckGame = dynamic(
  () =>
    import('@/features/games/vocabulary-check/VocabularyCheckGame').then(
      (m) => m.VocabularyCheckGame,
    ),
  { ssr: false, loading },
);

export const LazyVocabularyTestGame = dynamic(
  () =>
    import('@/features/games/vocabulary-test/VocabularyTestGame').then(
      (m) => m.VocabularyTestGame,
    ),
  { ssr: false, loading },
);

export const LazyWordMatchGame = dynamic(
  () =>
    import('@/features/games/word-match/WordMatchGame').then((m) => m.WordMatchGame),
  { ssr: false, loading },
);
