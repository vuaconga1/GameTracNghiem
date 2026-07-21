'use client';

import { useEffect, useState, type KeyboardEvent, type ReactNode } from 'react';

import { EbookViewer } from '@/features/courses/EbookViewer';
import type { CourseGameLessonDescriptor } from '@/lib/loadCourseGameLesson';

type GameLessonTab = 'exercise' | 'lesson';

const TAB_ORDER: GameLessonTab[] = ['exercise', 'lesson'];

const TAB_IDS = {
  exercise: 'game-lesson-tab-exercise',
  lesson: 'game-lesson-tab-lesson',
} as const;

const PANEL_IDS = {
  exercise: 'game-lesson-panel-exercise',
  lesson: 'game-lesson-panel-lesson',
} as const;

type GameLessonTabsContentProps = {
  lesson: CourseGameLessonDescriptor | null;
  children: ReactNode;
  activeTab?: GameLessonTab;
  initialTab?: GameLessonTab;
  onTabChange?: (tab: GameLessonTab) => void;
};

export function GameLessonTabsContent({
  lesson,
  children,
  activeTab,
  initialTab = 'exercise',
  onTabChange,
}: GameLessonTabsContentProps) {
  const selectedTab = activeTab ?? initialTab;
  const [lessonMounted, setLessonMounted] = useState(selectedTab === 'lesson');

  useEffect(() => {
    if (selectedTab === 'lesson') {
      setLessonMounted(true);
    }
  }, [selectedTab]);

  if (!lesson) return children;

  const selectTab = (tab: GameLessonTab) => {
    if (tab === 'lesson') setLessonMounted(true);
    onTabChange?.(tab);
  };

  const onTabListKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const currentIndex = TAB_ORDER.indexOf(selectedTab);
    if (currentIndex < 0) return;

    let nextIndex: number | null = null;
    switch (event.key) {
      case 'ArrowRight':
        nextIndex = (currentIndex + 1) % TAB_ORDER.length;
        break;
      case 'ArrowLeft':
        nextIndex = (currentIndex - 1 + TAB_ORDER.length) % TAB_ORDER.length;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = TAB_ORDER.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    selectTab(TAB_ORDER[nextIndex]);
  };

  return (
    <div className="game-lesson-tabs">
      <div
        className="game-lesson-tab-list"
        role="tablist"
        aria-label="Nội dung học tập"
        onKeyDown={onTabListKeyDown}
      >
        <button
          type="button"
          role="tab"
          id={TAB_IDS.exercise}
          className={`game-lesson-tab${selectedTab === 'exercise' ? ' active' : ''}`}
          aria-selected={selectedTab === 'exercise'}
          aria-controls={PANEL_IDS.exercise}
          tabIndex={selectedTab === 'exercise' ? 0 : -1}
          onClick={() => selectTab('exercise')}
        >
          Bài tập
        </button>
        <button
          type="button"
          role="tab"
          id={TAB_IDS.lesson}
          className={`game-lesson-tab${selectedTab === 'lesson' ? ' active' : ''}`}
          aria-selected={selectedTab === 'lesson'}
          aria-controls={PANEL_IDS.lesson}
          tabIndex={selectedTab === 'lesson' ? 0 : -1}
          onClick={() => selectTab('lesson')}
        >
          Bài học
        </button>
      </div>

      <div
        className="game-lesson-panel game-lesson-panel--exercise"
        role="tabpanel"
        id={PANEL_IDS.exercise}
        aria-labelledby={TAB_IDS.exercise}
        hidden={selectedTab !== 'exercise'}
      >
        {children}
      </div>
      <div
        className="game-lesson-panel game-lesson-panel--lesson"
        role="tabpanel"
        id={PANEL_IDS.lesson}
        aria-labelledby={TAB_IDS.lesson}
        hidden={selectedTab !== 'lesson'}
      >
        {lessonMounted ? (
          <EbookViewer
            ebookId={lesson.ebookId}
            pageStart={lesson.pageStart}
            pageEnd={lesson.pageEnd}
          />
        ) : null}
      </div>
    </div>
  );
}

export function GameLessonTabs({
  lesson,
  children,
  initialTab = 'exercise',
}: Pick<GameLessonTabsContentProps, 'lesson' | 'children' | 'initialTab'>) {
  const [activeTab, setActiveTab] = useState<GameLessonTab>(initialTab);

  return (
    <GameLessonTabsContent
      lesson={lesson}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      {children}
    </GameLessonTabsContent>
  );
}
