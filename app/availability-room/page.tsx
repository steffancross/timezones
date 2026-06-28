import { CreateRoomForm } from '@/components/room/CreateRoomForm';
import type { CellClassFn } from '@/components/room/HeatmapMini';
import { HeatmapMini } from '@/components/room/HeatmapMini';
import { JoinRoomPanel } from '@/components/room/JoinRoomPanel';
import { Breadcrumbs } from '@/components/site/Breadcrumbs';
import { buildMetadata } from '@/lib/seo/metadata';
import Link from 'next/link';
import './availability-room.css';

export const metadata = buildMetadata({
  title: 'Availability Room — Find a time that works for everyone',
  description:
    "Share one link, let everyone paint when they're free, and watch the overlap appear — no accounts, no scheduling back-and-forth.",
  path: '/availability-room',
});

// --- cell class functions for decorative heatmaps ---

const consensus: CellClassFn = (c, k) => {
  const h = k / 2;
  if (c >= 5) {
    if (h >= 11 && h < 14.5) return c === 5 && h >= 12 && h < 14 ? 's-all' : 's-some';
    return 's-none';
  }
  if (h >= 13 && h < 18) return c === 2 && h >= 15 && h < 16 ? 's-some' : 's-all';
  if ((h >= 11 && h < 13) || (h >= 18 && h < 20)) return 's-some';
  return 's-none';
};

// Sparse: only when everyone agrees — tight green cluster, lots of blank
const viewConsensus: CellClassFn = (c, k) => {
  const h = k / 2;
  if (c >= 5) return 's-none';
  if (c >= 1 && c <= 3 && h >= 10.5 && h < 12) return 's-all';
  if (c >= 1 && c <= 3 && h >= 10 && h < 10.5) return 's-some';
  if ((c === 0 || c === 4) && h >= 10.5 && h < 11.5) return 's-some';
  return 's-none';
};

// Gradient: shows how many people are free — more coverage, varying intensity
const viewHeatmap: CellClassFn = (c, k) => {
  const h = k / 2;
  if (c >= 5) return 's-none';
  if (c >= 1 && c <= 3 && h >= 10.5 && h < 12) return 'lvl-5';
  if (h >= 10 && h < 12) return 'lvl-4';
  if ((h >= 9.5 && h < 10) || (h >= 12 && h < 12.5)) return 'lvl-3';
  if ((h >= 9 && h < 9.5) || (h >= 12.5 && h < 13.5)) return 'lvl-2';
  if (h >= 13.5) return 'lvl-1';
  return 's-none';
};

// One person's recurring weekly pattern (with gaps for meetings)
const viewGeneral: CellClassFn = (c, k) => {
  const h = k / 2;
  if (c >= 5) return 's-none';
  if (h >= 9 && h < 10) return 's-all';
  if (h >= 10 && h < 10.5) return 's-none'; // recurring 10am meeting
  if (h >= 10.5 && h < 12) return 's-all';
  if (h >= 12 && h < 12.5) return 's-some'; // lunch = maybe
  if (h >= 12.5 && h < 13) return 's-none'; // blocked
  if (h >= 13 && h < 14.5) return 's-all';
  return 's-none';
};

// This week: a few slots differ from the general pattern
const viewSpecific: CellClassFn = (c, k) => {
  const h = k / 2;
  if (c >= 5) return 's-none';
  if (c === 2 && h >= 10.5 && h < 12) return 's-some'; // Wed: rescheduled → maybe
  if (c === 3 && h >= 13.5 && h < 14.5) return 's-none'; // Thu: afternoon blocked
  if (c === 4 && h >= 10 && h < 10.5) return 's-all'; // Fri: 10am cancelled → free
  return viewGeneral(c, k);
};

// ---

