import Link from 'next/link';
import env from '@/lib/env';

export function Header() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="font-semibold">
          {env.NEXT_PUBLIC_SITE_NAME}
        </Link>
        <div className="flex items-center gap-2">
          {/* Per-site: nav links, theme toggle, search, etc. */}
        </div>
      </div>
    </header>
  );
}
