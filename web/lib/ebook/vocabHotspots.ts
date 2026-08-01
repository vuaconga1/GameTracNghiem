/**
 * Detect clickable vocabulary / sentence hotspots from PDF text (Logistics + general slides).
 *
 * Supported layouts:
 * 1) Key Vocabulary cards with Meaning: / Example:
 * 2) 2–3 term columns with definitions under titles (no Meaning label)
 * 3) One-term flashcard page (title + definition)
 * 4) Vertical term → definition stacks
 * 5) Label: definition pairs (Department:, Handle:, …)
 * 6) Key Sentence Structures cards with Pattern: / Example:
 */

export type PdfTextBox = {
  str: string;
  /** Left edge in viewport coordinates (origin top-left). */
  x: number;
  /** Top edge in viewport coordinates. */
  y: number;
  width: number;
  height: number;
};

/** Normalized 0–1 rect relative to page size, plus the word to speak. */
export type VocabHotspot = {
  word: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

type TextLine = {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

const MEANING_RE = /^meaning\s*:?\s*$/i;
const EXAMPLE_RE = /^example\s*:?\s*$/i;
const PATTERN_RE = /^pattern\s*:?\s*$/i;
const STRUCTURE_LABEL_RE = /^(pattern|example)\s*:?\s*$/i;
const STRUCTURE_LABEL_PREFIX_RE = /^(pattern|example)\s*:/i;
const SKIP_PAGE_RE =
  /^(lesson overview|key sentence|discussion|practical activity|questions\?|thank you|useful phone|call structure|handling peak|part\s*\d+)/i;
const SKIP_TITLE_RE =
  /^(key\s+vocabulary|vocabulary(\s*[-–—]\s*part\s*\d+)?|core vocabulary|more key|basic supply|operations\s*&\s*fulfillment|strategy\s*&\s*efficiency|department\s*&\s*|urgent sentences|roleplay practice|standard booking|urgent\s*\/\s*peak|unit\s+\d+|lesson\s+\d+)\b/i;
// Dialogue/meta labels must include a colon. Bare words like "Carrier" are vocab.
const META_LABEL_RE = /^(pattern|example|meaning|caller|carrier|q\d+)\s*:$/i;
const SECTION_HEADING_RE = /^\d+\.\s+\S.{0,50}$/;

function cleanWord(text: string): string {
  return text
    .replace(/^\d+\.\s*/, '')
    .replace(/[：:]\s*$/, '')
    // PDF private-use brackets around acronyms, e.g. Full Container FCL
    .replace(/[\uE000-\uF8FF]/g, '')
    .replace(/[()[\]{}]/g, (ch) => ch)
    .replace(/\s+/g, ' ')
    .trim();
}

/** Strip quote wrappers for TTS while keeping placeholders like [Role]. */
function cleanSpeakText(text: string): string {
  return text
    .replace(/[\uE000-\uF8FF]/g, '')
    .replace(/^[“"']+|[”"']+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isSpeakableSentence(text: string): boolean {
  const spoken = cleanSpeakText(text);
  if (spoken.length < 8 || spoken.length > 220) return false;
  if (!/[\p{L}]/u.test(spoken)) return false;
  if (STRUCTURE_LABEL_RE.test(spoken) || MEANING_RE.test(spoken)) return false;
  // Reject short slide titles only — long lines may legitimately start with "Thank you".
  if (spoken.length < 42 && (SKIP_PAGE_RE.test(spoken) || SKIP_TITLE_RE.test(spoken))) {
    return false;
  }
  if (SECTION_HEADING_RE.test(spoken) && spoken.length < 40) return false;
  return true;
}

function isSentenceFragment(text: string): boolean {
  const t = text.trim();
  if (/[.!?]"?$/.test(t) && t.length > 18) return true;
  if (/^[a-z]/.test(t)) return true;
  if (/^(the|a|an|to|for|and|or|with|from|like|using|making|anyone|all|ready|stopping|hiring|managing|unloading|loading)\b/i.test(t) && t.length > 20) {
    return true;
  }
  return false;
}

export function isVocabHeadword(text: string): boolean {
  const raw = text.trim();
  if (!raw) return false;
  if (MEANING_RE.test(raw) || EXAMPLE_RE.test(raw) || META_LABEL_RE.test(raw)) return false;
  if (SKIP_TITLE_RE.test(raw) || SKIP_PAGE_RE.test(raw)) return false;
  const word = cleanWord(raw);
  if (word.length < 2 || word.length > 55) return false;
  if (isSentenceFragment(word)) return false;
  // Must start with letter/number (Title Case, acronym, or numbered term already stripped).
  if (!/^[\p{L}\p{N}]/u.test(word)) return false;
  // Reject long quoted dialogue / patterns.
  if ((word.match(/"/g) || []).length >= 2 && word.length > 24) return false;
  if (/\[.*\]/.test(word) && word.length > 20) return false;
  return true;
}

/** Prefer glyph estimate when pdf.js width is missing/inflated. */
function estimateWidth(box: PdfTextBox): number {
  const fromChars = Math.max(4, box.str.length * Math.max(box.height, 8) * 0.52);
  if (!box.width || box.width <= 0) return fromChars;
  return Math.min(box.width, fromChars * 1.35);
}

/** @internal Exported for unit tests. */
export function clusterLines(items: PdfTextBox[]): TextLine[] {
  if (items.length === 0) return [];

  const sorted = [...items].sort((a, b) => {
    const yDiff = a.y - b.y;
    if (Math.abs(yDiff) > Math.max(a.height, b.height, 4) * 0.45) return yDiff;
    return a.x - b.x;
  });

  const lineRows: PdfTextBox[][] = [];
  let row: PdfTextBox[] = [];
  for (const item of sorted) {
    if (!row.length) {
      row.push(item);
      continue;
    }
    const ref = row[0];
    const yTol = Math.max(ref.height, item.height, 4) * 0.55;
    if (Math.abs(item.y - ref.y) <= yTol) row.push(item);
    else {
      lineRows.push(row);
      row = [item];
    }
  }
  if (row.length) lineRows.push(row);

  const lines: TextLine[] = [];
  for (const lineRow of lineRows) {
    const ordered = [...lineRow].sort((a, b) => a.x - b.x);
    let group: PdfTextBox[] = [];
    const emit = (g: PdfTextBox[]) => {
      if (!g.length) return;
      const first = g[0];
      const last = g[g.length - 1];
      const top = Math.min(...g.map((i) => i.y));
      const bottom = Math.max(...g.map((i) => i.y + i.height));
      // Keep Meaning:/Example:/Pattern: as their own tokens when glued to text.
      const parts: string[] = [];
      for (const box of g) {
        const s = box.str.trim();
        if (/^(meaning|example|pattern)\s*:?\s*$/i.test(s)) {
          if (parts.length) {
            lines.push(makeLine(parts.join(' '), g[0], last, top, bottom));
            parts.length = 0;
          }
          lines.push(makeLine(s.replace(/:$/, '') + ':', box, box, box.y, box.y + box.height));
          continue;
        }
        if (
          /^(meaning|example|pattern)\s*:/i.test(s) &&
          !/^(meaning|example|pattern)\s*:?\s*$/i.test(s)
        ) {
          const label = s.match(/^(meaning|example|pattern)\s*:/i)?.[0] || '';
          const rest = s.slice(label.length).trim();
          lines.push(
            makeLine(
              label.replace(/:$/, '') + ':',
              box,
              box,
              box.y,
              box.y + box.height
            )
          );
          if (rest) parts.push(rest);
          continue;
        }
        parts.push(s);
      }
      if (parts.length) {
        const text = parts.join(' ').replace(/\s+/g, ' ').trim();
        if (text) {
          lines.push({
            text,
            x: first.x,
            y: top,
            width: last.x + estimateWidth(last) - first.x,
            height: Math.max(4, bottom - top),
          });
        }
      }
    };

    for (const item of ordered) {
      if (!group.length) {
        group.push(item);
        continue;
      }
      const prev = group[group.length - 1];
      const gap = item.x - (prev.x + estimateWidth(prev));
      const gapTol = Math.max(prev.height, item.height, 10) * 1.15;
      // Always split Meaning:/Example:/Pattern: labels from neighboring text.
      const itemIsLabel = /^(meaning|example|pattern)\s*:?\s*$/i.test(item.str.trim());
      const prevIsLabel = /^(meaning|example|pattern)\s*:?\s*$/i.test(prev.str.trim());
      if (gap > gapTol || itemIsLabel || prevIsLabel) {
        emit(group);
        group = [item];
      } else {
        group.push(item);
      }
    }
    emit(group);
  }

  return lines.sort((a, b) => a.y - b.y || a.x - b.x);
}

function makeLine(
  text: string,
  first: PdfTextBox,
  last: PdfTextBox,
  top: number,
  bottom: number
): TextLine {
  return {
    text: text.replace(/\s+/g, ' ').trim(),
    x: first.x,
    y: top,
    width: Math.max(8, last.x + estimateWidth(last) - first.x),
    height: Math.max(4, bottom - top),
  };
}

function lineMidX(line: TextLine): number {
  return line.x + line.width / 2;
}

function overlapsColumn(line: TextLine, left: number, right: number): boolean {
  const mid = lineMidX(line);
  return mid >= left && mid <= right;
}

function normalizeHotspot(
  word: string,
  left: number,
  top: number,
  right: number,
  bottom: number,
  pageWidth: number,
  pageHeight: number
): VocabHotspot | null {
  const spoken = cleanWord(word);
  if (!isVocabHeadword(spoken) && !isVocabHeadword(word)) return null;
  const w = Math.max(1, pageWidth);
  const h = Math.max(1, pageHeight);
  const boxW = right - left;
  const boxH = bottom - top;
  if (boxW < 8 || boxH < 8) return null;
  return {
    word: spoken,
    x: Math.max(0, left) / w,
    y: Math.max(0, top) / h,
    width: Math.min(boxW, w - Math.max(0, left)) / w,
    height: Math.min(boxH, h - Math.max(0, top)) / h,
  };
}

function normalizeSpeakHotspot(
  text: string,
  left: number,
  top: number,
  right: number,
  bottom: number,
  pageWidth: number,
  pageHeight: number
): VocabHotspot | null {
  const spoken = cleanSpeakText(text);
  if (!isSpeakableSentence(spoken)) return null;
  const w = Math.max(1, pageWidth);
  const h = Math.max(1, pageHeight);
  const boxW = right - left;
  const boxH = bottom - top;
  if (boxW < 12 || boxH < 8) return null;
  return {
    word: spoken,
    x: Math.max(0, left) / w,
    y: Math.max(0, top) / h,
    width: Math.min(boxW, w - Math.max(0, left)) / w,
    height: Math.min(boxH, h - Math.max(0, top)) / h,
  };
}

/** Key Sentence Structures: clickable Pattern / Example lines. */
export function extractFromSentenceStructures(
  lines: TextLine[],
  pageWidth: number,
  pageHeight: number
): VocabHotspot[] {
  const hotspots: VocabHotspot[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const prefix = line.text.match(STRUCTURE_LABEL_PREFIX_RE)?.[0] || '';
    const isBareLabel = STRUCTURE_LABEL_RE.test(line.text) || PATTERN_RE.test(line.text);
    if (!prefix && !isBareLabel) continue;

    let content = prefix ? line.text.slice(prefix.length).trim() : '';
    const contentBoxes: TextLine[] = [];
    const labelMidX = lineMidX(line);
    const sameColumn = (box: TextLine) => Math.abs(lineMidX(box) - labelMidX) <= pageWidth * 0.3;

    if (isSpeakableSentence(content)) {
      contentBoxes.push({
        ...line,
        text: content,
        x: line.x + Math.min(line.width * 0.2, 70),
        width: Math.max(40, line.width * 0.8),
      });
    } else {
      content = '';
      for (let j = i + 1; j < lines.length; j += 1) {
        const next = lines[j];
        if (STRUCTURE_LABEL_PREFIX_RE.test(next.text) || STRUCTURE_LABEL_RE.test(next.text)) {
          // Another label in this column ends the block; other-column labels are skipped.
          if (sameColumn(next)) break;
          continue;
        }
        if (MEANING_RE.test(next.text)) {
          if (sameColumn(next)) break;
          continue;
        }
        if (SECTION_HEADING_RE.test(next.text)) {
          if (sameColumn(next)) break;
          continue;
        }
        // Only treat short page/section titles as stoppers — not Example sentences
        // that happen to start with words like "Thank you…".
        if (
          next.text.length < 42 &&
          (SKIP_PAGE_RE.test(next.text) || SKIP_TITLE_RE.test(next.text))
        ) {
          break;
        }
        if (next.y - line.y > Math.max(line.height, 12) * 7) break;
        if (!sameColumn(next)) continue;

        const nextPrefix = next.text.match(STRUCTURE_LABEL_PREFIX_RE)?.[0] || '';
        const piece = nextPrefix ? next.text.slice(nextPrefix.length).trim() : next.text.trim();
        if (!piece) continue;

        content = content ? `${content} ${piece}` : piece;
        contentBoxes.push(nextPrefix ? { ...next, text: piece } : next);

        // Prefer stopping after a finished sentence so Pattern/Example stay separate.
        if (content.length >= 12 && /[.!?]"?\s*$/.test(piece)) break;
        if (content.length > 160) break;
      }
    }

    if (!contentBoxes.length || !isSpeakableSentence(content)) continue;

    const left = Math.min(...contentBoxes.map((box) => box.x)) - 8;
    const top = Math.min(...contentBoxes.map((box) => box.y)) - 4;
    const right = Math.max(...contentBoxes.map((box) => box.x + box.width)) + 8;
    const bottom = Math.max(...contentBoxes.map((box) => box.y + box.height)) + 6;
    const spot = normalizeSpeakHotspot(content, left, top, right, bottom, pageWidth, pageHeight);
    if (spot) hotspots.push(spot);
  }

  return hotspots;
}

function pageHeader(lines: TextLine[]): string {
  return (lines[0]?.text || '').trim();
}

function isNonVocabPage(lines: TextLine[]): boolean {
  const header = pageHeader(lines);
  if (SKIP_PAGE_RE.test(header)) return true;
  // Discussion / closing slides (header-only — not Pattern/Example body copy).
  if (/^(discussion|thank you|questions\?)\b/i.test(header)) {
    if (!lines.some((l) => MEANING_RE.test(l.text) || STRUCTURE_LABEL_RE.test(l.text))) {
      return true;
    }
  }
  return false;
}

function extractFromMeanings(
  lines: TextLine[],
  pageWidth: number,
  pageHeight: number
): VocabHotspot[] {
  const meanings = lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => MEANING_RE.test(line.text));
  if (!meanings.length) return [];

  const bands: { line: TextLine; index: number }[][] = [];
  for (const m of meanings) {
    const band = bands.find((b) => {
      const ref = b[0].line;
      return Math.abs(m.line.y - ref.y) <= Math.max(ref.height, m.line.height, 10) * 1.2;
    });
    if (band) band.push(m);
    else bands.push([m]);
  }

  const hotspots: VocabHotspot[] = [];
  for (const band of bands) {
    const sortedBand = [...band].sort((a, b) => a.line.x - b.line.x);
    const columns = sortedBand.map((m, i) => {
      const left =
        i === 0
          ? Math.max(0, m.line.x - 40)
          : (sortedBand[i - 1].line.x + sortedBand[i - 1].line.width + m.line.x) / 2;
      const right =
        i === sortedBand.length - 1
          ? Math.min(pageWidth, m.line.x + Math.max(m.line.width, 160) + 40)
          : (m.line.x + m.line.width + sortedBand[i + 1].line.x) / 2;
      return { left, right, meaning: m.line, meaningIndex: m.index };
    });

    for (const col of columns) {
      const meaning = col.meaning;
      const titleMaxY = meaning.y - 1;
      const titleMinY = meaning.y - Math.max(meaning.height, 14) * 4.5;
      const candidates = lines.filter((line, idx) => {
        if (idx >= col.meaningIndex) return false;
        if (line.y > titleMaxY || line.y < titleMinY) return false;
        if (!overlapsColumn(line, col.left, col.right)) return false;
        return isVocabHeadword(line.text);
      });
      if (!candidates.length) continue;
      const title = candidates.sort((a, b) => b.y - a.y)[0];

      let bottom = meaning.y + meaning.height * 2.8;
      const exampleLabel = lines.find(
        (line, idx) =>
          idx > col.meaningIndex &&
          EXAMPLE_RE.test(line.text) &&
          overlapsColumn(line, col.left, col.right) &&
          line.y >= meaning.y - 2 &&
          line.y - meaning.y < meaning.height * 5
      );
      if (exampleLabel) {
        bottom = exampleLabel.y + exampleLabel.height * 3.2;
      }

      const spot = normalizeHotspot(
        title.text,
        Math.min(title.x, meaning.x) - 8,
        title.y - title.height * 0.6,
        Math.max(title.x + title.width, meaning.x + meaning.width, col.right - 8),
        bottom,
        pageWidth,
        pageHeight
      );
      if (spot) hotspots.push(spot);
    }
  }
  return hotspots;
}

/** Side-by-side term cards without Meaning: labels. */
function extractFromTermColumns(
  lines: TextLine[],
  pageWidth: number,
  pageHeight: number
): VocabHotspot[] {
  const headwords = lines.filter((l) => isVocabHeadword(l.text));
  if (headwords.length < 2) return [];

  const bands: TextLine[][] = [];
  for (const title of headwords) {
    const band = bands.find((b) => {
      const ref = b[0];
      return Math.abs(title.y - ref.y) <= Math.max(ref.height, title.height, 10) * 0.9;
    });
    if (band) band.push(title);
    else bands.push([title]);
  }

  const hotspots: VocabHotspot[] = [];
  for (const band of bands) {
    if (band.length < 2) continue;
    // Prefer denser title rows (2–4 cards).
    if (band.length > 4) continue;
    const sorted = [...band].sort((a, b) => a.x - b.x);

    // Require definition-like text under at least one title.
    const hasDefs = sorted.some((title) =>
      lines.some(
        (l) =>
          l.y > title.y + 2 &&
          l.y < title.y + title.height * 6 &&
          Math.abs(lineMidX(l) - lineMidX(title)) < Math.max(title.width, 80) &&
          (l.text.length > title.text.length + 8 || isSentenceFragment(l.text) || l.text.length > 28)
      )
    );
    if (!hasDefs) continue;

    for (let i = 0; i < sorted.length; i += 1) {
      const title = sorted[i];
      const left =
        i === 0 ? Math.max(0, title.x - 16) : (sorted[i - 1].x + sorted[i - 1].width + title.x) / 2;
      const right =
        i === sorted.length - 1
          ? Math.min(pageWidth, title.x + title.width + 16)
          : (title.x + title.width + sorted[i + 1].x) / 2;

      let bottom = title.y + title.height * 5;
      const below = lines.filter(
        (l) =>
          l.y > title.y + 2 &&
          l.y < title.y + title.height * 8 &&
          overlapsColumn(l, left, right)
      );
      if (below.length) {
        bottom = Math.max(...below.map((l) => l.y + l.height)) + title.height * 0.6;
      }

      const spot = normalizeHotspot(
        title.text,
        left,
        title.y - title.height * 0.55,
        right,
        bottom,
        pageWidth,
        pageHeight
      );
      if (spot) hotspots.push(spot);
    }
  }
  return hotspots;
}

/** One vocabulary word per slide (flashcard). */
function extractFromSingleTermPage(
  lines: TextLine[],
  pageWidth: number,
  pageHeight: number
): VocabHotspot[] {
  if (lines.length < 3 || lines.length > 10) return [];
  const header = lines[0];
  if (!header || !isVocabHeadword(header.text)) return [];
  if (header.text.length > 40) return [];

  // Mid-page title often repeats / expands the header.
  const mid = lines.find(
    (l, idx) =>
      idx > 0 &&
      idx < 3 &&
      isVocabHeadword(l.text) &&
      l.y > header.y + header.height * 2 &&
      (cleanWord(l.text).toLowerCase().includes(cleanWord(header.text).toLowerCase()) ||
        cleanWord(header.text).toLowerCase().includes(cleanWord(l.text).toLowerCase().slice(0, 12)))
  );

  const defs = lines.filter(
    (l) =>
      l.y > (mid?.y ?? header.y) + 2 &&
      (isSentenceFragment(l.text) || l.text.length > 35 || /^[A-Z][a-z]/.test(l.text))
  );
  if (defs.length < 1) return [];

  // Avoid multi-term glossary pages.
  const otherHeads = lines.filter(
    (l, idx) => idx > 0 && l !== mid && isVocabHeadword(l.text) && l.y > header.y + header.height
  );
  if (otherHeads.filter((h) => h !== mid).length >= 2) return [];

  const word = mid?.text || header.text;
  const top = (mid || header).y - (mid || header).height * 0.4;
  const bottom = Math.max(...defs.map((d) => d.y + d.height)) + 12;
  const left = Math.min(header.x, mid?.x ?? header.x) - 12;
  const right = Math.max(
    pageWidth * 0.92,
    (mid || header).x + (mid || header).width + 24
  );
  const spot = normalizeHotspot(word, left, top, right, bottom, pageWidth, pageHeight);
  return spot ? [spot] : [];
}

/** Vertical stacks: term then definition (and Label: definition). */
function extractFromStackedPairs(
  lines: TextLine[],
  pageWidth: number,
  pageHeight: number
): VocabHotspot[] {
  const hotspots: VocabHotspot[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const labelForm = /^.+:\s*$/.test(line.text) || /^.+:\s+\S+/.test(line.text);
    const head = labelForm
      ? line.text.split(':')[0] + (line.text.includes(':') ? ':' : '')
      : line.text;
    if (!isVocabHeadword(head) && !(labelForm && isVocabHeadword(cleanWord(head)))) continue;
    if (SKIP_TITLE_RE.test(line.text) || SKIP_PAGE_RE.test(line.text)) continue;

    // Definition on same line after colon, or next line(s).
    const afterColon = line.text.includes(':') ? line.text.split(':').slice(1).join(':').trim() : '';
    const next = lines[i + 1];
    const nextIsDef =
      next &&
      next.y - (line.y + line.height) < line.height * 2.2 &&
      Math.abs(next.x - line.x) < Math.max(line.width, 80) &&
      (next.text.length > cleanWord(head).length + 6 || isSentenceFragment(next.text));

    if (!afterColon && !nextIsDef) continue;
    // Skip if this looks like a column title row (neighbors at same y).
    const sameRowHeads = lines.filter(
      (l) =>
        l !== line &&
        Math.abs(l.y - line.y) < line.height * 0.8 &&
        isVocabHeadword(l.text)
    );
    if (sameRowHeads.length >= 1) continue;

    let bottom = line.y + line.height * 2.4;
    if (nextIsDef) {
      bottom = next.y + next.height;
      const next2 = lines[i + 2];
      if (
        next2 &&
        next2.y - (next.y + next.height) < line.height * 1.8 &&
        Math.abs(next2.x - line.x) < Math.max(line.width, 80) &&
        !isVocabHeadword(next2.text)
      ) {
        bottom = next2.y + next2.height;
      }
    }

    const spot = normalizeHotspot(
      head,
      Math.max(0, line.x - 10),
      line.y - line.height * 0.35,
      Math.min(pageWidth, Math.max(line.x + line.width, pageWidth * 0.85)),
      bottom + 8,
      pageWidth,
      pageHeight
    );
    if (spot) hotspots.push(spot);
  }
  return hotspots;
}

function dedupeHotspots(spots: VocabHotspot[]): VocabHotspot[] {
  const out: VocabHotspot[] = [];
  for (const spot of spots) {
    const key = spot.word.toLowerCase();
    const exists = out.find((o) => o.word.toLowerCase() === key);
    if (!exists) {
      out.push(spot);
      continue;
    }
    // Keep the larger click target.
    if (spot.width * spot.height > exists.width * exists.height) {
      out[out.indexOf(exists)] = spot;
    }
  }
  return out.sort((a, b) => a.y - b.y || a.x - b.x);
}

/**
 * Build vocabulary hotspots from viewport-space text boxes.
 * Coordinates are normalized to [0, 1] using pageWidth/pageHeight.
 */
export function extractVocabHotspots(
  items: PdfTextBox[],
  pageWidth: number,
  pageHeight: number
): VocabHotspot[] {
  const boxes = items.filter((i) => i.str.trim());
  const lines = clusterLines(boxes);
  if (!lines.length) return [];

  const fromSentences = extractFromSentenceStructures(lines, pageWidth, pageHeight);

  if (isNonVocabPage(lines)) {
    // Key Sentence Structures + any Meaning cards on overview-style pages.
    const fromMeanings = extractFromMeanings(lines, pageWidth, pageHeight);
    return dedupeHotspots([...fromSentences, ...fromMeanings]);
  }

  const fromMeanings = extractFromMeanings(lines, pageWidth, pageHeight);
  if (fromMeanings.length >= 2) return dedupeHotspots(fromMeanings);

  if (fromSentences.length >= 2) return dedupeHotspots(fromSentences);

  const fromColumns = extractFromTermColumns(lines, pageWidth, pageHeight);
  if (fromColumns.length >= 2) return dedupeHotspots(fromColumns);

  const fromSingle = extractFromSingleTermPage(lines, pageWidth, pageHeight);
  if (fromSingle.length === 1) return fromSingle;

  const fromStacked = extractFromStackedPairs(lines, pageWidth, pageHeight);
  if (fromStacked.length >= 1) return dedupeHotspots(fromStacked);

  if (fromMeanings.length) return dedupeHotspots(fromMeanings);
  if (fromSentences.length) return dedupeHotspots(fromSentences);
  if (fromColumns.length) return dedupeHotspots(fromColumns);
  return [];
}

/**
 * Convert pdf.js text item (PDF space) + viewport transform into a top-left box.
 */
export function textItemToViewportBox(
  str: string,
  itemTransform: number[],
  itemWidth: number,
  itemHeight: number,
  viewportTransform: number[]
): PdfTextBox | null {
  const trimmed = str.trim();
  if (!trimmed) return null;

  const m = multiplyTransform(viewportTransform, itemTransform);
  const fontHeight = Math.max(Math.hypot(m[2], m[3]), itemHeight || 0, 4);
  const scaleX = Math.hypot(m[0], m[1]) || 1;
  // pdf.js `width` is already in text-space units; multiply by horizontal scale only.
  const width = Math.max((itemWidth || trimmed.length * 0.5) * scaleX, fontHeight * 0.3);
  const x = m[4];
  const y = m[5] - fontHeight;

  return {
    str: trimmed,
    x,
    y,
    width,
    height: Math.max(fontHeight, 4),
  };
}

function multiplyTransform(a: number[], b: number[]): number[] {
  return [
    a[0] * b[0] + a[2] * b[1],
    a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3],
    a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4],
    a[1] * b[4] + a[3] * b[5] + a[5],
  ];
}
