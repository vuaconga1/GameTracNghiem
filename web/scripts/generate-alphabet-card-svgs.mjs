/**
 * One-shot generator for public/images/alphabet/{a-z}.svg
 * Run: node scripts/generate-alphabet-card-svgs.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '../public/images/alphabet');

/** Unique WeWIN-ish accents (no purple cliché); soft gradients for kids. */
const THEMES = {
  a: { accent: '#0d2b6e', mid: '#1e4a9a', soft: '#c5d4ef', glow: '#7eb0ff' },
  b: { accent: '#1e5a96', mid: '#2f7ec4', soft: '#c8def3', glow: '#7ec8ff' },
  c: { accent: '#1a5494', mid: '#2a78c0', soft: '#c2d8ef', glow: '#6ab8e8' },
  d: { accent: '#2d6b3a', mid: '#3f8f50', soft: '#c6e2cc', glow: '#7ed99a' },
  e: { accent: '#3d6b2a', mid: '#558f3a', soft: '#d0e4c4', glow: '#a8d97a' },
  f: { accent: '#2a6b62', mid: '#3d9186', soft: '#c4e2dd', glow: '#6ed9c8' },
  g: { accent: '#24734a', mid: '#349968', soft: '#c4e8d4', glow: '#6ed9a0' },
  h: { accent: '#a85f12', mid: '#d07a22', soft: '#f0dcc4', glow: '#ffb86a' },
  i: { accent: '#9a5f1a', mid: '#c47a2e', soft: '#eed8c0', glow: '#ffc078' },
  j: { accent: '#8a6d28', mid: '#b08c38', soft: '#ebe0c4', glow: '#e8c86a' },
  k: { accent: '#8f3d5c', mid: '#b85078', soft: '#ecd0da', glow: '#f090b0' },
  l: { accent: '#5a4a78', mid: '#7460a0', soft: '#ddd4ec', glow: '#b8a0e0' },
  m: { accent: '#1a3a6e', mid: '#2a5a9a', soft: '#c4d4ef', glow: '#7090d8' },
  n: { accent: '#3a5a78', mid: '#4e789a', soft: '#d0dce8', glow: '#90b0cc' },
  o: { accent: '#1e4a9a', mid: '#3a6cc0', soft: '#c8d8f4', glow: '#80a8ff' },
  p: { accent: '#2a7a4a', mid: '#3e9a62', soft: '#c6e8d2', glow: '#7ad9a0' },
  q: { accent: '#1a6b6b', mid: '#2a9090', soft: '#c2e0e0', glow: '#6ad0d0' },
  r: { accent: '#1a5a5a', mid: '#2a7a7a', soft: '#c0dcdc', glow: '#68c8c8' },
  s: { accent: '#3a4a5a', mid: '#526878', soft: '#d0d8e0', glow: '#98a8b8' },
  t: { accent: '#b85a1a', mid: '#d87830', soft: '#f2dcc8', glow: '#ffb070' },
  u: { accent: '#0f4c81', mid: '#1f6ab0', soft: '#c0d6ec', glow: '#6aa8e0' },
  v: { accent: '#4a6b2a', mid: '#628f3a', soft: '#d4e4c4', glow: '#a8d070' },
  w: { accent: '#0d5c6e', mid: '#1a8094', soft: '#c0dde6', glow: '#5ec8dc' },
  x: { accent: '#6b3a2a', mid: '#8f523a', soft: '#e6d4c8', glow: '#d09878' },
  y: { accent: '#8a7018', mid: '#b09428', soft: '#ebe4c0', glow: '#e8d060' },
  z: { accent: '#2a4a6b', mid: '#3e6a94', soft: '#c8d6e6', glow: '#80a8d0' },
};

