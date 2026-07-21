import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { GameLessonTabsContent } from './GameLessonTabs';

const lesson = {
  ebookId: 'ebook-1',
  pageStart: 12,
  pageEnd: 18,
};

describe('GameLessonTabsContent', () => {
  it('renders children without tabs when no lesson is mapped', () => {
    const html = renderToStaticMarkup(
      <GameLessonTabsContent lesson={null}>
        <div className="sample-game">Game content</div>
      </GameLessonTabsContent>,
    );

    expect(html).toContain('class="sample-game"');
    expect(html).not.toContain('class="game-lesson-tabs"');
    expect(html).not.toContain('Bài học');
  });

  it('defaults a mapped lesson to the active exercise tab', () => {
    const html = renderToStaticMarkup(
      <GameLessonTabsContent lesson={lesson}>
        <div className="sample-game">Game content</div>
      </GameLessonTabsContent>,
    );

    expect(html).toContain('class="game-lesson-tabs"');
    expect(html).toContain('id="game-lesson-tab-exercise"');
    expect(html).toContain('class="game-lesson-tab active"');
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('Bài tập');
    expect(html).toContain('class="sample-game"');
    expect(html).toContain('id="game-lesson-panel-exercise"');
    expect(html).toContain('aria-controls="game-lesson-panel-exercise"');
    expect(html).toContain('aria-labelledby="game-lesson-tab-exercise"');
    expect(html).toMatch(
      /id="game-lesson-panel-lesson"[^>]*hidden(?:="")?/,
    );
    expect(html).not.toContain('class="ebook-flip-root"');
  });

  it('keeps the game mounted when the lesson tab is active', () => {
    const html = renderToStaticMarkup(
      <GameLessonTabsContent lesson={lesson} initialTab="lesson">
        <div className="sample-game">Game content</div>
      </GameLessonTabsContent>,
    );

    expect(html).toContain('id="game-lesson-tab-lesson"');
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('Bài học');
    expect(html).toContain('class="ebook-flip-root"');
    expect(html).toContain('class="sample-game"');
    expect(html).toContain('id="game-lesson-panel-exercise"');
    expect(html).toContain('id="game-lesson-panel-lesson"');
    expect(html).toContain('aria-labelledby="game-lesson-tab-lesson"');
    expect(html).toMatch(
      /id="game-lesson-panel-exercise"[^>]*hidden(?:="")?/,
    );
  });
});
