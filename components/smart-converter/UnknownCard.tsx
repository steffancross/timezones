'use client';

import { HelpCircle } from 'lucide-react';
import type { UnknownEvent } from '@/lib/smart-converter/types';

interface Props {
  event: UnknownEvent;
  /** Focus the paste box so the user can rewrite the time in a format we read. */
  onEnterManually?: () => void;
}

/** Nothing parseable — a clear "couldn't read this" with working examples. */
export function UnknownCard({ event, onEnterManually }: Props) {
  return (
    <div className="sc-card unknown">
      <div className="sc-unk-row">
        <span className="sc-unk-ico">
          <HelpCircle size={16} aria-hidden="true" />
        </span>
        <div style={{ minWidth: 0 }}>
          <div className="unk-title">Couldn't read a time here</div>
          <div className="unk-body">We couldn't find a date, clock time, or zone to lock onto:</div>
          <div className="sc-echo" style={{ marginTop: 9 }}>
            <span className="echo-tag" style={{ borderStyle: 'dashed' }}>
              skipped
            </span>
            <span className="echo-text" style={{ fontStyle: 'italic' }}>
              {event.snippet}
            </span>
          </div>
        </div>
      </div>
      <div className="sc-unk-ex">
        <span className="ex-cap">Formats that work</span>
        <div className="ex-chips">
          <span className="sc-chip">
            April 29 <b>8:00 PM</b> GMT+8
          </span>
          <span className="sc-chip">
            drops <b>3pm EST</b> Friday
          </span>
          <span className="sc-chip">
            <b>15:00</b> Beijing time
          </span>
        </div>
      </div>
      {onEnterManually ? (
        <div className="sc-unk-actions">
          <button
            className="sc-copy"
            type="button"
            style={{ height: 32 }}
            onClick={onEnterManually}
          >
            Edit the text
          </button>
        </div>
      ) : null}
    </div>
  );
}
