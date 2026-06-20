import { RoomDataProvider } from '@/components/room/RoomDataProvider';
import { BreakdownSheet } from '@/components/room/team/BreakdownSheet';
import { buildWeekColumns } from '@/components/room/team/slots';
import { FIXTURE_ROOM, FIXTURE_VIEWER_TZ, FIXTURE_WEEK_ANCHOR } from '@/lib/rooms/fixtures';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';

function renderSheet(cell: { day: number; slot: number } | null) {
  return render(
    <RoomDataProvider
      state={FIXTURE_ROOM}
      youId={null}
      viewerTz={FIXTURE_VIEWER_TZ}
      initialWeekAnchor={FIXTURE_WEEK_ANCHOR}
    >
      <BreakdownSheet
        cell={cell}
        columns={buildWeekColumns(FIXTURE_WEEK_ANCHOR)}
        onClose={() => {}}
      />
    </RoomDataProvider>,
  );
}

// Same fixture cells the TeamTab test uses: Monday day 1 slot 18 = all-green over
// the 4 responders; Tuesday day 2 slot 18 = some (Sam on "if needed").
describe('BreakdownSheet — the free / if-needed split (spec 7a)', () => {
  it('shows the all-free split for a fully-available cell', async () => {
    renderSheet({ day: 1, slot: 18 });
    // vaul portals the drawer into document.body and mounts it asynchronously.
    await vi.waitFor(() => expect(document.body.textContent).toContain('4 free'));
  });

  it('spells out the split — not a single "N of M" — when someone is on if-needed', async () => {
    renderSheet({ day: 2, slot: 18 });
    await vi.waitFor(() => expect(document.body.textContent).toContain('3 free · 1 if needed'));
  });

  it('renders nothing when closed (no cell)', async () => {
    const { container } = await renderSheet(null);
    expect(container.textContent).toBe('');
  });
});
