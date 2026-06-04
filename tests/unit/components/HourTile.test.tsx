import { beforeEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import type { ColumnData } from '@/components/converter/HourStrip';
import { HourTile } from '@/components/converter/HourTile';
import { ConverterStoreProvider } from '@/components/converter/store-context';
import { createConverterStore } from '@/lib/store/converter';

let store: ReturnType<typeof createConverterStore>;
function freshStore() {
  store = createConverterStore();
  store.setState({
    rangeStartMin: null,
    rangeEndMin: null,
    previewHour: null,
  });
}

function renderTile(props: React.ComponentProps<typeof HourTile>) {
  return render(
    <ConverterStoreProvider value={store}>
      <HourTile {...props} />
    </ConverterStoreProvider>,
  );
}

/** Standard "same-day, same-hour" column for a row that's at home offset. */
function column(homeHour: number, overrides: Partial<ColumnData> = {}): ColumnData {
  return {
    homeHour,
    localHour: homeHour,
    localDate: '2026-05-20',
    dayDelta: 0,
    ...overrides,
  };
}

/**
 * Find the tile's root <div> from the rendered container. Tests assert against
 * its className — the tile encodes its full visual state there, and asserting
 * the class string catches both Tailwind class renames and conditional logic
 * regressions without falling back to screenshot diffs.
 *
 * The selector keys on `data-home-hour` (always present, stable across tile
 * states) rather than aria-label (intentionally omitted from production tiles
 * — 24 announcements per row would be screen-reader noise).
 */
function tileEl(container: HTMLElement): HTMLElement {
  const el = container.querySelector<HTMLElement>('[data-home-hour]');
  if (!el) throw new Error('HourTile root not found');
  return el;
}

/**
 * Find the tile and return a Locator so we can fire real Playwright-driven
 * hover/unhover events (React's synthetic mouseenter/mouseleave aren't
 * reliably triggered by dispatching native events).
 */
function tileLocator(container: HTMLElement) {
  return page.elementLocator(tileEl(container));
}

describe('HourTile className state matrix', () => {
  beforeEach(freshStore);

  it('renders the formatted hour label', async () => {
    const screen = await renderTile({
      column: column(14),
      columnIndex: 14,
      format: '12',
      isOffDay: false,
      isCurrentHour: false,
      isWeekend: false,
    });
    await expect.element(screen.getByText('2p')).toBeVisible();
  });

  it('renders 24-hour label when format=24', async () => {
    const screen = await renderTile({
      column: column(14),
      columnIndex: 14,
      format: '24',
      isOffDay: false,
      isCurrentHour: false,
      isWeekend: false,
    });
    await expect.element(screen.getByText('14')).toBeVisible();
  });

  it('applies the major-tick height class on every 6th column', async () => {
    const screen = await renderTile({
      column: column(12),
      columnIndex: 12,
      format: '12',
      isOffDay: false,
      isCurrentHour: false,
      isWeekend: false,
    });
    expect(tileEl(screen.container).className).toContain('before:h-3');
  });

  it('does not apply the major-tick height class on a minor column', async () => {
    const screen = await renderTile({
      column: column(7),
      columnIndex: 7,
      format: '12',
      isOffDay: false,
      isCurrentHour: false,
      isWeekend: false,
    });
    // Minor tick uses `before:h-1.5` — the major `before:h-3` class is absent
    // (substring search would match h-1.5, so we check for the specific h-3
    // utility followed by a space or end).
    expect(tileEl(screen.container).className).not.toMatch(/(^|\s)before:h-3(\s|$)/);
  });

  it('does not paint a brand fill on in-range tiles — the RangeBand overlay carries the range visual', async () => {
    // The range used to fill each tile with bg-[var(--brand)]; now the tile
    // stays transparent and the overlay band sits on top. Asserting the absence
    // is what guards against accidentally re-introducing the per-tile fill.
    store.setState({ rangeStartMin: 840, rangeEndMin: 900 });
    const screen = await renderTile({
      column: column(14),
      columnIndex: 14,
      format: '12',
      isOffDay: false,
      isCurrentHour: false,
      isWeekend: false,
    });
    expect(tileEl(screen.container).className).not.toContain('bg-[var(--brand)]');
  });

  it('applies the preview-band class when previewHour matches but anchor is unset', async () => {
    store.setState({ previewHour: 14 });
    const screen = await renderTile({
      column: column(14),
      columnIndex: 14,
      format: '12',
      isOffDay: false,
      isCurrentHour: false,
      isWeekend: false,
    });
    expect(tileEl(screen.container).className).toContain('bg-[var(--brand-soft)]');
  });

  it('does not show preview band when anchor is set to the same column (avoid double-emphasis)', async () => {
    // The brand-soft preview tint would compound with the RangeBand overlay
    // already covering the column. Keep them mutually exclusive.
    store.setState({ rangeStartMin: 840, rangeEndMin: 900, previewHour: 14 });
    const screen = await renderTile({
      column: column(14),
      columnIndex: 14,
      format: '12',
      isOffDay: false,
      isCurrentHour: false,
      isWeekend: false,
    });
    expect(tileEl(screen.container).className).not.toContain('bg-[var(--brand-soft)]');
  });

  it('applies the now class (brand tick + label) when isCurrentHour and not anchor-aligned', async () => {
    const screen = await renderTile({
      column: column(9),
      columnIndex: 9,
      format: '12',
      isOffDay: false,
      isCurrentHour: true,
      isWeekend: false,
    });
    expect(tileEl(screen.container).className).toContain('text-[color:var(--brand)]');
  });

  it('applies weekend recolor classes', async () => {
    const screen = await renderTile({
      column: column(10),
      columnIndex: 10,
      format: '12',
      isOffDay: false,
      isCurrentHour: false,
      isWeekend: true,
    });
    const cls = tileEl(screen.container).className;
    expect(cls).toContain('text-[color:var(--weekend-fg)]');
    expect(cls).toContain('border-[color:var(--weekend-base)]');
  });

  it('renders the +Nd day-delta badge when anchor-aligned and column.dayDelta > 0', async () => {
    store.setState({ rangeStartMin: 1380, rangeEndMin: 1440 });
    const screen = await renderTile({
      column: { homeHour: 23, localHour: 1, localDate: '2026-05-21', dayDelta: 1 },
      columnIndex: 23,
      format: '12',
      isOffDay: false,
      isCurrentHour: false,
      isWeekend: false,
    });
    await expect.element(screen.getByText('+1d')).toBeVisible();
  });

  it('renders the -Nd day-delta badge when column.dayDelta < 0', async () => {
    store.setState({ rangeStartMin: 0, rangeEndMin: 60 });
    const screen = await renderTile({
      column: { homeHour: 0, localHour: 22, localDate: '2026-05-19', dayDelta: -1 },
      columnIndex: 0,
      format: '12',
      isOffDay: false,
      isCurrentHour: false,
      isWeekend: false,
    });
    await expect.element(screen.getByText('-1d')).toBeVisible();
  });

  it('does not render a day-delta badge when not anchor-aligned, even if dayDelta is nonzero', async () => {
    const screen = await renderTile({
      column: { homeHour: 23, localHour: 1, localDate: '2026-05-21', dayDelta: 1 },
      columnIndex: 23,
      format: '12',
      isOffDay: false,
      isCurrentHour: false,
      isWeekend: false,
    });
    // No badge means no "+1d" text in the tile content.
    expect(screen.container.textContent ?? '').not.toContain('+1d');
  });

  it('applies off-day opacity to the label when isOffDay and not anchor-aligned', async () => {
    const screen = await renderTile({
      column: column(10),
      columnIndex: 10,
      format: '12',
      isOffDay: true,
      isCurrentHour: false,
      isWeekend: false,
    });
    const label = screen.container.querySelector('span');
    expect(label?.className).toContain('opacity-[0.55]');
  });

  it('hides the label on mobile for non-major columns (sparse-label rule)', async () => {
    // Column index 7 — not divisible by 3, not anchor-aligned, so label gets
    // max-md:invisible. Anchor tiles bypass this rule.
    const screen = await renderTile({
      column: column(7),
      columnIndex: 7,
      format: '12',
      isOffDay: false,
      isCurrentHour: false,
      isWeekend: false,
    });
    const label = screen.container.querySelector('span');
    expect(label?.className).toContain('max-md:invisible');
  });

  it('keeps the label visible on mobile when the column is anchor-aligned', async () => {
    store.setState({ rangeStartMin: 420, rangeEndMin: 480 });
    const screen = await renderTile({
      column: column(7),
      columnIndex: 7,
      format: '12',
      isOffDay: false,
      isCurrentHour: false,
      isWeekend: false,
    });
    const label = screen.container.querySelector('span');
    expect(label?.className).not.toContain('max-md:invisible');
  });

  it('lights the final column when the range ends partway into it (3:00–5:15 → col 5)', async () => {
    // 5:15 ends inside the 5:00–6:00 column, so column 5 is in range. Observed
    // via off-day opacity: in-range tiles drop the dimming.
    store.setState({ rangeStartMin: 180, rangeEndMin: 315 });
    const screen = await renderTile({
      column: column(5),
      columnIndex: 5,
      format: '12',
      isOffDay: true,
      isCurrentHour: false,
      isWeekend: false,
    });
    const label = screen.container.querySelector('span');
    expect(label?.className).not.toContain('opacity-[0.55]');
  });

  it('does not light the column past an exact-hour end (3:00–5:00 → col 5 excluded)', async () => {
    // 5:00 stops on the boundary, so column 5 (5:00–6:00) is NOT in range and
    // keeps its off-day dimming.
    store.setState({ rangeStartMin: 180, rangeEndMin: 300 });
    const screen = await renderTile({
      column: column(5),
      columnIndex: 5,
      format: '12',
      isOffDay: true,
      isCurrentHour: false,
      isWeekend: false,
    });
    const label = screen.container.querySelector('span');
    expect(label?.className).toContain('opacity-[0.55]');
  });
});

describe('HourTile interaction', () => {
  beforeEach(freshStore);

  it('mouse enter sets previewHour to column.homeHour', async () => {
    const screen = await renderTile({
      column: column(14),
      columnIndex: 14,
      format: '12',
      isOffDay: false,
      isCurrentHour: false,
      isWeekend: false,
    });
    await tileLocator(screen.container).hover();
    expect(store.getState().previewHour).toBe(14);
  });

  it('mouse leave clears previewHour back to null', async () => {
    const screen = await renderTile({
      column: column(14),
      columnIndex: 14,
      format: '12',
      isOffDay: false,
      isCurrentHour: false,
      isWeekend: false,
    });
    const tile = tileLocator(screen.container);
    await tile.hover();
    expect(store.getState().previewHour).toBe(14);
    await tile.unhover();
    expect(store.getState().previewHour).toBeNull();
  });

  it('uses column.homeHour (not column.localHour) when firing preview — cross-row column highlight relies on this', async () => {
    // Row at +3h from home: home column 14 maps to local hour 17 in this row.
    // Hovering this tile should still set previewHour=14 so the same column on
    // every other row lights up — not previewHour=17 (which would mean
    // "highlight column 17 across rows", a different column).
    const screen = await renderTile({
      column: { homeHour: 14, localHour: 17, localDate: '2026-05-20', dayDelta: 0 },
      columnIndex: 14,
      format: '12',
      isOffDay: false,
      isCurrentHour: false,
      isWeekend: false,
    });
    await tileLocator(screen.container).hover();
    expect(store.getState().previewHour).toBe(14);
  });
});
