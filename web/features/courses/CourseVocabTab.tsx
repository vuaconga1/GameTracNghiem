'use client';

/* eslint-disable @next/next/no-img-element */

import { useCallback, useRef, useState } from 'react';

import { useI18n } from '@/components/i18n/I18nProvider';
import type { CourseVocabCard } from '@/lib/courseVocabDeck';
import { playReferenceAudio } from '@/features/games/pronunciation/audio';

type CourseVocabTabProps = {
  cards: CourseVocabCard[];
};

export function CourseVocabTab({ cards }: CourseVocabTabProps) {
  const { t } = useI18n();
  const [activeWord, setActiveWord] = useState<string | null>(null);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeAudio = useRef<HTMLAudioElement | null>(null);

  const handleSpeak = useCallback((card: CourseVocabCard) => {
    playReferenceAudio(card.word, card.audioUrl, 0.92, activeAudio.current, (audio) => {
      activeAudio.current = audio;
    });
    setActiveWord(card.word);
    if (clearTimer.current) clearTimeout(clearTimer.current);
    clearTimer.current = setTimeout(() => setActiveWord(null), 900);
  }, []);

  if (cards.length === 0) {
    return <div className="ebook-empty">{t('course.vocabEmpty')}</div>;
  }

  const isPrimary = cards.some((card) => card.layout === 'primary');

  return (
    <div className={`course-vocab-panel${isPrimary ? ' course-vocab-panel--primary' : ''}`}>
      <h3 className="course-vocab-heading">{t('course.vocabHeading')}</h3>
      <ul className={`course-vocab-list${isPrimary ? ' course-vocab-list--primary' : ''}`}>
        {cards.map((card) => {
          const isActive = activeWord === card.word;
          if (card.layout === 'primary') {
            return (
              <li key={card.word}>
                <button
                  type="button"
                  className={`course-vocab-flashcard${isActive ? ' is-speaking' : ''}`}
                  onClick={() => handleSpeak(card)}
                  aria-label={t('course.vocabSpeak', { word: card.word })}
                >
                  <span className="course-vocab-flashcard-pin" aria-hidden="true">
                    <i className="fas fa-thumbtack" />
                  </span>
                  <div className="course-vocab-flashcard-body">
                    <div className="course-vocab-flashcard-text">
                      <span className="course-vocab-flashcard-word">{card.word}</span>
                      {card.ipa ? (
                        <span className="course-vocab-flashcard-ipa">{card.ipa}</span>
                      ) : null}
                      <span className="course-vocab-flashcard-meaning">{card.meaning}</span>
                    </div>
                    <div className="course-vocab-flashcard-media">
                      {card.imageUrl ? (
                        <img src={card.imageUrl} alt="" loading="lazy" />
                      ) : (
                        <i className="fas fa-image" aria-hidden="true" />
                      )}
                    </div>
                  </div>
                </button>
              </li>
            );
          }

          return (
            <li key={card.word}>
              <button
                type="button"
                className={`course-vocab-card course-vocab-card--${card.accent || 'coral'}${isActive ? ' is-speaking' : ''}`}
                onClick={() => handleSpeak(card)}
                aria-label={t('course.vocabSpeak', { word: card.word })}
              >
                <div className="course-vocab-card-title">
                  <i className={`fas ${card.icon || 'fa-book'}`} aria-hidden="true" />
                  <span>{card.word}</span>
                  <i className="fas fa-volume-up course-vocab-speak-icon" aria-hidden="true" />
                </div>
                <p className="course-vocab-line">
                  <strong>{t('course.vocabMeaning')}</strong> {card.meaning}
                </p>
                {card.example ? (
                  <p className="course-vocab-line">
                    <strong>{t('course.vocabExample')}</strong> {card.example}
                  </p>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
