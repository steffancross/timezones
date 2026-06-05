'use client';

import { useConverterStore } from '@/components/converter/store-context';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronsUp, X } from 'lucide-react';

interface Props {
  index: number;
  isFirst: boolean;
  isLast: boolean;
}

export function ZoneRowControls({ index, isFirst, isLast }: Props) {
  const moveZone = useConverterStore((s) => s.moveZone);
  const removeZone = useConverterStore((s) => s.removeZone);

  return (
    <div
      className={cn(
        'flex items-center justify-center gap-0',
        'flex-col',
        'max-md:flex-row max-md:gap-0.5',
      )}
    >
      <ControlButton
        disabled={isFirst}
        onClick={() => moveZone(index, 0)}
        aria-label="Move zone to top"
      >
        <ChevronsUp className="size-4" />
      </ControlButton>

      <ControlButton
        variant="destructive"
        onClick={() => removeZone(index)}
        aria-label="Remove zone"
      >
        <X className="size-3.5" />
      </ControlButton>

      <ControlButton
        disabled={isLast}
        onClick={() => moveZone(index, index + 1)}
        aria-label="Move zone down"
      >
        <ChevronDown className="size-4" />
      </ControlButton>
    </div>
  );
}

interface ControlButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: 'default' | 'destructive';
  children: React.ReactNode;
}

function ControlButton({
  variant = 'default',
  className,
  children,
  disabled,
  ...rest
}: ControlButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        'inline-flex size-[22px] max-md:size-[26px] items-center justify-center rounded-[var(--radius)] transition-colors',
        'text-[color:var(--fg-subtle)]',
        !disabled && 'hover:bg-[var(--hover)] hover:text-[color:var(--fg)]',
        !disabled && variant === 'destructive' && 'hover:text-[color:hsl(var(--destructive))]',
        disabled && 'cursor-not-allowed opacity-35',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
