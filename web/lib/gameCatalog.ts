export type ProgressStatus = 'empty' | 'correct' | 'wrong';

export type GameCatalogItem = {
  key: string;
  slug: string;
  label: string;
  iconClass: string;
  icon: string;
  /** When true, course detail links to the live Next.js game route. */
  live: boolean;
};

/** All activity cards shown on course detail. Flip `live` as each game is ported. */
export const GAME_CATALOG: GameCatalogItem[] = [
  {
    key: 'grammar',
    slug: 'grammar',
    label: 'Ngữ pháp',
    iconClass: 'grammar',
    icon: 'fas fa-book-open',
    live: true,
  },
  {
    key: 'quiz',
    slug: 'quiz',
    label: 'Trắc nghiệm',
    iconClass: 'quiz',
    icon: 'fas fa-file-alt',
    live: true,
  },
  {
    key: 'pronunciation',
    slug: 'pronunciation',
    label: 'Phát âm',
    iconClass: 'pronunciation',
    icon: 'fas fa-microphone',
    live: true,
  },
  {
    key: 'scramble',
    slug: 'scramble',
    label: 'Sắp xếp từ',
    iconClass: 'scramble',
    icon: 'fas fa-shuffle',
    live: true,
  },
  {
    key: 'word_match',
    slug: 'word-match',
    label: 'Nối từ với hình',
    iconClass: 'word-match',
    icon: 'fas fa-image',
    live: true,
  },
  {
    key: 'look_and_write',
    slug: 'look-and-write',
    label: 'Nhìn và viết',
    iconClass: 'look-write',
    icon: 'fas fa-images',
    live: true,
  },
  {
    key: 'choose_and_circle',
    slug: 'choose-and-circle',
    label: 'Chọn và khoanh',
    iconClass: 'choose-circle',
    icon: 'fas fa-circle-dot',
    live: true,
  },
  {
    key: 'read_and_complete',
    slug: 'read-and-complete',
    label: 'Đọc và hoàn thành',
    iconClass: 'read-complete',
    icon: 'fas fa-pen-fancy',
    live: true,
  },
  {
    key: 'read_and_match',
    slug: 'read-and-match',
    label: 'Đọc và nối',
    iconClass: 'read-match',
    icon: 'fas fa-link',
    live: true,
  },
  {
    key: 'vocabulary_test',
    slug: 'vocabulary-test',
    label: 'Kiểm tra từ vựng',
    iconClass: 'vocab-test',
    icon: 'fas fa-table-cells',
    live: true,
  },
  {
    key: 'vocabulary_check',
    slug: 'vocabulary-check',
    label: 'Kiểm tra đúng sai',
    iconClass: 'vocab-check',
    icon: 'fas fa-check-double',
    live: true,
  },
];

export const LIVE_GAME_KEYS = new Set(
  GAME_CATALOG.filter((game) => game.live).map((game) => game.key)
);

export const ALL_GAME_KEYS = GAME_CATALOG.map((game) => game.key);

/**
 * Empty/null enabledGames means all catalog games are visible (legacy courses).
 */
export function resolveEnabledGameKeys(enabledGames: string[] | null | undefined): string[] {
  if (!enabledGames || enabledGames.length === 0) return [...ALL_GAME_KEYS];
  const allowed = new Set(ALL_GAME_KEYS);
  return enabledGames.filter((key) => allowed.has(key));
}

export function isGameEnabledForCourse(
  enabledGames: string[] | null | undefined,
  gameKey: string
): boolean {
  return resolveEnabledGameKeys(enabledGames).includes(gameKey);
}

export function normalizeEnabledGamesInput(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const allowed = new Set(ALL_GAME_KEYS);
  const keys = [
    ...new Set(value.map((item) => String(item || '').trim()).filter((key) => allowed.has(key))),
  ];
  return keys;
}

export function progressStatuses(value: unknown): ProgressStatus[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const status = String(item || 'empty').trim().toLowerCase();
    if (status === 'correct' || status === 'wrong') return status;
    return 'empty';
  });
}

export function normalizeStatuses(
  statuses: ProgressStatus[] | undefined,
  questionCount: number
): ProgressStatus[] {
  return Array.from({ length: questionCount }, (_, index) => statuses?.[index] || 'empty');
}

export function nextEmptyIndex(statuses: ProgressStatus[]): number {
  return statuses.findIndex((status) => status === 'empty');
}

export function findGameByPathname(pathname: string): GameCatalogItem | undefined {
  const match = pathname.match(/^\/games\/([^/]+)/);
  if (!match) return undefined;
  return GAME_CATALOG.find((game) => game.slug === match[1]);
}
