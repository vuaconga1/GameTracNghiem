/** Shared 2D cartoon scene builders for unit card thumbnails (Global Success style). */

const O = '#1A1A2E';
const SKIN = '#FFCC80';
const SKIN_D = '#F0A860';

function sky(top = '#87CEEB', bottom = '#B3E5FC'): string {
  return `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${top}"/><stop offset="100%" stop-color="${bottom}"/></linearGradient></defs>
  <rect width="850" height="500" fill="url(#sky)"/>`;
}

function grass(y = 340, c = '#7CB342', c2 = '#558B2F'): string {
  return `<rect y="${y}" width="850" height="${500 - y}" fill="${c}"/>
  <ellipse cx="120" cy="${y + 30}" rx="90" ry="18" fill="${c2}" opacity="0.5"/>
  <ellipse cx="420" cy="${y + 20}" rx="120" ry="22" fill="${c2}" opacity="0.4"/>
  <ellipse cx="720" cy="${y + 35}" rx="100" ry="20" fill="${c2}" opacity="0.5"/>`;
}

function sun(cx = 720, cy = 80, r = 45): string {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#FFD54F" stroke="${O}" stroke-width="2"/>
  <circle cx="${cx}" cy="${cy}" r="${r - 8}" fill="#FFEB3B" opacity="0.6"/>`;
}

function cloud(x: number, y: number, s = 1): string {
  return `<g transform="translate(${x},${y}) scale(${s})">
    <ellipse cx="0" cy="0" rx="35" ry="18" fill="#FFFFFF" stroke="${O}" stroke-width="1.5"/>
    <ellipse cx="-25" cy="5" rx="22" ry="14" fill="#FFFFFF" stroke="${O}" stroke-width="1.5"/>
    <ellipse cx="25" cy="5" rx="22" ry="14" fill="#FFFFFF" stroke="${O}" stroke-width="1.5"/>
  </g>`;
}

function eye(ex: number, ey: number, flip = false): string {
  const p = flip ? 1 : -1;
  return `<ellipse cx="${ex}" cy="${ey}" rx="9" ry="11" fill="#FFFFFF" stroke="${O}" stroke-width="1.5"/>
  <circle cx="${ex + p}" cy="${ey + 2}" r="5.5" fill="${O}"/>
  <circle cx="${ex + p * 2}" cy="${ey - 1}" r="2" fill="#FFFFFF"/>`;
}

function smile(cx: number, cy: number, w = 8): string {
  return `<path d="M${cx - w} ${cy} Q${cx} ${cy + 8} ${cx + w} ${cy}" fill="none" stroke="${O}" stroke-width="2" stroke-linecap="round"/>`;
}

type BoyOpts = { shirt?: string; pants?: string; hair?: 'spiky' | 'short' | 'curly' };
function boy(x: number, y: number, scale = 1, opts: BoyOpts = {}): string {
  const shirt = opts.shirt ?? '#42A5F5';
  const pants = opts.pants ?? '#1565C0';
  const hair = opts.hair ?? 'spiky';
  const hairPath =
    hair === 'spiky'
      ? `M-28 0 Q-22 -38 0 -42 Q22 -38 28 0 Q18 -28 0 -32 Q-18 -28 -28 0`
      : hair === 'curly'
        ? `M-28 2 Q-30 -20 -15 -35 Q0 -42 15 -35 Q30 -20 28 2 Q15 -15 0 -18 Q-15 -15 -28 2`
        : `M-28 5 Q-26 -25 0 -30 Q26 -25 28 5 Q15 -12 0 -15 Q-15 -12 -28 5`;
  return `<g transform="translate(${x},${y}) scale(${scale})">
    <line x1="-11" y1="52" x2="-11" y2="82" stroke="${pants}" stroke-width="13" stroke-linecap="round"/>
    <line x1="11" y1="52" x2="11" y2="82" stroke="${pants}" stroke-width="13" stroke-linecap="round"/>
    <ellipse cx="-11" cy="86" rx="11" ry="5" fill="#37474F" stroke="${O}" stroke-width="1.5"/>
    <ellipse cx="11" cy="86" rx="11" ry="5" fill="#37474F" stroke="${O}" stroke-width="1.5"/>
    <path d="M-24 18 Q0 12 24 18 L26 55 Q0 62 -26 55 Z" fill="${shirt}" stroke="${O}" stroke-width="2"/>
    <path d="M-24 22 Q-42 35 -46 52" fill="none" stroke="${SKIN}" stroke-width="11" stroke-linecap="round"/>
    <path d="M24 22 Q42 35 46 52" fill="none" stroke="${SKIN}" stroke-width="11" stroke-linecap="round"/>
    <circle cx="0" cy="-8" r="30" fill="${SKIN}" stroke="${O}" stroke-width="2"/>
    <ellipse cx="0" cy="5" rx="18" ry="8" fill="${SKIN_D}" opacity="0.3"/>
    <path d="${hairPath}" fill="#3E2723" stroke="${O}" stroke-width="1.5"/>
    ${eye(-12, -5)}${eye(12, -5, true)}
    ${smile(0, 10)}
  </g>`;
}

type GirlOpts = { dress?: string; hair?: 'long' | 'pigtails' | 'bob' };
function girl(x: number, y: number, scale = 1, opts: GirlOpts = {}): string {
  const dress = opts.dress ?? '#EC407A';
  const hair = opts.hair ?? 'long';
  const hairExtra =
    hair === 'pigtails'
      ? `<circle cx="-32" cy="-15" r="10" fill="#5D4037" stroke="${O}" stroke-width="1.5"/>
         <circle cx="32" cy="-15" r="10" fill="#5D4037" stroke="${O}" stroke-width="1.5"/>`
      : hair === 'bob'
        ? `<path d="M-30 0 Q-32 -30 0 -35 Q32 -30 30 0 L28 15 Q0 20 -28 15 Z" fill="#6D4C41" stroke="${O}" stroke-width="1.5"/>`
        : `<path d="M-30 5 Q-28 -32 0 -38 Q28 -32 30 5 L25 30 Q0 35 -25 30 Z" fill="#5D4037" stroke="${O}" stroke-width="1.5"/>`;
  return `<g transform="translate(${x},${y}) scale(${scale})">
    <line x1="-10" y1="52" x2="-10" y2="80" stroke="${SKIN}" stroke-width="10" stroke-linecap="round"/>
    <line x1="10" y1="52" x2="10" y2="80" stroke="${SKIN}" stroke-width="10" stroke-linecap="round"/>
    <ellipse cx="-10" cy="84" rx="10" ry="5" fill="#EF5350" stroke="${O}" stroke-width="1.5"/>
    <ellipse cx="10" cy="84" rx="10" ry="5" fill="#EF5350" stroke="${O}" stroke-width="1.5"/>
    <path d="M-22 18 Q0 14 22 18 L24 70 Q0 78 -24 70 Z" fill="${dress}" stroke="${O}" stroke-width="2"/>
    <path d="M-22 22 Q-38 38 -42 55" fill="none" stroke="${SKIN}" stroke-width="10" stroke-linecap="round"/>
    <path d="M22 22 Q38 38 42 55" fill="none" stroke="${SKIN}" stroke-width="10" stroke-linecap="round"/>
    <circle cx="0" cy="-8" r="28" fill="${SKIN}" stroke="${O}" stroke-width="2"/>
    ${hairExtra}
    ${eye(-11, -5)}${eye(11, -5, true)}
    ${smile(0, 10)}
  </g>`;
}

function teen(x: number, y: number, scale = 1, shirt = '#7E57C2'): string {
  return `<g transform="translate(${x},${y}) scale(${scale})">
    <line x1="-12" y1="58" x2="-12" y2="95" stroke="#37474F" stroke-width="12" stroke-linecap="round"/>
    <line x1="12" y1="58" x2="12" y2="95" stroke="#37474F" stroke-width="12" stroke-linecap="round"/>
    <ellipse cx="-12" cy="99" rx="12" ry="5" fill="#263238" stroke="${O}" stroke-width="1.5"/>
    <ellipse cx="12" cy="99" rx="12" ry="5" fill="#263238" stroke="${O}" stroke-width="1.5"/>
    <path d="M-26 22 Q0 16 26 22 L28 62 Q0 70 -28 62 Z" fill="${shirt}" stroke="${O}" stroke-width="2"/>
    <path d="M-26 26 Q-44 42 -48 62" fill="none" stroke="${SKIN}" stroke-width="11" stroke-linecap="round"/>
    <path d="M26 26 Q44 42 48 62" fill="none" stroke="${SKIN}" stroke-width="11" stroke-linecap="round"/>
    <circle cx="0" cy="-12" r="32" fill="${SKIN}" stroke="${O}" stroke-width="2"/>
    <path d="M-30 0 Q-24 -42 0 -46 Q24 -42 30 0 Q18 -30 0 -34 Q-18 -30 -30 0" fill="#212121" stroke="${O}" stroke-width="1.5"/>
    ${eye(-13, -8)}${eye(13, -8, true)}
    ${smile(0, 8)}
  </g>`;
}

function adult(x: number, y: number, scale = 1, shirt = '#78909C'): string {
  return boy(x, y, scale * 1.15, { shirt, pants: '#455A64', hair: 'short' });
}

function schoolBuilding(x: number, y: number): string {
  return `<g transform="translate(${x},${y})">
    <rect x="-80" y="-20" width="160" height="90" fill="#ECEFF1" stroke="${O}" stroke-width="2"/>
    <polygon points="-90,-20 0,-70 90,-20" fill="#EF5350" stroke="${O}" stroke-width="2"/>
    <rect x="-25" y="10" width="50" height="60" fill="#8D6E63" stroke="${O}" stroke-width="1.5"/>
    <rect x="-60" y="-5" width="30" height="25" fill="#81D4FA" stroke="${O}" stroke-width="1.5"/>
    <rect x="30" y="-5" width="30" height="25" fill="#81D4FA" stroke="${O}" stroke-width="1.5"/>
    <rect x="-8" y="-55" width="16" height="25" fill="#FFF" stroke="${O}" stroke-width="1.5"/>
    <circle cx="0" cy="-42" r="8" fill="#FFD54F" stroke="${O}" stroke-width="1"/>
  </g>`;
}

function house(x: number, y: number): string {
  return `<g transform="translate(${x},${y})">
    <rect x="-70" y="-10" width="140" height="80" fill="#FFCC80" stroke="${O}" stroke-width="2"/>
    <polygon points="-80,-10 0,-55 80,-10" fill="#EF5350" stroke="${O}" stroke-width="2"/>
    <rect x="-20" y="20" width="40" height="50" fill="#5D4037" stroke="${O}" stroke-width="1.5"/>
    <rect x="-55" y="5" width="25" height="25" fill="#81D4FA" stroke="${O}" stroke-width="1.5"/>
    <rect x="30" y="5" width="25" height="25" fill="#81D4FA" stroke="${O}" stroke-width="1.5"/>
  </g>`;
}

function bed(x: number, y: number): string {
  return `<g transform="translate(${x},${y})">
    <rect x="-70" y="0" width="140" height="35" rx="6" fill="#8D6E63" stroke="${O}" stroke-width="2"/>
    <rect x="-65" y="-25" width="130" height="30" rx="8" fill="#FFFFFF" stroke="${O}" stroke-width="1.5"/>
    <rect x="-60" y="-20" width="40" height="20" rx="4" fill="#BBDEFB" stroke="${O}" stroke-width="1"/>
    <rect x="15" y="-20" width="50" height="20" rx="4" fill="#FFCDD2" stroke="${O}" stroke-width="1"/>
  </g>`;
}

function alarmClock(x: number, y: number): string {
  return `<g transform="translate(${x},${y})">
    <circle cx="0" cy="0" r="22" fill="#42A5F5" stroke="${O}" stroke-width="2"/>
    <circle cx="0" cy="0" r="16" fill="#FFFFFF" stroke="${O}" stroke-width="1.5"/>
    <line x1="0" y1="0" x2="0" y2="-10" stroke="${O}" stroke-width="2" stroke-linecap="round"/>
    <line x1="0" y1="0" x2="8" y2="4" stroke="#E53935" stroke-width="2" stroke-linecap="round"/>
    <rect x="-4" y="-28" width="8" height="8" rx="2" fill="#FFD54F" stroke="${O}" stroke-width="1"/>
    <rect x="-4" y="20" width="8" height="8" rx="2" fill="#FFD54F" stroke="${O}" stroke-width="1"/>
  </g>`;
}

function birthdayCake(x: number, y: number): string {
  return `<g transform="translate(${x},${y})">
    <rect x="-40" y="0" width="80" height="35" rx="6" fill="#F48FB1" stroke="${O}" stroke-width="2"/>
    <rect x="-35" y="-20" width="70" height="22" rx="4" fill="#CE93D8" stroke="${O}" stroke-width="1.5"/>
    <line x1="-15" y1="-20" x2="-15" y2="-38" stroke="#FFD54F" stroke-width="3"/>
    <ellipse cx="-15" cy="-40" rx="5" ry="7" fill="#FF7043" stroke="${O}" stroke-width="1"/>
    <line x1="0" y1="-20" x2="0" y2="-42" stroke="#FFD54F" stroke-width="3"/>
    <ellipse cx="0" cy="-44" rx="5" ry="7" fill="#FF7043" stroke="${O}" stroke-width="1"/>
    <line x1="15" y1="-20" x2="15" y2="-38" stroke="#FFD54F" stroke-width="3"/>
    <ellipse cx="15" cy="-40" rx="5" ry="7" fill="#FF7043" stroke="${O}" stroke-width="1"/>
  </g>`;
}

function balloon(x: number, y: number, color: string): string {
  return `<g transform="translate(${x},${y})">
    <ellipse cx="0" cy="0" rx="14" ry="18" fill="${color}" stroke="${O}" stroke-width="1.5"/>
    <line x1="0" y1="18" x2="0" y2="45" stroke="${O}" stroke-width="1.5"/>
  </g>`;
}

function animal(x: number, y: number, type: 'dog' | 'cat' | 'bird' | 'elephant'): string {
  if (type === 'dog') {
    return `<g transform="translate(${x},${y})">
      <ellipse cx="0" cy="15" rx="35" ry="25" fill="#FFCC80" stroke="${O}" stroke-width="2"/>
      <circle cx="0" cy="-15" r="22" fill="#FFCC80" stroke="${O}" stroke-width="2"/>
      <ellipse cx="-18" cy="-22" rx="10" ry="14" fill="#FFCC80" stroke="${O}" stroke-width="1.5"/>
      <ellipse cx="18" cy="-22" rx="10" ry="14" fill="#FFCC80" stroke="${O}" stroke-width="1.5"/>
      ${eye(-8, -15)}${eye(8, -15, true)}
      <ellipse cx="0" cy="-5" rx="6" ry="5" fill="#5D4037" stroke="${O}" stroke-width="1"/>
      ${smile(0, 2, 5)}
      <path d="M-30 15 Q-50 5 -45 -5" fill="none" stroke="#FFCC80" stroke-width="8" stroke-linecap="round"/>
    </g>`;
  }
  if (type === 'cat') {
    return `<g transform="translate(${x},${y})">
      <ellipse cx="0" cy="10" rx="28" ry="22" fill="#FFAB91" stroke="${O}" stroke-width="2"/>
      <circle cx="0" cy="-12" r="20" fill="#FFAB91" stroke="${O}" stroke-width="2"/>
      <polygon points="-18,-28 -12,-18 -22,-18" fill="#FFAB91" stroke="${O}" stroke-width="1.5"/>
      <polygon points="18,-28 12,-18 22,-18" fill="#FFAB91" stroke="${O}" stroke-width="1.5"/>
      ${eye(-7, -12)}${eye(7, -12, true)}
      <path d="M-3 -5 L0 -2 L3 -5" fill="none" stroke="${O}" stroke-width="1.5"/>
      ${smile(0, 2, 4)}
    </g>`;
  }
  if (type === 'bird') {
    return `<g transform="translate(${x},${y})">
      <ellipse cx="0" cy="0" rx="18" ry="14" fill="#42A5F5" stroke="${O}" stroke-width="2"/>
      <circle cx="12" cy="-8" r="10" fill="#42A5F5" stroke="${O}" stroke-width="1.5"/>
      <polygon points="20,-8 30,-5 20,-2" fill="#FF7043" stroke="${O}" stroke-width="1"/>
      <circle cx="15" cy="-10" r="3" fill="${O}"/>
      <path d="M-15 0 Q-30 -15 -25 -25" fill="#1565C0" stroke="${O}" stroke-width="1.5"/>
    </g>`;
  }
  return `<g transform="translate(${x},${y})">
    <ellipse cx="0" cy="20" rx="45" ry="30" fill="#90A4AE" stroke="${O}" stroke-width="2"/>
    <circle cx="0" cy="-10" r="28" fill="#90A4AE" stroke="${O}" stroke-width="2"/>
    <ellipse cx="-30" cy="-5" rx="18" ry="30" fill="#B0BEC5" stroke="${O}" stroke-width="1.5" transform="rotate(-20 -30 -5)"/>
    <ellipse cx="30" cy="-5" rx="18" ry="30" fill="#B0BEC5" stroke="${O}" stroke-width="1.5" transform="rotate(20 30 -5)"/>
    ${eye(-10, -12)}${eye(10, -12, true)}
    <path d="M-5 0 L0 8 L5 0" fill="none" stroke="${O}" stroke-width="2"/>
  </g>`;
}

function unitBadge(unit: number, color: string): string {
  return `<rect x="28" y="28" width="118" height="42" rx="21" fill="rgba(255,255,255,0.92)" stroke="${O}" stroke-width="1"/>
  <text x="87" y="56" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="22" font-weight="700" fill="${color}">Unit ${unit}</text>`;
}

/** Lớp 4 unit scene illustrations (850×500). */
export const LOP4_SCENES: Record<number, string> = {
  1: `${sky('#81D4FA', '#B3E5FC')}${sun()}${cloud(150, 60)}${cloud(400, 40, 0.8)}${grass(350)}
    ${schoolBuilding(680, 280)}
    ${boy(320, 300, 1.1, { shirt: '#42A5F5' })}
    ${boy(480, 300, 1.1, { shirt: '#66BB6A', hair: 'short' })}
    <path d="M350 260 Q400 230 450 260" fill="none" stroke="${SKIN}" stroke-width="12" stroke-linecap="round"/>
    <path d="M355 255 Q400 225 445 255" fill="none" stroke="${SKIN}" stroke-width="12" stroke-linecap="round"/>`,

  2: `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#FFE082"/><stop offset="100%" stop-color="#FFF9C4"/></linearGradient></defs>
    <rect width="850" height="500" fill="url(#sky)"/>
    <rect x="0" y="280" width="850" height="220" fill="#D7CCC8"/>
    <rect x="550" y="80" width="120" height="100" rx="4" fill="#81D4FA" stroke="${O}" stroke-width="2"/>
    <rect x="560" y="90" width="100" height="80" fill="#B3E5FC"/>
    ${sun(610, 50, 30)}
    ${bed(350, 280)}
    <g transform="translate(350,265)">
      <circle cx="0" cy="-5" r="26" fill="${SKIN}" stroke="${O}" stroke-width="2"/>
      <path d="M-24 0 Q-20 -30 0 -34 Q20 -30 24 0" fill="#3E2723" stroke="${O}" stroke-width="1.5"/>
      ${eye(-10, -5)}${eye(10, -5, true)}
      <ellipse cx="-18" cy="8" rx="8" ry="5" fill="#FFCDD2" opacity="0.5"/>
      <path d="M-30 -15 Q-45 -35 -35 -50" fill="none" stroke="${SKIN}" stroke-width="10" stroke-linecap="round"/>
      <path d="M30 -15 Q45 -35 35 -50" fill="none" stroke="${SKIN}" stroke-width="10" stroke-linecap="round"/>
      <ellipse cx="0" cy="18" rx="14" ry="8" fill="#FFCDD2" stroke="${O}" stroke-width="1"/>
    </g>
    ${alarmClock(520, 310)}`,

  3: `${sky()}${grass(360)}
    <rect x="280" y="120" width="290" height="220" rx="12" fill="#FFFFFF" stroke="${O}" stroke-width="2"/>
    <rect x="280" y="120" width="290" height="40" rx="12" fill="#7E57C2" stroke="${O}" stroke-width="2"/>
    <text x="425" y="148" text-anchor="middle" font-family="Arial,sans-serif" font-size="18" font-weight="700" fill="#FFFFFF">MY WEEK</text>
    ${[0, 1, 2, 3, 4, 5, 6].map((i) => {
      const cx = 320 + (i % 4) * 65;
      const cy = 190 + Math.floor(i / 4) * 55;
      const colors = ['#EF5350', '#FF7043', '#FFD54F', '#66BB6A', '#42A5F5', '#AB47BC', '#EC407A'];
      return `<circle cx="${cx}" cy="${cy}" r="18" fill="${colors[i]}" stroke="${O}" stroke-width="1.5"/>
      <text x="${cx}" y="${cy + 5}" text-anchor="middle" font-family="Arial,sans-serif" font-size="14" font-weight="700" fill="#FFF">${['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}</text>`;
    }).join('')}
    ${girl(620, 310, 1, { dress: '#7E57C2' })}
    <path d="M580 250 L540 200" fill="none" stroke="${SKIN}" stroke-width="8" stroke-linecap="round"/>` ,

  4: `${sky('#F8BBD0', '#FCE4EC')}${sun(700, 70)}${grass(360, '#A5D6A7', '#81C784')}
    ${birthdayCake(425, 320)}
    ${balloon(280, 120, '#EF5350')}${balloon(320, 100, '#42A5F5')}${balloon(530, 110, '#FFD54F')}${balloon(570, 130, '#66BB6A')}
    ${boy(280, 310, 0.95, { shirt: '#42A5F5' })}${girl(560, 310, 0.95, { dress: '#EC407A', hair: 'pigtails' })}
    ${boy(420, 290, 0.85, { shirt: '#FF7043', hair: 'curly' })}`,

  5: `${sky()}${grass(340)}
    ${boy(200, 310, 1, { shirt: '#42A5F5' })}
    <circle cx="280" cy="380" r="18" fill="#FFFFFF" stroke="${O}" stroke-width="2"/>
    <path d="M262 380 L298 380 M280 362 L280 398 M268 368 L292 392 M292 368 L268 392" stroke="${O}" stroke-width="2"/>
    ${girl(420, 310, 1, { dress: '#26C6DA' })}
    <ellipse cx="500" cy="370" rx="40" ry="15" fill="#4FC3F7" stroke="${O}" stroke-width="2"/>
    <path d="M460 370 Q500 340 540 370" fill="#29B6F6" stroke="${O}" stroke-width="1.5"/>
    ${boy(650, 310, 1, { shirt: '#66BB6A' })}
    <rect x="700" y="350" width="30" height="40" rx="4" fill="#FFD54F" stroke="${O}" stroke-width="1.5"/>
    <line x1="715" y1="350" x2="715" y2="330" stroke="${O}" stroke-width="2"/>` ,

  6: `${sky()}${grass(370)}
    ${schoolBuilding(425, 250)}
    ${boy(250, 340, 0.9, { shirt: '#42A5F5' })}
    ${girl(600, 340, 0.9, { dress: '#EC407A' })}
    <rect x="100" y="200" width="60" height="80" rx="4" fill="#A5D6A7" stroke="${O}" stroke-width="1.5"/>
    <text x="130" y="248" text-anchor="middle" font-family="Arial,sans-serif" font-size="12" font-weight="700" fill="${O}">LIB</text>
    <rect x="690" y="200" width="60" height="80" rx="4" fill="#FFCC80" stroke="${O}" stroke-width="1.5"/>
    <text x="720" y="248" text-anchor="middle" font-family="Arial,sans-serif" font-size="11" font-weight="700" fill="${O}">GYM</text>`,

  7: `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#C5CAE9"/><stop offset="100%" stop-color="#E8EAF6"/></linearGradient></defs>
    <rect width="850" height="500" fill="url(#sky)"/>
    <rect x="0" y="380" width="850" height="120" fill="#BCAAA4"/>
    <rect x="200" y="100" width="450" height="260" rx="8" fill="#FFFFFF" stroke="${O}" stroke-width="2"/>
    <rect x="200" y="100" width="450" height="35" fill="#5C6BC0" stroke="${O}" stroke-width="2"/>
    ${['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((d, i) => `<text x="${260 + i * 85}" y="125" text-anchor="middle" font-family="Arial,sans-serif" font-size="13" font-weight="700" fill="#FFF">${d}</text>`).join('')}
    ${['Math', 'Eng', 'PE', 'Art', 'Music', 'Sci', 'Hist', 'Geo'].map((s, i) => {
      const row = Math.floor(i / 5);
      const col = i % 5;
      const colors = ['#EF5350', '#42A5F5', '#66BB6A', '#FFD54F', '#AB47BC', '#FF7043', '#26C6DA', '#8D6E63'];
      return `<rect x="${220 + col * 85}" y="${150 + row * 50}" width="75" height="38" rx="4" fill="${colors[i]}" stroke="${O}" stroke-width="1"/>
      <text x="${257 + col * 85}" y="${174 + row * 50}" text-anchor="middle" font-family="Arial,sans-serif" font-size="11" font-weight="700" fill="#FFF">${s}</text>`;
    }).join('')}
    ${boy(680, 340, 1, { shirt: '#5C6BC0' })}`,

  8: `${sky('#FFCDD2', '#FFEBEE')}${grass(360)}
    ${boy(250, 310, 1, { shirt: '#EF5350' })}
    <rect x="210" y="220" width="50" height="60" rx="4" fill="#FFFFFF" stroke="${O}" stroke-width="2"/>
    <text x="235" y="258" text-anchor="middle" font-family="Arial,sans-serif" font-size="22" font-weight="700" fill="#C62828">A</text>
    ${girl(425, 310, 1, { dress: '#42A5F5' })}
    <rect x="385" y="220" width="50" height="60" rx="4" fill="#FFFFFF" stroke="${O}" stroke-width="2"/>
    <text x="410" y="255" text-anchor="middle" font-family="Arial,sans-serif" font-size="16" font-weight="700" fill="#1565C0">1+2</text>
    ${boy(600, 310, 1, { shirt: '#66BB6A' })}
    <rect x="560" y="220" width="50" height="60" rx="4" fill="#FFFFFF" stroke="${O}" stroke-width="2"/>
    <circle cx="585" cy="245" r="12" fill="none" stroke="#2E7D32" stroke-width="2"/>
    <line x1="575" y1="245" x2="595" y2="245" stroke="#2E7D32" stroke-width="2"/>
    <line x1="585" y1="235" x2="585" y2="255" stroke="#2E7D32" stroke-width="2"/>`,

  9: `${sky()}${grass(350, '#81C784', '#558B2F')}
    <rect x="0" y="350" width="850" height="8" fill="#FFFFFF" stroke="${O}" stroke-width="1"/>
    ${boy(300, 320, 1.05, { shirt: '#FF7043' })}
    <path d="M280 340 Q260 320 250 300" fill="none" stroke="${SKIN}" stroke-width="10" stroke-linecap="round"/>
    <path d="M320 340 Q340 320 350 300" fill="none" stroke="${SKIN}" stroke-width="10" stroke-linecap="round"/>
    ${girl(550, 330, 1, { dress: '#42A5F5' })}
    <circle cx="680" cy="200" r="30" fill="#FFD54F" stroke="${O}" stroke-width="2"/>
    <text x="680" y="208" text-anchor="middle" font-family="Arial,sans-serif" font-size="28" font-weight="700" fill="#F57F17">1</text>
    <rect x="720" y="160" width="35" height="45" rx="4" fill="#EF5350" stroke="${O}" stroke-width="1.5"/>
    <path d="M737 160 L737 140 L747 150 L727 150 Z" fill="#FFD54F" stroke="${O}" stroke-width="1"/>`,

  10: `${sky('#4FC3F7', '#81D4FA')}${sun(650, 60, 50)}${cloud(200, 80)}${cloud(450, 50)}
    <ellipse cx="425" cy="420" rx="350" ry="30" fill="#FFF59D"/>
    <ellipse cx="425" cy="400" rx="280" ry="20" fill="#4FC3F7" stroke="${O}" stroke-width="1.5"/>
    <path x="350" y="280" d="M350 280 L375 230 L400 280 Z" fill="#FF7043" stroke="${O}" stroke-width="1.5"/>
    <rect x="355" y="280" width="40" height="5" fill="#795548" stroke="${O}" stroke-width="1"/>
    ${boy(480, 310, 1, { shirt: '#42A5F5', pants: '#FF7043' })}
    ${girl(580, 310, 1, { dress: '#EC407A' })}
    <circle cx="300" cy="370" r="12" fill="#FF7043" stroke="${O}" stroke-width="1"/>
    <circle cx="320" cy="385" r="10" fill="#FFD54F" stroke="${O}" stroke-width="1"/>`,

  11: `${sky('#FFE082', '#FFF9C4')}${grass(380)}
    ${house(425, 280)}
    ${adult(280, 340, 0.9, '#78909C')}
    ${girl(380, 350, 0.85, { dress: '#EC407A', hair: 'pigtails' })}
    ${boy(470, 350, 0.85, { shirt: '#42A5F5' })}
    <path d="M100 380 Q200 360 300 380" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-dasharray="8 4"/>`,

  12: `${sky('#ECEFF1', '#CFD8DC')}${grass(370)}
    ${adult(200, 320, 0.85, '#FFFFFF')}
    <rect x="175" y="250" width="50" height="8" rx="2" fill="#FFD54F" stroke="${O}" stroke-width="1"/>
    <text x="200" y="240" text-anchor="middle" font-family="Arial,sans-serif" font-size="11" font-weight="700" fill="${O}">TEACHER</text>
    ${boy(400, 320, 0.9, { shirt: '#FFFFFF' })}
    <rect x="370" y="260" width="60" height="50" rx="4" fill="#EF5350" stroke="${O}" stroke-width="1.5"/>
    <circle cx="400" cy="275" r="8" fill="#FFFFFF" stroke="${O}" stroke-width="1"/>
    <text x="400" y="240" text-anchor="middle" font-family="Arial,sans-serif" font-size="11" font-weight="700" fill="${O}">DOCTOR</text>
    ${boy(620, 320, 0.9, { shirt: '#66BB6A' })}
    <rect x="590" y="280" width="60" height="8" rx="2" fill="#8D6E63" stroke="${O}" stroke-width="1"/>
    <text x="620" y="240" text-anchor="middle" font-family="Arial,sans-serif" font-size="11" font-weight="700" fill="${O}">FARMER</text>`,

  13: `${sky('#F8BBD0', '#FCE4EC')}${grass(360)}
    ${girl(350, 310, 1.1, { dress: '#EC407A', hair: 'long' })}
    <rect x="500" y="180" width="80" height="140" rx="8" fill="#E1BEE7" stroke="${O}" stroke-width="2"/>
    <rect x="515" y="195" width="50" height="100" rx="4" fill="#B3E5FC" stroke="${O}" stroke-width="1.5"/>
    <g transform="translate(540,240)">
      <circle cx="0" cy="0" r="22" fill="${SKIN}" stroke="${O}" stroke-width="1.5"/>
      <path d="M-20 5 Q-18 -18 0 -22 Q18 -18 20 5" fill="#6D4C41" stroke="${O}" stroke-width="1"/>
      ${eye(-7, -2)}${eye(7, -2, true)}
      ${smile(0, 8)}
    </g>
    ${boy(650, 310, 1, { shirt: '#42A5F5', hair: 'curly' })}`,

  14: `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#B2EBF2"/><stop offset="100%" stop-color="#E0F7FA"/></linearGradient></defs>
    <rect width="850" height="500" fill="url(#sky)"/>
    <rect x="0" y="380" width="850" height="120" fill="#BCAAA4"/>
    <rect x="280" y="200" width="200" height="120" rx="6" fill="#8D6E63" stroke="${O}" stroke-width="2"/>
    <rect x="290" y="210" width="180" height="15" fill="#6D4C41"/>
    ${boy(380, 260, 0.95, { shirt: '#26C6DA' })}
    <path d="M340 280 L360 300" fill="none" stroke="${SKIN}" stroke-width="8" stroke-linecap="round"/>
    <rect x="350" y="295" width="40" height="25" rx="2" fill="#FFFFFF" stroke="${O}" stroke-width="1.5"/>
    <line x1="360" y1="305" x2="380" y2="305" stroke="#1565C0" stroke-width="1.5"/>
    <line x1="360" y1="312" x2="375" y2="312" stroke="#1565C0" stroke-width="1.5"/>
    <rect x="550" y="120" width="100" height="80" rx="4" fill="#81D4FA" stroke="${O}" stroke-width="2"/>
    ${sun(600, 60, 25)}`,

  15: `${sky()}${grass(350)}
    <rect x="250" y="320" width="350" height="12" rx="4" fill="#8D6E63" stroke="${O}" stroke-width="1"/>
    ${adult(300, 340, 0.85, '#78909C')}
    ${girl(400, 350, 0.8, { dress: '#EC407A' })}
    ${boy(480, 350, 0.8, { shirt: '#42A5F5' })}
    ${boy(560, 350, 0.75, { shirt: '#66BB6A', hair: 'curly' })}
    <circle cx="320" cy="300" r="14" fill="#EF5350" stroke="${O}" stroke-width="1.5"/>
    <circle cx="380" cy="295" r="14" fill="#FFD54F" stroke="${O}" stroke-width="1.5"/>
    <rect x="420" y="290" width="30" height="20" rx="3" fill="#FFFFFF" stroke="${O}" stroke-width="1"/>
    ${cloud(150, 70)}${cloud(650, 50)}`,

  16: `${sky('#90CAF9', '#BBDEFB')}${cloud(180, 60, 1.2)}${cloud(400, 40)}${cloud(600, 80, 0.9)}
    ${sun(720, 70, 35)}
    ${grass(360)}
    ${boy(300, 320, 1, { shirt: '#42A5F5' })}
    <path d="M250 260 Q300 220 350 260" fill="#78909C" stroke="${O}" stroke-width="2"/>
    <line x1="300" y1="260" x2="300" y2="320" stroke="#546E7A" stroke-width="3"/>
    ${girl(550, 320, 1, { dress: '#FFD54F' })}
    <path d="M520 250 L580 250 L550 290 Z" fill="#FFD54F" stroke="${O}" stroke-width="1.5"/>
    <ellipse cx="700" cy="300" rx="25" ry="15" fill="#FFFFFF" stroke="${O}" stroke-width="1.5"/>
    <line x1="680" y1="310" x2="720" y2="310" stroke="#90CAF9" stroke-width="3"/>
    <line x1="690" y1="320" x2="710" y2="320" stroke="#90CAF9" stroke-width="3"/>`,

  17: `${sky('#B0BEC5', '#CFD8DC')}${grass(390)}
    <rect x="80" y="150" width="70" height="200" fill="#90A4AE" stroke="${O}" stroke-width="2"/>
    <rect x="100" y="170" width="20" height="20" fill="#FFE082" stroke="${O}" stroke-width="1"/>
    <rect x="130" y="170" width="20" height="20" fill="#FFE082" stroke="${O}" stroke-width="1"/>
    <rect x="200" y="100" width="90" height="250" fill="#78909C" stroke="${O}" stroke-width="2"/>
    <rect x="220" y="120" width="25" height="25" fill="#81D4FA" stroke="${O}" stroke-width="1"/>
    <rect x="255" y="120" width="25" height="25" fill="#81D4FA" stroke="${O}" stroke-width="1"/>
    <rect x="350" y="130" width="80" height="220" fill="#B0BEC5" stroke="${O}" stroke-width="2"/>
    <rect x="480" y="80" width="100" height="270" fill="#607D8B" stroke="${O}" stroke-width="2"/>
    <rect x="620" y="160" width="75" height="190" fill="#90A4AE" stroke="${O}" stroke-width="2"/>
    <rect x="0" y="390" width="850" height="20" fill="#546E7A"/>
    ${boy(425, 360, 0.9, { shirt: '#FF7043' })}
    ${girl(520, 360, 0.85, { dress: '#AB47BC' })}`,

  18: `${sky('#E1BEE7', '#F3E5F5')}${grass(380)}
    <rect x="150" y="120" width="550" height="250" rx="8" fill="#FFFFFF" stroke="${O}" stroke-width="2"/>
    <rect x="150" y="120" width="550" height="40" fill="#AB47BC" stroke="${O}" stroke-width="2"/>
    <text x="425" y="148" text-anchor="middle" font-family="Arial,sans-serif" font-size="20" font-weight="700" fill="#FFFFFF">SHOPPING CENTRE</text>
    <rect x="180" y="180" width="100" height="80" rx="4" fill="#F8BBD0" stroke="${O}" stroke-width="1.5"/>
    <text x="230" y="228" text-anchor="middle" font-family="Arial,sans-serif" font-size="12" font-weight="700" fill="${O}">SHOES</text>
    <rect x="310" y="180" width="100" height="80" rx="4" fill="#BBDEFB" stroke="${O}" stroke-width="1.5"/>
    <text x="360" y="228" text-anchor="middle" font-family="Arial,sans-serif" font-size="12" font-weight="700" fill="${O}">TOYS</text>
    <rect x="440" y="180" width="100" height="80" rx="4" fill="#C8E6C9" stroke="${O}" stroke-width="1.5"/>
    <text x="490" y="228" text-anchor="middle" font-family="Arial,sans-serif" font-size="12" font-weight="700" fill="${O}">FOOD</text>
    ${girl(350, 360, 1, { dress: '#EC407A' })}
    <rect x="300" y="330" width="50" height="35" rx="4" fill="#B0BEC5" stroke="${O}" stroke-width="1.5"/>
    <circle cx="310" cy="345" r="8" fill="#EF5350" stroke="${O}" stroke-width="1"/>
    ${boy(550, 360, 0.9, { shirt: '#42A5F5' })}`,

  19: `${sky()}${grass(370, '#A5D6A7', '#7CB342')}
    ${animal(200, 340, 'dog')}
    ${animal(400, 350, 'cat')}
    ${animal(600, 330, 'bird')}
    ${animal(750, 340, 'elephant')}
    ${boy(320, 320, 0.9, { shirt: '#66BB6A' })}
    ${girl(480, 320, 0.9, { dress: '#FFD54F', hair: 'pigtails' })}
    <rect x="100" y="280" width="80" height="60" rx="4" fill="#8D6E63" stroke="${O}" stroke-width="1.5"/>
    <text x="140" y="318" text-anchor="middle" font-family="Arial,sans-serif" font-size="14" font-weight="700" fill="#FFF">ZOO</text>`,
};

/** Lớp 1 unit scene illustrations (850×500) — Global Success 1 places. */
export const LOP1_SCENES: Record<number, string> = {
  // Unit 1: In the school playground — ball / bike / book
  1: `${sky('#81D4FA', '#E1F5FE')}${sun()}${cloud(160, 55)}${cloud(480, 40, 0.85)}${grass(350)}
    ${schoolBuilding(700, 260)}
    ${boy(280, 300, 1.05, { shirt: '#42A5F5' })}
    <circle cx="360" cy="360" r="22" fill="#EF5350" stroke="${O}" stroke-width="2"/>
    <path d="M348 360 Q360 348 372 360 Q360 372 348 360" fill="#FFFFFF" opacity="0.35"/>
    ${girl(480, 305, 1, { dress: '#EC407A', hair: 'pigtails' })}
    <rect x="450" y="250" width="36" height="46" rx="3" fill="#FFF59D" stroke="${O}" stroke-width="1.5"/>
    <line x1="456" y1="262" x2="478" y2="262" stroke="#F9A825" stroke-width="2"/>
    <line x1="456" y1="272" x2="474" y2="272" stroke="#F9A825" stroke-width="2"/>
    <g transform="translate(170,330)">
      <ellipse cx="0" cy="20" rx="38" ry="12" fill="#546E7A" stroke="${O}" stroke-width="1.5"/>
      <circle cx="-28" cy="18" r="12" fill="#37474F" stroke="${O}" stroke-width="1.5"/>
      <circle cx="28" cy="18" r="12" fill="#37474F" stroke="${O}" stroke-width="1.5"/>
      <rect x="-22" y="-8" width="44" height="18" rx="4" fill="#66BB6A" stroke="${O}" stroke-width="1.5"/>
    </g>`,

  // Unit 2: In the dining room — cake / car / cat / cup
  2: `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#FFE0B2"/><stop offset="100%" stop-color="#FFF8E1"/></linearGradient></defs>
    <rect width="850" height="500" fill="url(#sky)"/>
    <rect x="0" y="300" width="850" height="200" fill="#D7CCC8"/>
    <rect x="120" y="220" width="420" height="28" rx="4" fill="#8D6E63" stroke="${O}" stroke-width="2"/>
    <rect x="140" y="248" width="18" height="70" fill="#6D4C41" stroke="${O}" stroke-width="1"/>
    <rect x="500" y="248" width="18" height="70" fill="#6D4C41" stroke="${O}" stroke-width="1"/>
    ${birthdayCake(280, 175)}
    <g transform="translate(400,200)">
      <ellipse cx="0" cy="8" rx="18" ry="14" fill="#FFFFFF" stroke="${O}" stroke-width="2"/>
      <rect x="-14" y="-18" width="28" height="22" rx="4" fill="#81D4FA" stroke="${O}" stroke-width="1.5"/>
      <ellipse cx="0" cy="-18" rx="16" ry="5" fill="#4FC3F7" stroke="${O}" stroke-width="1"/>
    </g>
    ${animal(620, 340, 'cat')}
    ${girl(200, 330, 0.95, { dress: '#FF7043', hair: 'bob' })}
    <g transform="translate(720,300) scale(0.85)">
      <rect x="-40" y="0" width="80" height="28" rx="8" fill="#EF5350" stroke="${O}" stroke-width="2"/>
      <circle cx="-28" cy="30" r="10" fill="#37474F" stroke="${O}" stroke-width="1.5"/>
      <circle cx="28" cy="30" r="10" fill="#37474F" stroke="${O}" stroke-width="1.5"/>
      <rect x="20" y="-18" width="28" height="22" rx="4" fill="#81D4FA" stroke="${O}" stroke-width="1.5"/>
    </g>`,

  // Unit 3: At the street market — apple / bag / can / hat
  3: `${sky('#FFF59D', '#FFFDE7')}${sun(720, 70, 38)}${grass(380, '#A5D6A7', '#81C784')}
    <rect x="80" y="200" width="220" height="140" rx="6" fill="#8D6E63" stroke="${O}" stroke-width="2"/>
    <rect x="90" y="160" width="200" height="45" rx="4" fill="#EF5350" stroke="${O}" stroke-width="2"/>
    <text x="190" y="190" text-anchor="middle" font-family="Arial,sans-serif" font-size="16" font-weight="700" fill="#FFF">MARKET</text>
    <circle cx="130" cy="250" r="16" fill="#EF5350" stroke="${O}" stroke-width="1.5"/>
    <circle cx="170" cy="255" r="14" fill="#FF7043" stroke="${O}" stroke-width="1.5"/>
    <circle cx="210" cy="248" r="15" fill="#66BB6A" stroke="${O}" stroke-width="1.5"/>
    <rect x="240" y="235" width="30" height="40" rx="4" fill="#90A4AE" stroke="${O}" stroke-width="1.5"/>
    ${girl(420, 320, 1, { dress: '#EC407A', hair: 'pigtails' })}
    <path d="M390 300 Q370 280 360 250" fill="none" stroke="#8D6E63" stroke-width="6" stroke-linecap="round"/>
    <rect x="340" y="230" width="40" height="35" rx="6" fill="#FFCC80" stroke="${O}" stroke-width="1.5"/>
    ${boy(580, 320, 1, { shirt: '#42A5F5' })}
    <ellipse cx="620" cy="250" rx="28" ry="14" fill="#7E57C2" stroke="${O}" stroke-width="1.5"/>
    <rect x="605" y="250" width="30" height="8" fill="#5E35B1"/>
    ${cloud(500, 55, 0.9)}`,

  // Unit 4: In the bedroom — desk / dog / door / duck
  4: `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#B3E5FC"/><stop offset="100%" stop-color="#E1F5FE"/></linearGradient></defs>
    <rect width="850" height="500" fill="url(#sky)"/>
    <rect x="0" y="320" width="850" height="180" fill="#D7CCC8"/>
    <rect x="60" y="120" width="70" height="200" rx="4" fill="#8D6E63" stroke="${O}" stroke-width="2"/>
    <circle cx="115" cy="220" r="6" fill="#FFD54F" stroke="${O}" stroke-width="1"/>
    <rect x="200" y="200" width="160" height="90" rx="4" fill="#A1887F" stroke="${O}" stroke-width="2"/>
    <rect x="210" y="160" width="140" height="45" rx="3" fill="#6D4C41" stroke="${O}" stroke-width="1.5"/>
    <rect x="230" y="170" width="50" height="30" rx="2" fill="#81D4FA" stroke="${O}" stroke-width="1"/>
    ${bed(520, 270)}
    ${animal(720, 340, 'dog')}
    ${boy(380, 330, 0.95, { shirt: '#66BB6A', hair: 'short' })}
    <g transform="translate(160,360) scale(0.7)">
      <ellipse cx="0" cy="10" rx="28" ry="18" fill="#FFD54F" stroke="${O}" stroke-width="2"/>
      <circle cx="22" cy="-5" r="14" fill="#FFD54F" stroke="${O}" stroke-width="1.5"/>
      <ellipse cx="32" cy="-5" rx="8" ry="4" fill="#FF7043" stroke="${O}" stroke-width="1"/>
      ${eye(18, -7)}${eye(26, -7, true)}
    </g>`,

  // Unit 5: At the fish and chip shop — chicken / chips / fish / milk
  5: `${sky('#FFE082', '#FFF8E1')}${grass(390)}
    <rect x="180" y="140" width="320" height="200" rx="8" fill="#FFFFFF" stroke="${O}" stroke-width="2"/>
    <rect x="180" y="140" width="320" height="48" fill="#EF6C00" stroke="${O}" stroke-width="2"/>
    <text x="340" y="172" text-anchor="middle" font-family="Arial,sans-serif" font-size="18" font-weight="700" fill="#FFF">FISH &amp; CHIPS</text>
    <ellipse cx="250" cy="250" rx="35" ry="18" fill="#81D4FA" stroke="${O}" stroke-width="1.5"/>
    <polygon points="285,250 310,240 310,260" fill="#4FC3F7" stroke="${O}" stroke-width="1"/>
    <rect x="340" y="230" width="50" height="40" rx="4" fill="#FFD54F" stroke="${O}" stroke-width="1.5"/>
    <rect x="348" y="238" width="8" height="24" fill="#FFA000"/>
    <rect x="360" y="238" width="8" height="24" fill="#FFA000"/>
    <rect x="372" y="238" width="8" height="24" fill="#FFA000"/>
    <rect x="420" y="235" width="28" height="40" rx="6" fill="#FFFFFF" stroke="${O}" stroke-width="1.5"/>
    <rect x="424" y="240" width="20" height="28" fill="#E3F2FD"/>
    ${girl(600, 320, 1, { dress: '#FF7043' })}
    ${boy(720, 320, 0.95, { shirt: '#42A5F5' })}
    ${cloud(700, 50)}`,

  // Unit 6: In the classroom — bell / pen / pencil / red
  6: `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#C8E6C9"/><stop offset="100%" stop-color="#E8F5E9"/></linearGradient></defs>
    <rect width="850" height="500" fill="url(#sky)"/>
    <rect x="0" y="380" width="850" height="120" fill="#BCAAA4"/>
    <rect x="120" y="80" width="420" height="220" rx="6" fill="#2E7D32" stroke="${O}" stroke-width="2"/>
    <rect x="140" y="100" width="380" height="180" fill="#43A047" stroke="${O}" stroke-width="1"/>
    <text x="330" y="200" text-anchor="middle" font-family="Arial,sans-serif" font-size="42" font-weight="700" fill="#FFFFFF">A B C</text>
    <g transform="translate(600,120)">
      <ellipse cx="0" cy="20" rx="28" ry="24" fill="#FFD54F" stroke="${O}" stroke-width="2"/>
      <rect x="-6" y="-10" width="12" height="18" fill="#8D6E63" stroke="${O}" stroke-width="1"/>
      <line x1="0" y1="-10" x2="0" y2="-28" stroke="${O}" stroke-width="2"/>
    </g>
    <rect x="560" y="280" width="14" height="70" rx="3" fill="#EF5350" stroke="${O}" stroke-width="1.5"/>
    <polygon points="567,280 560,265 574,265" fill="#C62828" stroke="${O}" stroke-width="1"/>
    <rect x="590" y="270" width="14" height="80" rx="3" fill="#FFD54F" stroke="${O}" stroke-width="1.5"/>
    <polygon points="597,270 590,255 604,255" fill="#F9A825" stroke="${O}" stroke-width="1"/>
    ${boy(280, 340, 0.95, { shirt: '#EF5350' })}
    ${girl(420, 340, 0.95, { dress: '#42A5F5', hair: 'bob' })}`,

  // Unit 7: In the garden — garden / gate / girl / goat
  7: `${sky('#A5D6A7', '#E8F5E9')}${sun(700, 70)}${cloud(180, 50)}${grass(360, '#7CB342', '#558B2F')}
    <rect x="80" y="200" width="18" height="160" fill="#8D6E63" stroke="${O}" stroke-width="1.5"/>
    <rect x="220" y="200" width="18" height="160" fill="#8D6E63" stroke="${O}" stroke-width="1.5"/>
    <rect x="98" y="210" width="122" height="100" fill="#A1887F" stroke="${O}" stroke-width="1.5"/>
    <line x1="98" y1="240" x2="220" y2="240" stroke="${O}" stroke-width="1.5"/>
    <line x1="98" y1="270" x2="220" y2="270" stroke="${O}" stroke-width="1.5"/>
    <line x1="130" y1="210" x2="130" y2="310" stroke="${O}" stroke-width="1.5"/>
    <line x1="170" y1="210" x2="170" y2="310" stroke="${O}" stroke-width="1.5"/>
    <circle cx="350" cy="300" r="28" fill="#EF5350" stroke="${O}" stroke-width="1.5"/>
    <circle cx="400" cy="310" r="22" fill="#EC407A" stroke="${O}" stroke-width="1.5"/>
    <circle cx="440" cy="295" r="20" fill="#FFD54F" stroke="${O}" stroke-width="1.5"/>
    <rect x="340" y="320" width="8" height="40" fill="#558B2F"/>
    <rect x="392" y="325" width="8" height="35" fill="#558B2F"/>
    <rect x="432" y="310" width="8" height="50" fill="#558B2F"/>
    ${girl(520, 310, 1.05, { dress: '#66BB6A', hair: 'pigtails' })}
    <g transform="translate(700,340)">
      <ellipse cx="0" cy="10" rx="32" ry="22" fill="#ECEFF1" stroke="${O}" stroke-width="2"/>
      <circle cx="28" cy="-8" r="16" fill="#ECEFF1" stroke="${O}" stroke-width="1.5"/>
      <rect x="38" y="-12" width="14" height="8" rx="2" fill="#FFCC80" stroke="${O}" stroke-width="1"/>
      ${eye(22, -10)}${eye(32, -10, true)}
      <ellipse cx="-20" cy="-5" rx="8" ry="12" fill="#B0BEC5" stroke="${O}" stroke-width="1"/>
      <ellipse cx="-8" cy="-8" rx="8" ry="12" fill="#B0BEC5" stroke="${O}" stroke-width="1"/>
    </g>`,

  // Unit 8: In the park — hair / hand / head / horse
  8: `${sky('#81D4FA', '#B3E5FC')}${sun()}${cloud(200, 60)}${grass(360)}
    <rect x="80" y="220" width="60" height="140" fill="#8D6E63" stroke="${O}" stroke-width="1.5"/>
    <ellipse cx="110" cy="200" rx="50" ry="40" fill="#66BB6A" stroke="${O}" stroke-width="1.5"/>
    <ellipse cx="140" cy="210" rx="35" ry="28" fill="#7CB342" stroke="${O}" stroke-width="1"/>
    ${boy(320, 310, 1, { shirt: '#FF7043' })}
    <path d="M290 280 Q310 250 330 280" fill="none" stroke="${SKIN}" stroke-width="10" stroke-linecap="round"/>
    <ellipse cx="340" cy="255" rx="14" ry="10" fill="${SKIN}" stroke="${O}" stroke-width="1.5"/>
    ${girl(480, 310, 1, { dress: '#AB47BC', hair: 'long' })}
    <g transform="translate(680,320) scale(0.95)">
      <ellipse cx="0" cy="20" rx="45" ry="28" fill="#8D6E63" stroke="${O}" stroke-width="2"/>
      <circle cx="40" cy="-5" r="22" fill="#8D6E63" stroke="${O}" stroke-width="2"/>
      <rect x="55" y="-15" width="20" height="10" rx="3" fill="#5D4037" stroke="${O}" stroke-width="1"/>
      ${eye(35, -8)}${eye(48, -8, true)}
      <line x1="-30" y1="40" x2="-30" y2="70" stroke="#5D4037" stroke-width="8" stroke-linecap="round"/>
      <line x1="20" y1="40" x2="20" y2="70" stroke="#5D4037" stroke-width="8" stroke-linecap="round"/>
      <path d="M-40 15 Q-60 0 -55 -10" fill="none" stroke="#8D6E63" stroke-width="10" stroke-linecap="round"/>
    </g>`,

  // Unit 9: In the shop — clocks / locks / mops / pots
  9: `${sky('#E1BEE7', '#F3E5F5')}${grass(390)}
    <rect x="150" y="100" width="550" height="250" rx="8" fill="#FFFFFF" stroke="${O}" stroke-width="2"/>
    <rect x="150" y="100" width="550" height="42" fill="#7B1FA2" stroke="${O}" stroke-width="2"/>
    <text x="425" y="128" text-anchor="middle" font-family="Arial,sans-serif" font-size="20" font-weight="700" fill="#FFF">SHOP</text>
    <circle cx="240" cy="220" r="28" fill="#42A5F5" stroke="${O}" stroke-width="2"/>
    <circle cx="240" cy="220" r="20" fill="#FFFFFF" stroke="${O}" stroke-width="1.5"/>
    <line x1="240" y1="220" x2="240" y2="205" stroke="${O}" stroke-width="2"/>
    <line x1="240" y1="220" x2="252" y2="228" stroke="#E53935" stroke-width="2"/>
    <rect x="320" y="195" width="40" height="50" rx="4" fill="#FFD54F" stroke="${O}" stroke-width="1.5"/>
    <circle cx="340" cy="220" r="6" fill="#546E7A" stroke="${O}" stroke-width="1"/>
    <line x1="420" y1="180" x2="420" y2="260" stroke="#8D6E63" stroke-width="6" stroke-linecap="round"/>
    <rect x="400" y="250" width="40" height="18" rx="4" fill="#90A4AE" stroke="${O}" stroke-width="1.5"/>
    <ellipse cx="520" cy="240" rx="30" ry="22" fill="#EF5350" stroke="${O}" stroke-width="1.5"/>
    <ellipse cx="520" cy="220" rx="22" ry="10" fill="#FF7043" stroke="${O}" stroke-width="1"/>
    ${girl(620, 360, 0.95, { dress: '#EC407A' })}
    ${boy(280, 360, 0.9, { shirt: '#26C6DA' })}`,

  // Unit 10: At the zoo — mango / monkey / mother / mouse
  10: `${sky('#81D4FA', '#E1F5FE')}${sun(700, 60)}${grass(370, '#A5D6A7', '#7CB342')}
    <rect x="60" y="200" width="120" height="160" rx="6" fill="#8D6E63" stroke="${O}" stroke-width="2"/>
    <text x="120" y="250" text-anchor="middle" font-family="Arial,sans-serif" font-size="22" font-weight="700" fill="#FFF">ZOO</text>
    <g transform="translate(320,300)">
      <ellipse cx="0" cy="20" rx="30" ry="24" fill="#A1887F" stroke="${O}" stroke-width="2"/>
      <circle cx="0" cy="-10" r="20" fill="#A1887F" stroke="${O}" stroke-width="2"/>
      <ellipse cx="-18" cy="-5" rx="10" ry="14" fill="#BCAAA4" stroke="${O}" stroke-width="1"/>
      <ellipse cx="18" cy="-5" rx="10" ry="14" fill="#BCAAA4" stroke="${O}" stroke-width="1"/>
      ${eye(-7, -12)}${eye(7, -12, true)}
      ${smile(0, 0, 5)}
      <path d="M-25 25 Q-45 40 -30 55" fill="none" stroke="#A1887F" stroke-width="10" stroke-linecap="round"/>
    </g>
    <g transform="translate(480,350) scale(0.75)">
      <ellipse cx="0" cy="10" rx="22" ry="16" fill="#B0BEC5" stroke="${O}" stroke-width="1.5"/>
      <circle cx="18" cy="-5" r="12" fill="#B0BEC5" stroke="${O}" stroke-width="1.5"/>
      <ellipse cx="26" cy="-2" rx="6" ry="3" fill="#FFCC80" stroke="${O}" stroke-width="1"/>
      ${eye(14, -7)}${eye(22, -7, true)}
      <ellipse cx="-8" cy="-8" rx="6" ry="8" fill="#90A4AE" stroke="${O}" stroke-width="1"/>
    </g>
    <ellipse cx="620" cy="280" rx="22" ry="28" fill="#FFA000" stroke="${O}" stroke-width="1.5"/>
    <ellipse cx="620" cy="260" rx="10" ry="8" fill="#EF6C00" stroke="${O}" stroke-width="1"/>
    ${adult(700, 320, 0.85, '#EC407A')}
    ${boy(200, 330, 0.9, { shirt: '#42A5F5' })}`,

  // Unit 11: At the bus stop — bus / run / sun / truck
  11: `${sky('#4FC3F7', '#B3E5FC')}${sun(720, 70, 48)}${cloud(180, 55)}${grass(380)}
    <rect x="40" y="220" width="8" height="160" fill="#90A4AE" stroke="${O}" stroke-width="1"/>
    <rect x="20" y="200" width="90" height="50" rx="4" fill="#FFD54F" stroke="${O}" stroke-width="1.5"/>
    <text x="65" y="232" text-anchor="middle" font-family="Arial,sans-serif" font-size="12" font-weight="700" fill="${O}">BUS</text>
    <g transform="translate(280,300)">
      <rect x="-80" y="-30" width="160" height="70" rx="10" fill="#EF5350" stroke="${O}" stroke-width="2"/>
      <rect x="-70" y="-20" width="35" height="28" rx="3" fill="#81D4FA" stroke="${O}" stroke-width="1"/>
      <rect x="-25" y="-20" width="35" height="28" rx="3" fill="#81D4FA" stroke="${O}" stroke-width="1"/>
      <rect x="20" y="-20" width="35" height="28" rx="3" fill="#81D4FA" stroke="${O}" stroke-width="1"/>
      <circle cx="-45" cy="45" r="16" fill="#37474F" stroke="${O}" stroke-width="2"/>
      <circle cx="45" cy="45" r="16" fill="#37474F" stroke="${O}" stroke-width="2"/>
    </g>
    <g transform="translate(620,310) scale(0.9)">
      <rect x="-60" y="-20" width="120" height="50" rx="8" fill="#42A5F5" stroke="${O}" stroke-width="2"/>
      <rect x="20" y="-40" width="50" height="30" rx="4" fill="#1565C0" stroke="${O}" stroke-width="1.5"/>
      <rect x="28" y="-32" width="28" height="18" rx="2" fill="#81D4FA" stroke="${O}" stroke-width="1"/>
      <circle cx="-35" cy="35" r="14" fill="#37474F" stroke="${O}" stroke-width="2"/>
      <circle cx="35" cy="35" r="14" fill="#37474F" stroke="${O}" stroke-width="2"/>
    </g>
    ${boy(450, 330, 0.95, { shirt: '#66BB6A' })}
    <path d="M430 340 Q400 320 390 300" fill="none" stroke="${SKIN}" stroke-width="8" stroke-linecap="round"/>`,

  // Unit 12: At the lake — lake / leaf / lemons / Lucy
  12: `${sky('#4FC3F7', '#E1F5FE')}${sun(680, 60)}${cloud(200, 50)}
    <ellipse cx="425" cy="380" rx="320" ry="70" fill="#29B6F6" stroke="${O}" stroke-width="2"/>
    <ellipse cx="425" cy="370" rx="280" ry="40" fill="#4FC3F7" opacity="0.7"/>
    <ellipse cx="200" cy="300" rx="40" ry="18" fill="#66BB6A" stroke="${O}" stroke-width="1.5" transform="rotate(-30 200 300)"/>
    <line x1="220" y1="310" x2="250" y2="340" stroke="#558B2F" stroke-width="3"/>
    <circle cx="620" cy="250" r="16" fill="#FFEB3B" stroke="${O}" stroke-width="1.5"/>
    <circle cx="655" cy="245" r="14" fill="#FFD54F" stroke="${O}" stroke-width="1.5"/>
    <circle cx="640" cy="275" r="15" fill="#FFEE58" stroke="${O}" stroke-width="1.5"/>
    ${girl(350, 280, 1, { dress: '#EC407A', hair: 'pigtails' })}
    ${boy(520, 285, 0.95, { shirt: '#42A5F5' })}
    ${grass(430, '#81C784', '#558B2F')}`,

  // Unit 13: In the school canteen — bananas / noodles / nuts / Nick
  13: `${sky('#FFE082', '#FFFDE7')}${grass(390)}
    <rect x="100" y="150" width="450" height="200" rx="8" fill="#FFFFFF" stroke="${O}" stroke-width="2"/>
    <rect x="100" y="150" width="450" height="40" fill="#00897B" stroke="${O}" stroke-width="2"/>
    <text x="325" y="178" text-anchor="middle" font-family="Arial,sans-serif" font-size="18" font-weight="700" fill="#FFF">CANTEEN</text>
    <path d="M160 240 Q180 210 200 240 Q220 210 240 240" fill="#FFD54F" stroke="${O}" stroke-width="1.5"/>
    <ellipse cx="320" cy="250" rx="45" ry="20" fill="#FFF59D" stroke="${O}" stroke-width="1.5"/>
    <path d="M280 250 Q300 240 320 250 Q340 260 360 250" fill="none" stroke="#FFCC80" stroke-width="3"/>
    <circle cx="420" cy="245" r="10" fill="#8D6E63" stroke="${O}" stroke-width="1"/>
    <circle cx="445" cy="250" r="9" fill="#A1887F" stroke="${O}" stroke-width="1"/>
    <circle cx="430" cy="265" r="8" fill="#6D4C41" stroke="${O}" stroke-width="1"/>
    ${boy(650, 320, 1.05, { shirt: '#26C6DA', hair: 'spiky' })}
    ${girl(520, 330, 0.9, { dress: '#FF7043' })}`,

  // Unit 14: In the toy shop — teddy / tiger / top / turtle
  14: `${sky('#F8BBD0', '#FCE4EC')}${grass(390)}
    <rect x="120" y="110" width="500" height="240" rx="8" fill="#FFFFFF" stroke="${O}" stroke-width="2"/>
    <rect x="120" y="110" width="500" height="42" fill="#C2185B" stroke="${O}" stroke-width="2"/>
    <text x="370" y="138" text-anchor="middle" font-family="Arial,sans-serif" font-size="20" font-weight="700" fill="#FFF">TOY SHOP</text>
    <g transform="translate(220,240)">
      <ellipse cx="0" cy="15" rx="28" ry="24" fill="#A1887F" stroke="${O}" stroke-width="2"/>
      <circle cx="0" cy="-12" r="20" fill="#A1887F" stroke="${O}" stroke-width="2"/>
      <circle cx="-18" cy="-5" r="10" fill="#8D6E63" stroke="${O}" stroke-width="1"/>
      <circle cx="18" cy="-5" r="10" fill="#8D6E63" stroke="${O}" stroke-width="1"/>
      ${eye(-7, -14)}${eye(7, -14, true)}
      <ellipse cx="0" cy="-2" rx="5" ry="4" fill="#5D4037"/>
    </g>
    <g transform="translate(370,245)">
      <ellipse cx="0" cy="15" rx="32" ry="22" fill="#FFA000" stroke="${O}" stroke-width="2"/>
      <circle cx="0" cy="-10" r="18" fill="#FFA000" stroke="${O}" stroke-width="2"/>
      <path d="M-15 -5 L-5 5 M5 5 L15 -5 M-8 12 L8 12" stroke="#5D4037" stroke-width="2"/>
      ${eye(-6, -12)}${eye(6, -12, true)}
      <polygon points="-12,-28 -6,-16 -16,-16" fill="#FFA000" stroke="${O}" stroke-width="1"/>
      <polygon points="12,-28 6,-16 16,-16" fill="#FFA000" stroke="${O}" stroke-width="1"/>
    </g>
    <g transform="translate(500,250)">
      <ellipse cx="0" cy="10" rx="30" ry="20" fill="#66BB6A" stroke="${O}" stroke-width="2"/>
      <circle cx="25" cy="0" r="12" fill="#81C784" stroke="${O}" stroke-width="1.5"/>
      ${eye(22, -2)}${eye(30, -2, true)}
      <path d="M-20 5 Q-35 -5 -30 -15" fill="none" stroke="#558B2F" stroke-width="4" stroke-linecap="round"/>
    </g>
    <g transform="translate(300,320)">
      <ellipse cx="0" cy="0" rx="18" ry="10" fill="#7E57C2" stroke="${O}" stroke-width="1.5"/>
      <polygon points="0,-18 -8,0 8,0" fill="#AB47BC" stroke="${O}" stroke-width="1"/>
      <line x1="0" y1="10" x2="0" y2="28" stroke="${O}" stroke-width="2"/>
    </g>
    ${girl(700, 330, 0.95, { dress: '#EC407A', hair: 'bob' })}`,

  // Unit 15: At the football match — face / father / foot / football
  15: `${sky('#81D4FA', '#E3F2FD')}${cloud(150, 50)}${grass(340, '#66BB6A', '#43A047')}
    <rect x="0" y="340" width="850" height="8" fill="#FFFFFF" stroke="${O}" stroke-width="1"/>
    <rect x="700" y="220" width="12" height="120" fill="#FFFFFF" stroke="${O}" stroke-width="1"/>
    <rect x="650" y="220" width="100" height="12" fill="#FFFFFF" stroke="${O}" stroke-width="1"/>
    <circle cx="380" cy="360" r="20" fill="#FFFFFF" stroke="${O}" stroke-width="2"/>
    <path d="M370 350 L390 370 M390 350 L370 370 M365 360 L395 360 M380 345 L380 375" stroke="${O}" stroke-width="1.5"/>
    ${boy(280, 290, 1.05, { shirt: '#EF5350', pants: '#FFFFFF' })}
    ${adult(480, 300, 0.95, '#1565C0')}
    ${boy(600, 305, 0.9, { shirt: '#FFD54F', hair: 'curly' })}
    <ellipse cx="250" cy="380" rx="18" ry="10" fill="#37474F" stroke="${O}" stroke-width="1.5"/>
    <text x="425" y="100" text-anchor="middle" font-family="Arial,sans-serif" font-size="28" font-weight="700" fill="#1565C0">FOOTBALL</text>`,

  // Unit 16: At home — wash / water / window / Wendy
  16: `${sky('#B3E5FC', '#E1F5FE')}${cloud(500, 50)}${grass(390)}
    ${house(400, 250)}
    <rect x="370" y="255" width="28" height="28" fill="#81D4FA" stroke="${O}" stroke-width="1.5"/>
    <line x1="384" y1="255" x2="384" y2="283" stroke="${O}" stroke-width="1"/>
    <line x1="370" y1="269" x2="398" y2="269" stroke="${O}" stroke-width="1"/>
    <g transform="translate(200,300)">
      <rect x="-25" y="0" width="50" height="40" rx="4" fill="#90A4AE" stroke="${O}" stroke-width="1.5"/>
      <ellipse cx="0" cy="5" rx="18" ry="8" fill="#4FC3F7" stroke="${O}" stroke-width="1"/>
      <path d="M-10 5 Q0 -10 10 5" fill="#29B6F6" opacity="0.6"/>
    </g>
    ${girl(580, 320, 1, { dress: '#7E57C2', hair: 'long' })}
    ${boy(250, 330, 0.9, { shirt: '#26C6DA' })}
    <path d="M230 310 Q200 290 190 270" fill="none" stroke="${SKIN}" stroke-width="8" stroke-linecap="round"/>
    <ellipse cx="185" cy="260" rx="12" ry="8" fill="#4FC3F7" stroke="${O}" stroke-width="1" opacity="0.7"/>`,
};

/** Lớp 8 unit scene illustrations (850×500). */
export const LOP8_SCENES: Record<number, string> = {
  1: `${sky('#FFCCBC', '#FFE0B2')}${grass(380)}
    ${teen(250, 320, 1, '#FF7043')}
    <rect x="200" y="220" width="80" height="55" rx="6" fill="#37474F" stroke="${O}" stroke-width="2"/>
    <rect x="208" y="228" width="64" height="39" rx="3" fill="#4FC3F7" stroke="${O}" stroke-width="1"/>
    ${teen(450, 320, 1, '#7E57C2')}
    <rect x="420" y="240" width="25" height="40" rx="3" fill="#37474F" stroke="${O}" stroke-width="1.5"/>
    <circle cx="432" cy="230" r="8" fill="#66BB6A" stroke="${O}" stroke-width="1"/>
    ${teen(650, 320, 1, '#26C6DA')}
    <ellipse cx="700" cy="260" rx="20" ry="8" fill="#FFD54F" stroke="${O}" stroke-width="1.5"/>
    <path d="M685 255 Q700 240 715 255" fill="none" stroke="${O}" stroke-width="1.5"/>`,

  2: `${sky('#81D4FA', '#B3E5FC')}${sun()}${cloud(180, 60)}
    ${grass(370, '#A5D6A7', '#7CB342')}
    <rect x="500" y="180" width="100" height="70" fill="#8D6E63" stroke="${O}" stroke-width="2"/>
    <polygon points="500,180 550,140 600,180" fill="#EF5350" stroke="${O}" stroke-width="2"/>
    <path d="M0 370 Q150 340 300 370 Q450 400 600 370 Q750 340 850 370 L850 500 L0 500 Z" fill="#C5E1A5" stroke="${O}" stroke-width="1"/>
    <path d="M100 370 L120 350 L140 370 L160 355 L180 370" fill="none" stroke="#FFD54F" stroke-width="3"/>
    ${teen(350, 340, 1, '#66BB6A')}
    <rect x="320" y="280" width="60" height="8" rx="2" fill="#8D6E63" stroke="${O}" stroke-width="1"/>
    ${animal(620, 360, 'dog')}`,

  3: `${sky('#CE93D8', '#E1BEE7')}${grass(380)}
    ${teen(220, 320, 1, '#42A5F5')}
    ${teen(380, 320, 1, '#EC407A')}
    ${teen(540, 320, 1, '#66BB6A')}
    ${teen(680, 320, 0.95, '#FF7043')}
    <rect x="300" y="160" width="250" height="60" rx="8" fill="#FFFFFF" stroke="${O}" stroke-width="2" opacity="0.8"/>
    <text x="425" y="198" text-anchor="middle" font-family="Arial,sans-serif" font-size="22" font-weight="700" fill="#7B1FA2">TEENAGERS</text>
    ${cloud(150, 50)}${cloud(650, 70)}`,

  4: `${sky('#FFCDD2', '#FFEBEE')}${grass(380)}
    ${teen(200, 320, 1, '#D32F2F')}
    <path d="M170 260 Q200 220 230 260 L220 310 Q200 320 180 310 Z" fill="#F9A825" stroke="${O}" stroke-width="1.5"/>
    ${teen(380, 320, 1, '#5D4037')}
    <path d="M350 260 Q380 220 410 260 L400 310 Q380 320 360 310 Z" fill="#FFD54F" stroke="${O}" stroke-width="1.5"/>
    ${teen(560, 320, 1, '#FFFFFF')}
    <path d="M530 260 Q560 220 590 260 L580 310 Q560 320 540 310 Z" fill="#EF5350" stroke="${O}" stroke-width="1.5"/>
    ${teen(720, 320, 0.95, '#EC407A')}
    <path d="M690 260 Q720 220 750 260 L740 310 Q720 320 700 310 Z" fill="#7E57C2" stroke="${O}" stroke-width="1.5"/>
    <rect x="150" y="140" width="550" height="50" rx="8" fill="#C62828" stroke="${O}" stroke-width="2"/>
    <text x="425" y="172" text-anchor="middle" font-family="Arial,sans-serif" font-size="18" font-weight="700" fill="#FFFFFF">ETHNIC GROUPS OF VIET NAM</text>`,

  5: `${sky('#FFE082', '#FFF9C4')}${grass(380)}
    <rect x="300" y="200" width="250" height="120" rx="8" fill="#EF5350" stroke="${O}" stroke-width="2"/>
    <rect x="310" y="210" width="230" height="30" fill="#FFD54F" stroke="${O}" stroke-width="1"/>
    <text x="425" y="232" text-anchor="middle" font-family="Arial,sans-serif" font-size="16" font-weight="700" fill="#C62828">CHÚC MỪNG NĂM MỚI</text>
    ${teen(350, 340, 1, '#EC407A')}
    <path d="M320 280 Q350 240 380 280 L370 330 Q350 340 330 330 Z" fill="#FFD54F" stroke="${O}" stroke-width="1.5"/>
    ${teen(500, 340, 1, '#42A5F5')}
    <ellipse cx="425" cy="170" rx="20" ry="25" fill="#FFD54F" stroke="${O}" stroke-width="1.5"/>
    <line x1="425" y1="145" x2="425" y2="125" stroke="${O}" stroke-width="2"/>
    <circle cx="380" cy="160" r="8" fill="#EF5350" stroke="${O}" stroke-width="1"/>
    <circle cx="470" cy="160" r="8" fill="#FFD54F" stroke="${O}" stroke-width="1"/>`,

  6: `${sky('#B2EBF2', '#E0F7FA')}${grass(380)}
    ${teen(250, 320, 1, '#26C6DA')}
    <path d="M220 280 Q250 240 280 280" fill="none" stroke="${SKIN}" stroke-width="10" stroke-linecap="round"/>
    <circle cx="280" cy="250" r="12" fill="#FF7043" stroke="${O}" stroke-width="1.5"/>
    ${teen(550, 320, 1, '#78909C')}
    <rect x="520" y="250" width="60" height="40" rx="4" fill="#37474F" stroke="${O}" stroke-width="1.5"/>
    <rect x="528" y="258" width="44" height="24" rx="2" fill="#4FC3F7"/>
    <rect x="680" y="200" width="80" height="100" rx="6" fill="#FFFFFF" stroke="${O}" stroke-width="2"/>
    <rect x="690" y="210" width="25" height="20" fill="#EF5350" stroke="${O}" stroke-width="1"/>
    <rect x="720" y="210" width="25" height="20" fill="#66BB6A" stroke="${O}" stroke-width="1"/>
    <rect x="690" y="240" width="25" height="20" fill="#FFD54F" stroke="${O}" stroke-width="1"/>
    <rect x="720" y="240" width="25" height="20" fill="#42A5F5" stroke="${O}" stroke-width="1"/>
    <text x="720" y="195" text-anchor="middle" font-family="Arial,sans-serif" font-size="12" font-weight="700" fill="${O}">HEALTHY</text>`,
};

export function buildCartoonUnitSvg(
  unit: number,
  title: string,
  scene: string,
  badgeColor: string,
  width: number,
  height: number,
): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="Unit ${unit}: ${title}">
  ${scene}
  ${unitBadge(unit, badgeColor)}
</svg>
`;
}

const PRIMARY_PALETTES: Array<{ top: string; bottom: string; accent: string; shirt: string; dress: string }> = [
  { top: '#81D4FA', bottom: '#E1F5FE', accent: '#1565C0', shirt: '#42A5F5', dress: '#EC407A' },
  { top: '#FFE082', bottom: '#FFF8E1', accent: '#EF6C00', shirt: '#FF7043', dress: '#AB47BC' },
  { top: '#A5D6A7', bottom: '#E8F5E9', accent: '#2E7D32', shirt: '#66BB6A', dress: '#26C6DA' },
  { top: '#CE93D8', bottom: '#F3E5F5', accent: '#7B1FA2', shirt: '#7E57C2', dress: '#EC407A' },
  { top: '#FFCCBC', bottom: '#FBE9E7', accent: '#D84315', shirt: '#FF7043', dress: '#FFD54F' },
  { top: '#B3E5FC', bottom: '#E1F5FE', accent: '#0277BD', shirt: '#29B6F6', dress: '#66BB6A' },
  { top: '#FFF59D', bottom: '#FFFDE7', accent: '#F9A825', shirt: '#FFA000', dress: '#42A5F5' },
  { top: '#B2DFDB', bottom: '#E0F2F1', accent: '#00695C', shirt: '#26A69A', dress: '#EC407A' },
];

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function titleFontSize(title: string): number {
  const len = title.length;
  if (len <= 14) return 34;
  if (len <= 22) return 28;
  if (len <= 30) return 24;
  return 20;
}

/**
 * Primary (GS2/3/5) unit card scene: theme background + kids +
 * unit title centred in a cloud (matches PDF slide layout).
 */
export function buildPrimaryCenteredUnitScene(
  grade: number,
  unit: number,
  title: string,
): string {
  const palette = PRIMARY_PALETTES[(unit + grade) % PRIMARY_PALETTES.length]!;
  const size = titleFontSize(title);
  const safeTitle = escapeXml(title);
  const props =
    unit % 4 === 1
      ? schoolBuilding(700, 250)
      : unit % 4 === 2
        ? house(700, 260)
        : unit % 4 === 3
          ? `${animal(720, 340, 'dog')}`
          : `${balloon(680, 120, '#EF5350')}${balloon(730, 100, '#42A5F5')}`;

  return `${sky(palette.top, palette.bottom)}${sun(120, 70, 36)}${cloud(280, 50, 0.85)}${cloud(520, 40, 0.7)}
    ${grass(370)}
    ${props}
    ${boy(180, 320, 0.95, { shirt: palette.shirt })}
    ${girl(300, 325, 0.9, { dress: palette.dress, hair: unit % 2 === 0 ? 'pigtails' : 'bob' })}
    <g transform="translate(425,210)">
      <ellipse cx="0" cy="0" rx="210" ry="88" fill="#FFFFFF" stroke="${O}" stroke-width="3" opacity="0.96"/>
      <ellipse cx="-90" cy="20" rx="70" ry="40" fill="#FFFFFF" stroke="${O}" stroke-width="2" opacity="0.96"/>
      <ellipse cx="90" cy="18" rx="70" ry="40" fill="#FFFFFF" stroke="${O}" stroke-width="2" opacity="0.96"/>
      <text x="0" y="-8" text-anchor="middle" font-family="Arial Rounded MT Bold,Arial,Helvetica,sans-serif" font-size="${size}" font-weight="700" fill="${palette.accent}">${safeTitle}</text>
      <rect x="-95" y="18" width="190" height="28" rx="14" fill="${palette.accent}"/>
      <text x="0" y="38" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="14" font-weight="700" fill="#FFFFFF">Global Success ${grade} · Unit ${unit}</text>
    </g>`;
}

