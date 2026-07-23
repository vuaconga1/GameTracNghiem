import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const xml = fs.readFileSync(path.join(__dirname, "_reading_unzip", "word", "document.xml"), "utf8");

function extractParasFromXmlChunk(chunk) {
  const paras = [];
  for (const p of chunk.split(/<\/w:p>/)) {
    let line = "";
    const re = /<w:t[^>]*>([^<]*)<\/w:t>/g;
    let m;
    while ((m = re.exec(p))) line += m[1];
    line = line.replace(/\s+/g, " ").trim();
    if (line) paras.push(line);
  }
  return paras;
}

// Full document paras in document order by walking all w:t but grouping by p
const allParas = extractParasFromXmlChunk(xml);

// Text boxes specifically
const txbxBlocks = [];
const txbxRe = /<w:txbxContent[^>]*>([\s\S]*?)<\/w:txbxContent>/g;
let tm;
while ((tm = txbxRe.exec(xml))) {
  const paras = extractParasFromXmlChunk(tm[1]);
  if (paras.length) txbxBlocks.push(paras);
}

// Tables
const tables = [];
const tblRe = /<w:tbl[\s>][\s\S]*?<\/w:tbl>/g;
let tb;
while ((tb = tblRe.exec(xml))) {
  const paras = extractParasFromXmlChunk(tb[0]);
  if (paras.length) tables.push(paras);
}

const outAll = path.join(__dirname, "_reading_lop8_all_paras.txt");
fs.writeFileSync(outAll, allParas.join("\n"), "utf8");

const outTx = path.join(__dirname, "_reading_lop8_textboxes.txt");
fs.writeFileSync(
  outTx,
  txbxBlocks.map((b, i) => `===== TEXTBOX ${i + 1} (${b.length} lines) =====\n` + b.join("\n")).join("\n\n"),
  "utf8",
);

const outTbl = path.join(__dirname, "_reading_lop8_tables.txt");
fs.writeFileSync(
  outTbl,
  tables.map((b, i) => `===== TABLE ${i + 1} (${b.length} lines) =====\n` + b.join("\n")).join("\n\n"),
  "utf8",
);

console.log({
  allParas: allParas.length,
  textboxes: txbxBlocks.length,
  textboxLines: txbxBlocks.reduce((a, b) => a + b.length, 0),
  tables: tables.length,
  tableLines: tables.reduce((a, b) => a + b.length, 0),
});

// Search cues in textboxes
const cues = [
  "Read the",
  "passage",
  "True or False",
  "TRUE",
  "FALSE",
  "Match",
  "heading",
  "READING",
  "Choose the best answer",
  "According to",
  "fill",
  "complete",
  "Questions",
  "paragraph",
];
for (const cue of cues) {
  let hits = 0;
  const samples = [];
  for (const block of txbxBlocks) {
    for (const line of block) {
      if (line.toLowerCase().includes(cue.toLowerCase())) {
        hits++;
        if (samples.length < 3) samples.push(line.slice(0, 140));
      }
    }
  }
  console.log(`TX cue "${cue}": ${hits}`, samples);
}

console.log("\n--- First 15 textboxes preview ---");
txbxBlocks.slice(0, 15).forEach((b, i) => {
  console.log(`\n[TB ${i + 1}]`, b.slice(0, 6).join(" | "));
});

console.log("\n--- Long textboxes (>8 lines) ---");
txbxBlocks.forEach((b, i) => {
  if (b.length > 8) {
    console.log(`TB ${i + 1} lines=${b.length}:`, b[0].slice(0, 100));
  }
});
