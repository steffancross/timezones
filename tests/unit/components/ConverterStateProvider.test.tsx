import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { ConverterStateProvider } from '@/components/converter/ConverterStateProvider';
import { useConverterStore } from '@/lib/store/converter';
import { DEFAULT_WORKING_HOURS } from '@/lib/time/working-hours';

// UrlSync (rendered as a child) calls next/navigation hooks that require a
// real App-Router context. Stub them with no-ops — these tests don't exercise
// URL writing.
vi.mock('next/navigation', () => ({
  __esModule: true,
  default: {},
  useRouter: () => ({ replace: () => {}, push: () => {}, prefetch: () => {} }),
  usePathname: () => '/',
}));

const STORAGE_KEY = 'converter_prefs';
const TODAY = '2026-05-20';

function clearStore() {
  useConverterStore.setState({
    zones: [],
    homeZoneIndex: null,
    anchorDate: TODAY,
    defaultAnchorDate: TODAY,
    rangeStart: null,
    previewHour: null,
    format: '12',
    overlay: { dayNight: true, workHours: false, weekend: false },
    workingHours: DEFAULT_WORKING_HOURS,
  });
}

describe('ConverterStateProvider bootstrap', () => {
  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY);
    clearStore();
  });

  it('renders children', async () => {
    const screen = await render(
      <ConverterStateProvider>
        <div>child content</div>
      </ConverterStateProvider>,
    );
    await expect.element(screen.getByText('child content')).toBeVisible();
  });

  it('applies initialState zones after mount', async () => {
    await render(
      <ConverterStateProvider
        initialState={{
          zones: [{ kind: 'zone', slug: 'pst', iana: 'America/Los_Angeles' }],
        }}
      >
        <div>child</div>
      </ConverterStateProvider>,
    );
    expect(useConverterStore.getState().zones).toHaveLength(1);
    expect(useConverterStore.getState().zones[0]?.iana).toBe('America/Los_Angeles');
  });

  it('applies persisted prefs (overlay + workingHours) from localStorage when no initialState supplies them', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        overlay: { dayNight: false, workHours: true, weekend: true },
        workingHours: { start: 8, end: 18, days: [1, 2, 3, 4, 5] },
      }),
    );

    await render(
      <ConverterStateProvider>
        <div>child</div>
      </ConverterStateProvider>,
    );

    const state = useConverterStore.getState();
    expect(state.overlay).toEqual({ dayNight: false, workHours: true, weekend: true });
    expect(state.workingHours).toEqual({ start: 8, end: 18, days: [1, 2, 3, 4, 5] });
    // format is intentionally not persisted — should stay at the baseline 12.
    expect(state.format).toBe('12');
  });

  it('initialState wins over persisted prefs on overlapping keys', async () => {
    // Persisted says workHours overlay is on; page-level initialState turns
    // it off. initialState (URL/page) takes precedence.
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        overlay: { dayNight: true, workHours: true, weekend: false },
        workingHours: DEFAULT_WORKING_HOURS,
      }),
    );

    await render(
      <ConverterStateProvider
        initialState={{ overlay: { dayNight: true, workHours: false, weekend: false } }}
      >
        <div>child</div>
      </ConverterStateProvider>,
    );

    expect(useConverterStore.getState().overlay.workHours).toBe(false);
  });

  it('does not re-run initialize across re-renders (hydrated ref guard)', async () => {
    const initial = [{ kind: 'zone' as const, slug: 'pst', iana: 'America/Los_Angeles' }];

    const screen = await render(
      <ConverterStateProvider initialState={{ zones: initial }}>
        <div>child</div>
      </ConverterStateProvider>,
    );

    expect(useConverterStore.getState().zones).toHaveLength(1);

    // Simulate the user adding a zone after mount — initialize must NOT re-run
    // and clobber it back to the single seed zone.
    useConverterStore.getState().addZone({ kind: 'zone', slug: 'est', iana: 'America/New_York' });
    expect(useConverterStore.getState().zones).toHaveLength(2);

    // Re-render with a new (irrelevant) wrapping element; initialize stays put.
    await screen.rerender(
      <ConverterStateProvider initialState={{ zones: initial }}>
        <div>updated child</div>
      </ConverterStateProvider>,
    );

    expect(useConverterStore.getState().zones).toHaveLength(2);
  });

  it('persistence is wired after init: store changes write to localStorage', async () => {
    await render(
      <ConverterStateProvider>
        <div>child</div>
      </ConverterStateProvider>,
    );

    // attachPersistence subscribed during mount. A user-action store change to
    // a persisted field (overlay/workingHours) should now show up in
    // localStorage. format is intentionally not persisted, so we don't use it
    // as the signal.
    useConverterStore.getState().toggleWeekendOverlay();

    // The persistence subscribe writes synchronously on change.
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) throw new Error('expected persistence to write to localStorage');
    const parsed = JSON.parse(raw);
    expect(parsed.overlay.weekend).toBe(true);
  });

  it('applies a full URL-shaped initialState (zones + anchor fields + format)', async () => {
    // Mirrors the shape G3 (pair page) passes: zones from slug, anchor/format
    // from search params. Verifies the refactor still wires URL state through
    // even when multiple fields are supplied at once.
    await render(
      <ConverterStateProvider
        initialState={{
          zones: [
            { kind: 'zone', slug: 'pst', iana: 'America/Los_Angeles' },
            { kind: 'zone', slug: 'est', iana: 'America/New_York' },
          ],
          homeZoneIndex: 0,
          anchorDate: '2026-12-25',
          rangeStart: 15,
          format: '24',
        }}
      >
        <div>child</div>
      </ConverterStateProvider>,
    );

    const s = useConverterStore.getState();
    expect(s.zones).toHaveLength(2);
    expect(s.zones[0]?.iana).toBe('America/Los_Angeles');
    expect(s.anchorDate).toBe('2026-12-25');
    expect(s.rangeStart).toBe(15);
    expect(s.format).toBe('24');
  });

  it('derives defaultAnchorDate from the home zone when initialState pins a URL date', async () => {
    // The store's `initialize` action snapshots `defaultAnchorDate` even when
    // the caller pins an explicit anchorDate (URL ?d=…). ResetButton relies on
    // this snapshot to know the URL date is non-default. If the snapshot stops
    // being derived here, ResetButton's enabled state regresses.
    await render(
      <ConverterStateProvider
        initialState={{
          zones: [{ kind: 'zone', slug: 'jst', iana: 'Asia/Tokyo' }],
          homeZoneIndex: 0,
          anchorDate: '2026-12-25',
        }}
      >
        <div>child</div>
      </ConverterStateProvider>,
    );

    const s = useConverterStore.getState();
    expect(s.anchorDate).toBe('2026-12-25');
    // defaultAnchorDate should be today-in-Tokyo, NOT the URL-supplied date.
    expect(s.defaultAnchorDate).not.toBe('2026-12-25');
    expect(s.defaultAnchorDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('handles an empty initialState object without altering baseline defaults', async () => {
    // Edge case: provider mounted with `initialState={}` (G2 home page might
    // do this if cf-timezone is missing and no zones are seeded).
    await render(
      <ConverterStateProvider initialState={{}}>
        <div>child</div>
      </ConverterStateProvider>,
    );

    const s = useConverterStore.getState();
    expect(s.zones).toEqual([]);
    expect(s.format).toBe('12');
    expect(s.overlay).toEqual({ dayNight: true, workHours: false, weekend: false });
  });
});
