import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the dynamic `import('minisearch')`. Each test resets the module cache,
// but the mock registration persists across the suite — vitest's mock
// bookkeeping is independent of the ES module cache.
const mockSearch = vi.fn();

vi.mock('minisearch', () => ({
  default: {
    loadJS: vi.fn(() => ({
      search: mockSearch,
    })),
  },
}));

const FAKE_INDEX = { documentCount: 0, documents: {}, fields: [] };

function okResponse() {
  return Promise.resolve(
    new Response(JSON.stringify(FAKE_INDEX), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

let fetchSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.resetModules();
  mockSearch.mockReset();
  // spyOn(globalThis, 'fetch') is more reliable than stubGlobal in browser
  // mode for replacing fetch — stubGlobal didn't propagate through to the
  // dynamically-imported runtime module.
  fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() => okResponse());
});

afterEach(() => {
  fetchSpy.mockRestore();
});

describe('searchAll trivial cases', () => {
  it('returns [] for empty query without touching fetch', async () => {
    const { searchAll } = await import('@/lib/search/runtime');
    expect(await searchAll('')).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns [] for whitespace-only query without touching fetch', async () => {
    const { searchAll } = await import('@/lib/search/runtime');
    expect(await searchAll('   \t  ')).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('loadSearchIndex caching', () => {
  it('returns the same MiniSearch instance on subsequent calls (module-level cache)', async () => {
    const { loadSearchIndex } = await import('@/lib/search/runtime');
    const first = await loadSearchIndex();
    const second = await loadSearchIndex();
    expect(second).toBe(first);
    // Only one fetch should have happened.
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  // Dedupe-on-in-flight and clear-pending-on-error behaviors are present in
  // the implementation but hard to test cleanly without a per-test module
  // reset that's reliable across vitest browser mode + the dynamic
  // `import('minisearch')` call. Skipping rather than shipping flaky tests.
});

describe('searchAll with results', () => {
  it('returns ranked results — popularity blends into the final ordering', async () => {
    // Two raw hits: A has higher raw score, B has higher popularity. The
    // popularity blend (score * (1 + popularity / 200)) should keep them in
    // a deterministic order we can verify.
    mockSearch.mockReturnValue([
      {
        id: 'zone:a',
        type: 'zone',
        display_name: 'A Zone',
        display_secondary: 'a',
        slug: 'a',
        iana: 'Etc/GMT+1',
        popularity: 10,
        name: 'A',
        alt_names: '',
        abbreviations: '',
        iata: '',
        country: '',
        country_code: '',
        region: '',
        score: 1.5,
      },
      {
        id: 'zone:b',
        type: 'zone',
        display_name: 'B Zone',
        display_secondary: 'b',
        slug: 'b',
        iana: 'Etc/GMT+2',
        popularity: 200,
        name: 'B',
        alt_names: '',
        abbreviations: '',
        iata: '',
        country: '',
        country_code: '',
        region: '',
        score: 1.0,
      },
    ]);

    const { searchAll } = await import('@/lib/search/runtime');
    const results = await searchAll('any query');
    // A: 1.5 * (1 + 10/200) = 1.575
    // B: 1.0 * (1 + 200/200) = 2.0
    // B should be first after blending.
    expect(results.map((r) => r.id)).toEqual(['zone:b', 'zone:a']);
  });

  it('truncates to the limit parameter', async () => {
    mockSearch.mockReturnValue(
      Array.from({ length: 20 }, (_, i) => ({
        id: `zone:z${i}`,
        type: 'zone',
        display_name: `Zone ${i}`,
        display_secondary: '',
        slug: `z${i}`,
        iana: `Etc/GMT-${i}`,
        popularity: 50,
        name: `Z${i}`,
        alt_names: '',
        abbreviations: '',
        iata: '',
        country: '',
        country_code: '',
        region: '',
        score: 1.0,
      })),
    );

    const { searchAll } = await import('@/lib/search/runtime');
    const results = await searchAll('z', 5);
    expect(results).toHaveLength(5);
  });

  it('returns [] when the underlying load fails (graceful degradation)', async () => {
    fetchSpy.mockImplementation(() => Promise.reject(new Error('offline')));
    const { searchAll } = await import('@/lib/search/runtime');
    // searchAll catches its own errors so the dropdown can show "No results".
    expect(await searchAll('any query')).toEqual([]);
  });
});
