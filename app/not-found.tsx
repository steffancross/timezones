import Link from 'next/link';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata = buildMetadata({
  title: 'Page not found',
  description: 'The page you were looking for does not exist.',
  path: '/404',
  noindex: true,
});

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <h1 className="text-3xl font-semibold">Page not found</h1>
      <p className="mt-3 text-[color:var(--fg-muted)]">
        The page you were looking for does not exist, or the link is no longer valid.
      </p>
      <Link
        prefetch={false}
        href="/"
        className="mt-6 inline-block rounded-[var(--radius)] border border-[color:var(--border)] bg-card px-4 py-2 text-sm hover:bg-[var(--hover)]"
      >
        Back to home
      </Link>
    </div>
  );
}
