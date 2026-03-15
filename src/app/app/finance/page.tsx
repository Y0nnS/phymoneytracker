'use client';

export const dynamic = 'force-dynamic';

import React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { CumulativeCashflowChart } from '@/components/charts/CumulativeCashflowChart';
import { ExpenseByCategoryChart } from '@/components/charts/ExpenseByCategoryChart';
import { TransactionModal } from '@/components/transactions/TransactionModal';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Input } from '@/components/ui/Input';
import { Progress } from '@/components/ui/Progress';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import { useBudget } from '@/hooks/useBudget';
import { useTransactions } from '@/hooks/useTransactions';
import { formatDateShort, monthIdFromDate } from '@/lib/date';
import { setBudgetForMonth } from '@/lib/firebase/budgets';
import { deleteTransaction } from '@/lib/firebase/transactions';
import {
  dateKeyLocal,
  expenseBreakdownByCategory,
  sumByType,
  transactionsForMonth,
} from '@/lib/insights';
import { formatIDR } from '@/lib/money';
import type { Transaction, TransactionType } from '@/lib/types';

function csvEscape(value: string) {
  const safe = value.replaceAll('"', '""');
  return `"${safe}"`;
}

const CASHFLOW_RANGES = [
  { id: '7d', label: '7d' },
  { id: '1m', label: '1 bulan' },
  { id: '3m', label: '3 bulan' },
  { id: '6m', label: '6 bulan' },
] as const;

type CashflowRange = (typeof CASHFLOW_RANGES)[number]['id'];

function FinanceCell({
  title,
  value,
  subtitle,
  toneClass = 'text-zinc-100',
}: {
  title: string;
  value: string;
  subtitle: string;
  toneClass?: string;
}) {
  return (
    <div className="app-strip-cell">
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 sm:text-xs">{title}</div>
      <div className={`mt-2 text-xl font-semibold sm:text-2xl ${toneClass}`}>{value}</div>
      <div className="mt-1 text-[12px] text-zinc-400 sm:text-sm">{subtitle}</div>
    </div>
  );
}

