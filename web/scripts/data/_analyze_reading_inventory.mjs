import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const text = fs.readFileSync(path.join(__dirname, "_reading_lop8_extract.txt"), "utf8");
const lines = text.split(/\r?\n/);

const unitRe = /^UNIT\s+(\d+)\s*[:：]/i;
const sectionRe =
  /^(READING|SPEAKING|LISTENING|WRITING|VOCABULARY|GRAMMAR|PRONUNCIATION|PHONETICS|COMMUNICATION|SKILLS|REVIEW)/i;
const exerciseRe = /^(Exercise|Ex\.?|Task|Part)\s*([0-9A-Z]+)?\s*[:.\-–—]?\s*(.*)$/i;
const readingCue =
  /(read the (following )?(passage|text|email|letter|blog|article|conversation|dialogue|notice|advertisement|announcement)|complete the (passage|text)|fill in|true or false|true\/false|match|heading|which of the following|according to the (passage|text)|choose the best answer|questions|comprehension)/i;

const units = [];
let current = null;
let currentSection = null;
let currentExercise = null;

function flushExercise() {
  if (current && currentExercise) {
    current.exercises.push(currentExercise);
    currentExercise = null;
  }
}

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const um = line.match(unitRe);
  if (um) {
    flushExercise();
    // avoid duplicate consecutive UNIT headers
    const n = Number(um[1]);
    if (!current || current.unit !== n || current.startLine !== i) {
      if (current && current.unit === n && i - current.startLine < 3) {
        // duplicate title right after — skip
      } else {
        current = {
          unit: n,
          title: line,
          startLine: i,
          sections: [],
          exercises: [],
          rawHeaders: [],
        };
        units.push(current);
        currentSection = null;
      }
    }
    continue;
  }
  if (!current) continue;

  if (sectionRe.test(line) && line.length < 80) {
    flushExercise();
    currentSection = line;
    current.sections.push(line);
    current.rawHeaders.push({ i, line, kind: "section" });
    continue;
  }

  const em = line.match(exerciseRe);
  if (em) {
    flushExercise();
    currentExercise = {
      unit: current.unit,
      section: currentSection,
      label: line,
      number: em[2] || "",
      instruction: (em[3] || "").trim() || line,
      startLine: i,
      lines: [line],
      sampleLines: [],
    };
    current.rawHeaders.push({ i, line, kind: "exercise" });
    continue;
  }

  if (currentExercise) {
    currentExercise.lines.push(line);
    if (currentExercise.sampleLines.length < 8) currentExercise.sampleLines.push(line);
  }
}

flushExercise();

// classify exercises
function classify(ex) {
  const blob = (ex.label + " " + ex.lines.slice(0, 25).join(" ")).toLowerCase();
  const types = [];
  if (/pronounced differently|underlined part|pronunciation|stress is different|main stress/.test(blob))
    types.push("phonetics");
  if (/true or false|true\/false|t\/f/.test(blob)) types.push("true_false");
  if (/match.*(heading|title|paragraph|statement|column)|match the/.test(blob)) types.push("match");
  if (/fill in|complete the (passage|text|sentences|summary)|gap|blank|missing word/.test(blob))
    types.push("fill_blank");
  if (/choose the (best |correct )?(answer|word|option|sentence)|best fits|multiple choice|a,\s*b,\s*c/.test(blob))
    types.push("mcq");
  if (/read the|passage|according to|comprehension|questions [0-9]/.test(blob)) types.push("reading_comp");
  if (/rearrange|put the (words|sentences)|sentence building/.test(blob)) types.push("rearrange");
  if (/find.*(synonym|antonym|meaning)|closest meaning|odd one out/.test(blob)) types.push("vocab");
  if (/grammar|verb form|correct form|word form/.test(blob)) types.push("grammar_form");
  if (!types.length) types.push("unknown");
  return types;
}

for (const u of units) {
  for (const ex of u.exercises) {
    ex.types = classify(ex);
    // count numbered items roughly
    let items = 0;
    for (const l of ex.lines) {
      if (/^\d+[\.\)]\s/.test(l) || /^[0-9]+\s+[A-D]\./.test(l)) items++;
    }
    ex.approxItems = items;
    ex.hasPassageCue = readingCue.test(ex.lines.join(" "));
    // estimate if long continuous text (passage)
    const longLines = ex.lines.filter((l) => l.length > 120);
    ex.longLineCount = longLines.length;
  }
}

const summary = units.map((u) => ({
  unit: u.unit,
  title: u.title,
  sections: [...new Set(u.sections)],
  exerciseCount: u.exercises.length,
  exercises: u.exercises.map((ex) => ({
    label: ex.label.slice(0, 160),
    section: ex.section,
    types: ex.types,
    approxItems: ex.approxItems,
    lineCount: ex.lines.length,
    longLineCount: ex.longLineCount,
    hasPassageCue: ex.hasPassageCue,
    sample: ex.sampleLines.slice(0, 4),
  })),
}));

const outJson = path.join(__dirname, "_reading_lop8_inventory.json");
fs.writeFileSync(outJson, JSON.stringify(summary, null, 2), "utf8");
console.log("units:", units.length);
for (const u of summary) {
  console.log("\n====", u.title, "exercises:", u.exerciseCount, "sections:", u.sections.join(" | "));
  for (const ex of u.exercises) {
    console.log(
      `  - [${ex.types.join(",")}] items~${ex.approxItems} lines=${ex.lineCount} long=${ex.longLineCount} passCue=${ex.hasPassageCue} :: ${ex.label.slice(0, 120)}`,
    );
  }
}
