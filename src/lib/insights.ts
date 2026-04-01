import { addDays, formatDayLabel, monthIdFromDate } from '@/lib/date';
import type { Transaction, TransactionType } from '@/lib/types';

export type MonthlyFinanceSnapshot = {
  monthId: string;
  openingBalance: number;
  income: number;
  expense: number;
  availableIncome: number;
  monthChange: number;
  closingBalance: number;
};

function pad2(value: number) {
  return String(value).padStart(2, '0');
}

export function parseMonthId(monthId: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(monthId);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return null;
  if (month < 1 || month > 12) return null;
  return { year, month };
}

export function monthIdLabel(monthId: string) {
  const parsed = parseMonthId(monthId);
  if (!parsed) return monthId;
  const date = new Date(parsed.year, parsed.month - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

export function dateKeyLocal(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(
    date.getDate(),
  )}`;
}

export function daysInMonthFromMonthId(monthId: string) {
  const parsed = parseMonthId(monthId);
  if (!parsed) return 30;
  return new Date(parsed.year, parsed.month, 0).getDate();
}

export function transactionsForMonth(transactions: Transaction[], monthId: string) {
  return transactions.filter((t) => monthIdFromDate(t.date) === monthId);
}

export function sortTransactionsNewestFirst(transactions: Transaction[]) {
  return [...transactions].sort((a, b) => {
    const dateDiff = b.date.getTime() - a.date.getTime();
    if (dateDiff !== 0) return dateDiff;

    const createdDiff = (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0);
    if (createdDiff !== 0) return createdDiff;

    const updatedDiff = (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0);
    if (updatedDiff !== 0) return updatedDiff;

    return b.id.localeCompare(a.id);
  });
}

export function sumByType(transactions: Transaction[], type: TransactionType) {
  return transactions
    .filter((t) => t.type === type)
    .reduce((sum, t) => sum + t.amount, 0);
}

export function isTrackedTransaction(transaction: Transaction) {
  return transaction.type === 'income' || transaction.type === 'expense';
}

function transactionNetAmount(transaction: Transaction) {
  if (transaction.type === 'income') return transaction.amount;
  if (transaction.type === 'expense') return -transaction.amount;
  return 0;
}

function monthlyIncomeExpense(transactions: Transaction[]) {
  const totals = new Map<string, { income: number; expense: number }>();

  for (const transaction of transactions) {
    if (!isTrackedTransaction(transaction)) continue;

    const monthId = monthIdFromDate(transaction.date);
    const entry = totals.get(monthId) ?? { income: 0, expense: 0 };

    if (transaction.type === 'income') entry.income += transaction.amount;
    else entry.expense += transaction.amount;

    totals.set(monthId, entry);
  }

  return totals;
}

export function netBalance(transactions: Transaction[]) {
  return transactions.reduce((sum, transaction) => sum + transactionNetAmount(transaction), 0);
}

export function openingBalanceForMonth(transactions: Transaction[], monthId: string) {
  return transactions.reduce((sum, transaction) => {
    if (!isTrackedTransaction(transaction)) return sum;
    return monthIdFromDate(transaction.date) < monthId
      ? sum + transactionNetAmount(transaction)
      : sum;
  }, 0);
}

export function monthlyFinanceSnapshot(
  transactions: Transaction[],
  monthId: string,
): MonthlyFinanceSnapshot {
  const totals = monthlyIncomeExpense(transactions).get(monthId) ?? { income: 0, expense: 0 };
  const openingBalance = openingBalanceForMonth(transactions, monthId);
  const availableIncome = openingBalance + totals.income;
  const closingBalance = availableIncome - totals.expense;

  return {
    monthId,
    openingBalance,
    income: totals.income,
    expense: totals.expense,
    availableIncome,
    monthChange: totals.income - totals.expense,
    closingBalance,
  };
}

export function monthlyFinanceSnapshots(
  transactions: Transaction[],
  monthIds: string[],
): MonthlyFinanceSnapshot[] {
  if (monthIds.length === 0) return [];

  const totals = monthlyIncomeExpense(transactions);
  let openingBalance = openingBalanceForMonth(transactions, monthIds[0]);

  return monthIds.map((monthId) => {
    const entry = totals.get(monthId) ?? { income: 0, expense: 0 };
    const availableIncome = openingBalance + entry.income;
    const closingBalance = availableIncome - entry.expense;
    const snapshot = {
      monthId,
      openingBalance,
      income: entry.income,
      expense: entry.expense,
      availableIncome,
      monthChange: entry.income - entry.expense,
      closingBalance,
    };

    openingBalance = closingBalance;
    return snapshot;
  });
}

export function buildDailyCumulativeSeries(
  monthTransactions: Transaction[],
  monthId: string,
) {
  const days = daysInMonthFromMonthId(monthId);
  const incomeDaily = Array.from({ length: days }, () => 0);
  const expenseDaily = Array.from({ length: days }, () => 0);

  for (const tx of monthTransactions) {
    if (tx.type === 'transfer') continue;
    const dayIndex = tx.date.getDate() - 1;
    if (dayIndex < 0 || dayIndex >= days) continue;
    if (tx.type === 'income') incomeDaily[dayIndex] += tx.amount;
    else expenseDaily[dayIndex] += tx.amount;
  }

  const incomeCumulative: number[] = [];
  const expenseCumulative: number[] = [];
  const netCumulative: number[] = [];

  let inc = 0;
  let exp = 0;
  for (let i = 0; i < days; i += 1) {
    inc += incomeDaily[i];
    exp += expenseDaily[i];
    incomeCumulative.push(inc);
    expenseCumulative.push(exp);
    netCumulative.push(inc - exp);
  }

  const labels = Array.from({ length: days }, (_, i) => String(i + 1));
  return {
    labels,
    incomeDaily,
    expenseDaily,
    incomeCumulative,
    expenseCumulative,
    netCumulative,
  };
}

export function buildDailyExpenseSeries(
  transactions: Transaction[],
  startDate: Date,
  endDate: Date,
) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  if (end < start) {
    return { labels: [], values: [] };
  }

  const expenseByDay = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.type !== 'expense') continue;
    const day = new Date(tx.date);
    day.setHours(0, 0, 0, 0);
    if (day < start || day > end) continue;
    const key = dateKeyLocal(day);
    expenseByDay.set(key, (expenseByDay.get(key) ?? 0) + tx.amount);
  }

  const totalDays = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
  const labels: string[] = [];
  const values: number[] = [];

  for (let i = 0; i < totalDays; i += 1) {
    const day = addDays(start, i);
    const key = dateKeyLocal(day);
    labels.push(formatDayLabel(key));
    values.push(expenseByDay.get(key) ?? 0);
  }

  return { labels, values };
}

export function expenseBreakdownByCategory(monthTransactions: Transaction[]) {
  const expenseOnly = monthTransactions.filter((t) => t.type === 'expense');
  const totals = new Map<string, number>();
  for (const tx of expenseOnly) {
    const key = tx.category || 'Other';
    totals.set(key, (totals.get(key) ?? 0) + tx.amount);
  }

  const entries = Array.from(totals.entries()).sort((a, b) => b[1] - a[1]);
  const totalExpense = entries.reduce((sum, [, amount]) => sum + amount, 0);

  const TOP_N = 6;
  const top = entries.slice(0, TOP_N).map(([category, amount]) => ({
    category,
    amount,
  }));
  const restAmount = entries.slice(TOP_N).reduce((sum, [, amount]) => sum + amount, 0);
  if (restAmount > 0) {
    const otherIndex = top.findIndex((t) => t.category === 'Other');
    if (otherIndex >= 0) top[otherIndex].amount += restAmount;
    else top.push({ category: 'Other', amount: restAmount });
  }

  const items = top.map((item) => ({
    ...item,
    percent: totalExpense > 0 ? item.amount / totalExpense : 0,
  }));

  return { totalExpense, items };
}

export function lastNMonthIds(fromMonthId: string, count: number) {
  const parsed = parseMonthId(fromMonthId) ?? parseMonthId(monthIdFromDate(new Date()));
  if (!parsed) return [fromMonthId];
  const base = new Date(parsed.year, parsed.month - 1, 1);

  const monthIds: string[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
    monthIds.push(monthIdFromDate(d));
  }
  return monthIds;
}
