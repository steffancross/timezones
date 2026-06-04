import { beforeEach, describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { ResetButton } from '@/components/converter/ResetButton';
import { ConverterStoreProvider } from '@/components/converter/store-context';
import { createConverterStore } from '@/lib/store/converter';
import { DEFAULT_WORKING_HOURS } from '@/lib/time/working-hours';

const TODAY = '2026-05-20';

// Pre-refactor this seeded a singleton with the "all defaults" baseline via
// `useConverterStore.setState({...})`. Now each test gets its own store, seeded
// the same way (anchorDate and defaultAnchorDate pinned to the same date so
// ResetButton reads "no date change").
let store: ReturnType<typeof createConverterStore>;
function freshStoreAtDefaults() {
  store = createConverterStore();
  store.setState({
    zones: [],
    homeZoneIndex: null,
    anchorDate: TODAY,
    defaultAnchorDate: TODAY,
    rangeStartMin: null,
    rangeEndMin: null,
    previewHour: null,
    format: '12',
    overlay: { dayNight: true, workHours: false, weekend: false },
    workingHours: DEFAULT_WORKING_HOURS,
  });
}

function renderWithStore() {
  return render(
    <ConverterStoreProvider value={store}>
      <ResetButton />
    </ConverterStoreProvider>,
  );
}

describe('ResetButton', () => {
  beforeEach(freshStoreAtDefaults);

  it('is disabled when every user-tweakable field is at its default', async () => {
    const screen = await renderWithStore();
    await expect.element(screen.getByRole('button')).toBeDisabled();
  });

  it('enables when a range is set', async () => {
    const screen = await renderWithStore();
    store.setState({ rangeStartMin: 840, rangeEndMin: 900 });
    await expect.element(screen.getByRole('button')).toBeEnabled();
  });

  it('enables when anchorDate differs from defaultAnchorDate', async () => {
    const screen = await renderWithStore();
    store.setState({ anchorDate: '2026-12-25' });
    await expect.element(screen.getByRole('button')).toBeEnabled();
  });

  it('enables when format flips to 24', async () => {
    const screen = await renderWithStore();
    store.setState({ format: '24' });
    await expect.element(screen.getByRole('button')).toBeEnabled();
  });

  it('enables when dayNight overlay is toggled off', async () => {
    const screen = await renderWithStore();
    store.setState({ overlay: { dayNight: false, workHours: false, weekend: false } });
    await expect.element(screen.getByRole('button')).toBeEnabled();
  });

  it('enables when workHours overlay is toggled on', async () => {
    const screen = await renderWithStore();
    store.setState({ overlay: { dayNight: true, workHours: true, weekend: false } });
    await expect.element(screen.getByRole('button')).toBeEnabled();
  });

  it('enables when weekend overlay is toggled on', async () => {
    const screen = await renderWithStore();
    store.setState({ overlay: { dayNight: true, workHours: false, weekend: true } });
    await expect.element(screen.getByRole('button')).toBeEnabled();
  });

  it('enables when workingHours start changes', async () => {
    const screen = await renderWithStore();
    store.setState({ workingHours: { ...DEFAULT_WORKING_HOURS, start: 8 } });
    await expect.element(screen.getByRole('button')).toBeEnabled();
  });

  it('enables when workingHours end changes', async () => {
    const screen = await renderWithStore();
    store.setState({ workingHours: { ...DEFAULT_WORKING_HOURS, end: 18 } });
    await expect.element(screen.getByRole('button')).toBeEnabled();
  });

  it('enables when workingHours days are reordered or removed', async () => {
    const screen = await renderWithStore();
    store.setState({
      workingHours: { ...DEFAULT_WORKING_HOURS, days: [1, 2, 3, 4, 5, 6] },
    });
    await expect.element(screen.getByRole('button')).toBeEnabled();
  });

  it('click calls resetAll: store returns to defaults', async () => {
    const screen = await renderWithStore();
    store.setState({
      rangeStartMin: 840,
      rangeEndMin: 900,
      format: '24',
      overlay: { dayNight: false, workHours: true, weekend: true },
      workingHours: { start: 8, end: 18, days: [1, 2, 3, 4, 5, 6] },
    });
    await expect.element(screen.getByRole('button')).toBeEnabled();

    await screen.getByRole('button').click();

    const after = store.getState();
    expect(after.rangeStartMin).toBeNull();
    expect(after.format).toBe('12');
    expect(after.overlay).toEqual({ dayNight: true, workHours: false, weekend: false });
    expect(after.workingHours).toEqual(DEFAULT_WORKING_HOURS);
    expect(after.anchorDate).toBe(after.defaultAnchorDate);
  });
});
