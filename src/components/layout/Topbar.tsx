'use client';

import { usePathname } from 'next/navigation';
import { monthIdFromDate } from '@/lib/date';
import { IconPlus } from '@/components/icons';
import { Button } from '@/components/ui/Button';

const TITLES: Array<{ prefix: string; title: string }> = [
  { prefix: '/app/transactions', title: 'Transaksi' },
  { prefix: '/app/budget', title: 'Budget Bulanan' },
  { prefix: '/app/settings', title: 'Settings' },
  { prefix: '/app', title: 'Dashboard' },
];

function titleFromPath(pathname: string) {
  const match = TITLES.find(
    (t) => pathname === t.prefix || pathname.startsWith(t.prefix),
  );
  return match?.title ?? 'Dashboard';
}

export function Topbar() {
  const pathname = usePathname();
  const title = titleFromPath(pathname);
  const monthId = monthIdFromDate(new Date());

  return (
    <header className="sticky top-0 z-10 border-b border-zinc-900 bg-zinc-950/90 backdrop-blur">
      <div className="flex items-center justify-between gap-4 px-6 py-4">
        <div className="min-w-0">
          <div className="text-xs font-semibold text-zinc-500">{monthId}</div>
          <div className="truncate text-base font-semibold">{title}</div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => window.dispatchEvent(new Event('moneytracker:add'))}
            className="hidden sm:inline-flex"
          >
            {IconPlus({ className: 'h-4 w-4' })}
            Tambah
          </Button>
          <Button
            size="sm"
            onClick={() => window.dispatchEvent(new Event('moneytracker:add'))}
            className="h-9 w-9 px-0 sm:hidden"
            aria-label="Tambah transaksi"
          >
            {IconPlus({ className: 'h-4 w-4' })}
          </Button>
        </div>
      </div>
    </header>
  );
}
