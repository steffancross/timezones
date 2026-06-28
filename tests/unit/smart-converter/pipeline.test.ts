import { runPipeline } from '@/lib/smart-converter/pipeline';
import { describe, expect, it } from 'vitest';

const REF = new Date(Date.UTC(2026, 5, 8, 16, 0, 0));
const run = (text: string) => runPipeline(text, { targetIana: 'America/New_York', refDate: REF });

describe('runPipeline', () => {
  it('parses the hero multi-event paste into two resolved cards', () => {
    const { events } = run(
      '🎮 Preorders go live June 29 at 8:00 PM (GMT+8). Worldwide release July 14, 9:00 PM (GMT+8).',
    );
    expect(events).toHaveLength(2);
    expect(events.every((e) => e.status === 'resolved')).toBe(true);
  });

  it('returns normalized text the same length as the input (highlight invariant)', () => {
    const input = '🎮 drops april 29 20:00 (gmt + 8) 2026';
    const { normalizedText } = run(input);
    expect(normalizedText.length).toBe(input.length);
  });

  it('emits a single unknown card when nothing parses', () => {
    const { events } = run("we'll open the vault at sundown ✨ stay tuned");
    expect(events).toHaveLength(1);
    expect(events[0]?.status).toBe('unknown');
  });

  it('produces no events for empty input', () => {
    expect(run('   ').events).toHaveLength(0);
  });
});
