import { DateTime } from 'luxon';
import type { ParsedPair, ZoneOrCity } from '@/lib/slugs/parse';
import { formatClock } from '@/lib/time/format';

interface Props {
  pair: ParsedPair;
}

/**
 * Popular specific times to answer in prose, mixing whole and half hours drawn
 * from Search Console queries ("2pm est to ist", "12:30 pm est to ist", ...).
 * Half hours live here rather than in the QuickReferenceTable so the table
 * stays a clean 24-row hourly grid. Tunable — expand as more GSC data arrives.
 */
const FAQ_TIMES: ReadonlyArray<{ hour: number; minute: number }> = [
  { hour: 9, minute: 0 },
  { hour: 12, minute: 0 },
  { hour: 12, minute: 30 },
  { hour: 14, minute: 0 },
  { hour: 17, minute: 0 },
  { hour: 23, minute: 30 },
];

function shortLabel(zoc: ZoneOrCity): string {
  return zoc.kind === 'zone' ? zoc.zone.id.toUpperCase() : zoc.city.name;
}

/**
 * Renders a handful of "What is <time> <zone> in <zone>?" Q&A as crawlable
 * prose plus FAQPage JSON-LD. The visible text is the SEO payload — it matches
 * the literal specific-time queries and is featured-snippet eligible. (Google
 * restricts the FAQ rich-result accordion to gov/health sites, so the schema
 * itself is a structural signal rather than a guaranteed SERP widget.)
 */
export function PairFaq({ pair }: Props) {
  const fromLabel = shortLabel(pair.from);
  const toLabel = shortLabel(pair.to);

  const faqs = FAQ_TIMES.map(({ hour, minute }) => {
    // ~6 conversions, server-side, once per (cached) render — negligible.
    const from = DateTime.fromObject({ hour, minute }, { zone: pair.fromIana });
    const to = from.setZone(pair.toIana);

    const dayDelta = Math.round(
      DateTime.fromISO(to.toISODate() ?? '').diff(DateTime.fromISO(from.toISODate() ?? ''), 'days')
        .days,
    );
    const dayNote = dayDelta === 0 ? '' : dayDelta > 0 ? ', the next day' : ', the previous day';

    const fromTime = `${formatClock(hour, minute, '12')} ${fromLabel}`;
    const toTime = `${formatClock(to.hour, to.minute, '12')} ${toLabel}`;

    return {
      question: `What is ${fromTime} in ${toLabel}?`,
      answer: `${fromTime} is ${toTime}${dayNote}.`,
    };
  });

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };

  return (
    <section>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: structured-data emitted from server-trusted values
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <h2 className="text-2xl font-semibold">Common conversions</h2>
      <dl className="mt-4 grid gap-x-8 gap-y-5 md:grid-cols-2 lg:grid-cols-3">
        {faqs.map((f) => (
          <div key={f.question}>
            <dt className="font-medium">{f.question}</dt>
            <dd className="mt-1 text-sm text-[color:var(--fg-muted)]">{f.answer}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
