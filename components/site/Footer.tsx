import env from '@/lib/env';
import Link from 'next/link';

const topPairs = [
  { slug: 'pst-to-est', label: 'PST to EST' },
  { slug: 'pst-to-cst', label: 'PST to CST' },
  { slug: 'est-to-ist', label: 'EST to IST' },
  { slug: 'new-york-to-london', label: 'New York to London' },
  { slug: 'beijing-to-tokyo', label: 'Beijing to Tokyo' },
  { slug: 'shanghai-to-paris', label: 'Shanghai to Paris' },
];

const topCities = [
  { id: 'los-angeles', name: 'Los Angeles' },
  { id: 'new-york', name: 'New York' },
  { id: 'london', name: 'London' },
  { id: 'tokyo', name: 'Tokyo' },
  { id: 'mumbai', name: 'Mumbai' },
  { id: 'paris', name: 'Paris' },
  { id: 'beijing', name: 'Beijing' },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-secondary/30">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div>
            <h3 className="mb-3 text-sm font-semibold">Popular conversions</h3>
            <ul className="space-y-1.5 text-sm">
              {topPairs.map((p) => (
                <li key={p.slug}>
                  <Link
                    prefetch={false}
                    href={`/convert/${p.slug}`}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {p.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  prefetch={false}
                  href="/conversions"
                  className="text-muted-foreground hover:text-foreground"
                >
                  See all →
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold">Popular cities</h3>
            <ul className="space-y-1.5 text-sm">
              {topCities.map((c) => (
                <li key={c.id}>
                  <Link
                    prefetch={false}
                    href={`/time-in/${c.id}`}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  prefetch={false}
                  href="/cities"
                  className="text-muted-foreground hover:text-foreground"
                >
                  See all →
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold">Resources</h3>
            <ul className="space-y-1.5 text-sm">
              <li>
                <Link
                  prefetch={false}
                  href="/dst"
                  className="text-muted-foreground hover:text-foreground"
                >
                  Daylight saving time
                </Link>
              </li>
              <li>
                <Link
                  prefetch={false}
                  href="/articles"
                  className="text-muted-foreground hover:text-foreground"
                >
                  Articles
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold">About</h3>
            <ul className="space-y-1.5 text-sm">
              <li>
                <Link
                  prefetch={false}
                  href="/about"
                  className="text-muted-foreground hover:text-foreground"
                >
                  About
                </Link>
              </li>
              <li>
                <Link
                  prefetch={false}
                  href="/privacy"
                  className="text-muted-foreground hover:text-foreground"
                >
                  Privacy
                </Link>
              </li>
              <li>
                <Link
                  prefetch={false}
                  href="/terms"
                  className="text-muted-foreground hover:text-foreground"
                >
                  Terms
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-6 text-xs text-muted-foreground">
          <p>
            City data from{' '}
            <a
              href="https://www.geonames.org/"
              className="underline hover:text-foreground"
              rel="noopener noreferrer"
              target="_blank"
            >
              GeoNames
            </a>{' '}
            (CC BY 4.0). Time zone rules from the IANA Time Zone Database.
          </p>
          <p className="mt-2">
            © {new Date().getFullYear()} {env.NEXT_PUBLIC_SITE_NAME}
          </p>
        </div>
      </div>
    </footer>
  );
}
