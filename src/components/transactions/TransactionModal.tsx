'use client';

import React from 'react';
import { addTransaction, updateTransaction } from '@/lib/firebase/transactions';
import { categoriesForType } from '@/lib/categories';
import {
  DEFAULT_FINANCE_ACCOUNT,
  FINANCE_ACCOUNT_OPTIONS,
  normalizeFinanceAccount,
} from '@/lib/financeAccounts';
import { readLocalStorageItem, writeLocalStorageItem } from '@/lib/storage';
import type { FinanceAccount, Transaction, TransactionType } from '@/lib/types';
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

function defaultTransferTarget(fromAccount: FinanceAccount) {
  return (
    FINANCE_ACCOUNT_OPTIONS.find((option) => option.value !== fromAccount)?.value ??
    DEFAULT_FINANCE_ACCOUNT
  );
}

export function TransactionModal({
  uid,
  open,
  onClose,
  defaultType = 'expense',
  mode = 'create',
  initialTransaction,
  onCreated,
  presetAccount,
}: {
  uid: string;
  open: boolean;
  onClose: () => void;
  defaultType?: TransactionType;
  mode?: 'create' | 'edit' | 'duplicate';
  initialTransaction?: Transaction | null;
  onCreated?: () => void;
  presetAccount?: FinanceAccount;
}) {
  const toast = useToast();
  const [type, setType] = React.useState<TransactionType>(defaultType);
  const [account, setAccount] = React.useState<FinanceAccount>(DEFAULT_FINANCE_ACCOUNT);
  const [toAccount, setToAccount] = React.useState<FinanceAccount>(
    defaultTransferTarget(DEFAULT_FINANCE_ACCOUNT),
  );
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
    const lastCategory =
      seedType === 'transfer'
        ? seedCategories[0]
        : readLocalStorageItem(`moneytracker:lastCategory:${seedType}`);
    const lastAccount = normalizeFinanceAccount(
      readLocalStorageItem('moneytracker:lastAccount'),
      DEFAULT_FINANCE_ACCOUNT,
    );
    const seedAccount = initialTransaction?.account ?? presetAccount ?? lastAccount;
    const lastToAccount = normalizeFinanceAccount(
      readLocalStorageItem('moneytracker:lastTransferToAccount'),
      defaultTransferTarget(seedAccount),
    );
    const seedToAccount = initialTransaction?.toAccount ?? lastToAccount;
    const normalizedToAccount =
      seedToAccount === seedAccount ? defaultTransferTarget(seedAccount) : seedToAccount;
    const seedCategory =
      seedType === 'transfer'
        ? seedCategories[0]
        : !initialTransaction && lastCategory && seedCategories.includes(lastCategory)
          ? lastCategory
          : initialTransaction?.category ?? seedCategories[0];

    setType(seedType);
    setAccount(seedAccount);
    setToAccount(normalizedToAccount);
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
  }, [open, defaultType, initialTransaction, mode, presetAccount]);

  const isEditing = mode === 'edit' && initialTransaction != null;
  const isDuplicate = mode === 'duplicate' && initialTransaction != null;
  const title = isEditing
    ? type === 'transfer'
      ? 'Edit transfer'
      : 'Edit transaction'
    : isDuplicate
      ? type === 'transfer'
        ? 'Duplicate transfer'
        : 'Duplicate transaction'
      : type === 'transfer'
        ? 'Add transfer'
        : 'Add transaction';

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError('Amount must be a number > 0.');
      return;
    }

    if (type === 'transfer' && account === toAccount) {
      setError('Source and destination accounts must be different.');
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
        account,
        toAccount: type === 'transfer' ? toAccount : undefined,
        amount: Math.round(numericAmount),
        category: type === 'transfer' ? 'Transfer' : category,
        note: note.trim(),
        date: txDate,
      };

      if (isEditing) {
        if (!initialTransaction) throw new Error('Missing transaction to edit.');
        await updateTransaction(uid, initialTransaction.id, payload);
        toast.success(type === 'transfer' ? 'Transfer updated.' : 'Transaction updated.');
      } else {
        await addTransaction(uid, payload);
        toast.success(
          isDuplicate
            ? type === 'transfer'
              ? 'Transfer duplicated.'
              : 'Transaction duplicated.'
            : type === 'transfer'
              ? 'Transfer saved.'
              : 'Transaction saved.',
        );
      }

      writeLocalStorageItem('moneytracker:lastType', type);
      writeLocalStorageItem('moneytracker:lastAccount', account);
      if (type === 'transfer') {
        writeLocalStorageItem('moneytracker:lastTransferToAccount', toAccount);
      } else {
        writeLocalStorageItem(`moneytracker:lastCategory:${type}`, category);
      }

      onCreated?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save transaction.');
      toast.danger(
        type === 'transfer' ? 'Failed to save transfer.' : 'Failed to save transaction.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  const transferTargetOptions = React.useMemo(
    () => FINANCE_ACCOUNT_OPTIONS.filter((option) => option.value !== account),
    [account],
  );

  return (
    <Modal open={open} title={title} onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {error ? <Alert variant="danger">{error}</Alert> : null}

        <div className={`grid gap-4 ${type === 'transfer' ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
          <Select
            label="Type"
            value={type}
            onChange={(e) => {
              const nextType = e.target.value as TransactionType;
              setType(nextType);
              if (nextType === 'transfer') {
                setCategory('Transfer');
                setToAccount((current) =>
                  current === account ? defaultTransferTarget(account) : current,
                );
                return;
              }

              const list = categoriesForType(nextType);
              const last = readLocalStorageItem(`moneytracker:lastCategory:${nextType}`);
              setCategory(last && list.includes(last) ? last : list[0]);
            }}>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
            <option value="transfer">Transfer</option>
          </Select>

          <Select
            label={type === 'transfer' ? 'From account' : 'Account'}
            value={account}
            onChange={(e) => {
              const nextAccount = e.target.value as FinanceAccount;
              setAccount(nextAccount);
              if (type === 'transfer' && nextAccount === toAccount) {
                setToAccount(defaultTransferTarget(nextAccount));
              }
            }}>
            {FINANCE_ACCOUNT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>

          {type === 'transfer' ? (
            <Select
              label="To account"
              value={toAccount}
              onChange={(e) => setToAccount(e.target.value as FinanceAccount)}>
              {transferTargetOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          ) : null}

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

        {type === 'transfer' ? (
          <Input
            label="Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <Select
              label="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}>
              {categoriesForType(type).map((c) => (
                <option key={c} value={c}>
                  {c}
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
        )}

        <Textarea
          label="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={
            type === 'transfer' ? 'Example: move from bank to pocket' : 'Example: lunch'
          }
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
