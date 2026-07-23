import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../../../../");
const docxCandidates = [
  path.join(repoRoot, "PDF", "Reading_Lop8.docx"),
  "E:/Wewin/Game Trắc Nghiệm/PDF/Reading_Lop8.docx",
];

let docx = docxCandidates.find((p) => fs.existsSync(p));
if (!docx) {
  console.error("DOCX not found. Tried:", docxCandidates);
  process.exit(1);
}

const outDir = __dirname;
const tmpZip = path.join(outDir, "_reading_tmp.zip");
const tmpDir = path.join(outDir, "_reading_unzip");

fs.copyFileSync(docx, tmpZip);
fs.rmSync(tmpDir, { recursive: true, force: true });
fs.mkdirSync(tmpDir, { recursive: true });

execFileSync(
  "powershell",
  [
    "-NoProfile",
    "-Command",
    `Expand-Archive -LiteralPath '${tmpZip.replace(/'/g, "''")}' -DestinationPath '${tmpDir.replace(/'/g, "''")}' -Force`,
  ],
  { stdio: "inherit" },
);

const xml = fs.readFileSync(path.join(tmpDir, "word", "document.xml"), "utf8");
const paras = [];
for (const chunk of xml.split(/<\/w:p>/)) {
  let line = "";
  const re = /<w:t[^>]*>([^<]*)<\/w:t>/g;
  let m;
  while ((m = re.exec(chunk))) line += m[1];
  line = line.replace(/\s+/g, " ").trim();
  if (line) paras.push(line);
}

const out = path.join(outDir, "_reading_lop8_extract.txt");
fs.writeFileSync(out, paras.join("\n"), "utf8");
console.log("docx:", docx);
console.log("paras:", paras.length);
console.log("wrote:", out);
console.log("---FIRST 120---");
console.log(paras.slice(0, 120).join("\n"));
