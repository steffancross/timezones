'use client';

import { Copy } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  /** Text copied to the clipboard. */
  value: string;
  label?: string;
}

/** Per-card copy action — copies the converted local time. */
export function CopyButton({ value, label = 'Copy' }: Props) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success('Copied to clipboard');
    } catch {
      toast.error("Couldn't copy");
    }
  };
  return (
    <button className="sc-copy" type="button" onClick={copy} aria-label={`Copy: ${value}`}>
      <Copy size={13} aria-hidden="true" />
      {label}
    </button>
  );
}
