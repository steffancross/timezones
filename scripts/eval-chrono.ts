// biome-ignore-all lint/suspicious/noConsole: console is useful
/**
 * Smart Converter — chrono limits evaluation harness.  Run: `pnpm eval:chrono`
 *
 * Runs the full deterministic pipeline over the realistic corpus
 * (`tests/smart-converter/corpus/cases.ts`) and scores each outcome against the
 * human label, bucketing into a confusion-style breakdown. Prints a per-case
 * table, a per-source-kind summary, and the two metrics that decide whether an
 * LLM extraction fallback (spec §7) is worth building:
 *
 *   • miss rate          — human saw a time, we extracted nothing  (AI might help)
 *   • silent-wrong rate  — we extracted, but it's WRONG             (the dangerous one)
 *
 * Failures here are FINDINGS, not a broken build. This script always exits 0.
 */

import { convert } from '@/lib/smart-converter/convert';
import { runPipeline } from '@/lib/smart-converter/pipeline';
import type { ParsedEvent } from '@/lib/smart-converter/types';
import {
  CASES,
  EVAL_REF,
  type EvalCase,
  type ZoneKind,
} from '@/tests/smart-converter/corpus/cases';

const TARGET = 'America/New_York'; // fixed viewer zone for determinism

type Bucket =
  | 'correct-resolved'
  | 'correct-ambiguous'
  | 'correct-unknown'
  | 'missed'
  | 'partial'
  | 'over-extract'
  | 'silent-wrong';

const MARK: Record<Bucket, string> = {
  'correct-resolved': '✓ ok ',
  'correct-ambiguous': '✓ amb',
  'correct-unknown': '✓ unk',
  missed: '✗ MISS',
  partial: '~ part',
  'over-extract': '~ split',
  'silent-wrong': '✗ WRONG',
};

function kindOf(e: ParsedEvent): ZoneKind {
  if (e.status === 'ambiguous') return 'ambiguous';
  if (e.status === 'unknown') return 'unknown';
  return e.zone.kind;
}

function gotInstantISO(e: ParsedEvent): string | null {
  if (e.status !== 'resolved') return null;
  return new Date(convert(e, TARGET).startInstantMs).toISOString();
}

interface Scored {
  bucket: Bucket;
  detail: string;
  gotKinds: string;
}

function score(c: EvalCase, events: ParsedEvent[]): Scored {
  const exp = c.expect;
  const gotKinds = events.map(kindOf).join(',') || '∅';

  if (exp.events === 0) {
    const punted = events.length === 0 || events.every((e) => e.status === 'unknown');
    return {
      bucket: punted ? 'correct-unknown' : 'silent-wrong',
      detail: punted ? '' : 'hallucinated event',
      gotKinds,
    };
  }
  if (events.length === 0) return { bucket: 'missed', detail: 'no events extracted', gotKinds };
  if (events.length < exp.events)
    return { bucket: 'partial', detail: `got ${events.length}/${exp.events}`, gotKinds };
  // Over-extraction: chrono split one event into several. Degraded (extra card)
  // but NOT a wrong time — kept separate from the dangerous silent-wrong bucket.
  if (events.length > exp.events)
    return { bucket: 'over-extract', detail: `split ${events.length}/${exp.events}`, gotKinds };

  let ambiguous = 0;
  const problems: string[] = [];
  for (let i = 0; i < exp.events; i++) {
    const e = events[i];
    if (!e) continue;
    const wantKind = exp.zoneKinds?.[i];
    const gotKind = kindOf(e);
    if (wantKind && gotKind !== wantKind) problems.push(`#${i + 1} zone ${gotKind}≠${wantKind}`);
    if (e.status === 'ambiguous') {
      ambiguous++;
      continue;
    }
    const wantInstant = exp.instantsUTC?.[i] ?? null;
    if (wantInstant) {
      const got = gotInstantISO(e);
      if (got !== wantInstant) problems.push(`#${i + 1} ${got}≠${wantInstant}`);
    }
  }
  if (problems.length > 0) return { bucket: 'silent-wrong', detail: problems.join('; '), gotKinds };
  if (ambiguous === exp.events) return { bucket: 'correct-ambiguous', detail: '', gotKinds };
  return { bucket: 'correct-resolved', detail: '', gotKinds };
}

