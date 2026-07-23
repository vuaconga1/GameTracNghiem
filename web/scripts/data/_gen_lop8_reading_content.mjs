/**
 * Generate lop8-reading-content.json from Reading_Lop8.docx (unzipped XML).
 *
 * Usage:
 *   node scripts/data/_gen_lop8_reading_content.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const XML_PATH = path.join(__dirname, "_reading_unzip", "word", "document.xml");
const OUT_PATH = path.join(__dirname, "lop8-reading-content.json");

const TITLE_BY_KIND = {
  phonetics_sound: "Phát âm khác",
  phonetics_stress: "Trọng âm khác",
  vocab_grammar_mcq: "Chọn đáp án đúng",
  synonym_mcq: "Từ gần nghĩa",
  antonym_mcq: "Từ trái nghĩa",
  circle_options: "Chọn dạng đúng",
  definition_mcq: "Chọn định nghĩa",
  article_correction: "Sửa mạo từ",
};

function wordCount(s) {
  return String(s || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function decodeXml(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function paraText(chunk) {
  let t = "";
  for (const run of chunk.matchAll(/<w:r[\s\S]*?<\/w:r>/g)) {
    const u = /<w:u[\s/>]/.test(run[0]);
    const tx = [...run[0].matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)]
      .map((x) => decodeXml(x[1]))
      .join("");
    if (!tx) continue;
    t += u ? `<u>${tx}</u>` : tx;
  }
  return t.replace(/\s+/g, " ").trim();
}

function cellParas(cellXml) {
  return [...cellXml.matchAll(/<w:p[\s\S]*?<\/w:p>/g)]
    .map((p) => paraText(p[0]))
    .filter(Boolean);
}

function parseTable(chunk) {
  return [...chunk.matchAll(/<w:tr[\s\S]*?<\/w:tr>/g)].map((row) =>
    [...row[0].matchAll(/<w:tc[\s\S]*?<\/w:tc>/g)].map((c) => cellParas(c[0]))
  );
}

function topLevelChildren(bodyXml) {
  const children = [];
  const re = /<(w:tbl|w:p)([\s>])/g;
  let m;
  const tableRanges = [];
  while ((m = re.exec(bodyXml))) {
    const tag = m[1];
    const start = m.index;
    if (tableRanges.some((r) => start > r.start && start < r.end)) continue;
    const endTag = tag === "w:tbl" ? "</w:tbl>" : "</w:p>";
    const end = bodyXml.indexOf(endTag, start);
    if (end < 0) continue;
    const endPos = end + endTag.length;
    if (tag === "w:tbl") tableRanges.push({ start, end: endPos });
    children.push({ tag, chunk: bodyXml.slice(start, endPos) });
  }
  return children;
}

function classify(label) {
  const l = label.toLowerCase();
  if (/pronounced differently|underlined part/.test(l)) return "phonetics_sound";
  if (/main stress|stress is different/.test(l)) return "phonetics_stress";
  if (/closest in meaning/.test(l)) return "synonym_mcq";
  if (/opposite in meaning/.test(l)) return "antonym_mcq";
  if (/circle the correct options/.test(l)) return "circle_options";
  if (/correct meaning of the following words/.test(l)) return "definition_mcq";
  if (/correct the mistaken articles/.test(l)) return "article_correction";
  if (/best fits the space|best answers the question/.test(l)) return "vocab_grammar_mcq";
  return "other";
}

function stripHtml(s) {
  return String(s || "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeOpt(s) {
  return String(s || "")
    .replace(/^[A-Da-d][\.\)\:]\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Parse "A. x B. y C. z D. w" (A. optional) into up to 4 options. */
function parseInlineOptions(line) {
  let raw = String(line || "").trim();
  if (!raw) return null;
  // Drop leading item numbers: "1. A. mouse" / "10. A. ..."
  raw = raw.replace(/^\d+[\.\)]\s+/, "");
  // Must look like options
  if (!/(?:^|\s)B\.\s/.test(raw) && !/^[A-D]\.\s/.test(raw)) return null;

  // Normalize missing A. — "knit B. surf C. message D. relax"
  let text = raw;
  if (!/^[A-D]\.\s/.test(text) && /(?:^|\s)B\.\s/.test(text)) {
    text = `A. ${text}`;
  }

  const splitRe = /(?:^|\s)([A-D])\.\s+/g;
  const marks = [];
  let sm;
  while ((sm = splitRe.exec(text))) {
    marks.push({ letter: sm[1], at: sm.index, len: sm[0].length });
  }
  if (marks.length < 2) return null;

  const parts = [];
  for (let i = 0; i < marks.length; i++) {
    const start = marks[i].at + marks[i].len;
    const end = i + 1 < marks.length ? marks[i + 1].at : text.length;
    const opt = text.slice(start, end).trim();
    if (opt) parts.push(normalizeOpt(opt));
  }
  if (parts.length < 2) return null;
  // Guard against accidental object coercion bugs
  return parts.filter((p) => typeof p === "string" && p && p !== "[object Object]");
}

