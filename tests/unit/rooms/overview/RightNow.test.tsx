import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { RightNow } from '@/components/room/overview/RightNow';
import type { LiveStatus } from '@/lib/rooms/compute';

const nameById = new Map([
  ['a', 'Ana'],
  ['b', 'Bo'],
  ['c', 'Cy'],
]);

const status: LiveStatus[] = [
  { participantId: 'a', state: 'y', inferred: false },
  { participantId: 'b', state: 'y', inferred: true },
  { participantId: 'c', state: 'n', inferred: true },
];

describe('RightNow', () => {
  it('tags inferred status, keeps definite status untagged, and recedes out people', async () => {
    const { container } = await render(<RightNow status={status} nameById={nameById} />);
    const items = [...container.querySelectorAll<HTMLElement>('[data-testid="rn-item"]')];
    expect(items).toHaveLength(3);

    const ana = items.find((el) => el.textContent?.includes('Ana'));
    expect(ana?.textContent).not.toContain('inferred'); // said they're free
    expect(ana?.textContent).toContain('Free');

    const bo = items.find((el) => el.textContent?.includes('Bo'));
    expect(bo?.textContent).toContain('inferred'); // probably free

    const cy = items.find((el) => el.textContent?.includes('Cy'));
    expect(cy?.getAttribute('data-state')).toBe('n');
    expect(cy?.className).toContain('opacity-50'); // out recedes
    expect(cy?.textContent).toContain('Out');
  });
});
