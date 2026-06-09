/**
 * Persistent "how it works" guide. Shown under the paste box at all times (it
 * doesn't get swapped out when results appear). Doubles as keyword-rich on-page
 * copy for search, and folds in the points that used to live in a separate FAQ.
 */
export function Guide() {
  return (
    <div className="sc-explain">
      <h2>How it works</h2>
      <p>
        Announcements rarely arrive in <strong>your</strong> timezone. A drop, preorder, stream
        start, ticket sale or match kickoff is almost always quoted wherever the people posting it
        happen to live. This converter reads that announcement and rewrites it in your local time —
        with a live countdown so you know exactly how long you've got.
      </p>
      <p>
        It understands times written as a <strong>UTC offset</strong> (
        <span className="ex-inline">GMT+8</span>, <span className="ex-inline">UTC−5</span>), a{' '}
        <strong>city or region</strong> (<span className="ex-inline">Beijing time</span>,{' '}
        <span className="ex-inline">Pacific time</span>), or a common <strong>abbreviation</strong>{' '}
        (<span className="ex-inline">EST</span>, <span className="ex-inline">JST</span>) — and it
        pulls out <strong>every</strong> time in a block of text, so a post with a preorder date and
        a second batch becomes two countdowns.
      </p>
      <p>
        Your timezone is detected automatically — change it with the control above and every result
        re-renders. Daylight saving is handled for each event's <strong>own</strong> date, not
        today's, and a time that has already passed reads “happened 2 hours ago” rather than a
        negative countdown. When an abbreviation is ambiguous (
        <span className="ex-inline">CST</span> could be US Central, China, or Cuba) it asks you
        which you meant instead of guessing.
      </p>
      <p className="sc-tip">
        Tip: write clock times with a colon (<span className="ex-inline">09:00</span>) or am/pm (
        <span className="ex-inline">9am</span>) — a bare <span className="ex-inline">0900</span> can
        look like a year and may not be read.
      </p>
    </div>
  );
}
