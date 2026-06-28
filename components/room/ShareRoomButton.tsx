'use client';

// The room's "copy the link" affordance, extracted so the header and the
// cold-start states (empty / just-you) share one implementation. Rooms spread by
// the shared link — there's no invite list — so this is the core growth action.

import { Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

type ButtonProps = React.ComponentProps<typeof Button>;

interface Props {
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
  className?: string;
  label?: string;
}

export function ShareRoomButton({
  variant = 'outline',
  size = 'sm',
  className,
  label = 'Share',
}: Props) {
  async function share() {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Room link copied');
    } catch {
      toast.error('Could not copy the link');
    }
  }

  return (
    <Button variant={variant} size={size} className={className} onClick={share}>
      <Share2 className="size-3.5" /> {label}
    </Button>
  );
}
