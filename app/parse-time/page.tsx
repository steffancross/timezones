import { Breadcrumbs } from '@/components/site/Breadcrumbs';
import { SmartConverter } from '@/components/smart-converter/SmartConverter';
import env from '@/lib/env';
import { buildMetadata } from '@/lib/seo/metadata';
import '../smart-converter.css';

export const metadata = buildMetadata({
  title: 'Parse Time — Paste & Convert Any Time + Countdown',
  description:
    'Paste any announcement — a drop, preorder, stream or launch — and see every time in your local zone with a live countdown. DST-aware, handles multiple events.',
  path: '/parse-time',
});

const webAppSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Parse Time',
  url: `${env.NEXT_PUBLIC_BASE_URL}/parse-time`,
  applicationCategory: 'UtilitiesApplication',
  operatingSystem: 'Any',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  description:
    'Paste a time stated in someone else’s time zone and convert it to your local time with a live countdown.',
};

export default function ParseTimePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD must render as a raw script tag
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppSchema) }}
      />

      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Parse Time' }]} />

      <div className="mt-3">
        <SmartConverter />
      </div>
    </div>
  );
}
