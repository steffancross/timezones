import { DateTime } from 'luxon';
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

  const rows = proj.map((e, hour) => ({
    hour,
    fromText: formatClock(hour, 0, '12'),
    toText: formatClock(e.hour, e.minute, '12'),
    dayDelta: e.day_delta,
  }));

  const fromName = shortLabel(pair.from);
  const toName = shortLabel(pair.to);

  return (
    <section>
      <h2 className="text-2xl font-semibold">Quick reference</h2>
      <p className="mt-2 text-sm text-[color:var(--fg-muted)]">Full 24-hour conversion table.</p>

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
              <tr
                key={`row-${row.hour}`}
                className="border-t border-[color:var(--border)] tabular-nums"
              >
                <td className="px-4 py-1.5">{row.fromText}</td>
                <td className="px-4 py-1.5">{row.toText}</td>
                <td className="px-4 py-1.5 text-[color:var(--fg-muted)]">
                  {row.dayDelta === 0
                    ? 'Same day'
                    : row.dayDelta > 0
                      ? `+${row.dayDelta} day`
                      : `${row.dayDelta} day`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
