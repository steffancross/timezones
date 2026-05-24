import { Breadcrumbs } from '@/components/site/Breadcrumbs';
import env from '@/lib/env';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata = buildMetadata({
  title: 'Terms of Service',
  description: `Terms governing your use of ${env.NEXT_PUBLIC_SITE_NAME} — acceptable use, data accuracy disclaimers, and limitations of liability.`,
  path: '/terms',
});

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Terms' }]} />

      <header className="mt-3 mb-6">
        <h1 className="text-3xl font-semibold">Terms of Service</h1>
        <p className="mt-2 text-muted-foreground">
          By using {env.NEXT_PUBLIC_SITE_NAME} (the &ldquo;Service&rdquo;), you agree to these
          terms. If you do not agree, please do not use the Service.
        </p>
      </header>

      <article className="space-y-8 text-sm leading-relaxed">
        <section>
          <h2 className="mb-2 text-xl font-semibold">Use of the Service</h2>
          <p className="text-muted-foreground">
            The Service is a free, no-account utility for comparing time across cities and time
            zones. You may use it for personal or commercial purposes without registration. You may
            link to any page on the Service.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold">Data accuracy disclaimer</h2>
          <p className="text-muted-foreground">
            Time zone data is sourced from the IANA Time Zone Database and city geography from
            GeoNames. Both are widely used and well-maintained, but neither is guaranteed to be
            error-free. Governments change DST rules and time zone boundaries on short notice;
            updates may not propagate to the Service immediately.
          </p>
          <p className="mt-3 text-muted-foreground">
            <strong className="text-foreground">
              Do not rely on this Service for legally significant scheduling
            </strong>{' '}
            — including but not limited to court filings, contract deadlines, regulatory
            submissions, flight bookings, or medical dosing schedules. Verify critical times against
            an authoritative source.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold">No warranties</h2>
          <p className="text-muted-foreground">
            The Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without
            warranties of any kind, whether express or implied, including warranties of
            merchantability, fitness for a particular purpose, accuracy, or non-infringement. We do
            not warrant that the Service will be uninterrupted, error-free, or secure.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold">Limitation of liability</h2>
          <p className="text-muted-foreground">
            To the maximum extent permitted by law, {env.NEXT_PUBLIC_SITE_NAME} and its operators
            shall not be liable for any indirect, incidental, special, consequential, or punitive
            damages, or any loss of profits, revenue, data, or use, arising out of or relating to
            your use of the Service, even if advised of the possibility of such damages. Our total
            cumulative liability for any claim relating to the Service shall not exceed five US
            dollars (USD 5.00).
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold">Acceptable use</h2>
          <p className="text-muted-foreground">You agree not to:</p>
          <ul className="mt-2 space-y-2 text-muted-foreground">
            <li>
              Scrape, mirror, or systematically download the Service in a way that imposes an
              unreasonable load on its infrastructure.
            </li>
            <li>
              Probe, attack, or attempt to compromise the Service, including by sending
              intentionally malformed requests.
            </li>
            <li>
              Use the Service in any manner that violates applicable law or infringes the rights of
              others.
            </li>
          </ul>
          <p className="mt-3 text-muted-foreground">
            We may rate-limit, block, or otherwise restrict access to the Service at our discretion,
            without notice, for any reason.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold">Third-party content</h2>
          <p className="text-muted-foreground">
            The Service may display advertisements served by third-party ad networks and may link to
            third-party sites. We do not control and are not responsible for third-party content or
            practices. Your interactions with third parties are governed by their own terms and
            policies. See the{' '}
            <a href="/privacy" className="underline hover:text-foreground">
              privacy policy
            </a>{' '}
            for more on how advertising on the Service works.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold">Intellectual property</h2>
          <p className="text-muted-foreground">
            The design, code, and original content of the Service are the property of its operators.
            City data is provided by{' '}
            <a
              href="https://www.geonames.org/"
              className="underline hover:text-foreground"
              rel="noopener noreferrer"
              target="_blank"
            >
              GeoNames
            </a>{' '}
            under the Creative Commons Attribution 4.0 License. Time zone rules are public-domain
            data from the IANA Time Zone Database. Trademarks and service marks belong to their
            respective owners.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold">Changes to these terms</h2>
          <p className="text-muted-foreground">
            We may revise these terms from time to time. The updated version will be posted at this
            URL with a revised effective date. Continued use of the Service after a change
            constitutes acceptance of the new terms.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold">Governing law</h2>
          <p className="text-muted-foreground">
            These terms are governed by the laws of the State of California, United States, without
            regard to its conflict-of-laws principles. Any dispute arising from your use of the
            Service shall be resolved in the state or federal courts located in California.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold">Contact</h2>
          <p className="text-muted-foreground">
            Questions about these terms can be sent to the contact address on the{' '}
            <a href="/about" className="underline hover:text-foreground">
              about
            </a>{' '}
            page.
          </p>
        </section>
      </article>
    </div>
  );
}
