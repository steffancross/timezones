import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { OverviewTab } from '@/components/room/overview/OverviewTab';
import { RoomDataProvider } from '@/components/room/RoomDataProvider';
import type { RoomState } from '@/lib/rooms/db';
import { FIXTURE_NOW, FIXTURE_ROOM, FIXTURE_VIEWER_TZ } from '@/lib/rooms/fixtures';

function renderOverview(state: RoomState = FIXTURE_ROOM, now: number = FIXTURE_NOW) {
  return render(
    <RoomDataProvider state={state} youId={null} viewerTz={FIXTURE_VIEWER_TZ} now={now}>
      <OverviewTab />
    </RoomDataProvider>,
  );
}

// Helpers for the cold-start fixtures (spec 7b).
const respondedAllN = (id: string): RoomState['participants'][number] => ({
  id,
  displayName: id,
  timezone: 'UTC',
  generalWeek: 'n'.repeat(336),
  overrides: {},
  hasResponded: true,
  hasPassword: false,
});

describe('OverviewTab — windows (headline)', () => {
  it('shows the all-clear pill on the green window and names the soft person on the some window', async () => {
    const { container } = await renderOverview();
    // Monday all-green over the 4 responders, Tuesday some (Sam if-needed).
    expect(container.textContent).toContain('Monday');
    expect(container.textContent).toContain('all 4');
    expect(container.textContent).toContain('works if Sam flexes');
  });
});

describe('OverviewTab — today fallback', () => {
  it('names the closest partial and who is out when no full overlap remains today', async () => {
    const { container } = await renderOverview();
    // Sunday at FIXTURE_NOW: no full overlap; only Sam is around (his override).
    expect(container.textContent).toContain('No full overlap left today');
    expect(container.textContent).toContain('Maya, Theo & Yuki are out');
    expect(container.textContent).toContain('Sam is around now');
  });

  it('degrades to the plain message when there is no partial either', async () => {
    // Two responders, both fully unavailable → no windows, no partial. (Needs 2+
    // responders so the windows section renders at all; one responder is the
    // spec-7b solo cold-start, covered below.)
    const allOut: RoomState = {
      room: { id: 'o', name: 'Out', schemaVersion: 1 },
      participants: [respondedAllN('A'), respondedAllN('B')],
    };
    const { container } = await renderOverview(allOut);
    expect(container.textContent).toContain('No full overlap left today.');
    expect(container.textContent).not.toContain('closest');
    expect(container.textContent).toContain('No full-overlap windows left this week');
  });
});

describe('OverviewTab — cold-start content states (spec 7b)', () => {
  it('empty (zero responders) → get-started, no windows', async () => {
    const empty: RoomState = {
      room: { id: 'e', name: 'Empty', schemaVersion: 1 },
      participants: [],
    };
    const { container } = await renderOverview(empty);
    expect(container.textContent).toContain("You're the first one here");
    expect(container.querySelector('[data-testid="window-row"]')).toBeNull();
    expect(container.textContent).not.toContain('When you overlap');
  });

  it('solo (one responder) → just-you banner + share, no overlap headline', async () => {
    const solo: RoomState = {
      room: { id: 's', name: 'Solo', schemaVersion: 1 },
      participants: [respondedAllN('Solo')],
    };
    const { container } = await renderOverview(solo);
    expect(container.textContent).toContain('Just you so far');
    expect(container.textContent).toContain('Share the link');
    // No "everyone overlaps" windows for one person.
    expect(container.querySelector('[data-testid="window-row"]')).toBeNull();
    expect(container.textContent).not.toContain('When you overlap');
  });
});

describe('OverviewTab — live status', () => {
  it('omits the unresponded participant and marks the override-covered person definite', async () => {
    const { container } = await renderOverview();
    const items = [...container.querySelectorAll<HTMLElement>('[data-testid="rn-item"]')];
    // Priya never responded → no status row anywhere in Overview.
    expect(container.textContent).not.toContain('Priya');
    // Sam is covered by a concrete override at FIXTURE_NOW → definite, not inferred.
    const sam = items.find((el) => el.textContent?.includes('Sam'));
    expect(sam?.getAttribute('data-inferred')).toBe('false');
    // The template-only responders are inferred.
    const maya = items.find((el) => el.textContent?.includes('Maya'));
    expect(maya?.getAttribute('data-inferred')).toBe('true');
  });
});
