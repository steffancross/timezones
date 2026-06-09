'use client';

import type { ParsedEvent } from '@/lib/smart-converter/types';
import { type RefObject, useState } from 'react';
import { TargetZoneControl } from './TargetZoneControl';

interface Props {
  value: string;
  onChange: (v: string) => void;
  events: ParsedEvent[];
  /** Event count for the footer readout; null shows the idle hint. */
  count: number | null;
  targetIana: string;
  onChangeTarget: (iana: string) => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
}

const PLACEHOLDER = 'Paste it here — e.g. “preorders start april 29 20:00 (gmt+8) 2026”';

type RunClass = 'zone' | 'mark' | null;

/**
 * Split `text` into styled runs from the events' match + zone-token spans. Zone
 * spans win over date spans where they overlap (a merged match can span the
 * blanked zone region). Indices are valid against the raw text because normalize
 * is length-preserving.
 */
function buildRuns(text: string, events: ParsedEvent[]): Array<{ text: string; cls: RunClass }> {
  const marks: Array<{ start: number; end: number; zone: boolean }> = [];
  for (const e of events) {
    if (e.status === 'unknown') continue;
    marks.push({ start: e.matchIndex, end: e.matchIndex + e.matchText.length, zone: false });
    if (e.zoneTokenIndex != null && e.zoneTokenText) {
      marks.push({
        start: e.zoneTokenIndex,
        end: e.zoneTokenIndex + e.zoneTokenText.length,
        zone: true,
      });
    }
  }
  const clsAt = (i: number): RunClass => {
    let cls: RunClass = null;
    for (const m of marks) {
      if (i >= m.start && i < m.end) {
        if (m.zone) return 'zone';
        cls = 'mark';
      }
    }
    return cls;
  };

  const runs: Array<{ text: string; cls: RunClass }> = [];
  let i = 0;
  while (i < text.length) {
    const c = clsAt(i);
    let j = i + 1;
    while (j < text.length && clsAt(j) === c) j++;
    runs.push({ text: text.slice(i, j), cls: c });
    i = j;
  }
  return runs;
}

export function PasteBox({
  value,
  onChange,
  events,
  count,
  targetIana,
  onChangeTarget,
  textareaRef,
}: Props) {
  const [focus, setFocus] = useState(false);
  const runs = buildRuns(value, events);

  return (
    <div className={`sc-paste${focus ? ' is-focus' : ''}`}>
      <div className="sc-paste-shell">
        <div className="sc-paste-text" aria-hidden="true">
          {value ? (
            runs.map((r, i) =>
              r.cls ? (
                // biome-ignore lint/suspicious/noArrayIndexKey: positional runs over static text
                <mark key={i} className={r.cls === 'zone' ? 'sc-mark zone' : 'sc-mark'}>
                  {r.text}
                </mark>
              ) : (
                // biome-ignore lint/suspicious/noArrayIndexKey: positional runs over static text
                <span key={i}>{r.text}</span>
              ),
            )
          ) : (
            <span className="is-placeholder">{PLACEHOLDER}</span>
          )}
          {/* trailing newline so the layer height tracks a final blank line */}
          {value.endsWith('\n') ? '​' : null}
        </div>
        <textarea
          ref={textareaRef}
          className="sc-paste-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          placeholder={PLACEHOLDER}
          spellCheck={false}
          aria-label="Paste a time announcement"
        />
      </div>
      <div className="sc-paste-foot">
        <span className="sc-count">
          {count != null ? (
            <>
              <b>{count}</b> event{count === 1 ? '' : 's'} found
            </>
          ) : (
            'Auto-detects as you paste'
          )}
        </span>
        <TargetZoneControl targetIana={targetIana} onChange={onChangeTarget} />
      </div>
    </div>
  );
}
