'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import {
  IconCheckSquare,
  IconGear,
  IconGrid,
  IconNote,
  IconPlus,
  IconTrendingUp,
  IconWallet,
} from '@/components/icons';
import { cn } from '@/lib/utils';

type NavItem = {
  href: string;
  label: string;
  icon: (props: { className?: string }) => ReactNode;
};

const NAV: NavItem[] = [
  { href: '/app', label: 'Home', icon: IconGrid },
  { href: '/app/tasks', label: 'Tasks', icon: IconCheckSquare },
  { href: '/app/notes', label: 'Notes', icon: IconNote },
  { href: '/app/finance', label: 'Finance', icon: IconWallet },
  { href: '/app/markets', label: 'Markets', icon: IconTrendingUp },
  { href: '/app/settings', label: 'Settings', icon: IconGear },
];

export function MobileNav({ onQuickCapture }: { onQuickCapture: () => void }) {
  const pathname = usePathname();
  const left = NAV.slice(0, 3);
  const right = NAV.slice(3);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-900 bg-zinc-950/95 backdrop-blur md:hidden">
      <div className="grid w-full grid-cols-7 px-1.5">
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
                'flex min-w-0 flex-col items-center gap-1 px-1 py-2.5 text-[10px] font-semibold text-zinc-400',
                active ? 'text-zinc-100' : 'hover:text-zinc-200',
              )}>
              <span
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-xl border border-transparent',
                  active ? 'border-zinc-800 bg-zinc-900' : 'bg-transparent',
                )}>
                {item.icon({ className: 'h-4 w-4' })}
              </span>
              <span className="max-w-full truncate leading-none">{item.label}</span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={onQuickCapture}
          className="flex flex-col items-center gap-1 px-1 py-2 text-[10px] font-semibold text-zinc-200"
          aria-label="Quick capture">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm shadow-black/50 ring-1 ring-white/10 transition-[transform,background-color] duration-150 active:translate-y-px active:shadow-none">
            {IconPlus({ className: 'h-4 w-4' })}
          </span>
          <span className="text-[9px] font-semibold text-zinc-400">Quick</span>
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
                'flex min-w-0 flex-col items-center gap-1 px-1 py-2.5 text-[10px] font-semibold text-zinc-400',
                active ? 'text-zinc-100' : 'hover:text-zinc-200',
              )}>
              <span
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-xl border border-transparent',
                  active ? 'border-zinc-800 bg-zinc-900' : 'bg-transparent',
                )}>
                {item.icon({ className: 'h-4 w-4' })}
              </span>
              <span className="max-w-full truncate leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
