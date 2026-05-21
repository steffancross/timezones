import Link from 'next/link';
import env from '@/lib/env';

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-8 text-sm text-muted-foreground">
        <p>
          © {new Date().getFullYear()} {env.NEXT_PUBLIC_SITE_NAME}
        </p>
        <nav className="flex flex-wrap gap-x-4 gap-y-2">
          <Link href="/cities" className="hover:text-foreground">
            Cities
          </Link>
          <Link href="/conversions" className="hover:text-foreground">
            Conversions
          </Link>
          <Link href="/dst" className="hover:text-foreground">
            DST
          </Link>
        </nav>
      </div>
    </footer>
  );
}
