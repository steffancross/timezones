// Decorative week-heatmap grid — mirrors the Availability Room's overview grid
// but rendered as static JSX with caller-supplied sample data. Server-safe (no
// 'use client'), used by AvailabilityRoomPromo and the /availability-room page.
//
// cellClass(col, slot) must return one of:
//   s-all | s-some | s-none       (consensus mode)
//   lvl-1 … lvl-5                 (heatmap gradient mode)

const COLS = [0, 1, 2, 3, 4, 5, 6];

const DAYS = [
  { d: 'Mon', n: 8, wknd: false },
  { d: 'Tue', n: 9, wknd: false },
  { d: 'Wed', n: 10, wknd: false },
  { d: 'Thu', n: 11, wknd: false },
  { d: 'Fri', n: 12, wknd: false },
  { d: 'Sat', n: 13, wknd: true },
  { d: 'Sun', n: 14, wknd: true },
];

function hrLabel(h: number): string {
  if (h === 0) return '12a';
  if (h === 12) return '12p';
  return h < 12 ? `${h}a` : `${h - 12}p`;
}

export type CellClassFn = (col: number, slot: number) => string;

interface Props {
  lo?: number;
  hi?: number;
  sm?: boolean;
  cellClass: CellClassFn;
}

export function HeatmapMini({ lo = 18, hi = 39, sm = false, cellClass }: Props) {
  const rowPx = sm ? 8 : 11;
  const slots: number[] = [];
  for (let k = lo; k <= hi; k++) slots.push(k);

  return (
    <div className={`avr-hm${sm ? ' sm' : ''}`}>
      <div className="hm-head">
        <div className="hm-corner" />
        <div className="hm-days">
          {DAYS.map((d) => (
            <div key={d.d} className={`d${d.wknd ? ' wknd' : ''}`}>
              {d.d}
              <span className="dn">{d.n}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="hm-body">
        <div className="hm-times" style={{ height: slots.length * rowPx }}>
          {slots.map((k, i) =>
            k % 2 === 0 ? (
              <span key={k} className="t" style={{ top: i * rowPx }}>
                {hrLabel(k / 2)}
              </span>
            ) : null,
          )}
        </div>
        <div className="hm-cells">
          {slots.flatMap((k) =>
            COLS.map((c) => (
              <div
                key={`${k}-${c}`}
                className={`hc ${cellClass(c, k)}${k % 2 ? ' hour-line' : ''}`}
              />
            )),
          )}
        </div>
      </div>
    </div>
  );
}
