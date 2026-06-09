import { normalize } from '@/lib/smart-converter/normalize';
import { extract } from '@/lib/smart-converter/parse';
import { classify } from '@/lib/smart-converter/classify';
import { describe, expect, it } from 'vitest';

const REF = new Date(Date.UTC(2026, 5, 8, 16, 0, 0));
const TARGET = 'America/New_York';

function run(text: string) {
  return classify(extract(normalize(text), REF), { targetIana: TARGET });
}

describe('classify', () => {
  it('resolves an explicit offset to a fixed-offset zone', () => {
    const [e] = run('drops April 29 8pm GMT+8');
    expect(e?.status).toBe('resolved');
    if (e?.status === 'resolved') expect(e.zone).toMatchObject({ kind: 'offset', minutes: 480 });
  });

  it('resolves a city/region phrase via search aliases', () => {
    const [e] = run('15:00 Beijing time tomorrow');
    expect(e?.status).toBe('resolved');
    if (e?.status === 'resolved' && e.zone.kind === 'named')
      expect(e.zone.iana).toBe('Asia/Shanghai');
  });

  it('marks an ambiguous abbreviation without guessing', () => {
    const [e] = run('stream Fri 9pm CST');
    expect(e?.status).toBe('ambiguous');
    if (e?.status === 'ambiguous') {
      expect(e.token).toBe('CST');
      expect(e.candidates.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('assumes the target zone for a bare time, flagged (rule 1)', () => {
    const [e] = run('drops at 8pm tonight');
    expect(e?.status).toBe('resolved');
    if (e?.status === 'resolved') expect(e.zone).toEqual({ kind: 'target', iana: TARGET });
  });

  it('inherits an earlier zone for a later zoneless event (rule 3)', () => {
    const events = run('Batch 1 June 29 8pm GMT+8. Batch 2 June 30 9pm.');
    expect(events).toHaveLength(2);
    const second = events[1];
    expect(second?.status).toBe('resolved');
    if (second?.status === 'resolved')
      expect(second.zone).toMatchObject({ kind: 'offset', minutes: 480 });
  });
});
