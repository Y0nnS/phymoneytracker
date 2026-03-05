'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';
import { signOutUser } from '@/lib/firebase/auth';
import { useAuth } from '@/components/auth/AuthProvider';
import { IconGear, IconGrid, IconList, IconPlus, IconWallet } from '@/components/icons';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/app', label: 'Dashboard', icon: IconGrid },
  { href: '/app/transactions', label: 'Transaksi', icon: IconList },
  { href: '/app/budget', label: 'Budget', icon: IconWallet },
  { href: '/app/settings', label: 'Settings', icon: IconGear },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [signingOut, setSigningOut] = React.useState(false);
  const initial = (user?.email?.trim()?.[0] ?? '?').toUpperCase();

  async function onSignOut() {
    setSigningOut(true);
    try {
      await signOutUser();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <aside className="hidden w-64 shrink-0 border-r border-zinc-900 bg-zinc-950 md:sticky md:top-0 md:flex md:h-dvh md:self-start md:flex-col md:overflow-hidden">
      <div className="flex flex-col gap-4 px-5 py-6">
        <div className="flex items-center justify-between gap-3">
          <Link href="/app" className="text-sm font-semibold tracking-wide">
            MoneyTracker
          </Link>
          <span className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-[10px] font-semibold text-zinc-300">
            Personal
          </span>
        </div>
        <Button
          onClick={() => window.dispatchEvent(new Event('moneytracker:add'))}
          className="w-full justify-start">
          <span className="inline-flex items-center gap-2">
            {IconPlus({ className: 'h-4 w-4' })}
            Tambah transaksi
          </span>
        </Button>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 pb-4">
        {navItems.map((item) => {
          const active =
            item.href === '/app'
              ? pathname === '/app'
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-zinc-300 transition-[background-color,color,transform] hover:translate-x-[1px] hover:bg-zinc-900 hover:text-zinc-100',
                active
                  ? 'bg-zinc-900 text-zinc-100 shadow-sm shadow-black/30 ring-1 ring-white/5'
                  : null,
              )}>
              <span
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-xl border border-transparent text-zinc-400 transition-[color,transform] group-hover:scale-[1.03] group-hover:text-zinc-100',
                  active ? 'border-zinc-800 bg-zinc-950 text-zinc-100' : null,
                )}>
                {item.icon({ className: 'h-5 w-5' })}
              </span>
              <span className="min-w-0 truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-zinc-900 px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 text-sm font-semibold text-zinc-100">
            {initial}
          </div>
          <div className="min-w-0">
            <div className="text-xs text-zinc-500">Masuk sebagai</div>
            <div className="truncate text-sm font-semibold text-zinc-200">
              {user?.email ?? '—'}
            </div>
          </div>
        </div>
        <Button
          variant="secondary"
          onClick={onSignOut}
          disabled={signingOut}
          className="mt-4 w-full">
          {signingOut ? 'Keluar…' : 'Keluar'}
        </Button>
      </div>
    </aside>
  );
}
