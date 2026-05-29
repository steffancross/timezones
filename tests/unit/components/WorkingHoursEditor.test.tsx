import { beforeEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { WorkingHoursEditor } from '@/components/converter/WorkingHoursEditor';
import { ConverterStoreProvider } from '@/components/converter/store-context';
import { createConverterStore } from '@/lib/store/converter';
import { DEFAULT_WORKING_HOURS } from '@/lib/time/working-hours';

let store: ReturnType<typeof createConverterStore>;
function freshStore() {
  store = createConverterStore();
  store.setState({
    workingHours: DEFAULT_WORKING_HOURS,
  });
}

function renderWithStore() {
  return render(
    <ConverterStoreProvider value={store}>
      <WorkingHoursEditor />
    </ConverterStoreProvider>,
  );
}

function findDayButton(idx: number): HTMLButtonElement | null {
  return document.body.querySelector<HTMLButtonElement>(`button[aria-label="Day ${idx}"]`);
}

async function clickDay(idx: number) {
  const btn = findDayButton(idx);
  if (!btn) throw new Error(`day button ${idx} not found`);
  await page.elementLocator(btn).click();
}

describe('WorkingHoursEditor', () => {
  beforeEach(freshStore);

  it('renders with the current store workingHours pre-populated', async () => {
    await renderWithStore();

    const selects = Array.from(document.body.querySelectorAll('select'));
    expect(selects).toHaveLength(2);
    expect(selects[0]?.value).toBe('9');
    expect(selects[1]?.value).toBe('17');
  });

  it('shows error when store has start >= end', async () => {
    store.setState({
      workingHours: { start: 18, end: 17, days: [1, 2, 3, 4, 5] },
    });
    await renderWithStore();

    expect(document.body.textContent ?? '').toContain('Start must be before end');
  });

  it('toggling a day off writes to the store immediately', async () => {
    await renderWithStore();

    await clickDay(1);
    expect(store.getState().workingHours.days).toEqual([2, 3, 4, 5]);
  });

  it('toggling a non-working day on adds it sorted', async () => {
    await renderWithStore();

    await clickDay(6);
    expect(store.getState().workingHours.days).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('changing the start select writes to the store', async () => {
    await renderWithStore();

    const startSelect = document.body.querySelectorAll('select')[0] as unknown as Element;
    await page.elementLocator(startSelect).selectOptions('8');
    expect(store.getState().workingHours.start).toBe(8);
  });

  it('changing the end select writes to the store', async () => {
    await renderWithStore();

    const endSelect = document.body.querySelectorAll('select')[1] as unknown as Element;
    await page.elementLocator(endSelect).selectOptions('18');
    expect(store.getState().workingHours.end).toBe(18);
  });
});
