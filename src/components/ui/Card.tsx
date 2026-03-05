import { cn } from '@/lib/utils';

export function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-sm shadow-black/40 ring-1 ring-white/5',
        className,
      )}
    >
      {children}
    </div>
  );
}
