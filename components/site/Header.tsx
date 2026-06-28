import Link from 'next/link';
import env from '@/lib/env';
import { NavMore } from './NavMore';
import { ThemeToggle } from './ThemeToggle';

const navLinks = [
  { href: '/parse-time', label: 'Parse Time' },
  { href: '/conversions', label: 'Conversions' },
  { href: '/availability-room', label: 'Rooms' },
];

export function Header() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link prefetch={false} href="/" className="font-semibold">
          {env.NEXT_PUBLIC_SITE_NAME}
        </Link>
        <div className="flex items-center gap-6">
          <nav className="hidden items-center gap-6 md:flex">
            {navLinks.map((link) => (
              <Link
                prefetch={false}
                key={link.href}
                href={link.href}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
            <NavMore />
          </nav>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
