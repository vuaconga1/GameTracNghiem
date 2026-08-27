'use client';

import { useEffect, useRef } from 'react';

import { useI18n } from '@/components/i18n/I18nProvider';
import {
  SPEAKING_VOICE_CHARACTERS,
  type SpeakingVoiceCharacterId,
} from '@/lib/speaking/voiceCharacters';

/**
 * Netflix-style "Who's speaking with you?" picker.
 *
 * Large avatar grid, name + short intro under each. Clicking a tile selects
 * that character and continues (onSelect). When `dismissable`, an Escape key
 * or the close button calls onClose without changing the selection.
 */
export function SpeakingCharacterPicker({
  selectedId,
  onSelect,
  onClose,
  dismissable = false,
}: {
  selectedId?: SpeakingVoiceCharacterId | null;
  onSelect: (id: SpeakingVoiceCharacterId) => void;
  onClose?: () => void;
  dismissable?: boolean;
}) {
  const { t } = useI18n();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const firstTileRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    firstTileRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!dismissable || !onClose) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [dismissable, onClose]);

  return (
    <div
      className="speaking-character-backdrop"
      onMouseDown={(event) => {
        if (dismissable && onClose && event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={panelRef}
        className="speaking-character-picker"
        role="dialog"
        aria-modal="true"
        aria-labelledby="speaking-character-title"
      >
        {dismissable && onClose ? (
          <button
            type="button"
            className="speaking-character-close"
            aria-label={t('common.close')}
            onClick={onClose}
          >
            <i className="fas fa-xmark" aria-hidden="true" />
          </button>
        ) : null}

        <p className="speaking-character-eyebrow">
          {t('speaking.characters.eyebrow')}
        </p>
        <h2 id="speaking-character-title" className="speaking-character-title">
          {t('speaking.characters.title')}
        </h2>
        <p className="speaking-character-subtitle">
          {t('speaking.characters.subtitle')}
        </p>

        <ul
          className="speaking-character-grid"
          aria-label={t('speaking.characters.title')}
        >
          {SPEAKING_VOICE_CHARACTERS.map((character, index) => {
            const name = t(character.nameKey);
            const isSelected = selectedId === character.id;
            return (
              <li key={character.id}>
                <button
                  ref={index === 0 ? firstTileRef : undefined}
                  type="button"
                  className={`speaking-character-card${
                    isSelected ? ' is-selected' : ''
                  }`}
                  aria-pressed={isSelected}
                  aria-label={t('speaking.characters.chooseAria', { name })}
                  onClick={() => onSelect(character.id)}
                >
                  <span
                    className="speaking-character-avatar"
                    style={{ ['--character-color' as string]: character.color }}
                  >
                    <img src={character.avatar} alt="" draggable={false} />
                    {isSelected ? (
                      <span
                        className="speaking-character-check"
                        aria-hidden="true"
                      >
                        <i className="fas fa-check" />
                      </span>
                    ) : null}
                  </span>
                  <span className="speaking-character-name">{name}</span>
                  <span className="speaking-character-intro">
                    {t(character.introKey)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
