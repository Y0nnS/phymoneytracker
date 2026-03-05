'use client';

import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthProvider';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  loadCustomCategories,
  saveCustomCategories,
} from '@/lib/categories';
import { signOutUser } from '@/lib/firebase/auth';
import React from 'react';

export default function SettingsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [signingOut, setSigningOut] = React.useState(false);

  const [expenseCustom, setExpenseCustom] = React.useState<string[]>([]);
  const [incomeCustom, setIncomeCustom] = React.useState<string[]>([]);
  const [expenseDraft, setExpenseDraft] = React.useState('');
  const [incomeDraft, setIncomeDraft] = React.useState('');

  const analyticsEnabled = Boolean(process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID);

  React.useEffect(() => {
    setExpenseCustom(loadCustomCategories('expense'));
    setIncomeCustom(loadCustomCategories('income'));
  }, []);

  async function onSignOut() {
    setSigningOut(true);
    try {
      await signOutUser();
    } finally {
      setSigningOut(false);
    }
  }

  function commitCategories(type: 'expense' | 'income', next: string[]) {
    saveCustomCategories(type, next);
    const refreshed = loadCustomCategories(type);
    if (type === 'expense') setExpenseCustom(refreshed);
    else setIncomeCustom(refreshed);
  }

  function addCategory(type: 'expense' | 'income') {
    const draft = type === 'expense' ? expenseDraft : incomeDraft;
    const name = draft.trim();
    if (!name) return;
    const existing = type === 'expense' ? expenseCustom : incomeCustom;
    commitCategories(type, [name, ...existing]);
    if (type === 'expense') setExpenseDraft('');
    else setIncomeDraft('');
    toast.success('Kategori tersimpan.');
  }

  function removeCategory(type: 'expense' | 'income', name: string) {
    const existing = type === 'expense' ? expenseCustom : incomeCustom;
    commitCategories(
      type,
      existing.filter((c) => c !== name),
    );
    toast.success('Kategori dihapus.');
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="text-sm text-zinc-400">Akun & Preferensi</div>
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <div className="text-sm font-semibold">Profil</div>
          <div className="mt-2 text-sm text-zinc-300">
            Email: <span className="font-semibold">{user?.email ?? '—'}</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/app/transactions"
              className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm font-semibold text-zinc-100 hover:bg-zinc-900">
              Buka transaksi
            </Link>
            <Link
              href="/app/budget"
              className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm font-semibold text-zinc-100 hover:bg-zinc-900">
              Atur budget
            </Link>
          </div>
          <div className="mt-4">
            <Button variant="secondary" onClick={onSignOut} disabled={signingOut} className="w-full">
              {signingOut ? 'Keluar…' : 'Keluar'}
            </Button>
          </div>
          <div className="mt-3 text-xs text-zinc-500">
            Analytics: {analyticsEnabled ? 'Aktif' : 'Nonaktif'} • Data realtime Firestore
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <div className="flex flex-col gap-1">
            <div className="text-sm font-semibold">Kategori custom (opsional)</div>
            <div className="text-xs text-zinc-500">
              Default kategori tetap ada. Custom kategori disimpan di browser (localStorage).
            </div>
          </div>

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <div>
              <div className="text-xs font-semibold text-zinc-400">Expense</div>
              <div className="mt-2 flex items-end gap-2">
                <Input
                  label="Tambah kategori"
                  value={expenseDraft}
                  onChange={(e) => setExpenseDraft(e.target.value)}
                  placeholder="Misal: Coffee"/>
                <Button
                  size="sm"
                  onClick={() => addCategory('expense')}
                  disabled={!expenseDraft.trim()}
                  className="h-10">
                  Tambah
                </Button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {expenseCustom.length === 0 ? (
                  <div className="text-sm text-zinc-500">Belum ada kategori custom.</div>
                ) : (
                  expenseCustom.map((c) => (
                    <span
                      key={c}
                      className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs font-semibold text-zinc-200">
                      {c}
                      <button
                        type="button"
                        onClick={() => removeCategory('expense', c)}
                        className="rounded-full px-1.5 py-0.5 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
                        aria-label={`Hapus kategori ${c}`}>
                        ×
                      </button>
                    </span>
                  ))
                )}
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs text-zinc-500">
                  Default: {EXPENSE_CATEGORIES.join(', ')}
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => commitCategories('expense', [])}
                  disabled={expenseCustom.length === 0}>
                  Reset
                </Button>
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-zinc-400">Income</div>
              <div className="mt-2 flex items-end gap-2">
                <Input
                  label="Tambah kategori"
                  value={incomeDraft}
                  onChange={(e) => setIncomeDraft(e.target.value)}
                  placeholder="Misal: Bonus"/>
                <Button
                  size="sm"
                  onClick={() => addCategory('income')}
                  disabled={!incomeDraft.trim()}
                  className="h-10">
                  Tambah
                </Button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {incomeCustom.length === 0 ? (
                  <div className="text-sm text-zinc-500">Belum ada kategori custom.</div>
                ) : (
                  incomeCustom.map((c) => (
                    <span
                      key={c}
                      className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs font-semibold text-zinc-200">
                      {c}
                      <button
                        type="button"
                        onClick={() => removeCategory('income', c)}
                        className="rounded-full px-1.5 py-0.5 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
                        aria-label={`Hapus kategori ${c}`}>
                        ×
                      </button>
                    </span>
                  ))
                )}
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs text-zinc-500">Default: {INCOME_CATEGORIES.join(', ')}</div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => commitCategories('income', [])}
                  disabled={incomeCustom.length === 0}>
                  Reset
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="text-sm font-semibold">Shortcut</div>
          <div className="mt-2 text-sm text-zinc-300">
            <div className="flex items-center justify-between gap-3">
              <span>Tambah expense cepat</span>
              <span className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs font-semibold text-zinc-200">
                N
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span>Tambah income cepat</span>
              <span className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs font-semibold text-zinc-200">
                Shift + N
              </span>
            </div>
          </div>
          <div className="mt-3 text-xs text-zinc-500">
            Tips: klik transaksi terbaru di Dashboard untuk edit. Di halaman Transaksi ada Edit / Duplikat / Hapus.
          </div>
        </Card>

        <Card>
          <div className="text-sm font-semibold">Keamanan</div>
          <div className="mt-2 text-sm text-zinc-300">
            Registrasi publik dimatikan. Halaman <span className="font-semibold">/sign-up</span>{' '}
            hanya menampilkan info.
          </div>
          <div className="mt-3 text-xs text-zinc-500">
            Untuk ekstra aman, batasi akses Firestore di <span className="font-semibold">firestore.rules</span>{' '}
            (misal hanya UID kamu).
          </div>
        </Card>
      </div>
    </div>
  );
}