function isStemLine(line) {
  const t = stripHtml(line);
  if (!t) return false;
  if (/^Exercise\s+\d+/i.test(t)) return false;
  if (parseInlineOptions(t) && !/_{3,}|_______/.test(t) && t.length < 80 && !/^\d+[\.\)]/.test(t)) {
    // pure options line
    return false;
  }
  if (/^[A-D]\.\s/.test(t) && /\bB\.\s/.test(t) && !/_{3,}/.test(t) && t.length < 120) {
    return false;
  }
  // glossary noise
  if (/^\w+:\s+.+\(/.test(t) && t.length < 80) return false;
  return (
    /_{3,}|_______/.test(t) ||
    /^\d+[\.\)]\s/.test(t) ||
    /<u>/.test(line) ||
    (t.length > 25 && !/^[A-D]\.\s/.test(t))
  );
}

function cleanStem(line) {
  return String(line || "")
    .replace(/^\d+[\.\)]\s*/, "")
    .replace(/<u>([.,;:!?\s]+)<\/u>/gi, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function looksLikePhoneticsLine(line) {
  const opts = parseInlineOptions(line);
  if (!opts || opts.length < 3) return false;
  // short words typical of phonetics
  return opts.every((o) => stripHtml(o).split(/\s+/).length <= 3) && stripHtml(line).length < 160;
}

/** Reconstruct scrambled MC table rows into {stem, options}[]. */
function reconstructScrambledTable(rows, pendingStem) {
  const items = [];
  let stem = pendingStem ? cleanStem(pendingStem) : null;

  for (const row of rows) {
    const cells = row.map((paras) => paras.slice());
    const flat = cells.flat();
    let nextStem = null;
    const optionBits = [];

    for (const cellParasList of cells) {
      for (const p of cellParasList) {
        const plain = stripHtml(p);
        if (/^\d+[\.\)]\s/.test(plain) || (isStemLine(p) && !parseInlineOptions(p))) {
          nextStem = cleanStem(p);
        } else {
          const opts = parseInlineOptions(p);
          if (opts) optionBits.push(...opts);
          else if (/^[A-D]\.\s*/.test(plain)) optionBits.push(normalizeOpt(p));
          else if (plain && !nextStem && /_{3,}/.test(plain)) nextStem = cleanStem(p);
        }
      }
    }

    // Deduce: if first cell has ABC+stem and second has D
    if (cells.length >= 2) {
      const left = cells[0];
      const rightFlat = cells.slice(1).flat();
      let leftOpts = [];
      let leftStem = null;
      for (const p of left) {
        const opts = parseInlineOptions(p);
        if (opts) leftOpts.push(...opts);
        else if (/^\d+[\.\)]\s/.test(stripHtml(p)) || (isStemLine(p) && !/^[A-D]\./.test(stripHtml(p)))) {
          leftStem = cleanStem(p);
        } else if (/^[A-D]\.\s*/.test(stripHtml(p))) leftOpts.push(normalizeOpt(p));
      }
      const rightOpts = [];
      for (const p of rightFlat) {
        const opts = parseInlineOptions(p);
        if (opts) rightOpts.push(...opts);
        else if (/^[A-D]\.\s*/.test(stripHtml(p))) rightOpts.push(normalizeOpt(p));
        else if (/^\d+[\.\)]\s/.test(stripHtml(p))) leftStem = leftStem || cleanStem(p);
      }
      const options = [...leftOpts, ...rightOpts].map(normalizeOpt).filter(Boolean);
      // unique preserve order
      const uniq = [];
      for (const o of options) {
        if (!uniq.some((x) => stripHtml(x).toLowerCase() === stripHtml(o).toLowerCase())) uniq.push(o);
      }
      if (stem && uniq.length >= 2) {
        items.push({ question: stem, options: uniq.slice(0, 4) });
        stem = leftStem;
      } else if (leftStem && uniq.length >= 2 && !stem) {
        // shouldn't emit yet
        stem = leftStem;
      } else {
        stem = leftStem || stem;
      }
      continue;
    }

    // single-cell fallback
    if (stem && optionBits.length >= 2) {
      items.push({ question: stem, options: optionBits.slice(0, 4) });
      stem = nextStem;
    } else {
      stem = nextStem || stem;
    }
  }

  return { items, pendingStem: stem };
}

