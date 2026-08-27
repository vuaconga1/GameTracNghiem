'use client';

import type { CSSProperties } from 'react';
import Link from 'next/link';

import { DataLoading } from '@/components/DataLoading';
import { useI18n } from '@/components/i18n/I18nProvider';
import type { CourseListItem } from '@/features/courses/CourseList';
import {
  alphabetCourseName,
  alphabetLetterFromCourseName,
} from '@/lib/alphabetLevel';

type AlphabetGridProps = {
  courses: CourseListItem[];
};

/** WeWIN activity-icon accents — unique A→Z so neighboring letters differ. */
const ALPHABET_CARD_COLORS: Record<string, { accent: string; soft: string }> = {
  A: { accent: '#0d2b6e', soft: '#e6ecf7' },
  B: { accent: '#1e5a96', soft: '#e8f1fb' },
  C: { accent: '#1a5494', soft: '#e4edf7' },
  D: { accent: '#2d6b3a', soft: '#e6f0e8' },
  E: { accent: '#3d6b2a', soft: '#edf3e8' },
  F: { accent: '#2a6b62', soft: '#e4efed' },
  G: { accent: '#24734a', soft: '#e6f4ec' },
  H: { accent: '#a85f12', soft: '#f5ebe0' },
  I: { accent: '#9a5f1a', soft: '#f3ebe0' },
  J: { accent: '#8a6d28', soft: '#f5f0e4' },
  K: { accent: '#8f3d5c', soft: '#f3e8ec' },
  L: { accent: '#5a4a78', soft: '#ede8f2' },
  M: { accent: '#1a3a6e', soft: '#e4ebf7' },
  N: { accent: '#3a5a78', soft: '#e8eef3' },
  O: { accent: '#1e4a9a', soft: '#e6eefb' },
  P: { accent: '#2a7a4a', soft: '#e4f3ea' },
  Q: { accent: '#1a6b6b', soft: '#e2f0f0' },
  R: { accent: '#1a5a5a', soft: '#e0eded' },
  S: { accent: '#3a4a5a', soft: '#e8ecf0' },
  T: { accent: '#b85a1a', soft: '#f5ebe0' },
  U: { accent: '#0f4c81', soft: '#e2ecf5' },
  V: { accent: '#4a6b2a', soft: '#eaf1e4' },
  W: { accent: '#0d5c6e', soft: '#e0eef2' },
  X: { accent: '#6b3a2a', soft: '#f0e8e4' },
  Y: { accent: '#8a7018', soft: '#f3efdf' },
  Z: { accent: '#2a4a6b', soft: '#e6ecf3' },
};

const PROGRESS_RADIUS = 18;
const PROGRESS_CIRCUMFERENCE = 2 * Math.PI * PROGRESS_RADIUS;

function alphabetCardColor(letter: string) {
  const upper = letter.toUpperCase().charAt(0);
  return ALPHABET_CARD_COLORS[upper] || ALPHABET_CARD_COLORS.A;
}

function formatSampleWords(words: string[] | undefined): string {
  return (words || [])
    .map((word) => word.trim())
    .filter(Boolean)
    .slice(0, 3)
    .join(', ');
}

function ProgressRing({ percent }: { percent: number }) {
  const clamped = Math.min(100, Math.max(0, Math.round(percent)));
  const offset = PROGRESS_CIRCUMFERENCE * (1 - clamped / 100);

  return (
    <div className="alphabet-progress" aria-hidden="true">
      <svg className="alphabet-progress-svg" viewBox="0 0 44 44" focusable="false">
        <circle className="alphabet-progress-track" cx="22" cy="22" r={PROGRESS_RADIUS} />
        <circle
          className="alphabet-progress-fill"
          cx="22"
          cy="22"
          r={PROGRESS_RADIUS}
          strokeDasharray={PROGRESS_CIRCUMFERENCE}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="alphabet-progress-text">{clamped}%</span>
    </div>
  );
}

export function AlphabetGrid({ courses }: AlphabetGridProps) {
  const { t } = useI18n();

  if (courses.length === 0) {
    return <DataLoading variant="message" message={t('alphabet.empty')} />;
  }

  return (
    <div className="alphabet-grid" id="alphabetGrid" data-tour="alphabet-grid">
      {courses.map((course) => {
        const letter = course.letter || alphabetLetterFromCourseName(course.name);
        const title = alphabetCourseName(letter);
        const colors = alphabetCardColor(letter);
        const percent = Math.min(100, Math.max(0, Math.round(course.completionPercent || 0)));
        const sampleWords = formatSampleWords(course.sampleWords);
        const description = sampleWords
          ? t('alphabet.phonicsDesc', { letter: title, words: sampleWords })
          : t('alphabet.phonicsDescEmpty', { letter: title });
        const showRetry = percent > 0 && percent < 100;
        const cardStyle = {
          '--alphabet-accent': colors.accent,
          '--alphabet-soft': colors.soft,
        } as CSSProperties;

        return (
          <Link
            key={course.id}
            href={`/games/pronunciation/${course.id}`}
            className="alphabet-card"
            data-letter={letter}
            style={cardStyle}
            aria-label={`${t('alphabet.lesson')}: ${title}. ${description}. ${t('alphabet.progressPercent', { percent })}`}
          >
            <span className="alphabet-card-icon" aria-hidden="true">
              <span className="alphabet-card-icon-letter">{title}</span>
            </span>

            <span className="alphabet-card-body">
              <span className="alphabet-card-label">{t('alphabet.lesson')}</span>
              <span className="alphabet-card-title">{title}</span>
              <span className="alphabet-card-desc">{description}</span>
            </span>

            <span className="alphabet-card-meta">
              <ProgressRing percent={percent} />
              {showRetry ? (
                <span className="alphabet-card-retry">{t('common.retry')}</span>
              ) : null}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
