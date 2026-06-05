import { beforeEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { SettingsMenu } from '@/components/converter/SettingsMenu';
import { ConverterStoreProvider } from '@/components/converter/store-context';
import { createConverterStore } from '@/lib/store/converter';
import { DEFAULT_WORKING_HOURS } from '@/lib/time/working-hours';

let store: ReturnType<typeof createConverterStore>;
function freshStore() {
  store = createConverterStore();
  store.setState({
    overlay: { dayNight: true, workHours: false, weekend: false },
    workingHours: DEFAULT_WORKING_HOURS,
  });
}

function renderWithStore() {
  return render(
    <ConverterStoreProvider value={store}>
      <SettingsMenu />
    </ConverterStoreProvider>,
  );
}

/** Open the Popover (portaled into body) and yield to React. */
async function openMenu(container: HTMLElement) {
  const trigger = container.querySelector('button[aria-label="Settings"]');
  if (!trigger) throw new Error('settings trigger not found');
  await page.elementLocator(trigger).click();
}

function findLabelByText(text: string): HTMLLabelElement | null {
  const labels = Array.from(document.body.querySelectorAll('label'));
  return labels.find((l) => l.textContent?.includes(text)) ?? null;
}

async function clickRow(text: string) {
  const label = findLabelByText(text);
  if (!label) throw new Error(`row "${text}" not found`);
  await page.elementLocator(label).click();
}

describe('SettingsMenu overlay toggles', () => {
  beforeEach(freshStore);

  it('clicking the Day / night row flips overlay.dayNight', async () => {
    const screen = await renderWithStore();
    await openMenu(screen.container);

    expect(store.getState().overlay.dayNight).toBe(true);
    await clickRow('Day / night');
    expect(store.getState().overlay.dayNight).toBe(false);
  });

  it('clicking the Working hours row flips overlay.workHours', async () => {
    const screen = await renderWithStore();
    await openMenu(screen.container);

    expect(store.getState().overlay.workHours).toBe(false);
    await clickRow('Working hours');
    expect(store.getState().overlay.workHours).toBe(true);
  });

  it('clicking the Weekend row flips overlay.weekend', async () => {
    const screen = await renderWithStore();
    await openMenu(screen.container);

    expect(store.getState().overlay.weekend).toBe(false);
    await clickRow('Weekend');
    expect(store.getState().overlay.weekend).toBe(true);
  });

  it('toggles are independent — flipping one does not flip the others', async () => {
    const screen = await renderWithStore();
    await openMenu(screen.container);

    // Seeded baseline (above): dayNight=true, others=false. Flip weekend on.
    await clickRow('Weekend');

    const state = store.getState();
    expect(state.overlay.weekend).toBe(true);
    expect(state.overlay.dayNight).toBe(true); // unchanged
    expect(state.overlay.workHours).toBe(false); // unchanged
  });

  it('inline working-hours editor only reveals when workHours is on', async () => {
    const screen = await renderWithStore();
    await openMenu(screen.container);

    // workHours starts false → editor not present (no hour selects).
    expect(document.body.querySelectorAll('select')).toHaveLength(0);

    // Flip workHours on
    await clickRow('Working hours');

    // Editor reveals: two hour selects pre-populated from the store.
    const selects = document.body.querySelectorAll('select');
    expect(selects).toHaveLength(2);
    expect((selects[0] as HTMLSelectElement | undefined)?.value).toBe('9');
    expect((selects[1] as HTMLSelectElement | undefined)?.value).toBe('17');
  });
});
