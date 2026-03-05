'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { IconGear, IconGrid, IconList, IconPlus, IconWallet } from '@/components/icons';
import { cn } from '@/lib/utils';

type NavItem = {
  href: string;
  label: string;
  icon: (props: { className?: string }) => ReactNode;
};

const NAV: NavItem[] = [
  { href: '/app', label: 'Dashboard', icon: IconGrid },
  { href: '/app/transactions', label: 'Transaksi', icon: IconList },
  { href: '/app/budget', label: 'Budget', icon: IconWallet },
  { href: '/app/settings', label: 'Settings', icon: IconGear },
];

export function MobileNav() {
  const pathname = usePathname();
  const left = NAV.slice(0, 2);
  const right = NAV.slice(2);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-900 bg-zinc-950/95 backdrop-blur md:hidden">
      <div className="grid w-full grid-cols-5 px-4">
        {left.map((item) => {
          const active =
            item.href === '/app'
              ? pathname === '/app'
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-1 px-2 py-3 text-xs font-semibold text-zinc-400',
                active ? 'text-zinc-100' : 'hover:text-zinc-200',
              )}
            >
              <span
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-xl border border-transparent',
                  active ? 'border-zinc-800 bg-zinc-900' : 'bg-transparent',
                )}
              >
                {item.icon({ className: 'h-5 w-5' })}
              </span>
              <span className="leading-none">{item.label}</span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event('moneytracker:add'))}
          className="flex flex-col items-center gap-1 px-2 py-2.5 text-xs font-semibold text-zinc-200"
          aria-label="Tambah transaksi"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm shadow-black/50 ring-1 ring-white/10 transition-[transform,background-color] duration-150 active:translate-y-px active:shadow-none">
            {IconPlus({ className: 'h-5 w-5' })}
          </span>
          <span className="text-[10px] font-semibold text-zinc-400">Tambah</span>
        </button>

        {right.map((item) => {
          const active =
            item.href === '/app'
              ? pathname === '/app'
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-1 px-2 py-3 text-xs font-semibold text-zinc-400',
                active ? 'text-zinc-100' : 'hover:text-zinc-200',
              )}
            >
              <span
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-xl border border-transparent',
                  active ? 'border-zinc-800 bg-zinc-900' : 'bg-transparent',
                )}
              >
                {item.icon({ className: 'h-5 w-5' })}
              </span>
              <span className="leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