function parsePhoneticsTable(rows) {
  const items = [];
  for (const row of rows) {
    // Prefer per-cell: "1. A. word" | "B. word" | "C. word" | "D. word"
    const cells = row.map((paras) => paras.join(" ").trim()).filter(Boolean);
    let opts = null;
    if (cells.length >= 3) {
      opts = cells.map((c) => normalizeOpt(c.replace(/^\d+[\.\)]\s+/, "").replace(/^[A-D]\.\s+/, "")));
      // If a cell still embeds multiple options, fall back to inline parse
      if (opts.some((o) => /\bB\.\s/.test(o)) || opts.some((o) => !o)) {
        opts = parseInlineOptions(cells.join(" "));
      }
    } else {
      opts = parseInlineOptions(cells.join(" "));
    }
    if (opts && opts.length >= 3) {
      items.push({
        options: opts.slice(0, 4).filter((o) => typeof o === "string" && stripHtml(o).length > 0),
      });
    }
  }
  return items.filter((it) => it.options.length >= 3);
}

function parsePhoneticsParas(paras) {
  const items = [];
  for (const p of paras) {
    if (!looksLikePhoneticsLine(p) && !parseInlineOptions(p)) continue;
    const opts = parseInlineOptions(p);
    if (opts && opts.length >= 3 && opts.every((o) => stripHtml(o).split(/\s+/).length <= 4)) {
      // skip if looks like vocab (long options)
      if (opts.some((o) => stripHtml(o).length > 40)) continue;
      items.push({ options: opts.slice(0, 4) });
    }
  }
  return items;
}

/** Walk paras+tables in order for vocab-like MC. */
function extractMcFromBlock(block) {
  const items = [];
  // Re-walk isn't available; use paras then tables with heuristics.

  // Pair consecutive stem/options in paras first, collecting unpaired stems
  const pendingStems = [];
  let i = 0;
  const paras = block.paras;

  while (i < paras.length) {
    const line = paras[i];
    const opts = parseInlineOptions(line);
    if (opts && !isStemLine(line)) {
      // orphan options — attach to last pending
      if (pendingStems.length) {
        const stem = pendingStems.pop();
        items.push({ question: stem, options: opts.slice(0, 4) });
      }
      i++;
      continue;
    }
    if (isStemLine(line)) {
      const stem = cleanStem(line);
      const next = paras[i + 1];
      const nextOpts = next ? parseInlineOptions(next) : null;
      if (nextOpts && !isStemLine(next)) {
        items.push({ question: stem, options: nextOpts.slice(0, 4) });
        i += 2;
        continue;
      }
      // stem may belong to following table
      pendingStems.push(stem);
      i++;
      continue;
    }
    i++;
  }

  // Tables
  let pending = pendingStems.length ? pendingStems.shift() : null;
  for (const table of block.tables) {
    const cols = Math.max(...table.map((r) => r.length));
    // Phonetics-style 4-col already handled elsewhere
    if (cols >= 4 && table.every((r) => r.length >= 4)) {
      for (const row of table) {
        const opts = parseInlineOptions(row.flat().join(" "));
        if (opts) items.push({ question: "Chọn đáp án đúng", options: opts.slice(0, 4) });
      }
      continue;
    }
    const { items: tItems, pendingStem } = reconstructScrambledTable(table, pending);
    items.push(...tItems);
    pending = pendingStem;
    // remaining pendingStems for next table
    if (!pending && pendingStems.length) pending = pendingStems.shift();
  }

  // leftover pending stems without options — drop
  return items.filter((it) => it.options && it.options.length >= 2);
}

function extractCircle(block) {
  const items = [];
  for (let i = 0; i < block.paras.length; ) {
    const stem = block.paras[i];
    const next = block.paras[i + 1];
    if (!next) break;
    const opts = parseInlineOptions(next) || parseInlineOptions(`A. ${next.replace(/\s+B\.\s/, " B. ")}`);
    // "communal house B. folk dance" → 2 opts
    let options = parseInlineOptions(next);
    if (!options) {
      const m = next.match(/^(.+?)\s+B\.\s+(.+)$/);
      if (m) options = [m[1].replace(/^A\.\s*/, "").trim(), m[2].trim()];
    }
    if (options && options.length >= 2 && isStemLine(stem)) {
      items.push({ question: cleanStem(stem), options: options.slice(0, 4) });
      i += 2;
    } else {
      i++;
    }
  }
  return items;
}

