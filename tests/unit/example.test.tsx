import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';

function Hello({ name }: { name: string }) {
  return <p>Hello, {name}</p>;
}

describe('Hello', () => {
  it('renders the name', async () => {
    const screen = await render(<Hello name="world" />);
    await expect.element(screen.getByText('Hello, world')).toBeVisible();
  });
});
