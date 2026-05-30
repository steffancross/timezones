import { DateTime } from 'luxon';
import { getZoneByIana } from '@/data/zones';
import { formatOffset } from '@/lib/time/format';
import { currentAbbreviation } from '@/lib/zones/abbreviation';

interface Props {
  iana: string;
}

export function ZoneCard({ iana }: Props) {
  const zone = getZoneByIana(iana);
  if (!zone) return null;

  const now = DateTime.now().setZone(iana);

  return (
    <div className="my-6 rounded-md border border-border bg-card p-4">
      <div className="font-semibold">{zone.display_name}</div>
      <div className="mt-1 text-sm text-muted-foreground">
        {currentAbbreviation(iana, now)} · {formatOffset(now.offset)}
      </div>
      <div className="mt-3 text-2xl tabular-nums">{now.toFormat('h:mm a')}</div>
      <div className="text-xs text-muted-foreground">{now.toFormat('cccc, MMMM d')}</div>
    </div>
  );
}
