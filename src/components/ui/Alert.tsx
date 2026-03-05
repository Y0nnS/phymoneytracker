import { cn } from '@/lib/utils';

export function Alert({
  children,
  variant = 'default',
  className,
}: {
  children: React.ReactNode;
  variant?: 'default' | 'danger';
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-lg border px-4 py-3 text-sm',
        variant === 'danger'
          ? 'border-red-900/60 bg-red-950/40 text-red-100'
          : 'border-zinc-800 bg-zinc-900 text-zinc-200',
        className,
      )}>
      {children}
    </div>
  );
}

