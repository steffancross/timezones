import { getZoneDescription } from '@/lib/zones/descriptions';
import { formatUtcOffset } from '@/lib/zones/offset';
import { getNextTransition } from '@/lib/time/dst';
import type { Zone } from '@/lib/zones/types';

interface QA {
  question: string;
  answer: string;
}

/**
 * Single-zone FAQ: the identity / offset / DST questions that match real search
 * phrasing ("what is X in UTC", "does X observe DST"), answered as crawlable
 * prose plus FAQPage JSON-LD. The question wording is the asset here — it
 * matches query language the facts table can't, and can feed People Also Ask.
 * Deliberately trimmed: a "what countries use X" item was dropped as a pure
 * restatement of the facts section's "Used in:" line. Note the FAQPage rich
 * result is gone for non-gov/health sites (Google, Aug 2023) — kept for the
 * visible Q&A + PAA, not the SERP snippet.
 */
export function ZoneFaq({ zone }: { zone: Zone }) {
  const abbr = zone.abbreviations[0] ?? zone.display_name;
  const stdOffset = formatUtcOffset(zone.utc_offset_std);
  const description = getZoneDescription(zone.id);
  const next = getNextTransition(zone.iana);

  const faqs: QA[] = [];

  faqs.push({
    question: `What is ${zone.display_name} (${abbr})?`,
    answer:
      description?.summary ??
      `${zone.display_name} (${abbr}) is a time zone at ${stdOffset}${
        zone.utc_offset_dst != null
          ? `, shifting to ${formatUtcOffset(zone.utc_offset_dst)} during daylight saving time`
          : ''
      }.`,
  });

  faqs.push({
    question: `What is ${abbr} in UTC?`,
    answer:
      zone.utc_offset_dst != null
        ? `${abbr} is ${stdOffset} in standard time and ${formatUtcOffset(zone.utc_offset_dst)} during daylight saving time.`
        : `${abbr} is ${stdOffset}, the same all year.`,
  });

  faqs.push({
    question: `Does ${zone.display_name} observe daylight saving time?`,
    answer: next
      ? `Yes. The next change is on ${next.date.toFormat('MMMM d, yyyy')}, when clocks ${
          next.direction === 'forward' ? 'spring forward' : 'fall back'
        } from ${next.abbreviationBefore} to ${next.abbreviationAfter}.`
      : `No. ${zone.display_name} stays at ${stdOffset} year-round.`,
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

      <h2 className="text-2xl font-semibold">Frequently asked questions</h2>
      <dl className="mt-4 grid gap-x-8 gap-y-5 md:grid-cols-2">
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
