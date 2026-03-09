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
        'app-surface p-4 sm:p-5',
        className,
      )}>
      {children}
    </div>
  );
}