function isDefinitionHead(line) {
  const t = stripHtml(line).replace(/^\d+\.\s*/, "").trim();
  if (!t || t.length > 40) return false;
  if (/^[A-D]\./.test(t)) return false;
  if (/^(a|an|the|something|good|living|working|being|performing|competing|making|an occasion)\b/i.test(t)) {
    return false;
  }
  return t.split(/\s+/).length <= 4;
}

function extractDefinitions(block) {
  const items = [];
  const lines = block.paras.map((p) => p.trim()).filter(Boolean);
  let i = 0;
  while (i < lines.length) {
    if (!isDefinitionHead(lines[i])) {
      i++;
      continue;
    }
    const word = stripHtml(lines[i]).replace(/^\d+\.\s*/, "").trim();
    const defs = [];
    i++;
    while (i < lines.length && defs.length < 4) {
      const L = lines[i];
      if (isDefinitionHead(L) && defs.length >= 2) break;
      if (isDefinitionHead(L) && defs.length === 0) break;
      // "def ... C. other def"
      const withC = L.split(/\s+C\.\s+/);
      if (withC.length === 2 && withC[0].length > 20) {
        defs.push(withC[0].replace(/^[A-D]\.\s*/, "").trim());
        defs.push(withC[1].trim());
        i++;
        continue;
      }
      // Trailing "5. ornamental tree" glued onto previous def
      const glued = L.match(/^(.*?)\s+\d+\.\s+(.+)$/);
      if (glued && glued[1].length > 20 && isDefinitionHead(glued[2])) {
        defs.push(glued[1].replace(/^[A-D]\.\s*/, "").trim());
        // push current defs item, then continue from head glued[2]
        break;
      }
      defs.push(L.replace(/^[A-D]\.\s*/, "").trim());
      i++;
    }
    if (defs.length >= 2) {
      items.push({
        question: `Chọn định nghĩa đúng của “${word}”.`,
        options: defs.slice(0, 4),
        _headword: word,
      });
    }
  }
  return items;
}

function extractArticles(block) {
  const items = [];
  const text = block.paras.join(" ");
  const parts = text.split(/(?=\d+\.\s)/).map((s) => s.trim()).filter(Boolean);
  for (const part of parts) {
    const m = part.match(/^\d+\.\s+(.+)$/);
    const sentence = (m ? m[1] : part).trim();
    if (sentence.length < 10) continue;
    const corrected = correctArticleSentence(sentence);
    items.push({
      type: "fill_blank",
      question: `Sửa mạo từ: ${sentence}`,
      options: [],
      answer: corrected.answer,
      accept: corrected.accept,
      uncertain: corrected.uncertain,
    });
  }
  return items;
}

function correctArticleSentence(s) {
  let out = s;
  const fixes = [
    [/a important/gi, "an important"],
    [/the sugar is not/gi, "sugar is not"],
    [/by a plane/gi, "by plane"],
    [/a most beautiful/gi, "the most beautiful"],
    [/in the Viet Nam/gi, "in Viet Nam"],
    [/an half/gi, "a half"],
    [/an good/gi, "a good"],
    [/in a summer/gi, "in the summer"],
    [/in a morning/gi, "in the morning"],
    [/^Rich are/gi, "The rich are"],
  ];
  let changed = false;
  for (const [re, rep] of fixes) {
    if (re.test(out)) {
      out = out.replace(re, rep);
      changed = true;
    }
  }
  return { answer: out, accept: [out], uncertain: !changed };
}

// ---------- Answer heuristics ----------

const STRESS_ULTIMATE = new Set([
  "prefer", "detest", "enjoy", "adore", "collect", "unique", "disturb", "expect",
  "volunteer", "museum", "vacation", "canoeing", "protection", "addicted", "computer",
  "especially", "community", "activity", "absolutely", "nomadic", "traditional",
]);

function underlineParts(opt) {
  const parts = [];
  for (const m of String(opt).matchAll(/<u>(.*?)<\/u>/gi)) parts.push(m[1].toLowerCase());
  return parts;
}

