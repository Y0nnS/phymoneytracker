'use client';

export const dynamic = 'force-dynamic';

import React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { CumulativeCashflowChart } from '@/components/charts/CumulativeCashflowChart';
import { ExpenseByCategoryChart } from '@/components/charts/ExpenseByCategoryChart';
import { MonthlyNetChart } from '@/components/charts/MonthlyNetChart';
import { TransactionModal } from '@/components/transactions/TransactionModal';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Input } from '@/components/ui/Input';

import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';

import { useTransactions } from '@/hooks/useTransactions';
import { dateToISO, formatDateShort, monthIdFromDate } from '@/lib/date';
import {
  FINANCE_ACCOUNT_OPTIONS,
  financeAccountLabel,
} from '@/lib/financeAccounts';

import { deleteTransaction } from '@/lib/firebase/transactions';
import {
  accountBalances as summarizeAccountBalances,
  balanceByAccount,
  dateKeyLocal,
  monthIdLabel,
  sortTransactionsNewestFirst,
  sumByType,
  transactionTouchesAccount,
  transactionsForMonth,
} from '@/lib/insights';
import { formatIDR, formatIDRCompact } from '@/lib/money';
import type { FinanceAccount, Transaction, TransactionType } from '@/lib/types';

function csvEscape(value: string) {
  const safe = value.replaceAll('"', '""');
  return `"${safe}"`;
}

function formatSignedCompact(amount: number) {
  return amount > 0 ? `+${formatIDRCompact(amount)}` : formatIDRCompact(amount);
}

function transactionSingleAccountLabel(account?: FinanceAccount) {
  return account ? financeAccountLabel(account) : 'No account';
}

function transactionAccountSummary(transaction: Transaction) {
  if (transaction.type !== 'transfer') return transactionSingleAccountLabel(transaction.account);
  return `${transactionSingleAccountLabel(transaction.account)} -> ${transactionSingleAccountLabel(
    transaction.toAccount,
  )}`;
}

function transactionTypeBadgeClass(type: TransactionType) {
  if (type === 'income') {
    return 'rounded-md border border-emerald-900/60 bg-emerald-950/30 px-2 py-1 text-xs font-semibold text-emerald-200';
  }
  if (type === 'expense') {
    return 'rounded-md border border-red-900/60 bg-red-950/30 px-2 py-1 text-xs font-semibold text-red-200';
  }
  return 'rounded-md border border-sky-900/60 bg-sky-950/30 px-2 py-1 text-xs font-semibold text-sky-200';
}

function transactionAmountToneClass(type: TransactionType) {
  if (type === 'income') return 'text-emerald-300';
  if (type === 'expense') return 'text-red-300';
  return 'text-sky-200';
}

function transactionAmountDisplay(transaction: Transaction) {
  if (transaction.type === 'income') return `+${formatIDR(transaction.amount)}`;
  if (transaction.type === 'expense') return `-${formatIDR(transaction.amount)}`;
  return formatIDR(transaction.amount);
}

function defaultExpenseDateRange(monthId: string) {
  const [yearRaw, monthRaw] = monthId.split('-');
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    const today = new Date();
    const iso = dateToISO(today);
    return { start: iso, end: iso };
  }

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  return {
    start: dateToISO(start),
    end: dateToISO(end),
  };
}

const CASHFLOW_RANGES = [
  { id: '7d', label: '7 days' },
  { id: '1m', label: '1 month' },
  { id: '3m', label: '3 months' },
  { id: '6m', label: '6 months' },
] as const;

type CashflowRange = (typeof CASHFLOW_RANGES)[number]['id'];

const TRANSACTION_PAGE_SIZE = 10;