// ── Run ──────────────────────────────────────────────────────────────────────
const rows: Array<{ c: EvalCase; s: Scored }> = CASES.map((c) => {
  const { events } = runPipeline(c.input, { targetIana: TARGET, refDate: EVAL_REF });
  return { c, s: score(c, events) };
});

const tally: Record<Bucket, number> = {
  'correct-resolved': 0,
  'correct-ambiguous': 0,
  'correct-unknown': 0,
  missed: 0,
  partial: 0,
  'over-extract': 0,
  'silent-wrong': 0,
};
for (const { s } of rows) tally[s.bucket]++;

const total = rows.length;
const pct = (n: number) => `${((100 * n) / total).toFixed(0)}%`;
const correct = tally['correct-resolved'] + tally['correct-ambiguous'] + tally['correct-unknown'];

// ── Per-case table ─────────────────────────────────────────────────────────
console.log('\n  SMART CONVERTER — chrono limits eval');
console.log(`  ref=${EVAL_REF.toISOString()}  target=${TARGET}  cases=${total}\n`);
console.log('  ' + 'id'.padEnd(24) + 'result'.padEnd(9) + 'kind'.padEnd(12) + 'detail');
console.log('  ' + '─'.repeat(86));
for (const { c, s } of rows) {
  const line =
    '  ' + c.id.padEnd(24) + MARK[s.bucket].padEnd(9) + s.gotKinds.padEnd(12) + (s.detail || '');
  console.log(line);
}

// ── By source kind ───────────────────────────────────────────────────────────
const kinds = [...new Set(rows.map((r) => r.c.source_kind))].sort();
console.log('\n  by source kind');
console.log('  ' + '─'.repeat(50));
for (const k of kinds) {
  const sub = rows.filter((r) => r.c.source_kind === k);
  const bad = sub.filter((r) => r.s.bucket === 'missed' || r.s.bucket === 'silent-wrong').length;
  const flag = bad > 0 ? `  ⚠ ${bad} miss/wrong` : '';
  console.log('  ' + k.padEnd(16) + `${sub.length} case(s)`.padEnd(14) + flag);
}

// ── Headline + rubric ──────────────────────────────────────────────────────
const missRate = tally.missed / total;
const wrongRate = tally['silent-wrong'] / total; // wrong instant or wrong zone
const splitRate = tally['over-extract'] / total;
console.log('\n  headline');
console.log('  ' + '─'.repeat(50));
console.log(`  coverage (correct)     ${pct(correct)}  (${correct}/${total})`);
console.log(`  correct-resolved       ${tally['correct-resolved']}`);
console.log(`  correct-ambiguous      ${tally['correct-ambiguous']}`);
console.log(`  correct-unknown        ${tally['correct-unknown']}`);
console.log(`  partial                ${tally.partial}`);
console.log(`  MISS rate              ${pct(tally.missed)}  ← human saw a time, we got nothing`);
console.log(
  `  SILENT-WRONG rate      ${pct(tally['silent-wrong'])}  ← wrong instant/zone — DANGEROUS`,
);
console.log(
  `  over-extract (split)   ${pct(tally['over-extract'])}  ← 1 event → N cards; degraded, not wrong`,
);

console.log('\n  decision rubric (tune thresholds as the corpus grows)');
console.log('  ' + '─'.repeat(50));
console.log('  The dangerous signal is a WRONG TIME shown confidently (silent-wrong) or a');
console.log('  MISS. Over-extraction degrades UX (an extra card) but never lies, and can');
console.log('  be mitigated deterministically (re-merge adjacent split events).');
const dangerous = wrongRate + missRate;
const verdict =
  dangerous > 0.05
    ? '  → AI extraction fallback JUSTIFIED (gated, cached, extraction-only per §7).'
    : splitRate > 0.1
      ? '  → Ship algorithm-only; chrono never shows a wrong time. Address splits with a\n    deterministic re-merge pass before considering AI.'
      : '  → Ship algorithm-only; AI fallback NOT warranted.';
console.log(
  `  if (silent-wrong + miss) > 5% → build AI tier.   currently ${pct(tally['silent-wrong'] + tally.missed)}`,
);
console.log(verdict);
console.log('');
