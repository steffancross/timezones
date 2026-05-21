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
  usePathname: () => '/sandbox/converter',
}));

const STORAGE_KEY = 'converter_prefs';
const TODAY = '2026-05-20';

function clearStore() {
  useConverterStore.setState({
    zones: [],
    homeZoneIndex: null,
    anchorDate: TODAY,
    defaultAnchorDate: TODAY,
    anchorHour: null,
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

  it('applies persisted prefs from localStorage when no initialState supplies them', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        format: '24',
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
    expect(state.format).toBe('24');
    expect(state.overlay).toEqual({ dayNight: false, workHours: true, weekend: true });
    expect(state.workingHours).toEqual({ start: 8, end: 18, days: [1, 2, 3, 4, 5] });
  });

  it('initialState wins over persisted prefs on overlapping keys', async () => {
    // Persisted says format=24; page-level initialState says format=12.
    // initialState (URL/page) takes precedence.
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        format: '24',
        overlay: { dayNight: true, workHours: false, weekend: false },
        workingHours: DEFAULT_WORKING_HOURS,
      }),
    );

    await render(
      <ConverterStateProvider initialState={{ format: '12' }}>
        <div>child</div>
      </ConverterStateProvider>,
    );

    expect(useConverterStore.getState().format).toBe('12');
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
    useConverterStore
      .getState()
      .addZone({ kind: 'zone', slug: 'est', iana: 'America/New_York' });
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

    // attachPersistence subscribed during mount. A user-action store change
    // should now show up in localStorage.
    useConverterStore.getState().setFormat('24');

    // The persistence subscribe writes synchronously on change.
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.format).toBe('24');
  });
});