/** Tiny decorative motifs (kid clipart vibe), anchored lower-right under the letter. */
function motif(letter) {
  // Local origin ~ (220, 250) for compact icons
  switch (letter) {
    case 'a': // apple
      return `
        <circle cx="236" cy="268" r="28" fill="#e85d4c"/>
        <ellipse cx="226" cy="254" rx="7" ry="4" fill="#ffb0a0" opacity="0.55"/>
        <path d="M236 240c0-8 6-14 11-16" fill="none" stroke="#5a3a1a" stroke-width="4" stroke-linecap="round"/>
        <ellipse cx="248" cy="234" rx="10" ry="6" fill="#3d8f50" transform="rotate(25 248 234)"/>`;
    case 'b': // ball
      return `
        <circle cx="236" cy="268" r="30" fill="#f0a020"/>
        <path d="M206 268h60M236 238v60M212 248c15 10 33 10 48 0M212 288c15-10 33-10 48 0" fill="none" stroke="#fff" stroke-width="3.5" opacity="0.85"/>`;
    case 'c': // cat face
      return `
        <circle cx="236" cy="270" r="28" fill="#f2c48a"/>
        <path d="M212 252l6-22 12 16M260 252l-6-22-12 16" fill="#f2c48a"/>
        <circle cx="226" cy="266" r="4" fill="#2b2118"/>
        <circle cx="246" cy="266" r="4" fill="#2b2118"/>
        <ellipse cx="236" cy="280" rx="5" ry="3.5" fill="#e87a6a"/>`;
    case 'd': // dog
      return `
        <ellipse cx="236" cy="272" rx="30" ry="24" fill="#d4a06a"/>
        <ellipse cx="208" cy="258" rx="10" ry="15" fill="#b88048"/>
        <ellipse cx="264" cy="258" rx="10" ry="15" fill="#b88048"/>
        <circle cx="226" cy="268" r="4" fill="#2b2118"/>
        <circle cx="246" cy="268" r="4" fill="#2b2118"/>
        <ellipse cx="236" cy="282" rx="7" ry="4" fill="#2b2118"/>`;
    case 'e': // egg
      return `
        <ellipse cx="236" cy="268" rx="22" ry="32" fill="#fff8e8"/>
        <ellipse cx="228" cy="254" rx="7" ry="8" fill="#fff" opacity="0.7"/>
        <path d="M218 268c6 3 12 3 18 0s12-3 18 0" fill="none" stroke="#f0c060" stroke-width="2.5" opacity="0.5"/>`;
    case 'f': // fish
      return `
        <ellipse cx="230" cy="270" rx="30" ry="18" fill="#4db8d0"/>
        <path d="M260 270l18-12v24z" fill="#3a9ab0"/>
        <circle cx="214" cy="264" r="4" fill="#0f2740"/>
        <path d="M220 278c7 5 16 5 24 0" fill="none" stroke="#fff" stroke-width="2.5" opacity="0.6"/>`;
    case 'g': // grapes
      return `
        <circle cx="224" cy="258" r="12" fill="#6b4a9a"/>
        <circle cx="242" cy="256" r="12" fill="#7a58a8"/>
        <circle cx="232" cy="272" r="12" fill="#5c3d88"/>
        <circle cx="250" cy="270" r="10" fill="#6b4a9a"/>
        <circle cx="216" cy="272" r="10" fill="#7a58a8"/>
        <path d="M236 242c0-8 5-13 10-15" fill="none" stroke="#3d6b2a" stroke-width="3.5" stroke-linecap="round"/>`;
    case 'h': // house
      return `
        <path d="M208 278h56v28H208z" fill="#f5e6d0"/>
        <path d="M200 278l36-30 36 30z" fill="#d07a22"/>
        <rect x="228" y="288" width="16" height="18" rx="2" fill="#8a5a2a"/>
        <rect x="214" y="284" width="10" height="10" rx="1" fill="#7eb0ff"/>`;
    case 'i': // ice cream
      return `
        <path d="M224 268h24l-5 40h-14z" fill="#e8b060"/>
        <circle cx="236" cy="250" r="22" fill="#ff8fab"/>
        <circle cx="226" cy="242" r="7" fill="#fff" opacity="0.45"/>`;
    case 'j': // juice cup
      return `
        <path d="M214 248h44l-7 48h-30z" fill="#ffa64d"/>
        <rect x="212" y="242" width="48" height="9" rx="3" fill="#fff8e8"/>
        <ellipse cx="236" cy="248" rx="16" ry="4" fill="#ffcf80" opacity="0.7"/>
        <path d="M256 254c10 3 14 14 7 20" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/>`;
    case 'k': // kite
      return `
        <path d="M236 232l30 34-30 34-30-34z" fill="#ff6b6b"/>
        <path d="M236 232v68M206 266h60" fill="none" stroke="#fff" stroke-width="2.5" opacity="0.7"/>
        <path d="M236 300c-8 10-3 18 5 24" fill="none" stroke="#f0d080" stroke-width="3.5" stroke-linecap="round"/>`;
    case 'l': // leaf
      return `
        <ellipse cx="236" cy="270" rx="18" ry="34" fill="#4caf6a" transform="rotate(-20 236 270)"/>
        <path d="M236 236c-2 16-2 34 0 52" fill="none" stroke="#2d6b3a" stroke-width="2.5"/>
        <path d="M236 252c-10 5-15 12-18 20M236 266c10 5 15 12 18 20" fill="none" stroke="#2d6b3a" stroke-width="2" opacity="0.6"/>`;
    case 'm': // moon (crescent via overlap)
      return `
        <circle cx="236" cy="268" r="30" fill="#ffe08a"/>
        <circle cx="250" cy="256" r="24" fill="__ACCENT__" opacity="0.92"/>
        <circle cx="224" cy="260" r="4" fill="#e0b040" opacity="0.5"/>
        <circle cx="234" cy="280" r="3.5" fill="#e0b040" opacity="0.4"/>`;
    case 'n': // nest + eggs
      return `
        <ellipse cx="236" cy="292" rx="34" ry="14" fill="#8a6238"/>
        <ellipse cx="236" cy="286" rx="28" ry="9" fill="#6e4c2a"/>
        <ellipse cx="226" cy="274" rx="10" ry="14" fill="#fff4d8"/>
        <ellipse cx="246" cy="272" rx="10" ry="14" fill="#ffe8b0"/>`;
    case 'o': // orange
      return `
        <circle cx="236" cy="270" r="30" fill="#f08820"/>
        <ellipse cx="224" cy="256" rx="8" ry="6" fill="#ffc070" opacity="0.55"/>
        <path d="M236 240c2-10 8-14 13-14" fill="none" stroke="#3d6b2a" stroke-width="3.5" stroke-linecap="round"/>
        <ellipse cx="244" cy="230" rx="9" ry="4.5" fill="#4caf6a"/>`;
    case 'p': // pencil
      return `
        <path d="M214 304l40-80 12 6-40 80z" fill="#f0c040"/>
        <path d="M214 304l8-5 36 18-8 5z" fill="#e8a020"/>
        <path d="M254 224l12 6-7 14-12-6z" fill="#f5e6d0"/>
        <path d="M259 230l7 3.5-3.5 7z" fill="#2b2118"/>
        <rect x="216" y="298" width="44" height="7" transform="rotate(-26 238 301)" fill="#e85d4c"/>`;
    case 'q': // queen crown
      return `
        <path d="M206 292h60l-5-30-14 12-9-24-9 24-14-12z" fill="#f0c040"/>
        <circle cx="214" cy="264" r="5" fill="#ff6b6b"/>
        <circle cx="236" cy="248" r="5" fill="#7eb0ff"/>
        <circle cx="258" cy="264" r="5" fill="#4caf6a"/>
        <rect x="208" y="292" width="56" height="9" rx="3" fill="#e8a020"/>`;
    case 'r': // rainbow arcs
      return `
        <path d="M200 300a40 40 0 0 1 80 0" fill="none" stroke="#ff6b6b" stroke-width="7" stroke-linecap="round"/>
        <path d="M208 300a32 32 0 0 1 64 0" fill="none" stroke="#f0c040" stroke-width="7" stroke-linecap="round"/>
        <path d="M216 300a24 24 0 0 1 48 0" fill="none" stroke="#4caf6a" stroke-width="7" stroke-linecap="round"/>
        <path d="M224 300a16 16 0 0 1 32 0" fill="none" stroke="#5b8fd9" stroke-width="7" stroke-linecap="round"/>`;
    case 's': // sun
      return `
        <circle cx="236" cy="268" r="24" fill="#ffcf4d"/>
        <g stroke="#ffcf4d" stroke-width="5" stroke-linecap="round">
          <path d="M236 230v-12M236 318v-12M204 268h-12M280 268h-12M208 240l-8-8M272 304l-8-8M264 240l8-8M208 304l-8 8"/>
        </g>`;
    case 't': // tree
      return `
        <rect x="228" y="278" width="14" height="30" rx="3" fill="#8a5a2a"/>
        <circle cx="235" cy="252" r="30" fill="#3d8f50"/>
        <circle cx="216" cy="264" r="18" fill="#4caf6a"/>
        <circle cx="254" cy="262" r="16" fill="#2d6b3a"/>`;
    case 'u': // umbrella
      return `
        <path d="M200 262c0-24 16-40 36-40s36 16 36 40H200z" fill="#e85d4c"/>
        <path d="M200 262h72" stroke="#c44a3c" stroke-width="3.5"/>
        <path d="M236 262v40" fill="none" stroke="#5a3a1a" stroke-width="4" stroke-linecap="round"/>
        <path d="M236 302c7 7 16 5 16-2" fill="none" stroke="#5a3a1a" stroke-width="4" stroke-linecap="round"/>`;
    case 'v': // van
      return `
        <rect x="196" y="258" width="72" height="34" rx="7" fill="#4db8d0"/>
        <path d="M230 258h30l10 20H230z" fill="#c8eef6"/>
        <circle cx="214" cy="294" r="9" fill="#2b2118"/>
        <circle cx="252" cy="294" r="9" fill="#2b2118"/>
        <circle cx="214" cy="294" r="3.5" fill="#94a3b8"/>
        <circle cx="252" cy="294" r="3.5" fill="#94a3b8"/>`;
    case 'w': // whale
      return `
        <ellipse cx="230" cy="274" rx="36" ry="20" fill="#5b8fd9"/>
        <path d="M264 274l20-12v24z" fill="#3a6cb0"/>
        <circle cx="210" cy="268" r="4" fill="#0f2740"/>
        <path d="M204 284c8 6 20 6 28 0" fill="none" stroke="#fff" stroke-width="2.5" opacity="0.5"/>
        <ellipse cx="220" cy="286" rx="12" ry="7" fill="#fff" opacity="0.35"/>`;
    case 'x': // xylophone
      return `
        <rect x="198" y="248" width="72" height="11" rx="3" fill="#ff6b6b"/>
        <rect x="202" y="264" width="64" height="11" rx="3" fill="#f0c040"/>
        <rect x="206" y="280" width="56" height="11" rx="3" fill="#4caf6a"/>
        <rect x="210" y="296" width="48" height="11" rx="3" fill="#5b8fd9"/>
        <path d="M194 244l7 7M274 244l-7 7" fill="none" stroke="#8a6238" stroke-width="3.5" stroke-linecap="round"/>`;
    case 'y': // yacht
      return `
        <path d="M236 236v58" fill="none" stroke="#fff" stroke-width="3.5"/>
        <path d="M240 242l34 42H240z" fill="#fff" opacity="0.92"/>
        <path d="M200 294h72l-8 14H208z" fill="#e85d4c"/>
        <path d="M190 308h90" fill="none" stroke="#7eb0ff" stroke-width="5" stroke-linecap="round" opacity="0.5"/>`;
    case 'z': // zebra
      return `
        <ellipse cx="236" cy="270" rx="34" ry="28" fill="#f5f0e8"/>
        <g stroke="#2b2118" stroke-width="7" stroke-linecap="round">
          <path d="M216 250c7 8 7 24 0 34"/>
          <path d="M230 246c5 10 5 28 0 42"/>
          <path d="M244 246c5 10 5 28 0 42"/>
          <path d="M256 252c5 8 5 24 0 32"/>
        </g>
        <circle cx="224" cy="266" r="3.5" fill="#2b2118"/>`;
    default:
      return '';
  }
}

