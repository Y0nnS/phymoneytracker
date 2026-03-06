'use client';

import Link from 'next/link';
import React from 'react';
import { ExpenseByCategoryChart } from '@/components/charts/ExpenseByCategoryChart';
import { MonthlyNetChart } from '@/components/charts/MonthlyNetChart';
import { Alert } from '@/components/ui/Alert';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { formatDateShort, monthIdFromDate } from '@/lib/date';
import { fetchTransactions } from '@/lib/firebase/transactions';
import {
  expenseBreakdownByCategory,
  lastNMonthIds,
  monthIdLabel,
  monthlyTotals,
  parseMonthId,
  sumByType,
  transactionsForMonth,
} from '@/lib/insights';
import { formatIDR } from '@/lib/money';
import type { Transaction } from '@/lib/types';

function monthStart(monthId: string) {
  const parsed = parseMonthId(monthId);
  if (!parsed) return new Date();
  return new Date(parsed.year, parsed.month - 1, 1);
}

function monthEnd(monthId: string) {
  const parsed = parseMonthId(monthId);
  if (!parsed) return new Date();
  return new Date(parsed.year, parsed.month, 0, 23, 59, 59, 999);
}

function getPublicUid() {
  const uid = process.env.NEXT_PUBLIC_PUBLIC_DASHBOARD_UID;
  return typeof uid === 'string' && uid.trim().length > 0 ? uid.trim() : null;
}

function StatCard({
  title,
  value,
  tone = 'neutral',
  subtitle,
}: {
  title: string;
  value: string;
  subtitle?: string;
  tone?: 'neutral' | 'good' | 'danger';
}) {
  const toneClass =
    tone === 'good'
      ? 'text-emerald-300'
      : tone === 'danger'
        ? 'text-red-300'
        : 'text-zinc-100';

  return (
    <Card className="p-4 sm:p-5">
      <div className="text-xs font-semibold text-zinc-400">{title}</div>
      <div className={`mt-1.5 text-xl font-semibold tracking-tight sm:mt-2 sm:text-2xl ${toneClass}`}>
        {value}
      </div>
      {subtitle ? <div className="mt-1 text-xs text-zinc-500">{subtitle}</div> : null}
    </Card>
  );
}

