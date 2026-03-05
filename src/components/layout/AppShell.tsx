'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { MobileNav } from '@/components/layout/MobileNav';
import { TransactionModal } from '@/components/transactions/TransactionModal';
import type { Transaction, TransactionType } from '@/lib/types';
import { readLocalStorageItem } from '@/lib/storage';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [transactionModalOpen, setTransactionModalOpen] = React.useState(false);
  const [transactionModalMode, setTransactionModalMode] = React.useState<
    'create' | 'edit' | 'duplicate'
  >('create');
  const [transactionModalDefaultType, setTransactionModalDefaultType] =
    React.useState<TransactionType>('expense');
  const [transactionModalInitial, setTransactionModalInitial] =
    React.useState<Transaction | null>(null);

  React.useEffect(() => {
    if (!loading && !user) router.replace('/sign-in');
  }, [loading, user, router]);

  React.useEffect(() => {
    const onAdd: EventListener = (e) => {
      const detail = (e as CustomEvent<{ type?: TransactionType }>).detail;
      const storedType = readLocalStorageItem('moneytracker:lastType');
      const fallbackType: TransactionType =
        storedType === 'income' || storedType === 'expense' ? storedType : 'expense';
      setTransactionModalMode('create');
      setTransactionModalInitial(null);
      setTransactionModalDefaultType(detail?.type ?? fallbackType);
      setTransactionModalOpen(true);
    };

    const onEdit: EventListener = (e) => {
      const detail = (
        e as CustomEvent<{
          transaction?: Transaction;
          mode?: 'edit' | 'duplicate';
        }>
      ).detail;

      if (!detail?.transaction) return;
      setTransactionModalMode(detail.mode === 'duplicate' ? 'duplicate' : 'edit');
      setTransactionModalInitial(detail.transaction);
      setTransactionModalDefaultType(detail.transaction.type);
      setTransactionModalOpen(true);
    };

    window.addEventListener('moneytracker:add', onAdd);
    window.addEventListener('moneytracker:edit', onEdit);
    return () => {
      window.removeEventListener('moneytracker:add', onAdd);
      window.removeEventListener('moneytracker:edit', onEdit);
    };
  }, []);

  React.useEffect(() => {
    function isEditableTarget(target: EventTarget | null) {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName.toLowerCase();
      return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable;
    }

    function onKeyDown(e: KeyboardEvent) {
      if (isEditableTarget(e.target)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key.toLowerCase() !== 'n') return;
      e.preventDefault();
      const type: TransactionType = e.shiftKey ? 'income' : 'expense';
      window.dispatchEvent(new CustomEvent('moneytracker:add', { detail: { type } }));
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100">
        <div className="flex w-full flex-col gap-4 px-6 py-14">
          <div className="h-7 w-40 animate-pulse rounded-md bg-zinc-900" />
          <div className="h-10 w-full animate-pulse rounded-xl bg-zinc-900" />
          <div className="h-10 w-2/3 animate-pulse rounded-xl bg-zinc-900" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="flex w-full">
        <Sidebar />
        <div className="flex min-h-screen flex-1 flex-col">
          <Topbar />
          <div
            key={pathname}
            className="flex-1 px-6 py-6 pb-24 motion-reduce:animate-none motion-safe:animate-[page-in_180ms_ease-out] md:pb-6">
            {children}
          </div>
        </div>
      </div>
      <MobileNav />
      <TransactionModal
        uid={user.uid}
        open={transactionModalOpen}
        onClose={() => setTransactionModalOpen(false)}
        mode={transactionModalMode}
        defaultType={transactionModalDefaultType}
        initialTransaction={transactionModalInitial}
      />
    </div>
  );
}
