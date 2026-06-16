/**
 * Renders the hand-authored zone prose body — the block that differentiates one
 * zone page from the next. Plain-text paragraphs split on `\n\n`; no inline
 * markup. Covers why the zone matters / what it's like to live with, not the
 * mechanics (offset, DST, cities) — those are owned by the sections below it.
 * The `summary` field is meta-only and not rendered here; the optional quirk
 * lives in ZoneQuirk.
 */
export function ZoneProse({ body }: { body: string }) {
  const paragraphs = body
    .split('\n\n')
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <section>
      <div className="space-y-3 text-sm leading-relaxed">
        {paragraphs.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>
    </section>
  );
}
