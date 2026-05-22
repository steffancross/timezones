import { AlertTriangle, CheckCircle, Info } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  type?: 'info' | 'warning' | 'success';
  children: ReactNode;
}

const ICONS = {
  info: Info,
  warning: AlertTriangle,
  success: CheckCircle,
};

const STYLES = {
  info: 'border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950',
  warning: 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950',
  success: 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950',
};

export function Callout({ type = 'info', children }: Props) {
  const Icon = ICONS[type];
  return (
    <div className={cn('my-6 flex gap-3 rounded-md border p-4', STYLES[type])}>
      <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
      <div className="text-sm leading-relaxed">{children}</div>
    </div>
  );
}
