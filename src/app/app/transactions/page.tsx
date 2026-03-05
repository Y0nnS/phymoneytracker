'use client';

import React from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import { useTransactions } from '@/hooks/useTransactions';
import { deleteTransaction } from '@/lib/firebase/transactions';
import type { Transaction, TransactionType } from '@/lib/types';
import { formatDateShort, isSameMonth, monthIdFromDate } from '@/lib/date';
import { formatIDR } from '@/lib/money';
import { dateKeyLocal } from '@/lib/insights';

function csvEscape(value: string) {
  const safe = value.replaceAll('"', '""');
  return `"${safe}"`;
}

export default function TransactionsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const { transactions, loading, error } = useTransactions(user?.uid);

  const [monthId, setMonthId] = React.useState(() => monthIdFromDate(new Date()));
  const [typeFilter, setTypeFilter] = React.useState<'all' | TransactionType>('all');
  const [query, setQuery] = React.useState('');
  const [pendingDelete, setPendingDelete] = React.useState<Transaction | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const queryTrimmed = query.trim();
  const hasActiveFilters = typeFilter !== 'all' || queryTrimmed.length > 0;
  const typeLabel =
    typeFilter === 'all' ? 'Semua' : typeFilter === 'income' ? 'Income' : 'Expense';

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return transactions
      .filter((t) => isSameMonth(t.date, monthId))
      .filter((t) => (typeFilter === 'all' ? true : t.type === typeFilter))
      .filter((t) => {
        if (!q) return true;
        return (
          t.category.toLowerCase().includes(q) || t.note.toLowerCase().includes(q)
        );
      });
  }, [transactions, monthId, typeFilter, query]);

  const totals = React.useMemo(() => {
    const income = filtered
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    const expense = filtered
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    return { income, expense, net: income - expense };
  }, [filtered]);

  function openEditor(tx: Transaction, mode: 'edit' | 'duplicate') {
    window.dispatchEvent(
      new CustomEvent('moneytracker:edit', {
        detail: { transaction: tx, mode },
      }),
    );
  }

  async function onConfirmDelete() {
    if (!user || !pendingDelete) return;
    setDeleting(true);
    try {
      await deleteTransaction(user.uid, pendingDelete.id);
      toast.success('Transaksi dihapus.');
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : 'Gagal menghapus transaksi.');
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  }

  function resetFilters() {
    setTypeFilter('all');
    setQuery('');
  }

  function onExportCsv() {
    const rows: string[][] = [
      ['date', 'type', 'category', 'note', 'amount'],
      ...filtered.map((t) => [
        dateKeyLocal(t.date),
        t.type,
        t.category,
        t.note ?? '',
        String(t.amount),
      ]),
    ];
    const csv = rows.map((r) => r.map(csvEscape).join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${monthId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-sm text-zinc-400">Kelola</div>
            <h1 className="text-3xl font-semibold tracking-tight">Transaksi</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              onClick={onExportCsv}
              disabled={filtered.length === 0}
            >
              Export CSV
            </Button>
            <Button onClick={() => window.dispatchEvent(new Event('moneytracker:add'))}>
              Tambah transaksi
            </Button>
          </div>
        </div>

        <Card className="p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 px-5 py-4">
            <div>
              <div className="text-sm font-semibold">Filter</div>
              <div className="mt-1 text-xs text-zinc-500">
                {monthId} • {typeLabel}
                {queryTrimmed ? ` • “${queryTrimmed}”` : ''}
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={resetFilters}
              disabled={!hasActiveFilters}
            >
              Reset
            </Button>
          </div>

          <div className="grid gap-3 px-5 py-4 sm:grid-cols-2 lg:grid-cols-[220px_200px_1fr]">
            <Input
              label="Bulan"
              type="month"
              value={monthId}
              onChange={(e) => setMonthId(e.target.value)}
            />
            <Select
              label="Tipe"
              value={typeFilter}
              onChange={(e) => {
                const value = e.target.value;
                if (value === 'all' || value === 'income' || value === 'expense') {
                  setTypeFilter(value);
                }
              }}
            >
              <option value="all">Semua</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </Select>
            <Input
              label="Cari"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Kategori atau note…"
            />
          </div>
        </Card>
      </div>

      {error ? <Alert variant="danger">{error}</Alert> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <div className="text-xs font-semibold text-zinc-400">Income</div>
          <div className="mt-2 text-xl font-semibold">{formatIDR(totals.income)}</div>
        </Card>
        <Card>
          <div className="text-xs font-semibold text-zinc-400">Expense</div>
          <div className="mt-2 text-xl font-semibold">
            {formatIDR(totals.expense)}
          </div>
        </Card>
        <Card>
          <div className="text-xs font-semibold text-zinc-400">Net</div>
          <div className="mt-2 text-xl font-semibold">{formatIDR(totals.net)}</div>
        </Card>
      </div>

      <Card className="p-0">
        <div className="flex items-center justify-between gap-4 border-b border-zinc-800 px-5 py-4">
          <div className="text-sm font-semibold">
            {monthId} • {filtered.length} transaksi
          </div>
          <div className="text-xs text-zinc-500">
            {loading ? 'Memuat…' : 'Realtime dari Firestore'}
          </div>
        </div>

        <div className="md:hidden">
          {loading ? (
            <div className="px-5 py-4 text-sm text-zinc-400">Memuat…</div>
          ) : filtered.length === 0 ? (
            <div className="px-5 py-4 text-sm text-zinc-400">Tidak ada transaksi.</div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {filtered.map((t) => (
                <div key={t.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{t.category}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                        <span>{formatDateShort(t.date)}</span>
                        <span className="text-zinc-700">•</span>
                        <span
                          className={
                            t.type === 'income'
                              ? 'rounded-md border border-emerald-900/60 bg-emerald-950/30 px-2 py-0.5 text-[11px] font-semibold text-emerald-200'
                              : 'rounded-md border border-red-900/60 bg-red-950/30 px-2 py-0.5 text-[11px] font-semibold text-red-200'
                          }
                        >
                          {t.type === 'income' ? 'Income' : 'Expense'}
                        </span>
                      </div>
                    </div>
                    <div
                      className={
                        t.type === 'income'
                          ? 'shrink-0 text-sm font-semibold text-emerald-300'
                          : 'shrink-0 text-sm font-semibold text-red-300'
                      }
                    >
                      {t.type === 'income' ? '+' : '-'}
                      {formatIDR(t.amount)}
                    </div>
                  </div>

                  {t.note ? (
                    <div className="mt-2 text-sm text-zinc-400">{t.note}</div>
                  ) : null}

                  <div className="mt-3 flex flex-wrap justify-end gap-2">
                    <Button size="sm" variant="secondary" onClick={() => openEditor(t, 'edit')}>
                      Edit
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => openEditor(t, 'duplicate')}>
                      <span className="sm:hidden">Dup</span>
                      <span className="hidden sm:inline">Duplikat</span>
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => setPendingDelete(t)}>
                      Hapus
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[720px] table-auto">
            <thead>
              <tr className="text-left text-xs font-semibold text-zinc-400">
                <th className="px-5 py-3">Tanggal</th>
                <th className="px-5 py-3">Tipe</th>
                <th className="px-5 py-3">Kategori</th>
                <th className="px-5 py-3">Note</th>
                <th className="px-5 py-3 text-right">Amount</th>
                <th className="px-5 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {loading ? (
                <tr>
                  <td className="px-5 py-4 text-sm text-zinc-400" colSpan={6}>
                    Memuat…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td className="px-5 py-4 text-sm text-zinc-400" colSpan={6}>
                    Tidak ada transaksi.
                  </td>
                </tr>
              ) : (
                filtered.map((t) => (
                  <tr key={t.id} className="text-sm text-zinc-200 hover:bg-zinc-950/40">
                    <td className="px-5 py-4 text-zinc-300">{formatDateShort(t.date)}</td>
                    <td className="px-5 py-4">
                      <span
                        className={
                          t.type === 'income'
                            ? 'rounded-md border border-emerald-900/60 bg-emerald-950/30 px-2 py-1 text-xs font-semibold text-emerald-200'
                            : 'rounded-md border border-red-900/60 bg-red-950/30 px-2 py-1 text-xs font-semibold text-red-200'
                        }
                      >
                        {t.type === 'income' ? 'Income' : 'Expense'}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-semibold">{t.category}</td>
                    <td className="px-5 py-4 text-zinc-400">{t.note || '—'}</td>
                    <td className="px-5 py-4 text-right font-semibold">
                      <span
                        className={
                          t.type === 'income' ? 'text-emerald-300' : 'text-red-300'
                        }
                      >
                        {t.type === 'income' ? '+' : '-'}
                        {formatIDR(t.amount)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="secondary" onClick={() => openEditor(t, 'edit')}>
                          Edit
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => openEditor(t, 'duplicate')}>
                          Duplikat
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => setPendingDelete(t)}>
                          Hapus
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Hapus transaksi?"
        description={
          pendingDelete
            ? `Transaksi “${pendingDelete.category}” (${formatDateShort(
                pendingDelete.date,
              )}) sebesar ${formatIDR(pendingDelete.amount)} akan dihapus permanen.`
            : 'Transaksi akan dihapus permanen.'
        }
        confirmText="Hapus"
        confirmVariant="danger"
        confirming={deleting}
        onConfirm={onConfirmDelete}
        onClose={() => {
          if (!deleting) setPendingDelete(null);
        }}
      />
    </div>
  );
}
