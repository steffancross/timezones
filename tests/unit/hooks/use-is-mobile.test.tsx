import { useIsMobile } from '@/lib/hooks/use-is-mobile';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';

function Probe() {
  return <span data-testid="m">{String(useIsMobile())}</span>;
}

// Minimal MediaQueryList stub so the result is deterministic regardless of the
// real test-runner viewport.
function stubMatchMedia(matches: boolean) {
  window.matchMedia = ((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

const original = window.matchMedia;
afterEach(() => {
  window.matchMedia = original;
});

describe('useIsMobile', () => {
  it('reflects a matching (phone) media query after mount', async () => {
    stubMatchMedia(true);
    const { container } = await render(<Probe />);
    await vi.waitFor(() =>
      expect(container.querySelector('[data-testid="m"]')?.textContent).toBe('true'),
    );
  });

  it('reflects a non-matching (desktop) media query', async () => {
    stubMatchMedia(false);
    const { container } = await render(<Probe />);
    await vi.waitFor(() =>
      expect(container.querySelector('[data-testid="m"]')?.textContent).toBe('false'),
    );
  });
});
