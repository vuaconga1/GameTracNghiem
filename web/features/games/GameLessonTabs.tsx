'use client';

import { useState, type ReactNode } from 'react';

import { EbookViewer } from '@/features/courses/EbookViewer';
import type { CourseGameLessonDescriptor } from '@/lib/loadCourseGameLesson';

type GameLessonTab = 'exercise' | 'lesson';

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
  if (!lesson) return children;

  const selectedTab = activeTab ?? initialTab;

  return (
    <div className="game-lesson-tabs">
      <div className="game-lesson-tab-list" role="tablist" aria-label="Nội dung học tập">
        <button
          type="button"
          role="tab"
          className={`game-lesson-tab${selectedTab === 'exercise' ? ' active' : ''}`}
          aria-selected={selectedTab === 'exercise'}
          onClick={() => onTabChange?.('exercise')}
        >
          Bài tập
        </button>
        <button
          type="button"
          role="tab"
          className={`game-lesson-tab${selectedTab === 'lesson' ? ' active' : ''}`}
          aria-selected={selectedTab === 'lesson'}
          onClick={() => onTabChange?.('lesson')}
        >
          Bài học
        </button>
      </div>

      {selectedTab === 'exercise' ? (
        <div className="game-lesson-panel game-lesson-panel--exercise" role="tabpanel">
          {children}
        </div>
      ) : (
        <div className="game-lesson-panel game-lesson-panel--lesson" role="tabpanel">
          <EbookViewer
            ebookId={lesson.ebookId}
            pageStart={lesson.pageStart}
            pageEnd={lesson.pageEnd}
          />
        </div>
      )}
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
