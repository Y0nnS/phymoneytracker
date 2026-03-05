import {
  Timestamp,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { firestore } from './client';
import type { Budget } from '@/lib/types';

function mapBudget(
  month: string,
  data: Record<string, unknown> | undefined,
): Budget | null {
  if (!data) return null;
  const amount =
    typeof data.amount === 'number' ? data.amount : Number(data.amount);
  const updatedAtTs = data.updatedAt as Timestamp | undefined;
  return {
    month,
    amount: Number.isFinite(amount) ? amount : 0,
    updatedAt: updatedAtTs ? updatedAtTs.toDate() : undefined,
  };
}

export function subscribeBudget(
  uid: string,
  monthId: string,
  onChange: (budget: Budget | null) => void,
  onError?: (err: unknown) => void,
) {
  const ref = doc(firestore, `users/${uid}/budgets/${monthId}`);
  return onSnapshot(
    ref,
    (snap) =>
      onChange(mapBudget(monthId, snap.exists() ? snap.data() : undefined)),
    (err) => onError?.(err),
  );
}

export async function setBudgetForMonth(
  uid: string,
  monthId: string,
  amount: number,
) {
  const ref = doc(firestore, `users/${uid}/budgets/${monthId}`);
  return setDoc(
    ref,
    {
      month: monthId,
      amount,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