function derivePhoneticsSound(options) {
  const byWord = derivePhoneticsSoundByWord(options);
  if (!byWord.uncertain) return byWord;

  const keys = options.map((o) => {
    const u = underlineParts(o);
    return u.length ? u.join("") : stripHtml(o).toLowerCase();
  });
  const freq = new Map();
  for (const k of keys) freq.set(k, (freq.get(k) || 0) + 1);
  const uniqueCount = [...freq.values()].filter((v) => v === 1).length;
  // Only trust odd-grapheme when exactly one unique key and others share
  if (uniqueCount === 1 && freq.size === 2) {
    const odd = keys.find((k) => freq.get(k) === 1);
    return { answer: options[keys.indexOf(odd)], uncertain: false };
  }
  return byWord;
}

function derivePhoneticsSoundByWord(options) {
  const words = options.map((o) => stripHtml(o).toLowerCase());
  // Very small curated odd-one maps for common textbook sets
  const sets = [
    [["mouse", "house", "would", "outdoors"], "would"],
    [["ear", "clear", "hear", "bear"], "bear"],
    [["leisure", "eight", "celebrate", "penalty"], "leisure"],
    [["worked", "watched", "needed", "walked"], "needed"],
    [["beat", "heat", "cheat", "break"], "break"],
    [["pictures", "watches", "buses", "brushes"], "pictures"],
    [["bracelet", "cake", "make", "hat"], "hat"],
    [["comedy", "letter", "princess", "cinema"], "letter"],
    [["sure", "sort", "soy", "soon"], "sure"],
    [["homework", "mother", "open", "judo"], "mother"],
  ];
  for (const [group, ans] of sets) {
    if (group.every((w) => words.includes(w))) {
      const idx = words.indexOf(ans);
      return { answer: options[idx], uncertain: false };
    }
  }
  return { answer: options[0], uncertain: true, note: "phonetics sound fallback" };
}

function derivePhoneticsStress(options) {
  const words = options.map((o) => stripHtml(o).toLowerCase());
  // Prefer option whose stress pattern differs — heuristic: words with stress on 2nd syllable among 1st-stress peers
  const curated = [
    [["relaxing", "traveling", "visiting", "listening"], "relaxing"],
    [["dislike", "detest", "fancy", "prefer"], "fancy"],
    [["library", "museum", "melody", "favourite"], "museum"],
    [["protection", "addicted", "computer", "goldfish"], "goldfish"],
    [["volleyball", "weather", "winter", "vacation"], "vacation"],
    [["climbing", "canoeing", "cricket", "cycling"], "canoeing"],
    [["computer", "protection", "volunteer", "museum"], "volunteer"],
    [["adore", "enjoy", "prefer", "listen"], "listen"],
    [["especially", "community", "activity", "absolutely"], "absolutely"],
    [["skateboard", "sticker", "adore", "leisure"], "adore"],
  ];
  for (const [group, ans] of curated) {
    if (group.every((w) => words.includes(w))) {
      return { answer: options[words.indexOf(ans)], uncertain: false };
    }
  }
  // heuristic: pick the one with different vowel-count stress guess
  const scores = words.map((w) => (STRESS_ULTIMATE.has(w) || /tion$|sion$|ic$/.test(w) ? 2 : 1));
  const freq = new Map();
  for (const s of scores) freq.set(s, (freq.get(s) || 0) + 1);
  const oddScore = scores.find((s) => freq.get(s) === 1);
  if (oddScore != null && freq.size > 1) {
    return { answer: options[scores.indexOf(oddScore)], uncertain: true, note: "stress heuristic" };
  }
  return { answer: options[0], uncertain: true, note: "stress fallback" };
}

function deriveSynonym(question, options) {
  const q = stripHtml(question).toLowerCase();
  const opts = options.map((o) => stripHtml(o).toLowerCase());
  const underlined = (question.match(/<u>(.*?)<\/u>/gi) || [])
    .map((x) => stripHtml(x).toLowerCase())
    .join(" ");
  const target = underlined || "";

  const map = {
    hates: "detests",
    satisfied: "pleased",
    enjoy: "like",
    "free time": "leisure time",
    certain: "sure",
    notification: "notice",
    pressure: "stress",
    teenagers: "youths",
    posting: "uploading",
    concentrate: "focus",
    accepted: "agreed",
    unity: "bond",
    disrespectful: "impolite",
    follow: "pursue",
    strictly: "severely",
  };
  for (const [k, v] of Object.entries(map)) {
    if (target.includes(k) || q.includes(k)) {
      const idx = opts.findIndex((o) => o === v || o.includes(v));
      if (idx >= 0) return { answer: options[idx], uncertain: false };
    }
  }
  return { answer: options[0], uncertain: true, note: "synonym fallback" };
}

