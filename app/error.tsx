'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function ErrorBoundary({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'posthog' in window) {
      // biome-ignore lint/suspicious/noExplicitAny: posthog global is loosely typed
      (window as any).posthog?.capture?.('render_error', {
        message: error.message,
        digest: 'digest' in error ? error.digest : undefined,
      });
    }
  }, [error]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <h1 className="text-3xl font-semibold">Something broke loading this page</h1>
      <p className="mt-3 text-[color:var(--fg-muted)]">Refresh to try again, or head back home.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={reset}
          className="rounded-[var(--radius)] border border-[color:var(--border)] bg-card px-4 py-2 text-sm hover:bg-[var(--hover)]"
        >
          Try again
        </button>
        <Link
          prefetch={false}
          href="/"
          className="rounded-[var(--radius)] border border-[color:var(--border)] bg-card px-4 py-2 text-sm hover:bg-[var(--hover)]"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
