import { Converter } from '@/components/converter/Converter';
import { ConverterStateProvider } from '@/components/converter/ConverterStateProvider';
import type { ZoneRef } from '@/lib/store/converter';

/**
 * Temporary sandbox route for verifying the section E converter end-to-end.
 * Seeds three zones so the strip + interaction states are immediately visible.
 * Delete this route once page-layer (G section) routes ship.
 */
const SEED_ZONES: ZoneRef[] = [
  { kind: 'zone', slug: 'pst', iana: 'America/Los_Angeles' },
  { kind: 'zone', slug: 'est', iana: 'America/New_York' },
  { kind: 'zone', slug: 'jst', iana: 'Asia/Tokyo' },
];

export default function SandboxConverterPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <ConverterStateProvider initialState={{ zones: SEED_ZONES }}>
        <Converter title="Converter sandbox" />
      </ConverterStateProvider>
    </div>
  );
}
