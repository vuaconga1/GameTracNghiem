import { LOP1_UNIT_VOCAB } from '../lib/lop1Vocab';
import { LOP2_UNIT_VOCAB } from '../lib/lop2Vocab';
import { LOP3_UNIT_VOCAB } from '../lib/lop3Vocab';
import { LOP4_UNIT_VOCAB } from '../lib/lop4Vocab';
import { LOP5_UNIT_VOCAB } from '../lib/lop5Vocab';

const GRADES = [
  ['Lớp 1', LOP1_UNIT_VOCAB],
  ['Lớp 2', LOP2_UNIT_VOCAB],
  ['Lớp 3', LOP3_UNIT_VOCAB],
  ['Lớp 4', LOP4_UNIT_VOCAB],
  ['Lớp 5', LOP5_UNIT_VOCAB],
] as const;

for (const [label, units] of GRADES) {
  const missing: Array<{ unit: number; word: string; hint: string }> = [];
  let total = 0;
  for (const unit of Object.values(units)) {
    for (const item of unit.words) {
      total += 1;
      const ipa = String(item.ipa || '').trim();
      if (!ipa || ipa === '—' || ipa === '-') {
        missing.push({ unit: unit.unit, word: item.word, hint: item.hint });
      }
    }
  }
  console.log(`\n${label}: ${missing.length}/${total} missing IPA`);
  for (const row of missing) {
    console.log(`  Unit ${row.unit}: ${row.word} (${row.hint})`);
  }
}