function deriveAntonym(question, options) {
  const underlined = (question.match(/<u>(.*?)<\/u>/gi) || [])
    .map((x) => stripHtml(x).toLowerCase())
    .join(" ");
  const map = {
    new: "old",
    harmful: "harmless",
    fancy: "hate",
    like: "dislike",
    good: "bad",
  };
  const opts = options.map((o) => stripHtml(o).toLowerCase());
  for (const [k, v] of Object.entries(map)) {
    if (underlined.includes(k)) {
      const idx = opts.findIndex((o) => o === v);
      if (idx >= 0) return { answer: options[idx], uncertain: false };
    }
  }
  return { answer: options[0], uncertain: true, note: "antonym fallback" };
}

function deriveVocab(question, options) {
  const q = stripHtml(question).toLowerCase();
  const opts = options.map((o) => stripHtml(String(o)));
  const low = opts.map((o) => o.toLowerCase());
  if (!opts.length) return { answer: "", uncertain: true, note: "no options" };

  const rules = [
    [/tik tok/, ["surf", "surfs"]],
    [/_______ the internet|surfs? the internet/, ["surf", "surfs"]],
    [/her own/, ["on"]],
    [/usually _{3,} my friends|_{3,} my friends whenever/, ["message"]],
    [/beach _{3,}/, ["resort"]],
    [/knitting _{3,}/, ["kit"]],
    [/art of _{3,}/, ["paper folding"]],
    [/build _{3,} and increase/, ["muscle"]],
    [/interested _{3,}/, ["in"]],
    [/fond _{3,}/, ["of"]],
    [/shorter working hours and more/, ["leisure time"]],
    [/dress looks so/, ["fancy"]],
    [/things in _{3,}/, ["common"]],
    [/visiting _{3,} increases/, ["museums"]],
    [/prefer travelling.*_{3,} travelling/, ["to"]],
    [/watch tv _{3,}/, ["in"]],
    [/leisure activity _{3,} teenagers/, ["for"]],
    [/going out _{3,}/, ["with"]],
    [/fancy _{3,} origami/, ["making"]],
    [/detest _{3,} fish/, ["eating"]],
    [/loves _{3,} with his new pen/, ["chatting", "to chat"]],
    [/did you _{3,} listening/, ["adore"]],
    [/don.?t mind _{3,} english/, ["reading"]],
    [/minh _{3,} to play football/, ["likes"]],
    [/fancy _{3,} museums/, ["visiting"]],
    [/mum _{3,} watching/, ["enjoys"]],
    [/enjoys _{3,} to music/, ["listening"]],
    [/love _{3,} very much.*flower/, ["doing gardening"]],
    [/avoid _{3,} too much tv/, ["watching"]],
    [/likes _{3,} with her close friend|window/, ["window shopping"]],
    [/love _{3,} front of the computer/, ["sitting"]],
    [/mind _{3,} a lot of homework/, ["doing"]],
    [/fancy _{3,} around the west lake/, ["going"]],
    [/don.?t like _{3,} up early|love _{3,} in bed/, ["getting / staying"]],
    [/likes _{3,} spring rolls/, ["making"]],
    [/very _{3,} to watch these movies/, ["entertaining"]],
    [/make you feel _{3,}/, ["comfortable"]],
    [/was a great _{3,}/, ["activist"]],
    [/his _{3,} of basketball/, ["knowledge"]],
    [/room for _{3,}/, ["improvement"]],
    [/drying rice|ly nhon/, ["drying rice"]],
    [/plant _{3,} suitable for saline/, ["orchards"]],
    [/houses with _{3,} architecture/, ["ancient"]],
    [/experience of _{3,} cows/, ["milking"]],
    [/green rice _{3,}/, ["fields"]],
    [/boxes into the trucks/, ["loaded"]],
  ];

  for (const [re, answers] of rules) {
    if (re.test(q)) {
      for (const a of answers) {
        const idx = low.findIndex((o) => o === a.toLowerCase());
        if (idx >= 0) return { answer: options[idx], uncertain: false };
      }
    }
  }

  // gerund after enjoy/fancy/mind/avoid/adore/detest
  if (/(enjoy|fancy|mind|avoid|adore|detest|dislike|prefer)\b/i.test(q)) {
    const gerundIdxs = low
      .map((o, idx) => (/ing$/i.test(o) && !/^to /i.test(o) ? idx : -1))
      .filter((idx) => idx >= 0);
    if (gerundIdxs.length === 1) {
      return { answer: options[gerundIdxs[0]], uncertain: true, note: "gerund heuristic" };
    }
  }

  return { answer: options[0], uncertain: true, note: "vocab fallback" };
}