function svgFor(letter) {
  const L = letter.toLowerCase();
  const U = letter.toUpperCase();
  const t = THEMES[L];
  const id = `g${L}`;
  const motifSvg = motif(L).replaceAll('__ACCENT__', t.accent);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 360" width="320" height="360" role="img" aria-label="Letter ${U}">
  <defs>
    <linearGradient id="${id}Bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${t.soft}"/>
      <stop offset="0.45" stop-color="${t.mid}"/>
      <stop offset="1" stop-color="${t.accent}"/>
    </linearGradient>
    <linearGradient id="${id}Shine" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.28"/>
      <stop offset="0.55" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="${id}Glow" cx="30%" cy="25%" r="65%">
      <stop offset="0" stop-color="${t.glow}" stop-opacity="0.55"/>
      <stop offset="1" stop-color="${t.accent}" stop-opacity="0"/>
    </radialGradient>
    <filter id="${id}Soft" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="${t.accent}" flood-opacity="0.35"/>
    </filter>
  </defs>
  <rect width="320" height="360" rx="28" fill="url(#${id}Bg)"/>
  <rect width="320" height="360" rx="28" fill="url(#${id}Glow)"/>
  <rect width="320" height="360" rx="28" fill="url(#${id}Shine)"/>
  <!-- decorative dots -->
  <circle cx="48" cy="56" r="10" fill="#fff" opacity="0.18"/>
  <circle cx="278" cy="72" r="7" fill="#fff" opacity="0.14"/>
  <circle cx="42" cy="300" r="14" fill="#fff" opacity="0.1"/>
  <circle cx="290" cy="310" r="18" fill="#000" opacity="0.08"/>
  <!-- big letter (graphic center) -->
  <text x="148" y="155" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="150" font-weight="800" fill="#ffffff" filter="url(#${id}Soft)" letter-spacing="-4">${U}</text>
  <text x="148" y="155" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="150" font-weight="800" fill="none" stroke="#ffffff" stroke-opacity="0.22" stroke-width="3" letter-spacing="-4">${U}</text>
  <!-- motif -->
  <g opacity="0.96">${motifSvg}
  </g>
  <!-- bottom accent bar -->
  <rect x="0" y="348" width="320" height="12" fill="${t.accent}" opacity="0.85"/>
</svg>
`;
}

fs.mkdirSync(OUT, { recursive: true });
for (const ch of 'abcdefghijklmnopqrstuvwxyz') {
  const file = path.join(OUT, `${ch}.svg`);
  fs.writeFileSync(file, svgFor(ch), 'utf8');
}
console.log(`Wrote 26 SVGs to ${OUT}`);
