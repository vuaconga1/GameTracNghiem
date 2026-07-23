import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const xml = fs.readFileSync(path.join(__dirname, "_reading_unzip", "word", "document.xml"), "utf8");
const lines = fs.readFileSync(path.join(__dirname, "_reading_lop8_extract.txt"), "utf8").split(/\n/);

const partHits = [];
for (const m of xml.matchAll(/PART[\s.]+[IVX0-9]+[^<]{0,50}/gi)) {
  partHits.push(m[0].replace(/\s+/g, " ").slice(0, 80));
}
console.log("PART in xml raw:", [...new Set(partHits)]);

// Estimate blanks: lines with _______ that are stems
function estimateVocabItems(start, end) {
  const body = lines.slice(start, end);
  const blankStems = body.filter((l) => /_{3,}|_______/.test(l) && !/^[A-D]\./.test(l) && !/^Exercise/i.test(l));
  const numbered = [...new Set(body.map((l) => {
    const m = l.match(/^(\d+)[\.\)]/);
    return m ? Number(m[1]) : null;
  }).filter(Boolean))];
  return { blankStems: blankStems.length, numberedUnique: numbered.length, numMin: numbered.length ? Math.min(...numbered) : null, numMax: numbered.length ? Math.max(...numbered) : null };
}

const inv = JSON.parse(fs.readFileSync(path.join(__dirname, "_reading_lop8_inventory_v2.json"), "utf8"));
console.log("\nBetter vocab estimates:");
for (const ex of inv.exercises.filter((e) => e.kind === "vocab_grammar_mcq")) {
  console.log("U" + ex.unit, estimateVocabItems(ex.startLine - 1, ex.endLine));
}

// U4 circle options sample
const circle = inv.exercises.find((e) => e.kind === "circle_options");
console.log("\nU4 circle body:");
console.log(lines.slice(circle.startLine - 1, circle.endLine).join("\n"));

// U3 synonym/antonym bodies
for (const ex of inv.exercises.filter((e) => e.unit === 3 && (e.kind === "synonym_mcq" || e.kind === "antonym_mcq"))) {
  console.log("\nU3", ex.kind, "body:");
  console.log(lines.slice(ex.startLine - 1, ex.endLine).join("\n"));
}

// U5 definition sample
const def = inv.exercises.find((e) => e.kind === "definition_mcq");
console.log("\nU5 definition body (first 40):");
console.log(lines.slice(def.startLine - 1, Math.min(def.endLine, def.startLine + 40)).join("\n"));

// Article correction
const art = inv.exercises.find((e) => e.kind === "article_correction");
console.log("\nU5 articles:");
console.log(lines.slice(art.startLine - 1, art.endLine).join("\n"));
