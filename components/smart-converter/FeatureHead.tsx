import { Clock } from 'lucide-react';

/** Feature header — the literal query users ask, per the naming/SEO doc. */
export function FeatureHead() {
  return (
    <div className="sc-head">
      <p className="eyebrow">
        <Clock size={13} aria-hidden="true" />
        Smart converter
      </p>
      <h1>What time is this for me?</h1>
      <p>
        Paste any announcement — a drop, preorder, stream or launch — and see it in your time, with
        a live countdown.
      </p>
    </div>
  );
}
