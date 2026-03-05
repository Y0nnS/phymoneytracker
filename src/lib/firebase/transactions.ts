import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { firestore } from './client';
import type { Transaction, TransactionCreateInput } from '@/lib/types';

function mapTransaction(
  id: string,
  data: Record<string, unknown>,
): Transaction {
  const dateValue = data.date as Timestamp | undefined;
  const date = dateValue ? dateValue.toDate() : new Date();

  return {
    id,
    type: data.type === 'income' ? 'income' : 'expense',
    amount: typeof data.amount === 'number' ? data.amount : Number(data.amount),
    category: typeof data.category === 'string' ? data.category : 'Other',
    note: typeof data.note === 'string' ? data.note : '',
    date,
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
      onChange(snap.docs.map((d) => mapTransaction(d.id, d.data())));
    },
    (err) => onError?.(err),
  );
}

export async function addTransaction(uid: string, input: TransactionCreateInput) {
  const colRef = collection(firestore, `users/${uid}/transactions`);
  return addDoc(colRef, {
    type: input.type,
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
    amount: input.amount,
    category: input.category,
    note: input.note ?? '',
    date: Timestamp.fromDate(input.date),
    updatedAt: serverTimestamp(),
  });
}
