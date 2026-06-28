// Quiet provisional-overlap signal for a partial room (2+ responders) — spec 7b.
// A bare responder count with NO denominator: there's no invite list to divide
// by, so the overlap reads as provisional, not "N of everyone."

interface Props {
  count: number;
}

export function RespondersNote({ count }: Props) {
  return (
    <p className="text-xs text-muted-foreground">
      {count} {count === 1 ? 'person has' : 'people have'} filled so far
    </p>
  );
}
