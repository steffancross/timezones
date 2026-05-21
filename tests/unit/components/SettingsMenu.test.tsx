import { beforeEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { SettingsMenu } from '@/components/converter/SettingsMenu';
import { useConverterStore } from '@/lib/store/converter';
import { DEFAULT_WORKING_HOURS } from '@/lib/time/working-hours';

function resetStore() {
  useConverterStore.setState({
    overlay: { dayNight: true, workHours: false, weekend: false },
    workingHours: DEFAULT_WORKING_HOURS,
  });
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
  beforeEach(resetStore);

  it('clicking the Day / night row flips overlay.dayNight', async () => {
    const screen = await render(<SettingsMenu />);
    await openMenu(screen.container);

    expect(useConverterStore.getState().overlay.dayNight).toBe(true);
    await clickRow('Day / night');
    expect(useConverterStore.getState().overlay.dayNight).toBe(false);
  });

  it('clicking the Working hours row flips overlay.workHours', async () => {
    const screen = await render(<SettingsMenu />);
    await openMenu(screen.container);

    expect(useConverterStore.getState().overlay.workHours).toBe(false);
    await clickRow('Working hours');
    expect(useConverterStore.getState().overlay.workHours).toBe(true);
  });

  it('clicking the Weekend row flips overlay.weekend', async () => {
    const screen = await render(<SettingsMenu />);
    await openMenu(screen.container);

    expect(useConverterStore.getState().overlay.weekend).toBe(false);
    await clickRow('Weekend');
    expect(useConverterStore.getState().overlay.weekend).toBe(true);
  });

  it('toggles are independent — flipping one does not flip the others', async () => {
    const screen = await render(<SettingsMenu />);
    await openMenu(screen.container);

    // Default: dayNight=true, others=false. Flip weekend on.
    await clickRow('Weekend');

    const state = useConverterStore.getState();
    expect(state.overlay.weekend).toBe(true);
    expect(state.overlay.dayNight).toBe(true); // unchanged
    expect(state.overlay.workHours).toBe(false); // unchanged
  });

  it('the working-hours summary + Edit affordance only shows when workHours is on', async () => {
    const screen = await render(<SettingsMenu />);
    await openMenu(screen.container);

    // workHours starts false → no Edit button visible
    expect(document.body.textContent ?? '').not.toContain('Edit');

    // Flip workHours on
    await clickRow('Working hours');

    // Now the summary "09:00 – 17:00, Mon, ..." + Edit button should appear
    expect(document.body.textContent ?? '').toContain('09:00');
    expect(document.body.textContent ?? '').toContain('Edit');
  });
});