export default function AvailabilityRoomPage() {
  return (
    <div className="mx-auto w-full max-w-[1080px] px-4 py-7 md:px-8">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Rooms' }]} />

      {/* ===== HERO ===== */}
      <section className="ar-hero">
        <div className="hero-copy">
          <p className="eyebrow">Beyond converting</p>
          <h1>
            Find a time that
            <br />
            works for everyone.
          </h1>
          <p className="lede">
            A converter tells you what time it is over there. A <strong> Room</strong> tells you
            when your whole group is actually free. Paint your week, share one link, and watch the
            overlap appear.
          </p>
          <div className="hero-actions">
            <Link
              prefetch={false}
              href="#create"
              className="inline-flex h-10 items-center gap-1.5 rounded-[var(--radius-lg)] px-[18px] text-[14px] font-medium"
              style={{ background: 'var(--brand)', color: 'var(--brand-fg)' }}
            >
              Create a room
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M5 12h14" />
                <path d="m13 5 7 7-7 7" />
              </svg>
            </Link>
            <Link
              prefetch={false}
              href="/r/example"
              className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[color:var(--fg)] no-underline hover:text-[color:var(--brand)]"
            >
              See an example room
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M7 17 17 7" />
                <path d="M7 7h10v10" />
              </svg>
            </Link>
          </div>
        </div>

        <div className="ar-board" aria-hidden="true">
          <div className="board-head">
            <span className="board-title">Design sync · Jun 8–14</span>
          </div>
          <HeatmapMini lo={18} hi={39} cellClass={consensus} />
          <div className="board-legend">
            <span className="key">
              <span className="dot" style={{ background: 'var(--avr-yes)' }} />
              everyone free
            </span>
            <span className="key">
              <span className="dot" style={{ background: 'var(--av-soft-fill)' }} />
              if needed
            </span>
            <span className="key">
              <span
                className="dot"
                style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
              />
              someone&apos;s out
            </span>
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="ar-section">
        <div className="ar-section-head">
          <p className="kicker">How it works</p>
          <h2>Three steps, no accounts to chase.</h2>
        </div>
        <div className="ar-steps">
          <div className="ar-step">
            <span className="num">1</span>
            <h3>Create a room</h3>
            <p>
              Name it and set your home zone. You get a link to share — that&apos;s the whole setup.
            </p>
          </div>
          <div className="ar-step">
            <span className="num">2</span>
            <h3>Everyone paints their week</h3>
            <p>
              Each person opens the link in their own timezone and drags across the hours
              they&apos;re free. No converting in the head, the room handles the math.
            </p>
          </div>
          <div className="ar-step">
            <span className="num">3</span>
            <h3>The overlap appears</h3>
            <p>
              A shared heatmap shades the times that work for the most people. Hover any slot to see
              exactly who&apos;s in.
            </p>
          </div>
        </div>
      </section>

      {/* ===== WHAT'S INSIDE ===== */}
      <section className="ar-section">
        <div className="ar-section-head">
          <p className="kicker">What&apos;s inside</p>
          <h2>Built for groups spread across the map.</h2>
        </div>
        <div className="ar-features">
          <div className="ar-feature">
            <span className="ficon" aria-hidden="true">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
            </span>
            <h3>Paint, don&apos;t poll</h3>
            <p>Drag across a continuous half-hour grid to mark free, if needed, and busy.</p>
          </div>
          <div className="ar-feature">
            <span className="ficon" aria-hidden="true">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
            </span>
            <h3>Everyone&apos;s zone, at once</h3>
            <p>
              The grid renders in each person&apos;s local time and reconciles it underneath, so 9am
              for you and 6pm for them line up automatically.
            </p>
          </div>
          <div className="ar-feature">
            <span className="ficon" aria-hidden="true">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M3 3v18h18" />
                <rect x="7" y="12" width="3" height="6" />
                <rect x="12" y="8" width="3" height="10" />
                <rect x="17" y="5" width="3" height="13" />
              </svg>
            </span>
            <h3>Consensus at a glance</h3>
            <p>
              A when2meet-style heatmap surfaces the best windows instantly, and recomputes the
              moment someone drops out or updates.
            </p>
          </div>
        </div>
      </section>

      {/* ===== WAYS TO READ ===== */}
      <section className="ar-section">
        <div className="ar-section-head">
          <p className="kicker">Ways to read the room</p>
          <h2>Same answers, different lenses.</h2>
          <p className="sub">
            The week grid is the core, but you can flip how it&apos;s colored, zoom the time scale,
            and choose whether you&apos;re setting a normal week or just one.
          </p>
        </div>
        <div className="ar-views">
          {/* Consensus vs Heatmap */}
          <div className="ar-view-card">
            <div>
              <div className="vc-top">
                <h3>Consensus or heatmap</h3>
              </div>
              <p>
                <strong>Consensus</strong> is strict: a slot only turns green when everyone can make
                it, yellow when all are in but some are &ldquo;if needed,&rdquo; and stays blank if
                anyone&apos;s out. <strong>Heatmap</strong> relaxes that into a when2meet-style
                gradient.
              </p>
            </div>
            <div className="ar-vc-visual" aria-hidden="true">
              <div className="ar-vc-col">
                <HeatmapMini lo={18} hi={29} sm cellClass={viewConsensus} />
                <div className="vlabel">Consensus</div>
              </div>
              <div className="ar-vc-col">
                <HeatmapMini lo={18} hi={29} sm cellClass={viewHeatmap} />
                <div className="vlabel">Heatmap</div>
              </div>
            </div>
          </div>

          {/* Week vs Day */}
          <div className="ar-view-card">
            <div>
              <div className="vc-top">
                <h3>Week or day</h3>
              </div>
              <p>
                <strong>Week</strong> shows all seven days at a half-hour grain to spot the broad
                windows. <strong>Day</strong> drops into a single date as one continuous bar per
                person.
              </p>
            </div>
            <div className="ar-vc-visual" aria-hidden="true">
              <div className="ar-vc-col">
                <HeatmapMini lo={18} hi={29} sm cellClass={consensus} />
                <div className="vlabel">Week</div>
              </div>
              <div className="ar-vc-col" style={{ alignSelf: 'center', minWidth: 150 }}>
                <div className="ar-day-mini">
                  {[
                    {
                      name: 'Maya',
                      segs: [
                        { id: 'ma0', v: 'no' },
                        { id: 'ma1', v: 'soft' },
                        { id: 'ma2', v: 'yes' },
                        { id: 'ma3', v: 'yes' },
                        { id: 'ma4', v: 'no' },
                      ],
                    },
                    {
                      name: 'Theo',
                      segs: [
                        { id: 'th0', v: 'no' },
                        { id: 'th1', v: 'no' },
                        { id: 'th2', v: 'yes' },
                        { id: 'th3', v: 'yes' },
                        { id: 'th4', v: 'soft' },
                      ],
                    },
                    {
                      name: 'Priya',
                      segs: [
                        { id: 'pr0', v: 'soft' },
                        { id: 'pr1', v: 'yes' },
                        { id: 'pr2', v: 'yes' },
                        { id: 'pr3', v: 'no' },
                        { id: 'pr4', v: 'no' },
                      ],
                    },
                    {
                      name: 'Sam',
                      segs: [
                        { id: 'sa0', v: 'no' },
                        { id: 'sa1', v: 'yes' },
                        { id: 'sa2', v: 'yes' },
                        { id: 'sa3', v: 'yes' },
                        { id: 'sa4', v: 'no' },
                      ],
                    },
                  ].map((row) => (
                    <div key={row.name} className="drow">
                      <span className="dname">{row.name}</span>
                      <div className="dbar">
                        {row.segs.map((seg) => (
                          <span key={seg.id} className={`dseg ${seg.v}`} />
                        ))}
                      </div>
                    </div>
                  ))}
                  <div className="daxis">
                    <span>9a</span>
                    <span>12p</span>
                    <span>5p</span>
                  </div>
                  <div className="vlabel">Day · Thu Jun 11</div>
                </div>
              </div>
            </div>
          </div>

          {/* General vs Specific */}
          <div className="ar-view-card">
            <div>
              <div className="vc-top">
                <h3>General or specific</h3>
              </div>
              <p>
                Paint a <strong>general week</strong> once and it becomes your default every week.
                When a particular week is different, switch to <strong>this week</strong> and
                override just those days. A single tap resets any week back to your general pattern.
              </p>
            </div>
            <div className="ar-vc-visual" aria-hidden="true">
              <div className="ar-vc-col">
                <HeatmapMini lo={18} hi={29} sm cellClass={viewGeneral} />
                <div className="vlabel">General week</div>
              </div>
              <div className="ar-vc-col">
                <HeatmapMini lo={18} hi={29} sm cellClass={viewSpecific} />
                <div className="vlabel">This week · edited</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== CREATE ===== */}
      <section className="ar-section" id="create" style={{ scrollMarginTop: '80px' }}>
        <div className="ar-section-head">
          <p className="kicker">Get started</p>
          <h2>Create a room.</h2>
        </div>
        <div className="ar-create-outer">
          <div className="ar-create-grid">
            <div className="ar-create-form-wrap">
              <h2>Your room, your rules</h2>
              <p className="sub">Free · no account required.</p>
              <CreateRoomForm />
            </div>
            <JoinRoomPanel />
          </div>
        </div>
      </section>
    </div>
  );
}
