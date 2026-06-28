import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { ZoneClocks } from '@/components/room/overview/ZoneClocks';
import type { PublicParticipant } from '@/lib/rooms/db';
import { formatTime } from '@/lib/time/format';
import { DateTime } from '@/lib/time/luxon';

const NOW = DateTime.fromISO('2026-01-04T12:00:00', { zone: 'UTC' }).toMillis();

const resp = (id: string, displayName: string, timezone: string): PublicParticipant => ({
  id,
  displayName,
  timezone,
  generalWeek: 'n'.repeat(336),
  overrides: {},
  hasResponded: true,
  hasPassword: false,
});

describe('ZoneClocks', () => {
  it('collapses members into one row per unique zone, west→east, with the local time', async () => {
    const participants = [
      resp('a', 'Ana', 'America/New_York'),
      resp('b', 'Bo', 'America/New_York'),
      resp('c', 'Cy', 'Asia/Tokyo'),
    ];
    const { container } = await render(<ZoneClocks participants={participants} now={NOW} />);
    const rows = [...container.querySelectorAll<HTMLElement>('[data-testid="zone-clock"]')];
    expect(rows).toHaveLength(2); // two unique zones, not three people

    // West (New York) before east (Tokyo).
    expect(rows[0]?.textContent).toContain('Ana');
    expect(rows[0]?.textContent).toContain('Bo'); // both NY members on one row
    expect(rows[1]?.textContent).toContain('Cy');

    // Local time per zone, DST-correct via Luxon.
    const nyTime = formatTime(DateTime.fromMillis(NOW).setZone('America/New_York'), '12');
    const tokyoTime = formatTime(DateTime.fromMillis(NOW).setZone('Asia/Tokyo'), '12');
    expect(rows[0]?.textContent).toContain(nyTime);
    expect(rows[1]?.textContent).toContain(tokyoTime);
  });
});
