import { describe, expect, it } from 'vitest';

import {
  GRAMMAR_FILL_INSTRUCTION_VI,
  isFindTheMistakeQuiz,
  normalizeQuizQuestionHtml,
  isWorkbookExerciseCode,
  quizExerciseDisplayTitle,
  quizExerciseInstructionVi,
  repairErrorOptions,
  sanitizeQuizHtml,
  splitQuizPassageAndStem,
  stripExerciseAnnotation,
  underlinePronunciationOptionsInQuestion,
  underlineErrorOptionsInSentence,
} from './exerciseDisplay';

describe('exerciseDisplay', () => {
  it('detects workbook exercise codes', () => {
    expect(isWorkbookExerciseCode('U4 Ex14')).toBe(true);
    expect(isWorkbookExerciseCode('u2 ex9')).toBe(true);
    expect(isWorkbookExerciseCode('Phát âm khác')).toBe(false);
    expect(isWorkbookExerciseCode('Unit 2 — Exercise 12: Read the text')).toBe(false);
  });

  it('strips (Ex N) annotations from titles', () => {
    expect(stripExerciseAnnotation('Đọc hiểu (Ex 13)')).toBe('Đọc hiểu');
    expect(stripExerciseAnnotation('Tìm lỗi sai (Ex 10)')).toBe('Tìm lỗi sai');
    expect(quizExerciseDisplayTitle('Hoàn thành câu (Ex 8)', '')).toBe('Hoàn thành câu');
  });

  it('uses typeLabel when exercise is a code', () => {
    expect(quizExerciseDisplayTitle('U4 Ex14', 'Find the mistake')).toBe('Find the mistake');
    expect(quizExerciseDisplayTitle('Phát âm khác', 'Trắc nghiệm')).toBe('Phát âm khác');
    expect(quizExerciseDisplayTitle('U1 Ex9', '')).toBe('U1 Ex9');
  });

  it('splits passage and stem for reading comprehension', () => {
    const passage = 'A'.repeat(90);
    const raw = `${passage}\n\nWhat was the focus of the course?`;
    expect(splitQuizPassageAndStem(raw)).toEqual({
      passage,
      stem: 'What was the focus of the course?',
    });
    expect(splitQuizPassageAndStem('Short only')).toEqual({
      passage: '',
      stem: 'Short only',
    });
  });

  it('underlines error options in order inside the sentence', () => {
    const html = underlineErrorOptionsInSentence(
      'She enjoys reading in her room because it gives her private from the rest of the house.',
      ['reading', 'because', 'private', 'of']
    );
    expect(html).toContain('<u class="quiz-error-opt">reading</u>');
    expect(html).toContain('<u class="quiz-error-opt">because</u>');
    expect(html).toContain('<u class="quiz-error-opt">private</u>');
    expect(html).toContain('<u class="quiz-error-opt">of</u>');
    expect(isFindTheMistakeQuiz('Tìm lỗi sai', 'Tìm lỗi sai')).toBe(true);
    expect(isFindTheMistakeQuiz('Trắc nghiệm', 'Hoàn thành câu')).toBe(false);
  });

  it('does not treat pronunciation-difference prompts as find-the-mistake items', () => {
    const raw =
      'Chọn từ có phần nguyên âm / âm khác: <u class="quiz-error-opt">garden</u> / <u class="quiz-error-opt">artist</u> / <u class="quiz-error-opt">candy</u> / <u class="quiz-error-opt">drama</u>';
    expect(isFindTheMistakeQuiz('Tìm lỗi sai', 'Phát âm khác')).toBe(false);
    const html = normalizeQuizQuestionHtml(
      raw,
      'Tìm lỗi sai',
      'Phát âm khác',
      raw,
      ['garden', 'artist', 'candy', 'drama']
    );
    expect(html).toContain('g<u class="quiz-error-opt">a</u>rden');
    expect(html).toContain('<u class="quiz-error-opt">a</u>rtist');
    expect(html).toContain('c<u class="quiz-error-opt">a</u>ndy');
    expect(html).toContain('dr<u class="quiz-error-opt">a</u>ma');
    expect(quizExerciseInstructionVi('Tìm lỗi sai', 'multiple_choice', 'Phát âm khác')).toBe(
      'Chọn từ có phần phát âm khác các từ còn lại.'
    );
  });

  it('does not escape pre-tagged pronunciation options into literal <u> text', () => {
    const html = underlinePronunciationOptionsInQuestion(
      'Chọn từ có phần nguyên âm / âm khác: m<u>ou</u>se / h<u>ou</u>se / w<u>ou</u>ld / <u>ou</u>tdoors',
      ['m<u>ou</u>se', 'h<u>ou</u>se', 'w<u>ou</u>ld', '<u>ou</u>tdoors']
    );
    expect(html).not.toContain('&lt;u&gt;');
    expect(html).not.toContain('m<u>ou</u>se');
    expect(html).toContain('m<u class="quiz-error-opt">ou</u>se');
    expect(html).toContain('h<u class="quiz-error-opt">ou</u>se');
    expect(html).toContain('w<u class="quiz-error-opt">ou</u>ld');
    expect(html).toContain('<u class="quiz-error-opt">ou</u>tdoors');
  });

  it('sanitizes quiz HTML to an allowlist of formatting tags', () => {
    expect(sanitizeQuizHtml('m<u>ou</u>se<script>alert(1)</script>')).toBe('m<u>ou</u>se');
    expect(sanitizeQuizHtml('<u class="quiz-error-opt" onclick="x">ou</u>')).toBe(
      '<u class="quiz-error-opt">ou</u>',
    );
    expect(sanitizeQuizHtml('a<br>b')).toBe('a<br />b');
  });

  it('infers the shared sound segment for pronunciation-difference options', () => {
    const html = underlinePronunciationOptionsInQuestion(
      'Chọn từ có phần nguyên âm / âm khác: pleasure / weather / speaker / feather',
      ['pleasure', 'weather', 'speaker', 'feather']
    );
    expect(html).toContain('pl<u class="quiz-error-opt">ea</u>sure');
    expect(html).toContain('w<u class="quiz-error-opt">ea</u>ther');
    expect(html).toContain('sp<u class="quiz-error-opt">ea</u>ker');
    expect(html).toContain('f<u class="quiz-error-opt">ea</u>ther');
  });

  it('repairs telex/truncated error options against the sentence', () => {
    const sentence =
      'Ngan learns to speak English by listen to English songs and repeating the lyrics.';
    expect(repairErrorOptions(sentence, ['to speak', 'listen', 'rêpating', 'th'])).toEqual([
      'to speak',
      'listen',
      'repeating',
      'the',
    ]);
    const html = underlineErrorOptionsInSentence(sentence, [
      'to speak',
      'listen',
      'rêpating',
      'th',
    ]);
    expect(html).toContain('<u class="quiz-error-opt">repeating</u>');
    expect(html).toContain('<u class="quiz-error-opt">the</u>');
  });

  it('repairs US/UK spelling and 1-letter typos to the sentence word', () => {
    const sentence =
      'There is a community center in our neighbour that offers different classes and activities for all ages.';
    expect(repairErrorOptions(sentence, ['There', 'in', 'neighbor', 'diffirent'])).toEqual([
      'There',
      'in',
      'neighbour',
      'different',
    ]);
    const html = underlineErrorOptionsInSentence(sentence, [
      'There',
      'in',
      'neighbor',
      'diffirent',
    ]);
    expect(html).toContain('<u class="quiz-error-opt">neighbour</u>');
    expect(html).toContain('<u class="quiz-error-opt">different</u>');
  });

  it('repairs British -re/-er and -our/-or pairs to the sentence word', () => {
    const sentence = 'The colour of the centre is bright.';
    expect(repairErrorOptions(sentence, ['The', 'color', 'of', 'center'])).toEqual([
      'The',
      'colour',
      'of',
      'centre',
    ]);
    const html = underlineErrorOptionsInSentence(sentence, ['The', 'color', 'of', 'center']);
    expect(html).toContain('<u class="quiz-error-opt">colour</u>');
    expect(html).toContain('<u class="quiz-error-opt">centre</u>');
  });

  it('maps Vietnamese instructions from typeLabel with type fallback', () => {
    expect(quizExerciseInstructionVi('Find the mistake', 'fill_blank')).toBe(
      'Gạch lỗi sai trong câu và viết lại câu đúng.'
    );
    expect(quizExerciseInstructionVi('', 'fill_blank')).toBe(
      'Điền từ thích hợp vào chỗ trống.'
    );
    expect(quizExerciseInstructionVi('Unknown', 'multiple_choice')).toBe('Chọn đáp án đúng.');
    expect(GRAMMAR_FILL_INSTRUCTION_VI).toMatch(/gợi ý/);
  });
});
