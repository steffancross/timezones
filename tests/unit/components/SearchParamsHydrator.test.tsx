import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { SearchParamsHydrator } from '@/components/converter/SearchParamsHydrator';
import { ConverterStoreProvider } from '@/components/converter/store-context';
import { createConverterStore } from '@/lib/store/converter';

/**
 * Each test controls what useSearchParams() returns via this variable. The
 * mock factory below resolves it lazily so re-setting between tests works
 * without re-importing the module.
 */
let mockedParams = new URLSearchParams();
vi.mock('next/navigation', () => ({
  __esModule: true,
  useSearchParams: () => mockedParams,
}));

let store: ReturnType<typeof createConverterStore>;
function freshStoreWithPair() {
  // Seed with a pair-page-like initial state: PST as zones[0], GMT as zones[1].
  // The hydrator should leave these alone unless `?z=` is supplied.
  store = createConverterStore({
    zones: [
      { kind: 'zone', slug: 'pst', iana: 'America/Los_Angeles' },
      { kind: 'zone', slug: 'gmt', iana: 'Europe/London' },
    ],
    homeZoneIndex: 0,
  });
}

async function renderHydrator() {
  return render(
    <ConverterStoreProvider value={store}>
      <SearchParamsHydrator />
    </ConverterStoreProvider>,
  );
}

describe('SearchParamsHydrator', () => {
  beforeEach(() => {
    mockedParams = new URLSearchParams();
    freshStoreWithPair();
  });

  it('is a no-op when no relevant params are present', async () => {
    const before = store.getState();
    await renderHydrator();
    const after = store.getState();
    expect(after.zones).toEqual(before.zones);
    expect(after.anchorDate).toBe(before.anchorDate);
    expect(after.rangeStartMin).toBeNull();
    expect(after.format).toBe('12');
  });

  it('applies ?d= as anchorDate', async () => {
    mockedParams = new URLSearchParams('d=2026-12-25');
    await renderHydrator();
    expect(store.getState().anchorDate).toBe('2026-12-25');
  });

  it('ignores ?d= with malformed value (validator drops it)', async () => {
    mockedParams = new URLSearchParams('d=not-a-date');
    const before = store.getState().anchorDate;
    await renderHydrator();
    expect(store.getState().anchorDate).toBe(before);
  });

  it('applies ?r=HHmm-HHmm as a one-hour range', async () => {
    mockedParams = new URLSearchParams('r=1400-1500');
    await renderHydrator();
    const s = store.getState();
    expect(s.rangeStartMin).toBe(840);
    expect(s.rangeEndMin).toBe(900);
  });

  it('applies a wider range', async () => {
    mockedParams = new URLSearchParams('r=1400-1700');
    await renderHydrator();
    const s = store.getState();
    expect(s.rangeStartMin).toBe(840);
    expect(s.rangeEndMin).toBe(1020);
  });

  it('applies a 15-minute-precise range', async () => {
    mockedParams = new URLSearchParams('r=0300-0515');
    await renderHydrator();
    const s = store.getState();
    expect(s.rangeStartMin).toBe(180);
    expect(s.rangeEndMin).toBe(315);
  });

  it('applies ?f=24', async () => {
    mockedParams = new URLSearchParams('f=24');
    await renderHydrator();
    expect(store.getState().format).toBe('24');
  });

  it('ignores ?f= with anything other than 12 or 24', async () => {
    mockedParams = new URLSearchParams('f=garbage');
    await renderHydrator();
    expect(store.getState().format).toBe('12');
  });

  it('applies ?z= as a zones override (share-link case)', async () => {
    // Resolvable zone slugs from the dataset. `tokyo` is a city; `jst` is the
    // zone id. Either form should resolve via resolveSlugSegment.
    mockedParams = new URLSearchParams('z=jst,gmt');
    await renderHydrator();
    const s = store.getState();
    expect(s.zones).toHaveLength(2);
    expect(s.zones[0]?.iana).toBe('Asia/Tokyo');
    expect(s.zones[1]?.iana).toBe('Europe/London');
  });

  it('applies multiple params in one mount (d + r + f)', async () => {
    mockedParams = new URLSearchParams('d=2026-12-25&r=0900-1700&f=24');
    await renderHydrator();
    const s = store.getState();
    expect(s.anchorDate).toBe('2026-12-25');
    expect(s.rangeStartMin).toBe(540);
    expect(s.rangeEndMin).toBe(1020);
    expect(s.format).toBe('24');
  });
});
