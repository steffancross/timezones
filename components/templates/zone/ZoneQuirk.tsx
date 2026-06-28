/**
 * Optional "huh, didn't know that" callout for a zone — a genuine surprise, not
 * a mechanics footnote. Plain text, no inline markup. Rendered only when the
 * authored description carries a quirk (and, by convention, a body).
 */
export function ZoneQuirk({ quirk }: { quirk: string }) {
  return (
    <section>
      <aside className="border-l-2 border-border pl-4 text-sm italic leading-relaxed text-[color:var(--fg-muted)]">
        {quirk}
      </aside>
    </section>
  );
}