function financeAccountSurfaceClass(account: FinanceAccount) {
  if (account === 'cash') {
    return 'border-amber-400/10 bg-[linear-gradient(180deg,rgba(18,18,20,0.98),rgba(8,8,9,0.98))]';
  }
  if (account === 'bank') {
    return 'border-sky-400/10 bg-[linear-gradient(180deg,rgba(18,18,20,0.98),rgba(8,8,9,0.98))]';
  }
  if (account === 'ewallet') {
    return 'border-emerald-400/10 bg-[linear-gradient(180deg,rgba(18,18,20,0.98),rgba(8,8,9,0.98))]';
  }
  return 'border-violet-400/10 bg-[linear-gradient(180deg,rgba(18,18,20,0.98),rgba(8,8,9,0.98))]';
}

function financeAccountBadgeClass(account: FinanceAccount) {
  if (account === 'cash') return 'border-amber-400/15 bg-amber-400/5 text-amber-100';
  if (account === 'bank') return 'border-sky-400/15 bg-sky-400/5 text-sky-100';
  if (account === 'ewallet') return 'border-emerald-400/15 bg-emerald-400/5 text-emerald-100';
  return 'border-violet-400/15 bg-violet-400/5 text-violet-100';
}

function financeAccountToneClass(account: FinanceAccount, balance: number) {
  if (balance < 0) return 'text-red-200';
  if (account === 'cash') return 'text-amber-100';
  if (account === 'bank') return 'text-sky-100';
  if (account === 'ewallet') return 'text-emerald-100';
  return 'text-violet-100';
}

