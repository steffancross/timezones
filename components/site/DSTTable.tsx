import type { DSTTransition } from '@/lib/time/dst';

interface Row {
  iana: string;
  displayName: string;
  region: string;
  transition: DSTTransition | null;
}

interface Props {
  rows: Row[];
}

export function DSTTable({ rows }: Props) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No zones in this group.</p>;
  }

  const sorted = [...rows].sort((a, b) => {
    if (!a.transition || !b.transition) return 0;
    return a.transition.date.toMillis() - b.transition.date.toMillis();
  });

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-4 py-2 text-left font-medium">Zone</th>
            <th className="px-4 py-2 text-left font-medium">Next transition</th>
            <th className="px-4 py-2 text-left font-medium">Direction</th>
            <th className="px-4 py-2 text-left font-medium">Change</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr key={row.iana} className="border-t border-border">
              <td className="px-4 py-2 font-medium">{row.displayName}</td>
              {row.transition ? (
                <>
                  <td className="px-4 py-2 tabular-nums">
                    {row.transition.date.toFormat('MMM d, yyyy')}
                  </td>
                  <td className="px-4 py-2">
                    {row.transition.direction === 'forward' ? 'Spring forward' : 'Fall back'}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {row.transition.abbreviationBefore} → {row.transition.abbreviationAfter}
                  </td>
                </>
              ) : (
                <td colSpan={3} className="px-4 py-2 text-muted-foreground">
                  No upcoming transition
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
