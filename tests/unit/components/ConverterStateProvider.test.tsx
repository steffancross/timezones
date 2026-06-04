import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { ConverterStateProvider } from '@/components/converter/ConverterStateProvider';
import { useConverterStoreApi } from '@/components/converter/store-context';
import type { ConverterStoreApi } from '@/lib/store/converter';

// UrlSync + SearchParamsHydrator (rendered as children) call next/navigation
// hooks that require a real App-Router context. Stub them with no-ops — these
// tests don't exercise URL writing or search-param hydration (the latter is
// covered by tests/unit/components/SearchParamsHydrator.test.tsx).
vi.mock('next/navigation', () => ({
  __esModule: true,
  default: {},
  useRouter: () => ({ replace: () => {}, push: () => {}, prefetch: () => {} }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

const STORAGE_KEY = 'converter_prefs';

/**
 * The per-mount store is owned by the provider and not exposed via a module
 * singleton anymore. To assert on the bootstrapped state, drop a child that
 * grabs the store from context and stashes it where the test can reach it.
 *
 * This is the test analogue of the production read path: real components
 * subscribe via `useConverterStore(selector)` from the same context.
 */
let capturedStore: ConverterStoreApi | null = null;
function StoreCapture() {
  capturedStore = useConverterStoreApi();
  return null;
}

function getStore(): ConverterStoreApi {
  if (!capturedStore) throw new Error('StoreCapture did not run — was it rendered?');
  return capturedStore;
}

describe('ConverterStateProvider bootstrap', () => {
  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY);
    capturedStore = null;
  });

  it('renders children', async () => {
    const screen = await render(
      <ConverterStateProvider>
        <StoreCapture />
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
        <StoreCapture />
        <div>child</div>
      </ConverterStateProvider>,
    );
    expect(getStore().getState().zones).toHaveLength(1);
    expect(getStore().getState().zones[0]?.iana).toBe('America/Los_Angeles');
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
        <StoreCapture />
        <div>child</div>
      </ConverterStateProvider>,
    );

    const state = getStore().getState();
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
        workingHours: { start: 9, end: 17, days: [1, 2, 3, 4, 5] },
      }),
    );

    await render(
      <ConverterStateProvider
        initialState={{ overlay: { dayNight: true, workHours: false, weekend: false } }}
      >
        <StoreCapture />
        <div>child</div>
      </ConverterStateProvider>,
    );

    expect(getStore().getState().overlay.workHours).toBe(false);
  });

  it('does not re-create the store across re-renders (useRef-stable instance)', async () => {
    const initial = [{ kind: 'zone' as const, slug: 'pst', iana: 'America/Los_Angeles' }];

    const screen = await render(
      <ConverterStateProvider initialState={{ zones: initial }}>
        <StoreCapture />
        <div>child</div>
      </ConverterStateProvider>,
    );

    expect(getStore().getState().zones).toHaveLength(1);
    const storeRefBefore = getStore();

    // Simulate the user adding a zone after mount — the provider's per-mount
    // store must not be recreated on rerender and clobber the addition.
    getStore().getState().addZone({ kind: 'zone', slug: 'est', iana: 'America/New_York' });
    expect(getStore().getState().zones).toHaveLength(2);

    // Re-render with a new (irrelevant) wrapping element; same store instance,
    // same state. Re-passing the same `initial` reference here is intentional;
    // changing initialState after mount is not a supported flow (production
    // route changes remount the provider).
    await screen.rerender(
      <ConverterStateProvider initialState={{ zones: initial }}>
        <StoreCapture />
        <div>updated child</div>
      </ConverterStateProvider>,
    );

    expect(getStore()).toBe(storeRefBefore);
    expect(getStore().getState().zones).toHaveLength(2);
  });

  it('persistence is wired after init: store changes write to localStorage', async () => {
    await render(
      <ConverterStateProvider>
        <StoreCapture />
        <div>child</div>
      </ConverterStateProvider>,
    );

    // attachPersistence subscribed during mount. A user-action store change to
    // a persisted field (overlay/workingHours) should now show up in
    // localStorage. format is intentionally not persisted, so we don't use it
    // as the signal.
    getStore().getState().toggleWeekendOverlay();

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
          rangeStartMin: 900,
          rangeEndMin: 960,
          format: '24',
        }}
      >
        <StoreCapture />
        <div>child</div>
      </ConverterStateProvider>,
    );

    const s = getStore().getState();
    expect(s.zones).toHaveLength(2);
    expect(s.zones[0]?.iana).toBe('America/Los_Angeles');
    expect(s.anchorDate).toBe('2026-12-25');
    expect(s.rangeStartMin).toBe(900);
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
        <StoreCapture />
        <div>child</div>
      </ConverterStateProvider>,
    );

    const s = getStore().getState();
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
        <StoreCapture />
        <div>child</div>
      </ConverterStateProvider>,
    );

    const s = getStore().getState();
    expect(s.zones).toEqual([]);
    expect(s.format).toBe('12');
    expect(s.overlay).toEqual({ dayNight: true, workHours: false, weekend: false });
  });
});
