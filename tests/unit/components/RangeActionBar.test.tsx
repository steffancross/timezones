import { beforeEach, describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { RangeActionBar } from '@/components/converter/RangeActionBar';
import { ConverterStoreProvider } from '@/components/converter/store-context';
import { createConverterStore } from '@/lib/store/converter';

let store: ReturnType<typeof createConverterStore>;
function freshStore() {
  store = createConverterStore({
    zones: [{ kind: 'zone', slug: 'pst', iana: 'America/Los_Angeles' }],
    homeZoneIndex: 0,
  });
  // 3:00–5:15 — a 15-minute-precise range (135 minutes).
  store.setState({
    rangeStartMin: 180,
    rangeEndMin: 315,
    anchorDate: '2026-05-20',
    defaultAnchorDate: '2026-05-20',
  });
}

function renderBar() {
  return render(
    <ConverterStoreProvider value={store}>
      <RangeActionBar />
    </ConverterStoreProvider>,
  );
}

describe('RangeActionBar', () => {
  beforeEach(freshStore);

  it('renders the duration of a 15-min-precise range', async () => {
    const screen = await renderBar();
    await expect.element(screen.getByText('2h 15m')).toBeVisible();
  });

  it('renders both endpoints as Radix comboboxes, not native selects', async () => {
    // The native <select> filled the screen with all 96 options; the Radix
    // Select is a height-bounded combobox whose options only mount on open.
    const screen = await renderBar();
    const comboboxes = screen.container.querySelectorAll('[role="combobox"]');
    expect(comboboxes.length).toBe(2);
    expect(screen.container.querySelector('[aria-label="Range start time"]')).not.toBeNull();
    expect(screen.container.querySelector('[aria-label="Range end time"]')).not.toBeNull();
  });
});
