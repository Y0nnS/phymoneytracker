'use client';

import Link from 'next/link';
import React from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { CumulativeCashflowChart } from '@/components/charts/CumulativeCashflowChart';
import { ExpenseByCategoryChart } from '@/components/charts/ExpenseByCategoryChart';
import { MonthlyNetChart } from '@/components/charts/MonthlyNetChart';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Progress } from '@/components/ui/Progress';
import { useTransactions } from '@/hooks/useTransactions';
import { useBudget } from '@/hooks/useBudget';
import { formatIDR } from '@/lib/money';
import { formatDateShort, monthIdFromDate } from '@/lib/date';
import {
  daysInMonthFromMonthId,
  expenseBreakdownByCategory,
  sumByType,
  transactionsForMonth,
} from '@/lib/insights';

export default function DashboardPage() {
  const { user } = useAuth();
  const [monthId, setMonthId] = React.useState(() => monthIdFromDate(new Date()));
  const { transactions, loading: txLoading, error: txError } = useTransactions(
    user?.uid,
  );
  const { budget, loading: budgetLoading } = useBudget(user?.uid, monthId);

  const monthTransactions = React.useMemo(() => {
    return transactionsForMonth(transactions, monthId);
  }, [transactions, monthId]);

  const income = React.useMemo(
    () => sumByType(monthTransactions, 'income'),
    [monthTransactions],
  );

  const expense = React.useMemo(
    () => sumByType(monthTransactions, 'expense'),
    [monthTransactions],
  );

  const net = income - expense;
  const budgetAmount = budget?.amount ?? null;
  const remainingBudget = budgetAmount === null ? null : budgetAmount - expense;
  const budgetRatio =
    budgetAmount && budgetAmount > 0 ? Math.min(1, expense / budgetAmount) : null;
  const budgetTone =
    budgetAmount === null
      ? 'neutral'
      : expense <= budgetAmount
        ? expense / (budgetAmount || 1) <= 0.8
          ? 'good'
          : 'warn'
        : 'danger';

  const daysInMonth = React.useMemo(() => daysInMonthFromMonthId(monthId), [monthId]);
  const avgDailyExpense = daysInMonth > 0 ? Math.round(expense / daysInMonth) : 0;

  const categoryBreakdown = React.useMemo(
    () => expenseBreakdownByCategory(monthTransactions),
    [monthTransactions],
  );
  const topCategory = categoryBreakdown.items[0]?.category ?? '—';

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-sm text-zinc-400">Overview</div>
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-zinc-400">Bulan</span>
            <input
              type="month"
              value={monthId}
              onChange={(e) => setMonthId(e.target.value)}
              className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </label>
          <div className="flex items-center gap-2">
            <Button
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent('moneytracker:add', { detail: { type: 'expense' } }),
                )
              }
              className="h-10">
              Tambah expense
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent('moneytracker:add', { detail: { type: 'income' } }),
                )
              }
              className="h-10 border-emerald-900 bg-emerald-950/40 text-emerald-100 hover:bg-emerald-950/70 focus:ring-emerald-500/30"
            >
              Tambah income
            </Button>
          </div>
        </div>
      </div>

      {txError ? <div className="text-sm text-zinc-400">{txError}</div> : null}

      <div className="grid gap-4 lg:grid-cols-4">
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-zinc-400">Income</div>
              <div className="mt-2 text-2xl font-semibold text-emerald-200">
                {formatIDR(income)}
              </div>
            </div>
            <div className="rounded-xl border border-emerald-900/60 bg-emerald-950/40 px-3 py-2 text-xs font-semibold text-emerald-200">
              Bulan ini
            </div>
          </div>
          <div className="mt-2 text-xs text-zinc-500">
            {monthTransactions.length} transaksi • fokus konsisten
          </div>
        </Card>
        <Card>
          <div className="text-xs font-semibold text-zinc-400">Expense</div>
          <div className="mt-2 text-2xl font-semibold text-red-200">
            {formatIDR(expense)}
          </div>
          <div className="mt-2 text-xs text-zinc-500">
            Rata-rata {formatIDR(avgDailyExpense)}/hari • top: {topCategory}
          </div>
        </Card>
        <Card>
          <div className="text-xs font-semibold text-zinc-400">Net</div>
          <div
            className={
              net >= 0
                ? 'mt-2 text-2xl font-semibold text-blue-200'
                : 'mt-2 text-2xl font-semibold text-amber-200'
            }>
            {formatIDR(net)}
          </div>
          <div className="mt-2 text-xs text-zinc-500">
            {income > 0
              ? `Saving rate: ${Math.round((net / income) * 100)}%`
              : 'Tambahkan income untuk hitung saving rate'}
          </div>
        </Card>
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-zinc-400">
                Budget Sisa
              </div>
              <div className="mt-2 text-2xl font-semibold">
                {budgetAmount === null ? '—' : formatIDR(remainingBudget ?? 0)}
              </div>
            </div>
            <Link
              href="/app/budget"
              className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-semibold text-zinc-100 hover:bg-zinc-900">
              Atur
            </Link>
          </div>
          <div className="mt-1 text-xs text-zinc-500">
            {budgetLoading
              ? 'Memuat…'
              : budgetAmount === null
                ? 'Belum diset'
                : `Total budget: ${formatIDR(budgetAmount)}`}
          </div>
          {budgetRatio !== null ? (
            <div className="mt-3">
              <Progress value={budgetRatio} tone={budgetTone} />
              <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
                <span>Terpakai: {Math.round(budgetRatio * 100)}%</span>
                <span>
                  {expense <= (budgetAmount || 0) ? 'Aman' : 'Melebihi budget'}
                </span>
              </div>
            </div>
          ) : (
            <div className="mt-3 text-xs text-zinc-500">
              Set budget untuk lihat progress.
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold">Cashflow (kumulatif)</div>
              <div className="mt-1 text-xs text-zinc-500">
                Income, expense, dan net kumulatif per hari di bulan {monthId}.
              </div>
            </div>
            <Link
              href="/app/transactions"
              className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-semibold text-zinc-100 hover:bg-zinc-900">
              Detail transaksi
            </Link>
          </div>
          <div className="mt-5">
            <CumulativeCashflowChart
              monthId={monthId}
              monthTransactions={monthTransactions}/>
          </div>
        </Card>

        <Card className="lg:col-span-4">
          <div className="text-sm font-semibold">Expense by category</div>
          <div className="mt-1 text-xs text-zinc-500">
            Breakdown expense bulan {monthId} (top kategori).
          </div>
          <div className="mt-5">
            <ExpenseByCategoryChart monthTransactions={monthTransactions} />
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-5">
          <div className="text-sm font-semibold">Trend net 6 bulan</div>
          <div className="mt-1 text-xs text-zinc-500">
            Net (income - expense) untuk 6 bulan terakhir.
          </div>
          <div className="mt-5">
            <MonthlyNetChart monthId={monthId} transactions={transactions} />
          </div>
        </Card>

        <Card className="lg:col-span-7 p-0">
          <div className="flex items-center justify-between gap-4 border-b border-zinc-800 px-5 py-4">
            <div>
              <div className="text-sm font-semibold">Transaksi terbaru</div>
              <div className="text-xs text-zinc-500">
                {monthId} • {monthTransactions.length} transaksi
              </div>
            </div>
            <Link
              href="/app/transactions"
              className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-semibold text-zinc-100 hover:bg-zinc-900">
              Lihat semua
            </Link>
          </div>

          <div className="divide-y divide-zinc-800">
            {txLoading ? (
              <div className="px-5 py-4 text-sm text-zinc-400">Memuat…</div>
            ) : monthTransactions.length === 0 ? (
              <div className="px-5 py-4 text-sm text-zinc-400">
                Belum ada transaksi di bulan ini. Klik “Tambah transaksi” untuk mulai.
              </div>
            ) : (
              monthTransactions.slice(0, 8).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() =>
                    window.dispatchEvent(
                      new CustomEvent('moneytracker:edit', {
                        detail: { transaction: t, mode: 'edit' },
                      }),
                    )
                  }
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-zinc-950/40">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">
                      {t.category}
                      {t.note ? (
                        <span className="font-normal text-zinc-400">
                          {' '}
                          • {t.note}
                        </span>
                      ) : null}
                    </div>
                    <div className="text-xs text-zinc-500">
                      {formatDateShort(t.date)} •{' '}
                      {t.type === 'income' ? 'Income' : 'Expense'}
                    </div>
                  </div>
                  <div
                    className={
                      t.type === 'income'
                        ? 'text-sm font-semibold text-emerald-300'
                        : 'text-sm font-semibold text-red-300'
                    }>
                    {t.type === 'income' ? '+' : '-'}
                    {formatIDR(t.amount)}
                  </div>
                </button>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
