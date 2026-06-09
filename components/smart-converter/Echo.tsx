interface Props {
  /** The date/time snippet chrono matched. */
  matchText: string;
  /** The raw zone token, if any ("GMT+8", "EST", "Beijing time"). */
  zoneToken?: string | null;
  tag?: string;
}

/**
 * The trust anchor: echoes the snippet we read back to the user, with the
 * matched date/time (and zone token) highlighted, so they can see exactly what
 * was parsed.
 */
export function Echo({ matchText, zoneToken, tag = 'matched' }: Props) {
  return (
    <div className="sc-echo">
      <span className="echo-tag">{tag}</span>
      <span className="echo-text">
        <mark>{matchText}</mark>
        {zoneToken ? <mark style={{ marginLeft: 4 }}>{zoneToken}</mark> : null}
      </span>
    </div>
  );
}
