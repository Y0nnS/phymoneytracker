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
import type { Goal, GoalInput, GoalStatus } from '@/lib/types';

function toDate(value: unknown) {
  return value instanceof Timestamp ? value.toDate() : null;
}

function normalizeStatus(value: unknown): GoalStatus {
  if (value === 'paused' || value === 'completed') return value;
  return 'active';
}

function mapGoal(id: string, data: Record<string, unknown>): Goal {
  const currentValue =
    typeof data.currentValue === 'number' ? data.currentValue : Number(data.currentValue);
  const targetValue =
    typeof data.targetValue === 'number' ? data.targetValue : Number(data.targetValue);

  return {
    id,
    title: typeof data.title === 'string' ? data.title : 'Untitled goal',
    description: typeof data.description === 'string' ? data.description : '',
    currentValue: Number.isFinite(currentValue) ? currentValue : 0,
    targetValue: Number.isFinite(targetValue) ? targetValue : 0,
    unit: typeof data.unit === 'string' ? data.unit : 'point',
    deadline: toDate(data.deadline),
    status: normalizeStatus(data.status),
    createdAt: toDate(data.createdAt) ?? undefined,
    updatedAt: toDate(data.updatedAt) ?? undefined,
  };
}

function serializeGoalInput(input: Partial<GoalInput>) {
  const payload: Record<string, unknown> = {};
  if (typeof input.title === 'string') payload.title = input.title.trim();
  if (typeof input.description === 'string') payload.description = input.description.trim();
  if (typeof input.unit === 'string') payload.unit = input.unit.trim() || 'point';
  if (typeof input.status === 'string') payload.status = input.status;
  if (typeof input.currentValue === 'number' && Number.isFinite(input.currentValue)) {
    payload.currentValue = input.currentValue;
  }
  if (typeof input.targetValue === 'number' && Number.isFinite(input.targetValue)) {
    payload.targetValue = input.targetValue;
  }
  if (input.deadline instanceof Date && !Number.isNaN(input.deadline.getTime())) {
    payload.deadline = Timestamp.fromDate(input.deadline);
  } else if (input.deadline === null) {
    payload.deadline = null;
  }
  return payload;
}

export function subscribeGoals(
  uid: string,
  onChange: (goals: Goal[]) => void,
  onError?: (err: unknown) => void,
) {
  const q = query(collection(firestore, `users/${uid}/goals`), orderBy('createdAt', 'desc'), limit(120));
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map((item) => mapGoal(item.id, item.data()))),
    (err) => onError?.(err),
  );
}

export async function addGoal(uid: string, input: GoalInput) {
  return addDoc(collection(firestore, `users/${uid}/goals`), {
    ...serializeGoalInput(input),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateGoal(uid: string, id: string, input: Partial<GoalInput>) {
  return updateDoc(doc(firestore, `users/${uid}/goals/${id}`), {
    ...serializeGoalInput(input),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteGoal(uid: string, id: string) {
  return deleteDoc(doc(firestore, `users/${uid}/goals/${id}`));
}
