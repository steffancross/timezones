import { SmartConverter } from '@/components/smart-converter/SmartConverter';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';

/**
 * Browser tests for the Smart Converter UI. The pure pipeline is covered
 * exhaustively in tests/unit/smart-converter/*; these verify the wiring:
 * paste → cards, disambiguation → resolve, the punt path, and the persistent
 * guide. Parsing is debounced 80ms, so assertions use `expect.element` (which
 * retries) rather than reading synchronously.
 */
describe('SmartConverter', () => {
  it('shows the persistent guide before anything is pasted', async () => {
    const screen = await render(<SmartConverter />);
    await expect.element(screen.getByText('How it works')).toBeVisible();
    await expect.element(screen.getByText('Auto-detects as you paste')).toBeVisible();
  });

  it('converts a single pasted event with a live countdown', async () => {
    const screen = await render(<SmartConverter />);
    await screen.getByRole('textbox').fill('Preorders April 29 8:00 PM GMT+8 2026');
    // A countdown timer (only resolved cards have one) appears once parsing settles.
    await expect.element(screen.getByRole('timer')).toBeVisible();
  });

  it('does not announce the countdown on every tick (aria-live off)', async () => {
    const screen = await render(<SmartConverter />);
    await screen.getByRole('textbox').fill('Drop April 29 8:00 PM GMT+8 2026');
    await expect.element(screen.getByRole('timer')).toHaveAttribute('aria-live', 'off');
  });

  it('asks instead of guessing on an ambiguous abbreviation, then resolves on pick', async () => {
    const screen = await render(<SmartConverter />);
    await screen.getByRole('textbox').fill('Stream Fri 9:00 PM CST');
    await expect.element(screen.getByText('needs input')).toBeVisible();

    await screen.getByRole('button', { name: /China Standard Time/ }).click();

    // Picking a candidate promotes the card to a resolved conversion: the
    // "needs input" flag goes away and a countdown timer appears.
    await expect.element(screen.getByRole('timer')).toBeVisible();
    await expect.element(screen.getByText('needs input')).not.toBeInTheDocument();
  });

  it('lands unparseable input in the couldn-read state', async () => {
    const screen = await render(<SmartConverter />);
    await screen.getByRole('textbox').fill("we'll open the vault at sundown");
    await expect.element(screen.getByText("Couldn't read a time here")).toBeVisible();
  });
});
