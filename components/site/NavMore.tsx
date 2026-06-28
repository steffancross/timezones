'use client';

import { ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const moreLinks = [
  { href: '/cities', label: 'Cities' },
  { href: '/timezones', label: 'Timezones' },
  { href: '/dst', label: 'DST' },
  { href: '/articles', label: 'Articles' },
];

export function NavMore() {
  return (
    <Popover>
      <PopoverTrigger className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        More <ChevronDown className="h-3.5 w-3.5" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-36 p-1">
        <div className="flex flex-col">
          {moreLinks.map((link) => (
            <Link
              prefetch={false}
              key={link.href}
              href={link.href}
              className="rounded px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
