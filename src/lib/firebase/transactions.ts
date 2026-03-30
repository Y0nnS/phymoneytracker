import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  type QueryConstraint,
  updateDoc,
  where,
} from 'firebase/firestore';
import { normalizeOptionalFinanceAccount } from '@/lib/financeAccounts';

import { firestore } from './client';
import { sortTransactionsNewestFirst } from '@/lib/insights';
import type { Transaction, TransactionCreateInput } from '@/lib/types';

function optionalDateFromValue(value: unknown) {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  return undefined;
}

function mapTransaction(
  id: string,
  data: Record<string, unknown>,
): Transaction {
  const date = optionalDateFromValue(data.date) ?? new Date();

  const type =
    data.type === 'income' || data.type === 'transfer'
      ? data.type
      : 'expense';

  return {
    id,
    type,
    account: normalizeOptionalFinanceAccount(data.account),
    toAccount: normalizeOptionalFinanceAccount(data.toAccount),
    amount: typeof data.amount === 'number' ? data.amount : Number(data.amount),
    category: typeof data.category === 'string' ? data.category : 'Other',
    note: typeof data.note === 'string' ? data.note : '',
    date,
    createdAt: optionalDateFromValue(data.createdAt),
    updatedAt: optionalDateFromValue(data.updatedAt),
  };
}

export function subscribeTransactions(
  uid: string,
  onChange: (transactions: Transaction[]) => void,
  onError?: (err: unknown) => void,
) {
  const q = query(
    collection(firestore, `users/${uid}/transactions`),
    orderBy('date', 'desc'),
    limit(200),
  );

  return onSnapshot(
    q,
    (snap) => {
      onChange(sortTransactionsNewestFirst(snap.docs.map((d) => mapTransaction(d.id, d.data()))));
    },
    (err) => onError?.(err),
  );
}

export async function fetchTransactions(
  uid: string,
  {
    startDate,
    endDate,
    limitCount = 600,
  }: {
    startDate?: Date;
    endDate?: Date;
    limitCount?: number;
  } = {},
) {
  const constraints: QueryConstraint[] = [orderBy('date', 'desc')];

  if (startDate) {
    constraints.push(where('date', '>=', Timestamp.fromDate(startDate)));
  }

  if (endDate) {
    constraints.push(where('date', '<=', Timestamp.fromDate(endDate)));
  }

  if (typeof limitCount === 'number' && Number.isFinite(limitCount) && limitCount > 0) {
    constraints.push(limit(Math.round(limitCount)));
  }

  const q = query(collection(firestore, `users/${uid}/transactions`), ...constraints);
  const snap = await getDocs(q);
  return sortTransactionsNewestFirst(snap.docs.map((d) => mapTransaction(d.id, d.data())));
}

export async function addTransaction(uid: string, input: TransactionCreateInput) {
  const colRef = collection(firestore, `users/${uid}/transactions`);
  return addDoc(colRef, {
    type: input.type,
    account: input.account ?? null,
    toAccount: input.toAccount ?? null,
    amount: input.amount,
    category: input.category,
    note: input.note ?? '',
    date: Timestamp.fromDate(input.date),
    createdAt: serverTimestamp(),
  });
}

export async function deleteTransaction(uid: string, id: string) {
  return deleteDoc(doc(firestore, `users/${uid}/transactions/${id}`));
}

export async function updateTransaction(
  uid: string,
  id: string,
  input: TransactionCreateInput,
) {
  const ref = doc(firestore, `users/${uid}/transactions/${id}`);
  return updateDoc(ref, {
    type: input.type,
    account: input.account ?? null,
    toAccount: input.toAccount ?? null,
    amount: input.amount,
    category: input.category,
    note: input.note ?? '',
    date: Timestamp.fromDate(input.date),
    updatedAt: serverTimestamp(),
  });
}


