export type Messages = {
  [key: string]: string | Messages;
};

/** Dot-path lookup with optional `{name}` interpolation. */
export function translate(
  messages: Messages,
  key: string,
  params?: Record<string, string | number>,
): string {
  const parts = key.split('.');
  let node: string | Messages | undefined = messages;
  for (const part of parts) {
    if (!node || typeof node === 'string') {
      node = undefined;
      break;
    }
    node = node[part];
  }
  let text = typeof node === 'string' ? node : key;
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      text = text.replaceAll(`{${name}}`, String(value));
    }
  }
  return text;
}

/** Display class level DB values like "Lớp 4" without mutating stored data. */
export function formatClassLevelName(levelName: string, locale: 'en' | 'vi'): string {
  const trimmed = levelName.trim();
  const m = /^Lớp\s+(\d+)$/i.exec(trimmed);
  if (m) {
    return locale === 'en' ? `Grade ${m[1]}` : `Lớp ${m[1]}`;
  }
  const g = /^Grade\s+(\d+)$/i.exec(trimmed);
  if (g) {
    return locale === 'en' ? `Grade ${g[1]}` : `Lớp ${g[1]}`;
  }
  return trimmed;
}
