import { DateTime } from 'luxon';
import type { ParsedPair, ZoneOrCity } from '@/lib/slugs/parse';
import { formatTime } from '@/lib/time/format';

interface Props {
  pair: ParsedPair;
}

function shortLabel(zoc: ZoneOrCity): string {
  return zoc.kind === 'zone' ? zoc.zone.id.toUpperCase() : zoc.city.name;
}

export function QuickReferenceTable({ pair }: Props) {
  // 24 rows: each hour 0-23 in the "from" zone, projected into the "to" zone.
  // Day delta covers cases where the "to" time crosses a calendar boundary.
  const base = DateTime.now().setZone(pair.fromIana).startOf('day');

  const rows = Array.from({ length: 24 }, (_, hour) => {
    const fromTime = base.set({ hour });
    const toTime = fromTime.setZone(pair.toIana);
    const dayDelta = Math.round(toTime.startOf('day').diff(fromTime.startOf('day'), 'days').days);
    return {
      hour,
      fromText: formatTime(fromTime, '12'),
      toText: formatTime(toTime, '12'),
      dayDelta,
    };
  });

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
