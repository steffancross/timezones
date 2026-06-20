import { RoomBottomNav } from '@/components/room/RoomBottomNav';
import type { RoomTab } from '@/components/room/RoomTabs';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { page } from 'vitest/browser';

function Harness() {
  const [tab, setTab] = useState<RoomTab>('overview');
  return <RoomBottomNav active={tab} onChange={setTab} />;
}

describe('RoomBottomNav', () => {
  it('moves the active tab on tap', async () => {
    const { container } = await render(<Harness />);
    expect(container.querySelector('[aria-current="page"]')?.textContent).toContain('Overview');

    const teamBtn = [...container.querySelectorAll<HTMLElement>('button')].find((b) =>
      b.textContent?.includes('Team'),
    );
    if (!teamBtn) throw new Error('Team button not found');
    await page.elementLocator(teamBtn).click();

    expect(container.querySelector('[aria-current="page"]')?.textContent).toContain('Team');
  });
});
