'use client';

import React from 'react';
import { addTransaction, updateTransaction } from '@/lib/firebase/transactions';
import { categoriesForType } from '@/lib/categories';
import { readLocalStorageItem, writeLocalStorageItem } from '@/lib/storage';
import type { Transaction, TransactionType } from '@/lib/types';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/components/ui/Toast';

type EntryTransactionType = Exclude<TransactionType, 'transfer'>;

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function dateToISO(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function normalizeEntryType(value?: TransactionType): EntryTransactionType {
  return value === 'income' ? 'income' : 'expense';
}

export function TransactionModal({
  uid,
  open,
  onClose,
  defaultType = 'expense',
  mode = 'create',
  initialTransaction,
  onCreated,
}: {
  uid: string;
  open: boolean;
  onClose: () => void;
  defaultType?: TransactionType;
  mode?: 'create' | 'edit' | 'duplicate';
  initialTransaction?: Transaction | null;
  onCreated?: () => void;
}) {
  const toast = useToast();
  const [type, setType] = React.useState<EntryTransactionType>(normalizeEntryType(defaultType));
  const [amount, setAmount] = React.useState('');
  const [category, setCategory] = React.useState(categoriesForType(normalizeEntryType(defaultType))[0]);
  const [date, setDate] = React.useState(todayISO());
  const [note, setNote] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;

    const seedType = normalizeEntryType(initialTransaction?.type ?? defaultType);
    const seedCategories = categoriesForType(seedType);
    const lastCategory = readLocalStorageItem(`moneytracker:lastCategory:${seedType}`);
    const seedCategory =
      initialTransaction && initialTransaction.type !== 'transfer'
        ? initialTransaction.category
        : !initialTransaction && lastCategory && seedCategories.includes(lastCategory)
          ? lastCategory
          : seedCategories[0];

    setType(seedType);
    setAmount(initialTransaction ? String(initialTransaction.amount) : '');
    setCategory(seedCategory);
    setDate(
      initialTransaction
        ? mode === 'duplicate'
          ? todayISO()
          : dateToISO(initialTransaction.date)
        : todayISO(),
    );
    setNote(initialTransaction ? initialTransaction.note : '');
    setError(null);
  }, [open, defaultType, initialTransaction, mode]);

  const isEditing = mode === 'edit' && initialTransaction != null;
  const isDuplicate = mode === 'duplicate' && initialTransaction != null;
  const title = isEditing ? 'Edit transaction' : isDuplicate ? 'Duplicate transaction' : 'Add transaction';

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError('Amount must be a number > 0.');
      return;
    }

    const txDate = new Date(`${date}T00:00:00`);
    if (Number.isNaN(txDate.getTime())) {
      setError('Date is invalid.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        type,
        amount: Math.round(numericAmount),
        category,
        note: note.trim(),
        date: txDate,
      };

      if (isEditing) {
        if (!initialTransaction) throw new Error('Missing transaction to edit.');
        await updateTransaction(uid, initialTransaction.id, payload);
        toast.success('Transaction updated.');
      } else {
        await addTransaction(uid, payload);
        toast.success(isDuplicate ? 'Transaction duplicated.' : 'Transaction saved.');
      }

      writeLocalStorageItem('moneytracker:lastType', type);
      writeLocalStorageItem(`moneytracker:lastCategory:${type}`, category);

      onCreated?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save transaction.');
      toast.danger('Failed to save transaction.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} title={title} onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {error ? <Alert variant="danger">{error}</Alert> : null}

        <div className="grid gap-4 md:grid-cols-2">
          <Select
            label="Type"
            value={type}
            onChange={(e) => {
              const nextType = normalizeEntryType(e.target.value as TransactionType);
              const list = categoriesForType(nextType);
              const last = readLocalStorageItem(`moneytracker:lastCategory:${nextType}`);

              setType(nextType);
              setCategory(last && list.includes(last) ? last : list[0]);
            }}>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </Select>

          <Input
            label="Amount (IDR)"
            inputMode="numeric"
            type="number"
            min={1}
            step={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Example: 50000"
            required
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Select
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}>
            {categoriesForType(type).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>

          <Input
            label="Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        <Textarea
          label="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Example: lunch"
        />

        <div className="flex items-center justify-end gap-3">
          <Button variant="secondary" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Saving…' : isEditing ? 'Save changes' : 'Save'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