export function PublicDashboardPreview() {
  const publicUid = React.useMemo(() => getPublicUid(), []);
  const baseMonthId = React.useMemo(() => monthIdFromDate(new Date()), []);

  const monthOptions = React.useMemo(() => {
    const optionsCount = 6;
    return lastNMonthIds(baseMonthId, optionsCount).slice().reverse();
  }, [baseMonthId]);

  const [monthId, setMonthId] = React.useState(() => baseMonthId);
  const [trendRange, setTrendRange] = React.useState(1);
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!publicUid) {
      setTransactions([]);
      setError(null);
      setLoading(false);
      return;
    }

    const monthsBack = 12;
    const start = monthStart(baseMonthId);
    const startDate = new Date(start.getFullYear(), start.getMonth() - (monthsBack - 1), 1);
    const endDate = monthEnd(baseMonthId);

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchTransactions(publicUid, { startDate, endDate, limitCount: 1200 })
      .then((next) => {
        if (cancelled) return;
        setTransactions(next);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : 'Gagal memuat recap transaksi publik.';
        setError(message);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [publicUid, baseMonthId]);

  React.useEffect(() => {
    if (monthOptions.includes(monthId)) return;
    setMonthId(baseMonthId);
  }, [monthOptions, monthId, baseMonthId]);

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

  const categoryBreakdown = React.useMemo(
    () => expenseBreakdownByCategory(monthTransactions),
    [monthTransactions],
  );
  const topCategory = categoryBreakdown.items[0]?.category ?? '—';

  const recapMonthIds = React.useMemo(() => lastNMonthIds(monthId, trendRange), [monthId, trendRange]);
  const recapTotals = React.useMemo(
    () => monthlyTotals(transactions, recapMonthIds),
    [transactions, recapMonthIds],
  );

  const recentTransactions = React.useMemo(() => {
    return monthTransactions
      .slice()
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 10);
  }, [monthTransactions]);

  if (!publicUid) {
    return (
      <Card className="p-6">
        <div className="text-sm font-semibold">Recap transaksi (publik)</div>
        <div className="mt-2 text-sm text-zinc-400">
          Belum aktif. Isi env <span className="font-mono">NEXT_PUBLIC_PUBLIC_DASHBOARD_UID</span>{' '}
          dan buat dokumen <span className="font-mono">publicProfiles/&#123;uid&#125;</span> dengan{' '}
          <span className="font-mono">&#123; enabled: true &#125;</span>.
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div>
          <div className="text-xs font-medium text-zinc-400 sm:text-sm">Read-only</div>
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Recap transaksi publik</h2>
          <p className="mt-1 max-w-2xl text-xs text-zinc-400 sm:text-sm">
            Ringkasan pemasukan & pengeluaran beberapa bulan terakhir.
          </p>
        </div>
        <div className="flex items-end gap-3">
          <Select
            label="Bulan"
            value={monthId}
            onChange={(e) => setMonthId(e.target.value)}
            className="w-full sm:w-[200px]">
            {monthOptions.map((m) => (
              <option key={m} value={m}>
                {monthIdLabel(m)}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {error ? <Alert variant="danger">{error}</Alert> : null}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          title="Income"
          value={loading ? '—' : formatIDR(income)}
          tone="good"
          subtitle={`${monthTransactions.length} transaksi • ${monthId}`}
        />
        <StatCard
          title="Expense"
          value={loading ? '—' : formatIDR(expense)}
          tone="danger"
          subtitle={`Top kategori: ${topCategory}`}
        />
        <StatCard
          title="Net"
          value={loading ? '—' : formatIDR(net)}
          tone={net >= 0 ? 'good' : 'danger'}
          subtitle="Income - Expense"
        />
        <StatCard
          title="Public profile"
          value="Read-only"
          subtitle=""
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="min-w-0 lg:col-span-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Trend net</div>
              <div className="mt-1 text-xs text-zinc-500">
                Net (income - expense) untuk {trendRange} bulan terakhir sampai {monthId}.
              </div>
            </div>
            <Select
              label="Rentang"
              value={String(trendRange)}
              onChange={(e) => setTrendRange(Number(e.target.value))}
              className="w-28">
              <option value="1">1 bulan</option>
              <option value="3">3 bulan</option>
              <option value="6">6 bulan</option>
              <option value="12">12 bulan</option>
            </Select>
          </div>

          <div className="mt-5 overflow-hidden">
            {loading ? (
              <div className="h-64 w-full animate-pulse rounded-xl bg-zinc-950/50" />
            ) : (
              <MonthlyNetChart monthId={monthId} transactions={transactions} rangeMonths={trendRange} />
            )}
          </div>

          <div className="mt-6 overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950/30">
            <table className="w-full min-w-[360px] table-auto">
              <thead>
                <tr className="text-left text-xs font-semibold text-zinc-400">
                  <th className="px-4 py-3">Bulan</th>
                  <th className="px-4 py-3 text-right">Income</th>
                  <th className="px-4 py-3 text-right">Expense</th>
                  <th className="px-4 py-3 text-right">Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {loading ? (
                  <tr>
                    <td className="px-4 py-3 text-sm text-zinc-400" colSpan={4}>
                      Memuat…
                    </td>
                  </tr>
                ) : (
                  recapTotals.map((row) => (
                    <tr key={row.monthId} className="text-xs text-zinc-200 sm:text-sm">
                      <td className="px-3 py-2.5 text-zinc-300 sm:px-4 sm:py-3">{monthIdLabel(row.monthId)}</td>
                      <td className="px-3 py-2.5 text-right font-semibold text-emerald-300 sm:px-4 sm:py-3">
                        +{formatIDR(row.income)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold text-red-300 sm:px-4 sm:py-3">
                        -{formatIDR(row.expense)}
                      </td>
                      <td
                        className={
                          row.net >= 0
                            ? 'px-3 py-2.5 text-right font-semibold text-emerald-200 sm:px-4 sm:py-3'
                            : 'px-3 py-2.5 text-right font-semibold text-red-200 sm:px-4 sm:py-3'
                        }
                      >
                        {formatIDR(row.net)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="min-w-0 lg:col-span-5">
          <div className="text-sm font-semibold">Expense by category</div>
          <div className="mt-1 text-xs text-zinc-500">Breakdown expense bulan {monthId}.</div>
          <div className="mt-5 overflow-hidden">
            {loading ? (
              <div className="h-56 w-full animate-pulse rounded-xl bg-zinc-950/50" />
            ) : (
              <ExpenseByCategoryChart monthTransactions={monthTransactions} />
            )}
          </div>
        </Card>
      </div>

      <Card className="p-0">
        <div className="flex items-center justify-between gap-3 border-b border-zinc-800 px-4 py-3 sm:px-5 sm:py-4">
          <div>
            <div className="text-sm font-semibold">Transaksi terbaru</div>
            <div className="text-xs text-zinc-500">
              {monthId} • {monthTransactions.length} transaksi
            </div>
          </div>
          <Link
            href="/app/transactions"
            className="shrink-0 rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-semibold text-zinc-100 hover:bg-zinc-900"
          >
            Buka dashboard
          </Link>
        </div>

        <div className="divide-y divide-zinc-800">
          {loading ? (
            <div className="px-5 py-4 text-sm text-zinc-400">Memuat…</div>
          ) : recentTransactions.length === 0 ? (
            <div className="px-5 py-4 text-sm text-zinc-400">Belum ada transaksi.</div>
          ) : (
            recentTransactions.map((t) => (
              <div
                key={t.id}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-zinc-950/40 sm:gap-4 sm:px-5 sm:py-4"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">
                    {t.category}
                    {t.note ? (
                      <span className="font-normal text-zinc-400"> • {t.note}</span>
                    ) : null}
                  </div>
                  <div className="text-xs text-zinc-500">
                    {formatDateShort(t.date)} • {t.type === 'income' ? 'Income' : 'Expense'}
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
            ))
          )}
        </div>
      </Card>
    </div>
  );
}