function deriveDefinition(item) {
  const word = (item._headword || "").toLowerCase();
  const opts = item.options;
  const low = opts.map((o) => stripHtml(o).toLowerCase());
  const map = {
    custom: /behaving|belief|established/,
    luck: /chance|good things/,
    longevity: /living for a long time/,
    decoration: /more attractive|putting things/,
    "ornamental tree": /decoration/,
    "family reunion": /members of family|get together/,
  };
  for (const [k, re] of Object.entries(map)) {
    if (word.includes(k) || k.includes(word)) {
      const idx = low.findIndex((o) => re.test(o));
      if (idx >= 0) return { answer: opts[idx], uncertain: false };
    }
  }
  return { answer: opts[0], uncertain: true, note: "definition fallback" };
}

function deriveCircle(question, options) {
  const q = stripHtml(question).toLowerCase();
  const low = options.map((o) => stripHtml(o).toLowerCase());
  const rules = [
    [/bamboo dancing/, "folk dance"],
    [/dan tinh/, "a musical instrument"],
    [/stilt house that is built/, "high posts"],
    [/largest and tallest/, "communal house"],
    [/climb a __________ to enter/, "staircase"],
    [/kinh use __________ to make/, "sticky rice"],
  ];
  for (const [re, ans] of rules) {
    if (re.test(q)) {
      const idx = low.findIndex((o) => o.includes(ans) || ans.includes(o));
      if (idx >= 0) return { answer: options[idx], uncertain: false };
    }
  }
  return { answer: options[0], uncertain: true, note: "circle fallback" };
}

function mcItem({ exercise, question, options, answer, accept, fillMode = false, type = "multiple_choice" }) {
  return {
    game: "quiz",
    type,
    typeLabel: type === "fill_blank" ? "Điền từ" : "Trắc nghiệm",
    skill: "reading",
    exercise,
    question,
    options: options || [],
    answer,
    accept: accept || [answer],
    fillMode: fillMode || type !== "multiple_choice",
  };
}

function buildBlocks() {
  const xml = fs.readFileSync(XML_PATH, "utf8");
  const body = xml.match(/<w:body[\s\S]*<\/w:body>/)?.[0] || "";
  const children = topLevelChildren(body);
  const blocks = [];
  let unit = 0;
  let current = null;
  const flush = () => {
    if (current) blocks.push(current);
    current = null;
  };

  for (const child of children) {
    if (child.tag === "w:p") {
      const text = paraText(child.chunk);
      if (!text) continue;
      const um = text.match(/^UNIT\s+(\d+)/i);
      if (um) {
        flush();
        unit = Number(um[1]);
        continue;
      }
      if (/VOCABULARY|PHONETIC|^A\.\s*PHONETIC|^B\.\s*VOCAB/i.test(text) && text.length < 80) continue;
      const em = text.match(/^(Exercise\s+\d+)\s*:\s*(.*)$/i);
      if (em) {
        flush();
        current = {
          unit,
          exercise: em[1],
          kind: classify(text),
          instruction: em[2],
          paras: [],
          tables: [],
        };
        const after = em[2];
        const inlineItem = after.match(/\b(\d+)\.\s+(.+)/);
        if (inlineItem && /closest|opposite/i.test(after)) {
          current.paras.push(`${inlineItem[1]}. ${inlineItem[2]}`);
        }
        continue;
      }
      if (current) current.paras.push(text);
    } else if (child.tag === "w:tbl" && current) {
      current.tables.push(parseTable(child.chunk));
    }
  }
  flush();
  return blocks;
}

