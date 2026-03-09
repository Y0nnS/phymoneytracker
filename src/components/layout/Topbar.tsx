'use client';

import { usePathname } from 'next/navigation';
import { monthIdFromDate } from '@/lib/date';
import { IconPlus } from '@/components/icons';
import { Button } from '@/components/ui/Button';

const TITLES: Array<{ prefix: string; title: string }> = [
  { prefix: '/app/tasks', title: 'Tasks' },
  { prefix: '/app/notes', title: 'Notes' },
  { prefix: '/app/finance', title: 'Finance' },
  { prefix: '/app/settings', title: 'Settings' },
  { prefix: '/app', title: 'Workspace' },
];

function titleFromPath(pathname: string) {
  const match = TITLES.find(
    (t) => pathname === t.prefix || pathname.startsWith(t.prefix),
  );
  return match?.title ?? 'Workspace';
}

export function Topbar({ onQuickCapture }: { onQuickCapture: () => void }) {
  const pathname = usePathname();
  const title = titleFromPath(pathname);
  const monthId = monthIdFromDate(new Date());

  return (
    <header className="sticky top-0 z-10 border-b border-zinc-900 bg-zinc-950/90 backdrop-blur">
      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:gap-4 sm:px-6 sm:py-4">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold text-zinc-500 sm:text-xs">{monthId}</div>
          <div className="truncate text-sm font-semibold sm:text-base">{title}</div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={onQuickCapture}
            className="hidden sm:inline-flex">
            {IconPlus({ className: 'h-4 w-4' })}
            Quick capture
          </Button>
          <Button
            size="sm"
            onClick={onQuickCapture}
            className="h-9 w-9 px-0 sm:hidden"
            aria-label="Quick capture">
            {IconPlus({ className: 'h-4 w-4' })}
          </Button>
        </div>
      </div>
    </header>
  );
}
