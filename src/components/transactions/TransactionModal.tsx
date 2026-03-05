'use client';

import React from 'react';
import { addTransaction, updateTransaction } from '@/lib/firebase/transactions';
import type { Transaction, TransactionType } from '@/lib/types';
import { categoriesForType } from '@/lib/categories';
import { readLocalStorageItem, writeLocalStorageItem } from '@/lib/storage';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/components/ui/Toast';

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
  const [type, setType] = React.useState<TransactionType>(defaultType);
  const [amount, setAmount] = React.useState('');
  const [category, setCategory] = React.useState(categoriesForType(defaultType)[0]);
  const [date, setDate] = React.useState(todayISO());
  const [note, setNote] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;

    const seedType = initialTransaction?.type ?? defaultType;
    const seedCategories = categoriesForType(seedType);
    const lastCategory = readLocalStorageItem(`moneytracker:lastCategory:${seedType}`);
    const seedCategory =
      !initialTransaction && lastCategory && seedCategories.includes(lastCategory)
        ? lastCategory
        : seedCategories[0];

    setType(seedType);
    setAmount(initialTransaction ? String(initialTransaction.amount) : '');
    setCategory(initialTransaction ? initialTransaction.category : seedCategory);
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
  const title = isEditing ? 'Edit transaksi' : isDuplicate ? 'Duplikat transaksi' : 'Tambah transaksi';

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError('Amount harus angka > 0.');
      return;
    }

    const txDate = new Date(`${date}T00:00:00`);
    if (Number.isNaN(txDate.getTime())) {
      setError('Tanggal tidak valid.');
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
        writeLocalStorageItem('moneytracker:lastType', type);
        writeLocalStorageItem(`moneytracker:lastCategory:${type}`, category);
        toast.success('Transaksi diperbarui.');
      } else {
        await addTransaction(uid, payload);
        writeLocalStorageItem('moneytracker:lastType', type);
        writeLocalStorageItem(`moneytracker:lastCategory:${type}`, category);
        toast.success(isDuplicate ? 'Transaksi diduplikasi.' : 'Transaksi tersimpan.');
      }
      onCreated?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan transaksi.');
      toast.danger('Gagal menyimpan transaksi.');
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
            label="Tipe"
            value={type}
            onChange={(e) => {
              const nextType = e.target.value as TransactionType;
              setType(nextType);
              const list = categoriesForType(nextType);
              const last = readLocalStorageItem(`moneytracker:lastCategory:${nextType}`);
              setCategory(last && list.includes(last) ? last : list[0]);
            }}
          >
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
            placeholder="Contoh: 50000"
            required
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Select
            label="Kategori"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {categoriesForType(type).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <Input
            label="Tanggal"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        <Textarea
          label="Note (opsional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Misal: makan siang"
        />

        <div className="flex items-center justify-end gap-3">
          <Button variant="secondary" onClick={onClose} type="button">
            Batal
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Menyimpan…' : isEditing ? 'Simpan perubahan' : 'Simpan'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
