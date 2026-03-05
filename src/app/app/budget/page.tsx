'use client';

import Link from 'next/link';
import React from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Progress } from '@/components/ui/Progress';
import { useToast } from '@/components/ui/Toast';
import { useBudget } from '@/hooks/useBudget';
import { useTransactions } from '@/hooks/useTransactions';
import { setBudgetForMonth } from '@/lib/firebase/budgets';
import { formatIDR } from '@/lib/money';
import { isSameMonth, monthIdFromDate } from '@/lib/date';

export default function BudgetPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [monthId, setMonthId] = React.useState(() => monthIdFromDate(new Date()));
  const { budget, loading, error } = useBudget(user?.uid, monthId);
  const { transactions } = useTransactions(user?.uid);

  const expense = React.useMemo(() => {
    return transactions
      .filter((t) => t.type === 'expense' && isSameMonth(t.date, monthId))
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions, monthId]);

  const [amount, setAmount] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setSaveError(null);
    setAmount(budget ? String(budget.amount) : '');
  }, [budget, monthId]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaveError(null);

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount < 0) {
      setSaveError('Budget harus angka >= 0.');
      return;
    }

    setSaving(true);
    try {
      await setBudgetForMonth(user.uid, monthId, Math.round(numericAmount));
      toast.success('Budget tersimpan.');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Gagal menyimpan budget.');
      toast.danger('Gagal menyimpan budget.');
    } finally {
      setSaving(false);
    }
  }

  const budgetAmount = budget?.amount ?? null;
  const remaining = budgetAmount === null ? null : budgetAmount - expense;
  const ratio =
    budgetAmount && budgetAmount > 0 ? Math.min(1, expense / budgetAmount) : null;
  const tone =
    budgetAmount === null
      ? 'neutral'
      : expense <= budgetAmount
        ? expense / (budgetAmount || 1) <= 0.8
          ? 'good'
          : 'warn'
        : 'danger';

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-sm text-zinc-400">Atur</div>
          <h1 className="text-3xl font-semibold tracking-tight">Budget Bulanan</h1>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-zinc-400">Bulan</span>
          <input
            type="month"
            value={monthId}
            onChange={(e) => setMonthId(e.target.value)}
            className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
        </label>
      </div>

      {error ? <Alert variant="danger">{error}</Alert> : null}
      {saveError ? <Alert variant="danger">{saveError}</Alert> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <div className="text-xs font-semibold text-zinc-400">Budget</div>
          <div className="mt-2 text-xl font-semibold">
            {loading
              ? 'Memuat…'
              : budgetAmount === null
                ? '—'
                : formatIDR(budgetAmount)}
          </div>
        </Card>
        <Card>
          <div className="text-xs font-semibold text-zinc-400">Terpakai</div>
          <div className="mt-2 text-xl font-semibold">{formatIDR(expense)}</div>
        </Card>
        <Card>
          <div className="text-xs font-semibold text-zinc-400">Sisa</div>
          <div
            className={
              remaining !== null && remaining < 0
                ? 'mt-2 text-xl font-semibold text-amber-200'
                : 'mt-2 text-xl font-semibold'
            }
          >
            {budgetAmount === null ? '—' : formatIDR(remaining ?? 0)}
          </div>
          <div className="mt-1 text-xs text-zinc-500">
            Untuk budget kamu di bulan {monthId}
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Status budget</div>
            <div className="mt-1 text-xs text-zinc-500">
              Pantau progress budget kamu dan tambah transaksi lebih cepat.
            </div>
          </div>
          <Button onClick={() => window.dispatchEvent(new Event('moneytracker:add'))}>
            Tambah transaksi
          </Button>
        </div>

        {budgetAmount === null ? (
          <div className="mt-4 text-sm text-zinc-400">
            Budget belum diset untuk bulan ini.
          </div>
        ) : (
          <div className="mt-4">
            <Progress value={ratio ?? 0} tone={tone} />
            <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
              <span>
                {formatIDR(expense)} / {formatIDR(budgetAmount)} (
                {budgetAmount > 0 ? Math.round((expense / budgetAmount) * 100) : 0}
                %)
              </span>
              <span>{expense <= budgetAmount ? 'Aman' : 'Over budget'}</span>
            </div>
          </div>
        )}
      </Card>

      <Card>
        <form onSubmit={onSave} className="flex flex-col gap-4">
          <div className="text-sm font-semibold">Set budget</div>
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Nominal budget (IDR)"
              type="number"
              min={0}
              step={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Contoh: 3000000"
              required
            />
            <div className="flex items-end gap-3">
              <Button type="submit" disabled={saving}>
                {saving ? 'Menyimpan…' : 'Simpan budget'}
              </Button>
              <Link
                href="/app/transactions"
                className="rounded-md border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-zinc-100 hover:bg-zinc-900"
              >
                Lihat transaksi
              </Link>
            </div>
          </div>
          <div className="text-xs text-zinc-500">
            Tips: kalau kamu punya “uang bulanan”, isi nominal itu sebagai budget.
          </div>
        </form>
      </Card>
    </div>
  );
}
