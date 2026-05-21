import { beforeEach, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { WorkingHoursEditor } from '@/components/converter/WorkingHoursEditor';
import { useConverterStore } from '@/lib/store/converter';
import { DEFAULT_WORKING_HOURS } from '@/lib/time/working-hours';

function resetStore() {
  useConverterStore.setState({
    workingHours: DEFAULT_WORKING_HOURS,
  });
}

/**
 * shadcn Dialog portals to document.body, outside the render container.
 * Query against the document and wrap as a Locator so clicks go through
 * Playwright — which awaits React's render cycle between events (native
 * `.click()` doesn't, so sequential clicks see stale state).
 *
 * Using the tag-name overload of querySelectorAll (without explicit generic)
 * sidesteps a TS conflict between HTMLSelectElement/HTMLButtonElement and
 * Playwright's DOM type augmentations on `Element.remove()`.
 */
function findButtonByText(text: string): HTMLButtonElement | null {
  const buttons = Array.from(document.body.querySelectorAll('button'));
  return buttons.find((b) => b.textContent?.trim() === text) ?? null;
}

async function clickButton(text: string) {
  const btn = findButtonByText(text);
  if (!btn) throw new Error(`button "${text}" not found`);
  await page.elementLocator(btn).click();
}

describe('WorkingHoursEditor', () => {
  beforeEach(resetStore);

  it('renders with the current store workingHours pre-populated', async () => {
    const onClose = vi.fn();
    await render(<WorkingHoursEditor onClose={onClose} />);

    const selects = Array.from(document.body.querySelectorAll('select'));
    expect(selects).toHaveLength(2);
    // Start (default 9) and end (default 17)
    expect(selects[0]?.value).toBe('9');
    expect(selects[1]?.value).toBe('17');
  });

  it('disables Save and shows error when start >= end', async () => {
    useConverterStore.setState({
      workingHours: { start: 18, end: 17, days: [1, 2, 3, 4, 5] },
    });
    const onClose = vi.fn();
    await render(<WorkingHoursEditor onClose={onClose} />);

    const save = findButtonByText('Save');
    expect(save?.disabled).toBe(true);
    expect(document.body.textContent ?? '').toContain('Start must be before end');
  });

  it('Save commits the draft and calls onClose', async () => {
    const onClose = vi.fn();
    await render(<WorkingHoursEditor onClose={onClose} />);

    await clickButton('Save');
    expect(onClose).toHaveBeenCalledTimes(1);
    // Store should now have the draft (which started as the current value).
    expect(useConverterStore.getState().workingHours).toEqual(DEFAULT_WORKING_HOURS);
  });

  it('Cancel calls onClose without committing', async () => {
    const onClose = vi.fn();
    await render(<WorkingHoursEditor onClose={onClose} />);

    await clickButton('Cancel');
    expect(onClose).toHaveBeenCalledTimes(1);
    // workingHours unchanged.
    expect(useConverterStore.getState().workingHours).toEqual(DEFAULT_WORKING_HOURS);
  });

  it('toggling a day off shrinks the days list', async () => {
    const onClose = vi.fn();
    await render(<WorkingHoursEditor onClose={onClose} />);

    // Default days are [1..5]. Toggle Mon (1) off, save, verify.
    await clickButton('Mon');
    await clickButton('Save');
    expect(useConverterStore.getState().workingHours.days).toEqual([2, 3, 4, 5]);
  });

  it('toggling a non-working day on adds it sorted into days', async () => {
    const onClose = vi.fn();
    await render(<WorkingHoursEditor onClose={onClose} />);

    // Default is Mon-Fri. Add Sat (6). Days should sort to [1..6].
    await clickButton('Sat');
    await clickButton('Save');
    expect(useConverterStore.getState().workingHours.days).toEqual([1, 2, 3, 4, 5, 6]);
  });
});