function FinanceCell({
  title,
  value,
  subtitle,
  toneClass = 'text-zinc-100',
  className = '',
}: {
  title: string;
  value: string;
  subtitle: string;
  toneClass?: string;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[24px] border border-white/10 bg-black/40 p-4 shadow-[0_20px_40px_-32px_rgba(0,0,0,0.9)] ${className}`}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400">{title}</div>
      <div className={`mt-3 text-2xl font-semibold tracking-tight sm:text-3xl ${toneClass}`}>{value}</div>
      <div className="mt-2 text-sm text-zinc-300">{subtitle}</div>
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

  const [transactionMonthFilter, setTransactionMonthFilter] = React.useState('all');
  const [transactionTypeFilter, setTransactionTypeFilter] = React.useState<'all' | TransactionType>('all');
  const [transactionAccountFilter, setTransactionAccountFilter] = React.useState<'all' | FinanceAccount>('all');
  const [transactionCategoryFilter, setTransactionCategoryFilter] = React.useState('all');
  const [transactionQuery, setTransactionQuery] = React.useState('');
  const [cashflowRange, setCashflowRange] = React.useState<CashflowRange>('1m');

  const [modalOpen, setModalOpen] = React.useState(false);
  const [modalMode, setModalMode] = React.useState<'create' | 'edit' | 'duplicate'>('create');
  const [defaultType, setDefaultType] = React.useState<TransactionType>('expense');
  const [modalPresetAccount, setModalPresetAccount] = React.useState<FinanceAccount | undefined>(undefined);
  const [editingTransaction, setEditingTransaction] = React.useState<Transaction | null>(null);
  const [pendingDelete, setPendingDelete] = React.useState<Transaction | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [page, setPage] = React.useState(0);
  const [expenseRangeStart, setExpenseRangeStart] = React.useState(
    () => defaultExpenseDateRange(monthIdFromDate(new Date())).start,
  );
  const [expenseRangeEnd, setExpenseRangeEnd] = React.useState(
    () => defaultExpenseDateRange(monthIdFromDate(new Date())).end,
  );

  React.useEffect(() => {
    if (searchParams.get('compose') === 'transaction') {
      setEditingTransaction(null);
      setModalMode('create');
      setDefaultType('expense');
      setModalPresetAccount(undefined);
      setModalOpen(true);
    }
  }, [searchParams]);


  const monthTransactions = React.useMemo(
    () => transactionsForMonth(transactions, monthId),
    [transactions, monthId],
  );
  const balancesByAccount = React.useMemo(
    () => summarizeAccountBalances(transactions),
    [transactions],
  );

  const transactionMonthIds = React.useMemo(
    () =>
      Array.from(new Set(transactions.map((tx) => monthIdFromDate(tx.date)))).sort((a, b) =>
        b.localeCompare(a),
      ),
    [transactions],
  );

  const transactionMonthOptions = React.useMemo(() => {
    const options = new Set<string>(transactionMonthIds);
    options.add(monthId);
    return Array.from(options).sort((a, b) => b.localeCompare(a));
  }, [transactionMonthIds, monthId]);

  const transactionFilterSource = React.useMemo(() => {
    return transactions.filter((tx) => {
      if (
        transactionMonthFilter !== 'all' &&
        monthIdFromDate(tx.date) !== transactionMonthFilter
      ) {
        return false;
      }
      if (transactionTypeFilter !== 'all' && tx.type !== transactionTypeFilter) return false;
      if (transactionAccountFilter !== 'all' && !transactionTouchesAccount(tx, transactionAccountFilter)) {
        return false;
      }
      return true;
    });
  }, [transactionAccountFilter, transactionMonthFilter, transactionTypeFilter, transactions]);

  const transactionCategoryOptions = React.useMemo(
    () =>
      Array.from(
        new Set(
          transactionFilterSource.map((tx) => {
            const category = tx.category.trim();
            return category.length > 0 ? category : 'Other';
          }),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [transactionFilterSource],
  );

  const filteredTransactions = React.useMemo(() => {
    const needle = transactionQuery.trim().toLowerCase();
    return sortTransactionsNewestFirst(
      transactionFilterSource.filter((tx) => {
        const category = tx.category.trim() || 'Other';
        if (transactionCategoryFilter !== 'all' && category !== transactionCategoryFilter) {
          return false;
        }
        if (!needle) return true;
        return (
          category.toLowerCase().includes(needle) ||
          transactionAccountSummary(tx).toLowerCase().includes(needle) ||
          tx.note.toLowerCase().includes(needle)
        );
      }),
    );
  }, [transactionCategoryFilter, transactionFilterSource, transactionQuery]);

  React.useEffect(() => {
    if (transactionMonthFilter === 'all') return;
    if (transactionMonthOptions.includes(transactionMonthFilter)) return;
    setTransactionMonthFilter('all');
  }, [transactionMonthFilter, transactionMonthOptions]);

  React.useEffect(() => {
    if (transactionCategoryFilter === 'all') return;
    if (transactionCategoryOptions.includes(transactionCategoryFilter)) return;
    setTransactionCategoryFilter('all');
  }, [transactionCategoryFilter, transactionCategoryOptions]);

  React.useEffect(() => {
    setPage(0);
  }, [
    transactionAccountFilter,
    transactionCategoryFilter,
    transactionMonthFilter,
    transactionQuery,
    transactionTypeFilter,
  ]);

  const pageCount = Math.max(1, Math.ceil(filteredTransactions.length / TRANSACTION_PAGE_SIZE));
  const pageStart = page * TRANSACTION_PAGE_SIZE;
  const pageEnd = pageStart + TRANSACTION_PAGE_SIZE;
  const pagedTransactions = React.useMemo(
    () => filteredTransactions.slice(pageStart, pageEnd),
    [filteredTransactions, pageEnd, pageStart],
  );

  const income = React.useMemo(() => sumByType(monthTransactions, 'income'), [monthTransactions]);
  const expense = React.useMemo(() => sumByType(monthTransactions, 'expense'), [monthTransactions]);
  const net = React.useMemo(() => balancesByAccount.reduce((sum, item) => sum + item.balance, 0), [balancesByAccount]);
  const monthLabel = monthIdLabel(monthId);
  const expenseRangeAccountLabel =
    transactionAccountFilter === 'all'
      ? 'All accounts'
      : financeAccountLabel(transactionAccountFilter);

  React.useEffect(() => {
    const nextRange = defaultExpenseDateRange(monthId);
    setExpenseRangeStart(nextRange.start);
    setExpenseRangeEnd(nextRange.end);
  }, [monthId]);

  const expenseRangeSummary = React.useMemo(() => {
    const start = new Date(`${expenseRangeStart}T00:00:00`);
    const end = new Date(`${expenseRangeEnd}T00:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return {
        total: 0,
        count: 0,
        startLabel: '—',
        endLabel: '—',
      };
    }

    const rangeStart = start <= end ? new Date(start) : new Date(end);
    const rangeEnd = start <= end ? new Date(end) : new Date(start);
    rangeStart.setHours(0, 0, 0, 0);
    rangeEnd.setHours(23, 59, 59, 999);

    const matches = transactions.filter((transaction) => {
      if (transaction.type !== 'expense') return false;
      if (transaction.date < rangeStart || transaction.date > rangeEnd) return false;
      if (transactionAccountFilter !== 'all' && !transactionTouchesAccount(transaction, transactionAccountFilter)) {
        return false;
      }
      return true;
    });

    return {
      total: matches.reduce((sum, transaction) => sum + transaction.amount, 0),
      count: matches.length,
      startLabel: formatDateShort(rangeStart),
      endLabel: formatDateShort(rangeEnd),
    };
  }, [expenseRangeEnd, expenseRangeStart, transactionAccountFilter, transactions]);

  function clearComposeParam() {
    if (searchParams.get('compose')) router.replace(pathname);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingTransaction(null);
    setModalPresetAccount(undefined);
    clearComposeParam();
  }

  function openCreate(type: TransactionType, options?: { account?: FinanceAccount }) {
    setEditingTransaction(null);
    setModalMode('create');
    setDefaultType(type);
    setModalPresetAccount(options?.account);
    setModalOpen(true);
  }

  function openEdit(transaction: Transaction, mode: 'edit' | 'duplicate') {
    setEditingTransaction(transaction);
    setModalMode(mode);
    setDefaultType(transaction.type);
    setModalPresetAccount(undefined);
    setModalOpen(true);
  }


  async function onDeleteTransaction() {
    if (!user || !pendingDelete) return;
    setDeleting(true);
    try {
      await deleteTransaction(user.uid, pendingDelete.id);
      toast.success('Transaction deleted.');
      setPendingDelete(null);
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : 'Failed to delete transaction.');
    } finally {
      setDeleting(false);
    }
  }

  function onExportCsv() {
    const rows: string[][] = [
      ['date', 'type', 'account', 'to_account', 'category', 'note', 'amount'],
      ...filteredTransactions.map((transaction) => [
        dateKeyLocal(transaction.date),
        transaction.type,
        transaction.account ?? '',
        transaction.toAccount ?? '',
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
    anchor.download =
      transactionMonthFilter === 'all'
        ? 'finance-transactions-all.csv'
        : `finance-transactions-${transactionMonthFilter}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function onResetTransactionFilters() {
    setTransactionMonthFilter('all');
    setTransactionTypeFilter('all');
    setTransactionAccountFilter('all');
    setTransactionCategoryFilter('all');
    setTransactionQuery('');
  }

  const hasActiveTransactionFilters =
    transactionMonthFilter !== 'all' ||
    transactionTypeFilter !== 'all' ||
    transactionAccountFilter !== 'all' ||
    transactionCategoryFilter !== 'all' ||
    transactionQuery.trim().length > 0;

  const transactionSubtitle =
    transactionMonthFilter === 'all'
      ? `${filteredTransactions.length} transactions across ${transactionMonthIds.length} month${
          transactionMonthIds.length === 1 ? '' : 's'
        }`
      : `${filteredTransactions.length} transactions for ${monthIdLabel(transactionMonthFilter)}`;

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(20,20,22,0.98),rgba(8,8,9,0.98))] shadow-[0_28px_90px_-52px_rgba(0,0,0,0.95)]">
        <div className="grid gap-6 px-5 py-6 sm:px-6 sm:py-7 xl:grid-cols-[minmax(0,1.12fr)_340px]">
          <div>
            <div className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-300">
              Finance overview
            </div>
            <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-4xl xl:text-5xl">
              My Financial Dashboard
            </h1>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button variant="secondary" onClick={() => openCreate('income')}>
                + Income
              </Button>
              <Button onClick={() => openCreate('expense')}>+ Expense</Button>
              <Button variant="success" onClick={() => openCreate('transfer')}>
                Transfer
              </Button>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <FinanceCell
                title="Income"
                value={formatIDRCompact(income)}
                subtitle={`Cash in for ${monthLabel}`}
                toneClass="text-emerald-200"
                className="border-emerald-400/10"
              />
              <FinanceCell
                title="Expense"
                value={formatIDRCompact(expense)}
                subtitle={`Cash out for ${monthLabel}`}
                toneClass="text-red-200"
                className="border-red-400/10"
              />
              <FinanceCell
                title="Net"
                value={formatIDRCompact(net)}
                subtitle="Pocket + Bank + E-Wallet + Personal"
                toneClass={net >= 0 ? 'text-sky-200' : 'text-amber-200'}
                className="border-sky-400/10"
              />
              <FinanceCell
                title="Entries"
                value={String(monthTransactions.length)}
                subtitle="Recorded this month"
                toneClass="text-zinc-100"
                className="border-white/10"
              />
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-black/40 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
                  Focus month
                </div>
                <div className="mt-2 text-xl font-semibold text-white">{monthLabel}</div>
              </div>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-300">
                Live
              </span>
            </div>

            <div className="mt-4">
              <Input
                label="Overview month"
                type="month"
                value={monthId}
                onChange={(e) => setMonthId(e.target.value)}
              />
            </div>

            <div className="mt-5 grid gap-3">
              <div className="rounded-[20px] border border-white/10 bg-zinc-950/80 px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Total history
                </div>
                <div className="mt-2 text-lg font-semibold text-zinc-100">{transactions.length} entries</div>
              </div>
            </div>
          </div>
        </div>
      </section>
      {error ? <Alert variant="danger">{error}</Alert> : null}

      <section>
        <div>
          <div className="mb-4 px-1">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Account balances
            </div>
            <h2 className="mt-2 text-xl font-semibold text-white">Four independent balances</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
            {balancesByAccount.map(({ account, balance }) => {
              const accountCount = transactions.filter((transaction) => transactionTouchesAccount(transaction, account)).length;
              const monthChange = balanceByAccount(monthTransactions, account);

              return (
                <article
                  key={account}
                  className={`rounded-[28px] border p-5 shadow-[0_22px_55px_-38px_rgba(0,0,0,0.9)] ${financeAccountSurfaceClass(account)}`}>
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <span
                        className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${financeAccountBadgeClass(account)}`}>
                        {financeAccountLabel(account)}
                      </span>
                      <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
                        {accountCount} {accountCount === 1 ? 'entry' : 'entries'}
                      </span>
                    </div>

                    <div className={`mt-6 text-3xl font-semibold tracking-tight ${financeAccountToneClass(account, balance)}`}>
                      {formatIDR(balance)}
                    </div>

                    <Button
                      size="sm"
                      variant="secondary"
                      className="mt-5 w-full"
                      onClick={() => openCreate('income', { account })}>
                      Add funds
                    </Button>

                    <div className="mt-6 flex items-center justify-between gap-3 border-t border-white/10 pt-4 text-xs text-zinc-400">
                      <span className={monthChange === 0 ? 'text-zinc-500' : 'text-zinc-300'}>
                        Month move {formatSignedCompact(monthChange)}
                      </span>
                      <span className={balance < 0 ? 'text-red-200' : 'text-zinc-300'}>
                        {balance < 0 ? 'Negative balance' : 'Tracked balance'}
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,.95fr)]">
        <section className="app-surface overflow-hidden border-white/10 bg-[linear-gradient(180deg,rgba(20,20,22,0.92),rgba(9,9,11,0.98))]">
          <div className="app-panel-header">
            <div>
              <div className="text-sm font-semibold">Daily expense flow</div>
              <div className="mt-1 text-xs text-zinc-500">
                Daily expense movement for the selected range.
              </div>
            </div>
            <div className="w-full sm:w-[160px]">
              <Select
                aria-label="Select cashflow range"
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

        <section className="app-surface overflow-hidden border-white/10 bg-[linear-gradient(180deg,rgba(20,20,22,0.92),rgba(9,9,11,0.98))]">
          <div className="app-panel-header">
            <div>
              <div className="text-sm font-semibold">Expense by category</div>
              <div className="mt-1 text-xs text-zinc-500">Category split for this month.</div>
            </div>
          </div>
          <div className="px-5 py-5 sm:px-6">
            <ExpenseByCategoryChart monthTransactions={monthTransactions} />
          </div>
        </section>
      </div>


      <section className="app-surface overflow-hidden border-white/10 bg-[linear-gradient(180deg,rgba(20,20,22,0.92),rgba(9,9,11,0.98))]">
        <div className="app-panel-header">
          <div>
            <div className="text-sm font-semibold">Monthly net trend</div>
            <div className="mt-1 text-xs text-zinc-500">Last 6 months monthly net.</div>
          </div>
        </div>
        <div className="px-5 py-5 sm:px-6">
          <MonthlyNetChart monthId={monthId} transactions={transactions} rangeMonths={6} />
        </div>
      </section>


      <section className="app-surface overflow-hidden border-white/10 bg-[linear-gradient(180deg,rgba(20,20,22,0.92),rgba(9,9,11,0.98))]">
        <div className="app-panel-header">
          <div>
            <div className="text-sm font-semibold">Transactions</div>
            <div className="mt-1 text-xs text-zinc-500">{transactionSubtitle}</div>
          </div>
        </div>

        <div className="grid gap-3 border-t border-white/10 px-4 py-4 sm:px-5 lg:grid-cols-[160px_140px_160px_180px_minmax(0,1fr)_auto] lg:items-end">
          <Select
            label="Month"
            value={transactionMonthFilter}
            onChange={(e) => setTransactionMonthFilter(e.target.value)}>
            <option value="all">All months</option>
            {transactionMonthOptions.map((option) => (
              <option key={option} value={option}>
                {monthIdLabel(option)}
              </option>
            ))}
          </Select>
          <Select
            label="Type"
            value={transactionTypeFilter}
            onChange={(e) => setTransactionTypeFilter(e.target.value as 'all' | TransactionType)}>
            <option value="all">All types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
            <option value="transfer">Transfer</option>
          </Select>
          <Select
            label="Account"
            value={transactionAccountFilter}
            onChange={(e) => setTransactionAccountFilter(e.target.value as 'all' | FinanceAccount)}>
            <option value="all">All accounts</option>
            {FINANCE_ACCOUNT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Select
            label="Category"
            value={transactionCategoryFilter}
            onChange={(e) => setTransactionCategoryFilter(e.target.value)}>
            <option value="all">All categories</option>
            {transactionCategoryOptions.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </Select>
          <Input
            label="Search"
            value={transactionQuery}
            onChange={(e) => setTransactionQuery(e.target.value)}
            placeholder="Category, account, or note..."
          />
          <div className="flex flex-wrap items-end gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={onResetTransactionFilters}
              disabled={!hasActiveTransactionFilters}>
              Reset filters
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={onExportCsv}
              disabled={filteredTransactions.length === 0}>
              Export CSV
            </Button>
          </div>
        </div>

        <div className="border-t border-white/10 px-4 py-4 sm:px-5">
          <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,10,12,0.9),rgba(6,6,7,0.95))] px-4 py-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Expense range total
                </div>
                <div className="mt-2 text-2xl font-semibold tracking-tight text-red-200">
                  {formatIDR(expenseRangeSummary.total)}
                </div>
                <div className="mt-2 text-sm text-zinc-400">
                  {expenseRangeSummary.count} expense{' '}
                  {expenseRangeSummary.count === 1 ? 'entry' : 'entries'} from{' '}
                  {expenseRangeSummary.startLabel} to {expenseRangeSummary.endLabel}.
                </div>
                <div className="mt-1 text-xs text-zinc-500">{expenseRangeAccountLabel}</div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:w-auto">
                <Input
                  label="From"
                  type="date"
                  value={expenseRangeStart}
                  onChange={(e) => setExpenseRangeStart(e.target.value)}
                  className="min-w-[170px]"
                />
                <Input
                  label="To"
                  type="date"
                  value={expenseRangeEnd}
                  onChange={(e) => setExpenseRangeEnd(e.target.value)}
                  className="min-w-[170px]"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="md:hidden">
          {loading ? (
            <div className="px-5 py-4 text-sm text-zinc-400">Loading…</div>
          ) : filteredTransactions.length === 0 ? (
            <div className="px-5 py-4 text-sm text-zinc-400">No transactions yet.</div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {pagedTransactions.map((transaction) => (
                <div key={transaction.id} className="px-4 py-3.5 sm:px-5 sm:py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="break-words text-[13px] font-semibold text-zinc-100 sm:text-sm">{transaction.category}</div>
                      <div className="mt-1 text-[11px] text-zinc-500 sm:text-xs">
                        {formatDateShort(transaction.date)} • {transaction.type} •{' '}
                        {transactionAccountSummary(transaction)}
                      </div>
                    </div>
                    <div
                      className={`shrink-0 text-[13px] font-semibold sm:text-sm ${transactionAmountToneClass(transaction.type)}`}>
                      {transactionAmountDisplay(transaction)}
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
                      Duplicate
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => setPendingDelete(transaction)}>
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[860px] table-auto">
            <thead>
              <tr className="text-left text-xs font-semibold text-zinc-500">
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Account</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Note</th>
                <th className="px-5 py-3 text-right">Amount</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-4 text-sm text-zinc-400">
                    Loading…
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-4 text-sm text-zinc-400">
                    No transactions yet.
                  </td>
                </tr>
              ) : (
                pagedTransactions.map((transaction) => (
                  <tr key={transaction.id} className="text-sm text-zinc-200 hover:bg-zinc-950/40">
                    <td className="px-5 py-4 text-zinc-300">{formatDateShort(transaction.date)}</td>
                    <td className="px-5 py-4">
                      <span className={transactionTypeBadgeClass(transaction.type)}>
                        {transaction.type}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-md border border-zinc-800 bg-zinc-950/70 px-2 py-1 text-xs font-semibold text-zinc-200">
                        {transactionAccountSummary(transaction)}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-semibold">{transaction.category}</td>
                    <td className="px-5 py-4 text-zinc-400">{transaction.note || '—'}</td>
                    <td className="px-5 py-4 text-right font-semibold">
                      <span className={transactionAmountToneClass(transaction.type)}>
                        {transactionAmountDisplay(transaction)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="secondary" onClick={() => openEdit(transaction, 'edit')}>
                          Edit
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => openEdit(transaction, 'duplicate')}>
                          Duplicate
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => setPendingDelete(transaction)}>
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {filteredTransactions.length > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-5 py-4 text-xs text-zinc-500">
            <div>
              Page {page + 1} of {pageCount}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setPage((current) => Math.max(0, current - 1))}
                disabled={page === 0}>
                Previous
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}
                disabled={page >= pageCount - 1}>
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </section>

      {user ? (
        <TransactionModal
          uid={user.uid}
          open={modalOpen}
          onClose={closeModal}
          mode={modalMode}
          defaultType={defaultType}
          initialTransaction={editingTransaction}
          presetAccount={modalPresetAccount}
        />
      ) : null}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete transaction?"
        description={
          pendingDelete
            ? `Transaction “${pendingDelete.category}” (${formatDateShort(
                pendingDelete.date,
              )}) for ${formatIDR(pendingDelete.amount)} will be permanently deleted.`
            : 'This transaction will be permanently deleted.'
        }
        confirmText="Delete"
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



















