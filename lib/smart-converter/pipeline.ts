import { classify } from './classify';
import { normalize } from './normalize';
import { extract } from './parse';
import type { ParsedEvent } from './types';

/**
 * Smart Converter — pipeline orchestrator.
 *
 * normalize → extract (chrono) → classify (resolveZone). Returns the events plus
 * the normalized text, which the paste box uses to map match indices back onto
 * the raw text for highlighting (normalize is length-preserving, so indices line
 * up 1:1).
 *
 * `convert` is intentionally NOT called here — it runs per-card at render so the
 * once-a-second countdown re-render doesn't re-run parsing.
 */

export interface PipelineResult {
  events: ParsedEvent[];
  normalizedText: string;
}

export interface PipelineOptions {
  targetIana: string;
  /** Reference instant for relative/forward-date resolution. Defaults to now. */
  refDate?: Date;
}

export function runPipeline(rawText: string, opts: PipelineOptions): PipelineResult {
  const normalizedText = normalize(rawText);
  const matches = extract(normalizedText, opts.refDate ?? new Date());
  const events: ParsedEvent[] = classify(matches, { targetIana: opts.targetIana });

  // Nothing parseable from non-empty text → a single "couldn't read this" card.
  // (Per-sentence unknown detection inside a multi-event paste is a future
  // enhancement; an unparsed sentence alongside real events is simply skipped.)
  if (events.length === 0 && rawText.trim().length > 0) {
    const snippet = rawText.trim();
    events.push({
      status: 'unknown',
      matchIndex: 0,
      matchText: snippet,
      zoneTokenText: null,
      zoneTokenIndex: null,
      snippet: snippet.length > 140 ? `${snippet.slice(0, 137)}…` : snippet,
    });
  }

  return { events, normalizedText };
}
