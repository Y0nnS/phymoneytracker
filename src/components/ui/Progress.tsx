import { cn } from '@/lib/utils';

export function Progress({
  value,
  tone = 'neutral',
  className,
}: {
  value: number; // 0..1 (clamped)
  tone?: 'neutral' | 'good' | 'warn' | 'danger';
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(1, value));
  const barTone =
    tone === 'good'
      ? 'bg-emerald-500'
      : tone === 'warn'
        ? 'bg-amber-500'
        : tone === 'danger'
          ? 'bg-red-500'
          : 'bg-blue-500';

  return (
    <div
      className={cn(
        'h-2 w-full overflow-hidden rounded-full border border-zinc-800 bg-zinc-950',
        className,
      )}>
      <div
        className={cn('h-full rounded-full transition-[width] duration-300', barTone)}
        style={{ width: `${clamped * 100}%` }}
      />
    </div>
  );
}