export default function FinancePage() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const toast = useToast();
  const [monthId, setMonthId] = React.useState(() => monthIdFromDate(new Date()));
  const { transactions, loading, error } = useTransactions(user?.uid);
  const { budget, loading: budgetLoading, error: budgetError } = useBudget(user?.uid, monthId);

  const [typeFilter, setTypeFilter] = React.useState<'all' | TransactionType>('all');
  const [query, setQuery] = React.useState('');
  const [amount, setAmount] = React.useState('');
  const [savingBudget, setSavingBudget] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [cashflowRange, setCashflowRange] = React.useState<CashflowRange>('1m');

  const [modalOpen, setModalOpen] = React.useState(false);
  const [modalMode, setModalMode] = React.useState<'create' | 'edit' | 'duplicate'>('create');
  const [defaultType, setDefaultType] = React.useState<TransactionType>('expense');
  const [editingTransaction, setEditingTransaction] = React.useState<Transaction | null>(null);
  const [pendingDelete, setPendingDelete] = React.useState<Transaction | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  React.useEffect(() => {
    if (searchParams.get('compose') === 'transaction') {
      setEditingTransaction(null);
      setModalMode('create');
      setDefaultType('expense');
      setModalOpen(true);
    }
  }, [searchParams]);

  React.useEffect(() => {
    setAmount(budget ? String(budget.amount) : '');
    setSaveError(null);
  }, [budget, monthId]);

  const monthTransactions = React.useMemo(
    () => transactionsForMonth(transactions, monthId),
    [transactions, monthId],
  );

  const filtered = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    return monthTransactions.filter((tx) => {
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
      if (!needle) return true;
      return (
        tx.category.toLowerCase().includes(needle) ||
        tx.note.toLowerCase().includes(needle)
      );
    });
  }, [monthTransactions, typeFilter, query]);

  const income = React.useMemo(() => sumByType(monthTransactions, 'income'), [monthTransactions]);
  const expense = React.useMemo(() => sumByType(monthTransactions, 'expense'), [monthTransactions]);
  const net = income - expense;
  const budgetAmount = budget?.amount ?? null;
  const budgetRatio =
    budgetAmount && budgetAmount > 0 ? Math.min(1, expense / budgetAmount) : null;
  const budgetTone =
    budgetAmount === null
      ? 'neutral'
      : expense <= budgetAmount
        ? expense / budgetAmount <= 0.8
          ? 'good'
          : 'warn'
        : 'danger';

  const categoryBreakdown = React.useMemo(
    () => expenseBreakdownByCategory(monthTransactions),
    [monthTransactions],
  );
  const topCategory = categoryBreakdown.items[0]?.category ?? '—';

  function clearComposeParam() {
    if (searchParams.get('compose')) router.replace(pathname);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingTransaction(null);
    clearComposeParam();
  }

  function openCreate(type: TransactionType) {
    setEditingTransaction(null);
    setModalMode('create');
    setDefaultType(type);
    setModalOpen(true);
  }

  function openEdit(transaction: Transaction, mode: 'edit' | 'duplicate') {
    setEditingTransaction(transaction);
    setModalMode(mode);
    setDefaultType(transaction.type);
    setModalOpen(true);
  }

  async function onSaveBudget(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount < 0) {
      setSaveError('Budget harus angka >= 0.');
      return;
    }

    setSavingBudget(true);
    setSaveError(null);
    try {
      await setBudgetForMonth(user.uid, monthId, Math.round(numericAmount));
      toast.success('Budget tersimpan.');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Gagal menyimpan budget.');
      toast.danger('Gagal menyimpan budget.');
    } finally {
      setSavingBudget(false);
    }
  }

  async function onDeleteTransaction() {
    if (!user || !pendingDelete) return;
    setDeleting(true);
    try {
      await deleteTransaction(user.uid, pendingDelete.id);
      toast.success('Transaksi dihapus.');
      setPendingDelete(null);
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : 'Gagal menghapus transaksi.');
    } finally {
      setDeleting(false);
    }
  }

  function onExportCsv() {
    const rows: string[][] = [
      ['date', 'type', 'category', 'note', 'amount'],
      ...filtered.map((transaction) => [
        dateKeyLocal(transaction.date),
        transaction.type,
        transaction.category,
        transaction.note,
        String(transaction.amount),
      ]),
    ];
    const csv = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `finance-${monthId}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-[13px] text-zinc-400 sm:text-sm">Money module</div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Finance</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => openCreate('income')}>
              + Income
            </Button>
            <Button onClick={() => openCreate('expense')}>+ Expense</Button>
          </div>
        </div>

        <section className="app-surface">
          <div className="grid gap-3 px-4 py-4 sm:px-5 md:grid-cols-[180px_180px_180px_1fr]">
            <Input
              label="Bulan"
              type="month"
              value={monthId}
              onChange={(e) => setMonthId(e.target.value)}
            />
            <Select
              label="Tipe"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as 'all' | TransactionType)}>
              <option value="all">Semua</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </Select>
            <div className="flex items-end">
              <Button variant="secondary" onClick={onExportCsv} className="w-full">
                Export CSV
              </Button>
            </div>
            <Input
              label="Cari"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Kategori atau note…"
            />
          </div>
        </section>
      </div>

      {error ? <Alert variant="danger">{error}</Alert> : null}
      {budgetError ? <Alert variant="danger">{budgetError}</Alert> : null}
      {saveError ? <Alert variant="danger">{saveError}</Alert> : null}

      <section className="app-strip">
        <div className="app-strip-grid md:grid-cols-4">
          <FinanceCell
            title="Income"
            value={formatIDR(income)}
            subtitle={`${monthTransactions.length} transaksi`}
            toneClass="text-emerald-200"
          />
          <FinanceCell
            title="Expense"
            value={formatIDR(expense)}
            subtitle={`Top kategori: ${topCategory}`}
            toneClass="text-red-200"
          />
          <FinanceCell
            title="Net"
            value={formatIDR(net)}
            subtitle={monthId}
            toneClass={net >= 0 ? 'text-blue-200' : 'text-amber-200'}
          />
          <div className="app-strip-cell">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 sm:text-xs">Budget</div>
            <div className="mt-2 text-xl font-semibold sm:text-2xl">
              {budgetAmount === null ? 'Belum diset' : formatIDR(budgetAmount)}
            </div>
            <div className="mt-1 text-[12px] text-zinc-400 sm:text-sm">
              {budgetAmount === null ? 'Set budget bulan ini.' : `${Math.round((budgetRatio ?? 0) * 100)}% terpakai`}
            </div>
            {budgetRatio !== null ? (
              <div className="mt-4">
                <Progress value={budgetRatio} tone={budgetTone} />
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,.95fr)]">
        <section className="app-surface overflow-hidden">
          <div className="app-panel-header">
            <div>
              <div className="text-sm font-semibold">Cashflow pengeluaran harian</div>
              <div className="mt-1 text-xs text-zinc-500">
                Naik-turun expense per hari sesuai rentang yang dipilih.
              </div>
            </div>
            <div className="w-full sm:w-[160px]">
              <Select
                aria-label="Pilih rentang cashflow"
                value={cashflowRange}
                onChange={(e) => setCashflowRange(e.target.value as CashflowRange)}>
                {CASHFLOW_RANGES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="px-5 py-5 sm:px-6">
            <CumulativeCashflowChart
              monthId={monthId}
              transactions={transactions}
              range={cashflowRange}
            />
          </div>
        </section>

        <section className="app-surface overflow-hidden">
          <div className="app-panel-header">
            <div>
              <div className="text-sm font-semibold">Expense by category</div>
              <div className="mt-1 text-xs text-zinc-500">Breakdown expense bulan ini.</div>
            </div>
          </div>
          <div className="px-5 py-5 sm:px-6">
            <ExpenseByCategoryChart monthTransactions={monthTransactions} />
          </div>
        </section>
      </div>

      <section className="app-surface overflow-hidden">
        <form onSubmit={onSaveBudget} className="flex flex-col gap-4">
          <div className="app-panel-header">
            <div>
              <div className="text-sm font-semibold">Budget control</div>
              <div className="mt-1 text-xs text-zinc-500">
                {budgetLoading ? 'Memuat budget…' : 'Atur batas pengeluaran bulanan.'}
              </div>
            </div>
            <div className="text-left text-xs text-zinc-500 sm:text-right">
              {budgetAmount === null
                ? 'Belum ada budget'
                : `${Math.round((budgetRatio ?? 0) * 100)}% terpakai`}
            </div>
          </div>
          <div className="grid gap-4 px-4 pb-4 sm:px-6 sm:pb-5">
            <div className="grid gap-4 md:grid-cols-[1fr_auto]">
              <Input
                label="Budget (IDR)"
                type="number"
                min={0}
                step={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="3000000"
                required
              />
              <div className="flex items-end">
                <Button type="submit" disabled={savingBudget}>
                  {savingBudget ? 'Menyimpan…' : 'Simpan budget'}
                </Button>
              </div>
            </div>
            <div className="app-strip overflow-hidden">
              <div className="app-strip-grid md:grid-cols-3">
                <div className="app-strip-cell">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 sm:text-xs">Terpakai</div>
                  <div className="mt-2 text-base font-semibold sm:text-lg">{formatIDR(expense)}</div>
                </div>
                <div className="app-strip-cell">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 sm:text-xs">Sisa</div>
                  <div className="mt-2 text-base font-semibold sm:text-lg">
                    {budgetAmount === null ? '—' : formatIDR(budgetAmount - expense)}
                  </div>
                </div>
                <div className="app-strip-cell">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 sm:text-xs">Status</div>
                  <div className="mt-2 text-base font-semibold sm:text-lg">
                    {budgetAmount === null ? 'Draft' : expense <= budgetAmount ? 'Aman' : 'Over'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </section>

      <section className="app-surface overflow-hidden">
        <div className="app-panel-header">
          <div>
            <div className="text-sm font-semibold">Transactions</div>
            <div className="mt-1 text-xs text-zinc-500">
              {filtered.length} transaksi untuk {monthId}
            </div>
          </div>
          <div className="text-xs text-zinc-500">
            {typeFilter === 'all' ? 'Semua tipe' : typeFilter}
          </div>
        </div>

        <div className="md:hidden">
          {loading ? (
            <div className="px-5 py-4 text-sm text-zinc-400">Memuat…</div>
          ) : filtered.length === 0 ? (
            <div className="px-5 py-4 text-sm text-zinc-400">Tidak ada transaksi.</div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {filtered.map((transaction) => (
                <div key={transaction.id} className="px-4 py-3.5 sm:px-5 sm:py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="break-words text-[13px] font-semibold text-zinc-100 sm:text-sm">{transaction.category}</div>
                      <div className="mt-1 text-[11px] text-zinc-500 sm:text-xs">
                        {formatDateShort(transaction.date)} • {transaction.type}
                      </div>
                    </div>
                    <div
                      className={
                        transaction.type === 'income'
                          ? 'shrink-0 text-[13px] font-semibold text-emerald-300 sm:text-sm'
                          : 'shrink-0 text-[13px] font-semibold text-red-300 sm:text-sm'
                      }>
                      {transaction.type === 'income' ? '+' : '-'}
                      {formatIDR(transaction.amount)}
                    </div>
                  </div>
                  {transaction.note ? (
                    <div className="mt-2 break-words text-[12px] text-zinc-400 sm:text-sm">{transaction.note}</div>
                  ) : null}
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <Button size="sm" variant="secondary" onClick={() => openEdit(transaction, 'edit')}>
                      Edit
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(transaction, 'duplicate')}>
                      Dup
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => setPendingDelete(transaction)}>
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
              <tr className="text-left text-xs font-semibold text-zinc-500">
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
                  <td colSpan={6} className="px-5 py-4 text-sm text-zinc-400">
                    Memuat…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-4 text-sm text-zinc-400">
                    Tidak ada transaksi.
                  </td>
                </tr>
              ) : (
                filtered.map((transaction) => (
                  <tr key={transaction.id} className="text-sm text-zinc-200 hover:bg-zinc-950/40">
                    <td className="px-5 py-4 text-zinc-300">{formatDateShort(transaction.date)}</td>
                    <td className="px-5 py-4">
                      <span
                        className={
                          transaction.type === 'income'
                            ? 'rounded-md border border-emerald-900/60 bg-emerald-950/30 px-2 py-1 text-xs font-semibold text-emerald-200'
                            : 'rounded-md border border-red-900/60 bg-red-950/30 px-2 py-1 text-xs font-semibold text-red-200'
                        }>
                        {transaction.type}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-semibold">{transaction.category}</td>
                    <td className="px-5 py-4 text-zinc-400">{transaction.note || '—'}</td>
                    <td className="px-5 py-4 text-right font-semibold">
                      <span
                        className={
                          transaction.type === 'income' ? 'text-emerald-300' : 'text-red-300'
                        }>
                        {transaction.type === 'income' ? '+' : '-'}
                        {formatIDR(transaction.amount)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="secondary" onClick={() => openEdit(transaction, 'edit')}>
                          Edit
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => openEdit(transaction, 'duplicate')}>
                          Duplikat
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => setPendingDelete(transaction)}>
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
      </section>

      {user ? (
        <TransactionModal
          uid={user.uid}
          open={modalOpen}
          onClose={closeModal}
          mode={modalMode}
          defaultType={defaultType}
          initialTransaction={editingTransaction}
        />
      ) : null}

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
        onConfirm={onDeleteTransaction}
        onClose={() => {
          if (!deleting) setPendingDelete(null);
        }}
      />
    </div>
  );
}