function processBlock(block, uncertainLog) {
  const title = TITLE_BY_KIND[block.kind];
  if (!title || block.kind === "other") return [];
  if (wordCount(title) > 6) throw new Error(`Title too long: ${title}`);

  const out = [];
  const pushMc = (question, options, derived, extra = {}) => {
    if (!options || options.length < 2) return;
    const answer = derived.answer;
    if (!options.some((o) => stripHtml(o) === stripHtml(answer) || o === answer)) {
      uncertainLog.push({
        unit: block.unit,
        exercise: title,
        reason: "answer not in options",
        question: stripHtml(question).slice(0, 80),
      });
    }
    if (derived.uncertain) {
      uncertainLog.push({
        unit: block.unit,
        exercise: title,
        reason: derived.note || "uncertain",
        question: stripHtml(question).slice(0, 80),
        answer: stripHtml(answer),
      });
    }
    out.push(
      mcItem({
        exercise: title,
        question,
        options,
        answer,
        accept: [answer, stripHtml(answer)].filter((v, i, a) => a.indexOf(v) === i),
        ...extra,
      })
    );
  };

  if (block.kind === "phonetics_sound" || block.kind === "phonetics_stress") {
    let raw = [];
    for (const table of block.tables) raw.push(...parsePhoneticsTable(table));
    if (!raw.length) raw = parsePhoneticsParas(block.paras);
    const prompt =
      block.kind === "phonetics_sound"
        ? "Chọn từ có phần gạch chân phát âm khác."
        : "Chọn từ có trọng âm khác.";
    for (const row of raw) {
      const derived =
        block.kind === "phonetics_sound"
          ? derivePhoneticsSound(row.options)
          : derivePhoneticsStress(row.options);
      pushMc(prompt, row.options, derived);
    }
    return out;
  }

  if (block.kind === "circle_options") {
    for (const it of extractCircle(block)) {
      pushMc(it.question, it.options, deriveCircle(it.question, it.options));
    }
    return out;
  }

  if (block.kind === "definition_mcq") {
    for (const it of extractDefinitions(block)) {
      pushMc(it.question, it.options, deriveDefinition(it));
    }
    return out;
  }

  if (block.kind === "article_correction") {
    for (const it of extractArticles(block)) {
      if (it.uncertain) {
        uncertainLog.push({
          unit: block.unit,
          exercise: title,
          reason: "article correction uncertain",
          question: it.question.slice(0, 80),
        });
      }
      out.push(
        mcItem({
          exercise: title,
          question: it.question,
          options: [],
          answer: it.answer,
          accept: it.accept,
          type: "fill_blank",
          fillMode: true,
        })
      );
    }
    return out;
  }

  // synonym / antonym / vocab
  const items = extractMcFromBlock(block);
  for (const it of items) {
    let question = it.question;
    if (block.kind === "phonetics_sound") continue;
    if (block.kind === "synonym_mcq" || block.kind === "antonym_mcq") {
      // keep underlines
    } else if (!question || question === "Chọn đáp án đúng") {
      question = it.question;
    }
    const derived =
      block.kind === "synonym_mcq"
        ? deriveSynonym(question, it.options)
        : block.kind === "antonym_mcq"
          ? deriveAntonym(question, it.options)
          : deriveVocab(question, it.options);
    pushMc(question, it.options, derived);
  }
  return out;
}

function main() {
  if (!fs.existsSync(XML_PATH)) {
    console.error("Missing", XML_PATH, "— run _extract_reading_docx.mjs first");
    process.exit(1);
  }

  const blocks = buildBlocks();
  const units = {};
  const uncertainLog = [];
  const skipped = [];
  const perUnitTitles = {};

  for (const block of blocks) {
    if (!block.unit || block.unit < 1 || block.unit > 6) continue;
    if (block.kind === "other") {
      skipped.push({ unit: block.unit, reason: "unclassified", item: block.instruction.slice(0, 80) });
      continue;
    }
    const items = processBlock(block, uncertainLog);
    if (!items.length) {
      skipped.push({
        unit: block.unit,
        reason: "no items parsed",
        item: `${block.exercise} [${block.kind}]`,
      });
      continue;
    }
    units[String(block.unit)] ??= [];
    units[String(block.unit)].push(...items);
    perUnitTitles[block.unit] ??= {};
    const t = items[0].exercise;
    perUnitTitles[block.unit][t] = (perUnitTitles[block.unit][t] || 0) + items.length;
  }

  const out = {
    generatedAt: new Date().toISOString(),
    source: "PDF/Reading_Lop8.docx",
    units,
    skipped,
    uncertain: uncertainLog,
    titles: perUnitTitles,
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2), "utf8");

  console.log("Wrote", OUT_PATH);
  let total = 0;
  for (let u = 1; u <= 6; u++) {
    const list = units[String(u)] || [];
    total += list.length;
    console.log(`\nUnit ${u}: ${list.length} items`);
    const titles = perUnitTitles[u] || {};
    for (const [t, n] of Object.entries(titles)) {
      console.log(`  - ${t}: ${n} (words=${wordCount(t)})`);
    }
  }
  console.log("\nTOTAL", total);
  console.log("Uncertain", uncertainLog.length);
  console.log("Skipped", skipped.length);
  for (const s of skipped) console.log(" ", s);
}

main();
