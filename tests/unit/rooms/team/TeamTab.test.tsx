import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { RoomDataProvider } from '@/components/room/RoomDataProvider';
import { TeamTab } from '@/components/room/team/TeamTab';
import type { RoomState } from '@/lib/rooms/db';
import { FIXTURE_ROOM, FIXTURE_VIEWER_TZ, FIXTURE_WEEK_ANCHOR } from '@/lib/rooms/fixtures';

function renderTeam(state: RoomState = FIXTURE_ROOM, youId: string | null = null) {
  return render(
    <RoomDataProvider
      state={state}
      youId={youId}
      viewerTz={FIXTURE_VIEWER_TZ}
      initialWeekAnchor={FIXTURE_WEEK_ANCHOR}
    >
      <TeamTab />
    </RoomDataProvider>,
  );
}

// Viewer NY, fixture week: Monday all-green window = day 1, slots 18..21;
// Tuesday some window (Sam if-needed) = day 2, slots 18..19.
const cell = (c: HTMLElement, day: number, slot: number) =>
  c.querySelector<HTMLElement>(`[data-day="${day}"][data-slot="${slot}"]`);

describe('TeamTab — heatmap grades from the engine', () => {
  it('colors the Monday window all-green and the Tuesday window some', async () => {
    const { container } = await renderTeam();
    expect(cell(container, 1, 18)?.getAttribute('data-grade')).toBe('all');
    expect(cell(container, 1, 21)?.getAttribute('data-grade')).toBe('all');
    expect(cell(container, 2, 18)?.getAttribute('data-grade')).toBe('some');
    // Sunday has no overlap → blank.
    expect(cell(container, 0, 18)?.getAttribute('data-grade')).toBe('none');
  });
});

describe('TeamTab — deselect recomputes the aggregate', () => {
  it('removing the if-needed person turns the Tuesday window all-green and decrements Counting', async () => {
    const { container } = await renderTeam();
    expect(container.textContent).toContain('4 of 5'); // 4 responders counted, Priya unresponded

    const remove = container.querySelector<HTMLElement>('[aria-label="Remove Sam"]');
    if (!remove) throw new Error('Sam toggle not found');
    await page.elementLocator(remove).click();

    expect(cell(container, 2, 18)?.getAttribute('data-grade')).toBe('all'); // Sam's "if needed" gone
    expect(container.textContent).toContain('3 of 5');
  });
});

describe('TeamTab — unresponded handling', () => {
  it('tags the unresponded participant and excludes them from the count', async () => {
    const { container } = await renderTeam();
    expect(container.textContent).toContain("hasn't filled");
    expect(container.textContent).toContain('4 of 5');
  });
});

describe('TeamTab — hover breakdown', () => {
  it('flips the sidebar to the per-person split for the hovered cell', async () => {
    const { container } = await renderTeam();
    const target = cell(container, 1, 18); // Monday 09:00, everyone in
    if (!target) throw new Error('cell not found');
    await page.elementLocator(target).hover();
    expect(container.textContent).toContain('4 free');
  });
});

describe('TeamTab — fold expand persists across recompute', () => {
  it('keeps a manually-expanded fold open after a selection change', async () => {
    const { container } = await renderTeam();
    // Overnight rows are folded by default — slot 0 isn't rendered.
    expect(cell(container, 1, 0)).toBeNull();

    const foldBtn = [...container.querySelectorAll<HTMLElement>('button')].find((b) =>
      b.textContent?.includes('expand'),
    );
    if (!foldBtn) throw new Error('fold strip not found');
    await page.elementLocator(foldBtn).click();
    expect(cell(container, 1, 0)).not.toBeNull(); // now expanded

    // Recompute via a selection change; the expanded fold stays open.
    const remove = container.querySelector<HTMLElement>('[aria-label="Remove Sam"]');
    if (remove) await page.elementLocator(remove).click();
    expect(cell(container, 1, 0)).not.toBeNull();
  });
});

describe('TeamTab — day view', () => {
  it('switches to per-person day view with day paging', async () => {
    const { container } = await renderTeam();
    const dayToggle = [...container.querySelectorAll<HTMLElement>('button')].find(
      (b) => b.textContent?.trim() === 'day',
    );
    if (!dayToggle) throw new Error('day toggle not found');
    await page.elementLocator(dayToggle).click();
    expect(container.querySelector('[aria-label="Next day"]')).not.toBeNull();
    expect(container.textContent).toContain('Maya');
  });
});

// Helper for cold-start fixtures (spec 7b).
const responder = (id: string, week = 'y'.repeat(336)): RoomState['participants'][number] => ({
  id,
  displayName: id,
  timezone: 'UTC',
  generalWeek: week,
  overrides: {},
  hasResponded: true,
  hasPassword: false,
});

describe('TeamTab — cold-start content states (spec 7b)', () => {
  it('empty (zero responders) → get-started, not a blank grid', async () => {
    const empty: RoomState = {
      room: { id: 'e', name: 'Empty', schemaVersion: 1 },
      participants: [
        {
          id: 'ghost',
          displayName: 'Ghost',
          timezone: 'UTC',
          generalWeek: null,
          overrides: {},
          hasResponded: false,
          hasPassword: false,
        },
      ],
    };
    const { container } = await renderTeam(empty);
    expect(container.textContent).toContain("You're the first one here");
    expect(container.textContent).toContain('Add your availability');
    // No heatmap cells rendered.
    expect(container.querySelector('[data-grade]')).toBeNull();
  });

  it('solo (one responder) → single-person view, never an all-green consensus', async () => {
    const solo: RoomState = {
      room: { id: 's', name: 'Solo', schemaVersion: 1 },
      participants: [responder('Solo')],
    };
    const { container } = await renderTeam(solo);
    expect(container.textContent).toContain('Just you so far');
    expect(container.textContent).toContain('Share the link');
    // Single-person view is present; the group aggregate + roster are not.
    expect(container.querySelector('[data-view="solo"]')).not.toBeNull();
    expect(container.querySelector('[data-view="group"]')).toBeNull();
    expect(container.textContent).not.toContain('Counting');
  });

  it('group (2+ responders) → aggregate + a quiet responder count (no denominator)', async () => {
    const group: RoomState = {
      room: { id: 'g', name: 'Group', schemaVersion: 1 },
      participants: [responder('A'), responder('B')],
    };
    const { container } = await renderTeam(group);
    expect(container.querySelector('[data-view="group"]')).not.toBeNull();
    expect(container.textContent).toContain('2 people have filled so far');
  });
});
