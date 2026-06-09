'use client';

import { runPipeline } from '@/lib/smart-converter/pipeline';
import type { ParsedEvent, ResolvedEvent } from '@/lib/smart-converter/types';
import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { FeatureHead } from './FeatureHead';
import { Guide } from './Guide';
import { PasteBox } from './PasteBox';
import { ResultsList } from './ResultsList';

interface State {
  rawText: string;
  targetIana: string;
  userSetTarget: boolean;
  /** matchKey → pinned IANA, from disambiguation choices. */
  overrides: Record<string, string>;
}

type Action =
  | { type: 'setText'; text: string }
  | { type: 'setTarget'; iana: string }
  | { type: 'detect'; iana: string }
  | { type: 'pin'; key: string; iana: string };

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'setText':
      return { ...s, rawText: a.text };
    case 'setTarget':
      return { ...s, targetIana: a.iana, userSetTarget: true };
    case 'detect':
      return s.userSetTarget ? s : { ...s, targetIana: a.iana };
    case 'pin':
      return { ...s, overrides: { ...s.overrides, [a.key]: a.iana } };
    default:
      return s;
  }
}

const keyOf = (e: ParsedEvent) => `${e.matchIndex}:${e.matchText}`;

export function SmartConverter() {
  const [state, dispatch] = useReducer(reducer, {
    rawText: '',
    targetIana: 'UTC',
    userSetTarget: false,
    overrides: {},
  });
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // The textarea (state.rawText) updates instantly; parsing runs against a value
  // debounced 80ms so a fast typist isn't re-parsing the whole block per keystroke.
  // (Paste fires one change, so the common path waits at most 80ms once.)
  const [parseText, setParseText] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setParseText(state.rawText), 80);
    return () => clearTimeout(id);
  }, [state.rawText]);

  // Detect the viewer's zone after hydration (static page → no cf headers).
  useEffect(() => {
    const iana = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (iana) dispatch({ type: 'detect', iana });
  }, []);

  const events = useMemo(() => {
    const { events } = runPipeline(parseText, { targetIana: state.targetIana });
    return events.map((e): ParsedEvent => {
      if (e.status !== 'ambiguous') return e;
      const pinned = state.overrides[keyOf(e)];
      if (!pinned) return e;
      const zone = e.candidates.find((c) => c.iana === pinned);
      if (!zone) return e;
      const resolved: ResolvedEvent = {
        matchIndex: e.matchIndex,
        matchText: e.matchText,
        zoneTokenText: e.zoneTokenText,
        zoneTokenIndex: e.zoneTokenIndex,
        status: 'resolved',
        zone: { kind: 'named', zone, iana: pinned },
        start: e.start,
        end: e.end,
        hasRange: e.hasRange,
      };
      return resolved;
    });
  }, [parseText, state.targetIana, state.overrides]);

  const hasText = parseText.trim().length > 0;
  const count = hasText ? events.filter((e) => e.status !== 'unknown').length : null;

  return (
    <div className="sc-app">
      <FeatureHead />
      <PasteBox
        value={state.rawText}
        onChange={(text) => dispatch({ type: 'setText', text })}
        events={events}
        count={count}
        targetIana={state.targetIana}
        onChangeTarget={(iana) => dispatch({ type: 'setTarget', iana })}
        textareaRef={textareaRef}
      />
      {hasText ? (
        <ResultsList
          events={events}
          targetIana={state.targetIana}
          onPin={(key, iana) => dispatch({ type: 'pin', key, iana })}
          onEnterManually={() => textareaRef.current?.focus()}
        />
      ) : null}
      <Guide />
    </div>
  );
}
