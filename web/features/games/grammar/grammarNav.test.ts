import { describe, expect, it } from 'vitest';

import {
  filterGrammarQuestionsByExercise,
  grammarExerciseDisplayTitle,
  grammarQuestionDisplayMeta,
  groupGrammarExercises,
} from './grammarNav';

describe('grammarNav', () => {
  it('groups grammar questions by hint/exercise label', () => {
    const groups = groupGrammarExercises([
      {
        hint: 'W Exercise 15',
        prefix: "Mary doesn't know",
        source: "Mary doesn't know how she can get to the community centre.",
      },
      {
        hint: 'W Exercise 15',
        prefix: "James is wondering",
        source: 'James is wondering what he should bring when going on a voyage.',
      },
      {
        hint: 'W Exercise 16',
        source: 'community/ clean/ The/ local/ to/ park./ came/ up/ together/ the',
      },
      { hint: '' },
    ]);

    expect(groups).toEqual([
      {
        key: 'W Exercise 15',
        label: 'Viết lại câu theo từ gợi ý',
        indices: [0, 1],
        questionCount: 2,
      },
      {
        key: 'W Exercise 16',
        label: 'Sắp xếp từ thành câu hoàn chỉnh',
        indices: [2],
        questionCount: 1,
      },
      {
        key: 'Ngữ pháp',
        label: 'Ngữ pháp',
        indices: [3],
        questionCount: 1,
      },
    ]);
  });

  it('labels double-comparative slash prompts differently from word-order scramble', () => {
    const groups = groupGrammarExercises([
      {
        hint: 'W Exercise 15',
        source: 'Lan/ her brother/ missed/ came down/ the concert/ because/ with/ a fever.',
      },
      {
        hint: 'W Exercise 16',
        source: 'modern/ car/ be,/ expensive/ it/ cost',
      },
    ]);

    expect(groups).toEqual([
      {
        key: 'W Exercise 15',
        label: 'Sắp xếp từ thành câu hoàn chỉnh',
        indices: [0],
        questionCount: 1,
      },
      {
        key: 'W Exercise 16',
        label: 'Viết lại câu theo dạng so sánh kép',
        indices: [1],
        questionCount: 1,
      },
    ]);
  });

  it('labels present-perfect guided slash prompts differently from word-order scramble', () => {
    const groups = groupGrammarExercises([
      {
        hint: 'W Exercise 15',
        source: 'I/ already/ speak/ / the manager/ the issue./',
      },
      {
        hint: 'W Exercise 16',
        source: 'We/ have/ problem/ yet./ a/ solution/ not/ the/ found/ to/',
      },
    ]);

    expect(groups).toEqual([
      {
        key: 'W Exercise 15',
        label: 'Viết câu dùng thì hiện tại hoàn thành',
        indices: [0],
        questionCount: 1,
      },
      {
        key: 'W Exercise 16',
        label: 'Sắp xếp từ thành câu hoàn chỉnh',
        indices: [1],
        questionCount: 1,
      },
    ]);
  });

  it('filters grammar questions by selected exercise', () => {
    const filtered = filterGrammarQuestionsByExercise(
      [{ hint: 'W Exercise 9' }, { hint: 'W Exercise 15' }, { hint: 'W Exercise 9' }],
      'W Exercise 9',
    );

    expect(filtered.map((entry) => entry.index)).toEqual([0, 2]);
  });

  it('formats writing exercise labels for cards', () => {
    expect(grammarExerciseDisplayTitle('W Exercise 14')).toBe('Bài tập viết');
    expect(grammarExerciseDisplayTitle('Custom set')).toBe('Custom set');
    expect(
      grammarExerciseDisplayTitle('W Exercise 16', {
        source: 'modern/ car/ be,/ expensive/ it/ cost',
      })
    ).toBe('Viết lại câu theo dạng so sánh kép');
    expect(
      grammarExerciseDisplayTitle('W Exercise 15', {
        source: 'He/ play/ guitar/ since/ he/ tobe/ child./',
      })
    ).toBe('Viết câu dùng thì hiện tại hoàn thành');
  });

  it('derives descriptive labels and prompts from question shape', () => {
    expect(
      grammarQuestionDisplayMeta({
        hint: 'W Exercise 15',
        prefix: "Mary doesn't know",
        source: "Mary doesn't know how she can get to the community centre.",
      })
    ).toMatchObject({
      title: 'Viết lại câu theo từ gợi ý',
      answerLabel: 'Viết phần còn thiếu:',
    });

    expect(
      grammarQuestionDisplayMeta({
        hint: 'W Exercise 16',
        source: 'community/ clean/ The/ local/ to/ park./ came/ up/ together/ the',
      })
    ).toMatchObject({
      mode: 'reorder_words',
      title: 'Sắp xếp từ thành câu hoàn chỉnh',
      answerLabel: 'Viết câu hoàn chỉnh:',
    });

    expect(
      grammarQuestionDisplayMeta({
        hint: 'W Exercise 16',
        source: 'modern/ car/ be,/ expensive/ it/ cost',
      })
    ).toMatchObject({
      mode: 'double_comparative',
      title: 'Viết lại câu theo dạng so sánh kép',
      instruction:
        'Dùng các từ gợi ý để viết câu theo cấu trúc so sánh kép (The more/less/-er ..., the more/less/-er ...).',
      sourceLabel: 'Từ/cụm từ gợi ý',
      answerLabel: 'Viết câu so sánh kép:',
      helperText:
        'Viết đầy đủ câu dạng "The ..., the ..." và thêm dấu câu phù hợp.',
    });

    expect(
      grammarQuestionDisplayMeta({
        hint: 'W Exercise 16',
        source: 'large/ sofa/ be, comfortable/ it/ be/ sit on',
      })
    ).toMatchObject({
      mode: 'double_comparative',
      title: 'Viết lại câu theo dạng so sánh kép',
    });

    expect(
      grammarQuestionDisplayMeta({
        hint: 'W Exercise 15',
        source: 'I/ already/ speak/ / the manager/ the issue./',
      })
    ).toMatchObject({
      mode: 'present_perfect',
      title: 'Viết câu dùng thì hiện tại hoàn thành',
      instruction:
        'Dùng các từ gợi ý để viết câu đúng với thì hiện tại hoàn thành (present perfect).',
      sourceLabel: 'Từ/cụm từ gợi ý',
      answerLabel: 'Viết câu hiện tại hoàn thành:',
      helperText:
        'Chia động từ ở thì hiện tại hoàn thành và bổ sung từ cần thiết (have/has, giới từ, mạo từ…).',
    });

    expect(
      grammarQuestionDisplayMeta({
        hint: 'W Exercise 15',
        source: 'She/ not/ achieve/ goals/ despite/ efforts.',
      })
    ).toMatchObject({
      mode: 'present_perfect',
      title: 'Viết câu dùng thì hiện tại hoàn thành',
    });

    expect(
      grammarQuestionDisplayMeta({
        hint: 'W Exercise 16',
        source: 'participated/ you/ ever/ challenging/ Have/ a/ in/ competition/ before?/',
      })
    ).toMatchObject({
      mode: 'reorder_words',
      title: 'Sắp xếp từ thành câu hoàn chỉnh',
    });

    expect(
      grammarQuestionDisplayMeta({
        hint: 'W Exercise 15',
        source: 'is,/ The dirtier/ the water/ the less/ to drink./ safe/ it is',
      })
    ).toMatchObject({
      mode: 'reorder_words',
      title: 'Sắp xếp từ thành câu hoàn chỉnh',
    });

    expect(
      grammarQuestionDisplayMeta({
        hint: 'W Exercise 14',
        source: 'My father was drive to work when he saw an accident on the road.',
      })
    ).toMatchObject({
      title: 'Tìm và sửa lỗi sai trong câu',
      answerLabel: 'Viết lại câu đúng:',
    });
  });
});
