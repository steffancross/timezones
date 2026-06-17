import { describe, expect, it } from 'vitest';
import { cellBreakdown } from '@/lib/rooms/compute/breakdown';
import { liveStatus } from '@/lib/rooms/compute/status';
import type { ComputeInput } from '@/lib/rooms/compute/types';
import type { RoomState } from '@/lib/rooms/db';
import {
  FIXTURE_NOW,
  FIXTURE_ROOM,
  FIXTURE_VIEWER_TZ,
  FIXTURE_WEEK_ANCHOR,
} from '@/lib/rooms/fixtures';

const base: ComputeInput = {
  room: FIXTURE_ROOM,
  viewerTz: FIXTURE_VIEWER_TZ,
  weekAnchor: FIXTURE_WEEK_ANCHOR,
  now: FIXTURE_NOW,
};

describe('liveStatus (fixture)', () => {
  it('omits unresponded, marks override-covered now as not-inferred, template as inferred', () => {
    const status = liveStatus(base);
    expect(status.map((s) => s.participantId).sort()).toEqual(['maya', 'sam', 'theo', 'yuki']); // no priya
    // Sam's override covers his Sunday local date at FIXTURE_NOW → concrete, available.
    expect(status.find((s) => s.participantId === 'sam')).toEqual({
      participantId: 'sam',
      state: 'y',
      inferred: false,
    });
    // Maya is template-only on Sunday → inferred out.
    expect(status.find((s) => s.participantId === 'maya')).toEqual({
      participantId: 'maya',
      state: 'n',
      inferred: true,
    });
  });
});

describe('cellBreakdown (fixture)', () => {
  it('splits free/soft/out for an all-green Monday cell (09:00)', () => {
    const bd = cellBreakdown(base, 1, 18); // Monday 09:00 NY
    expect(bd).toMatchObject({ freeCount: 4, softCount: 0, outCount: 0 });
    expect(bd.perPerson).toHaveLength(4); // responders only (no priya)
  });

  it('counts Sam as if-needed on the Tuesday some-cell', () => {
    const bd = cellBreakdown(base, 2, 18); // Tuesday 09:00 NY
    expect(bd).toMatchObject({ freeCount: 3, softCount: 1, outCount: 0 });
  });
});

describe('empty compute set', () => {
  const onlyGhosts: RoomState = {
    room: { id: 'r', name: null, schemaVersion: 1 },
    participants: [
      {
        id: 'g',
        displayName: 'Ghost',
        timezone: 'UTC',
        generalWeek: null,
        overrides: {},
        hasResponded: false,
        hasPassword: false,
      },
    ],
  };
  const input: ComputeInput = {
    room: onlyGhosts,
    viewerTz: 'UTC',
    weekAnchor: FIXTURE_WEEK_ANCHOR,
    now: FIXTURE_NOW,
  };

  it('yields empty status and a zero breakdown with no division', () => {
    expect(liveStatus(input)).toEqual([]);
    expect(cellBreakdown(input, 1, 18)).toEqual({
      perPerson: [],
      freeCount: 0,
      softCount: 0,
      outCount: 0,
    });
  });
});
