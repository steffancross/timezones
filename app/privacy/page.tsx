import { Breadcrumbs } from '@/components/site/Breadcrumbs';
import env from '@/lib/env';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata = buildMetadata({
  title: 'Privacy',
  description: `How ${env.NEXT_PUBLIC_SITE_NAME} handles data — what stays in your browser, what analytics and ads are used, and what is never collected.`,
  path: '/privacy',
});

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Privacy' }]} />

      <header className="mt-3 mb-6">
        <h1 className="text-3xl font-semibold">Privacy</h1>
        <p className="mt-2 text-muted-foreground">
          Short version: there are no accounts and no sign-ups. Your converter preferences live in
          your browser. Anonymous usage analytics help us see what is broken or unused.
        </p>
      </header>

      <article className="space-y-8 text-sm leading-relaxed">
        <section>
          <h2 className="mb-2 text-xl font-semibold">What stays in your browser</h2>
          <ul className="space-y-2 text-muted-foreground">
            <li>
              <strong className="text-foreground">Local preferences:</strong> the time format
              (12/24h), overlay toggles (day/night, working hours, weekends), and your working-hours
              window are stored in <code className="font-mono">localStorage</code> under{' '}
              <code className="font-mono">converter_prefs</code>. They never leave your browser.
            </li>
            <li>
              <strong className="text-foreground">The URL:</strong> the date and hour you are
              viewing, plus the time format, are encoded into the page URL so that links you share
              reproduce what you were looking at. Nothing identifying goes into the URL.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold">What we do not collect</h2>
          <ul className="space-y-2 text-muted-foreground">
            <li>
              No accounts, names, email addresses, or passwords — there is nothing to sign up for.
            </li>
            <li>No payment information.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold">Analytics</h2>
          <p className="text-muted-foreground">
            We use{' '}
            <a
              href="https://posthog.com/"
              className="underline hover:text-foreground"
              rel="noopener noreferrer"
              target="_blank"
            >
              PostHog
            </a>{' '}
            to count pageviews and feature usage in aggregate. Events are sent through our own{' '}
            <code className="font-mono">/ingest</code> endpoint on this domain — there is no
            third-party request from your browser to <code className="font-mono">posthog.com</code>.
            PostHog uses an anonymous identifier stored in{' '}
            <code className="font-mono">localStorage</code> and a cookie; user profiles are only
            created for identified users, which this site does not do, so the identifier remains
            anonymous.
          </p>
          <p className="mt-3 text-muted-foreground">
            You can opt out by blocking <code className="font-mono">/ingest</code> in any
            content-blocker, by turning on your browser&apos;s &ldquo;Do Not Track,&rdquo; or by
            clearing site data for this domain.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold">Advertising</h2>
          <p className="text-muted-foreground">
            This site may display ads served by third-party ad networks. Those networks (and their
            partners) may set their own cookies or similar identifiers and use them to measure ad
            performance and to serve ads based on your visits to this and other sites — including
            personalized advertising where allowed by law. Their use of your data is governed by
            their own privacy policies, not this one.
          </p>
          <p className="mt-3 text-muted-foreground">
            You can limit ad personalization through your browser&apos;s privacy settings, by opting
            out via{' '}
            <a
              href="https://www.youradchoices.com/"
              className="underline hover:text-foreground"
              rel="noopener noreferrer"
              target="_blank"
            >
              YourAdChoices
            </a>{' '}
            (US) or{' '}
            <a
              href="https://www.youronlinechoices.eu/"
              className="underline hover:text-foreground"
              rel="noopener noreferrer"
              target="_blank"
            >
              YourOnlineChoices
            </a>{' '}
            (EU), or by using a content blocker.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold">Server-side data</h2>
          <p className="text-muted-foreground">
            The home page uses your request headers (provided by Cloudflare) to pick a sensible
            default set of zones — specifically <code className="font-mono">cf-timezone</code> and{' '}
            <code className="font-mono">cf-ipcountry</code>. These are read in memory to render the
            page and are not logged or stored.
          </p>
          <p className="mt-3 text-muted-foreground">
            Standard request logs (timestamp, status code, path) may be retained briefly by our
            hosting provider for operational reasons. They are not used for analytics or shared with
            third parties.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold">Changes</h2>
          <p className="text-muted-foreground">
            If this policy changes meaningfully, the updated version will be posted at this URL.
            Continued use of the site after a change constitutes acceptance of the new policy.
          </p>
        </section>
      </article>
    </div>
  );
}
