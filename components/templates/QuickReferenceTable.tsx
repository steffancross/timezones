import { DateTime } from 'luxon';
import { QuickRefRow } from '@/components/converter/QuickRefRow';
import type { ParsedPair, ZoneOrCity } from '@/lib/slugs/parse';
import { formatClock } from '@/lib/time/format';
import { projectAnchorDay } from '@/lib/time/luxon';

interface Props {
  pair: ParsedPair;
}

function shortLabel(zoc: ZoneOrCity): string {
  return zoc.kind === 'zone' ? zoc.zone.id.toUpperCase() : zoc.city.name;
}

export function QuickReferenceTable({ pair }: Props) {
  // 24 rows: each hour 0-23 in the "from" zone, projected into the "to" zone.
  // Day delta covers cases where the "to" time crosses a calendar boundary.
  // Offset arithmetic (one projection) instead of 24 per-row `setZone` chains.
  const isoDate = DateTime.now().setZone(pair.fromIana).toISODate() ?? '';
  const proj = projectAnchorDay(isoDate, pair.fromIana, pair.toIana);

  const fromName = shortLabel(pair.from);
  const toName = shortLabel(pair.to);

  // Clean data cells under the zone-labelled headers — Google reads cells in
  // header context (EST→IST), and tidy values snippet better than cells stamped
  // with a repeated zone token. The contiguous "<time> <zone> in <zone>" phrase
  // that matches specific-time queries lives in PairFaq instead.
  const rows = proj.map((e, hour) => {
    const fromText = formatClock(hour, 0, '12');
    const toText = formatClock(e.hour, e.minute, '12');
    const dayText =
      e.day_delta === 0 ? 'Same day' : e.day_delta > 0 ? `+${e.day_delta} day` : `${e.day_delta} day`;
    return {
      hour,
      fromText,
      toText,
      dayText,
      ariaLabel: `Show ${fromText} ${fromName} in the converter`,
    };
  });

  return (
    <section>
      <h2 className="text-2xl font-semibold">Quick reference</h2>
      <p className="mt-2 text-sm text-[color:var(--fg-muted)]">
        Full 24-hour conversion table — tap any time to open it in the converter.
      </p>

      <div className="mt-4 overflow-x-auto rounded-[var(--radius)] border border-[color:var(--border)]">
        <table className="w-full text-sm">
          <thead className="bg-[color:var(--hover)]">
            <tr>
              <th className="px-4 py-2 text-left font-medium">{fromName}</th>
              <th className="px-4 py-2 text-left font-medium">{toName}</th>
              <th className="px-4 py-2 text-left font-medium">Day</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <QuickRefRow
                key={`row-${row.hour}`}
                hour={row.hour}
                fromText={row.fromText}
                toText={row.toText}
                dayText={row.dayText}
                ariaLabel={row.ariaLabel}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
