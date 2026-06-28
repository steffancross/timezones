import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { AvailabilityTab } from '@/components/room/availability/AvailabilityTab';
import { RoomDataProvider } from '@/components/room/RoomDataProvider';
import { FIXTURE_ROOM, FIXTURE_VIEWER_TZ, FIXTURE_WEEK_ANCHOR } from '@/lib/rooms/fixtures';

// Render as Maya (a participant with a seeded general week) so the draft seeds.
function renderAvail() {
  return render(
    <RoomDataProvider
      state={FIXTURE_ROOM}
      youId="maya"
      viewerTz={FIXTURE_VIEWER_TZ}
      initialWeekAnchor={FIXTURE_WEEK_ANCHOR}
    >
      <AvailabilityTab />
    </RoomDataProvider>,
  );
}

const cell = (c: HTMLElement, col: number, slot: number) =>
  c.querySelector<HTMLElement>(`[data-col="${col}"][data-slot="${slot}"]`);
const byText = (c: HTMLElement, text: string) =>
  [...c.querySelectorAll<HTMLElement>('button')].find((b) => b.textContent?.trim() === text);

describe('AvailabilityTab — general paint', () => {
  it('seeds from your blob, erases, and paints into the right storage cell', async () => {
    const { container } = await renderAvail();
    // Maya is free Mon 09:00 NY → display col 1 (Mon), slot 18 → 'y' from seed.
    expect(cell(container, 1, 18)?.getAttribute('data-state')).toBe('y');

    // Erase it.
    const erase = byText(container, 'Erase');
    if (erase) await page.elementLocator(erase).click();
    const target = cell(container, 1, 18);
    if (target) await page.elementLocator(target).click();
    expect(cell(container, 1, 18)?.getAttribute('data-state')).toBe('n');

    // Paint a previously-blank pre-dawn cell available (headroom is reachable).
    const avail = byText(container, 'Available');
    if (avail) await page.elementLocator(avail).click();
    const blank = cell(container, 3, 2); // Wed 01:00
    if (blank) await page.elementLocator(blank).click();
    expect(cell(container, 3, 2)?.getAttribute('data-state')).toBe('y');
  });
});

describe('AvailabilityTab — override mode', () => {
  it('paints over the ghosted template with a changed marker, and reset clears it', async () => {
    const { container } = await renderAvail();
    const weekToggle = byText(container, 'A week');
    if (weekToggle) await page.elementLocator(weekToggle).click();

    // Sunday (col 0) early-morning is 'n' in Maya's template → ghost, not changed.
    expect(cell(container, 0, 2)?.getAttribute('data-changed')).toBeNull();

    const target = cell(container, 0, 2);
    if (target) await page.elementLocator(target).click(); // paint 'y' (default palette)
    expect(cell(container, 0, 2)?.getAttribute('data-state')).toBe('y');
    expect(cell(container, 0, 2)?.getAttribute('data-changed')).toBe('true');

    const reset = byText(container, 'Reset to general week');
    if (reset) await page.elementLocator(reset).click();
    expect(cell(container, 0, 2)?.getAttribute('data-state')).toBe('n'); // back to template
    expect(cell(container, 0, 2)?.getAttribute('data-changed')).toBeNull();
  });
});

describe('AvailabilityTab — lurker', () => {
  it('prompts to join instead of painting', async () => {
    const { container } = await render(
      <RoomDataProvider
        state={FIXTURE_ROOM}
        youId={null}
        viewerTz={FIXTURE_VIEWER_TZ}
        initialWeekAnchor={FIXTURE_WEEK_ANCHOR}
      >
        <AvailabilityTab />
      </RoomDataProvider>,
    );
    expect(container.textContent).toContain('Join the room to paint');
  });
});
