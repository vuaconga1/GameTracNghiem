import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const lines = fs.readFileSync(path.join(__dirname, "_reading_lop8_extract.txt"), "utf8").split(/\n/);

const unitStarts = [];
for (let i = 0; i < lines.length; i++) {
  const m = lines[i].match(/^UNIT\s+(\d+)/i);
  if (m) {
    // take first of duplicates
    if (!unitStarts.length || unitStarts[unitStarts.length - 1].unit !== Number(m[1])) {
      unitStarts.push({ unit: Number(m[1]), title: lines[i], i });
      // title may continue on next line
      if (i + 1 < lines.length && !/^UNIT\s+\d+/i.test(lines[i + 1]) && !/^Exercise/i.test(lines[i + 1]) && lines[i + 1].length < 60) {
        // peek: for unit 5/6 title split
      }
    }
  }
}

// enrich titles from following lines
for (const u of unitStarts) {
  const next = lines[u.i + 1] || "";
  if (next && !/^UNIT/i.test(next) && !/^Exercise/i.test(next) && !/^A\.|^B\./.test(next) && next.length < 80) {
    if (/OUR CUSTOMS|LIFESTYLES|VIET NAM|COUNTRYSIDE|CITY/i.test(next) || u.title.endsWith(":")) {
      u.title = (u.title.replace(/:$/, "") + ": " + next).replace(/:\s+:/, ":");
    }
  }
  if (u.unit === 2 && /LIFE IN THE$/.test(u.title)) {
    // look ahead for countryside/city - may not exist as separate line
    u.title = "UNIT 2: LIFE IN THE COUNTRYSIDE (title truncated in extract)";
  }
  if (u.unit === 4) u.title = "UNIT 4: ETHNIC GROUPS OF VIET NAM";
}

function classifyLabel(label) {
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

const exercises = [];
for (let i = 0; i < lines.length; i++) {
  const m = lines[i].match(/^(Exercise\s+\d+)\s*:\s*(.*)$/i);
  if (!m) continue;
  const unit = [...unitStarts].reverse().find((u) => u.i <= i);
  if (!unit) continue;
  const label = lines[i];
  const kind = classifyLabel(label);
  // find end
  let j = i + 1;
  while (j < lines.length && !/^UNIT\s+\d+/i.test(lines[j]) && !/^Exercise\s+\d+\s*:/i.test(lines[j])) j++;
  const body = lines.slice(i, j);
  // count items: lines starting with N. or standalone numbered stems
  let itemCount = 0;
  for (const l of body) {
    if (/^\d+[\.\)]\s/.test(l)) itemCount++;
  }
  // For phonetics where options are one-line "A. x B. y...", count those lines as items if no numbered
  if (itemCount === 0) {
    const optionLines = body.filter((l) => /^A\.\s/.test(l) && /B\./.test(l));
    if (optionLines.length) itemCount = optionLines.length;
  }
  // definition blocks: word then definition lines
  if (kind === "definition_mcq" && itemCount === 0) {
    // heuristic: short lowercase-ish headwords
    const heads = body.filter((l, idx) => idx > 0 && l.length < 40 && !/^[A-D]\./.test(l) && !/^Exercise/.test(l) && !/^\d/.test(l));
    itemCount = Math.max(1, Math.floor(heads.length / 2));
  }

  exercises.push({
    unit: unit.unit,
    unitTitle: unit.title,
    exercise: m[1],
    instruction: m[2].slice(0, 180),
    kind,
    itemCount,
    bodyLines: body.length,
    startLine: i + 1,
    endLine: j,
  });
}

// section markers
const sections = [];
for (let i = 0; i < lines.length; i++) {
  if (/VOCABULARY|PHONETIC|PRONUNCIATION|GRAMMAR|READING|SKILLS/i.test(lines[i]) && lines[i].length < 60) {
    const unit = [...unitStarts].reverse().find((u) => u.i <= i);
    sections.push({ unit: unit?.unit, line: i + 1, text: lines[i] });
  }
}

const byUnit = {};
for (const ex of exercises) {
  byUnit[ex.unit] ??= { title: ex.unitTitle, kinds: {}, exercises: [] };
  byUnit[ex.unit].kinds[ex.kind] = (byUnit[ex.unit].kinds[ex.kind] || 0) + ex.itemCount;
  byUnit[ex.unit].exercises.push(ex);
}

const report = { unitStarts, sections, byUnit, exercises };
fs.writeFileSync(path.join(__dirname, "_reading_lop8_inventory_v2.json"), JSON.stringify(report, null, 2));

console.log("=== SECTIONS ===");
sections.forEach((s) => console.log(s));
console.log("\n=== PER UNIT ===");
for (const [u, data] of Object.entries(byUnit)) {
  console.log(`\nUnit ${u}: ${data.title}`);
  console.log("  kind totals (items):", data.kinds);
  for (const ex of data.exercises) {
    console.log(`  ${ex.exercise} [${ex.kind}] ~${ex.itemCount} items | ${ex.instruction.slice(0, 100)}`);
  }
}

const kindTotals = {};
for (const ex of exercises) {
  kindTotals[ex.kind] = (kindTotals[ex.kind] || 0) + ex.itemCount;
}
console.log("\n=== GLOBAL KIND TOTALS (items) ===", kindTotals);
console.log("exercise blocks:", exercises.length);
