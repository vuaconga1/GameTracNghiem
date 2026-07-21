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
    expect(html).toContain('class="game-lesson-tab active"');
    expect(html).toContain('aria-selected="true">Bài tập</button>');
    expect(html).toContain('class="sample-game"');
    expect(html).not.toContain('class="ebook-flip-root"');
  });

  it('renders the ebook viewer with the lesson tab active', () => {
    const html = renderToStaticMarkup(
      <GameLessonTabsContent lesson={lesson} initialTab="lesson">
        <div className="sample-game">Game content</div>
      </GameLessonTabsContent>,
    );

    expect(html).toContain('aria-selected="true">Bài học</button>');
    expect(html).toContain('class="ebook-flip-root"');
    expect(html).not.toContain('class="sample-game"');
  });
});
