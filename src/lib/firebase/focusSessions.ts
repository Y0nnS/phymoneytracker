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
} from 'firebase/firestore';
import { firestore } from './client';
import type { FocusMode, FocusSession, FocusSessionInput } from '@/lib/types';

function toDate(value: unknown) {
  return value instanceof Timestamp ? value.toDate() : null;
}

function normalizeMode(value: unknown): FocusMode {
  if (value === 'admin' || value === 'learning') return value;
  return 'deep_work';
}

function mapFocusSession(id: string, data: Record<string, unknown>): FocusSession {
  const plannedMinutes =
    typeof data.plannedMinutes === 'number'
      ? data.plannedMinutes
      : Number(data.plannedMinutes);
  const actualMinutes =
    typeof data.actualMinutes === 'number' ? data.actualMinutes : Number(data.actualMinutes);

  return {
    id,
    label: typeof data.label === 'string' ? data.label : 'Focus session',
    mode: normalizeMode(data.mode),
    sessionDate: typeof data.sessionDate === 'string' ? data.sessionDate : '',
    plannedMinutes: Number.isFinite(plannedMinutes) ? plannedMinutes : 25,
    actualMinutes: Number.isFinite(actualMinutes) ? actualMinutes : 0,
    startedAt: toDate(data.startedAt) ?? new Date(),
    completedAt: toDate(data.completedAt),
    createdAt: toDate(data.createdAt) ?? undefined,
  };
}

export function subscribeFocusSessions(
  uid: string,
  onChange: (sessions: FocusSession[]) => void,
  onError?: (err: unknown) => void,
) {
  const q = query(
    collection(firestore, `users/${uid}/focusSessions`),
    orderBy('startedAt', 'desc'),
    limit(200),
  );
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map((item) => mapFocusSession(item.id, item.data()))),
    (err) => onError?.(err),
  );
}

export async function addFocusSession(uid: string, input: FocusSessionInput) {
  return addDoc(collection(firestore, `users/${uid}/focusSessions`), {
    label: input.label.trim(),
    mode: input.mode,
    sessionDate: input.sessionDate,
    plannedMinutes: Math.max(1, Math.round(input.plannedMinutes)),
    actualMinutes: Math.max(0, Math.round(input.actualMinutes)),
    startedAt: Timestamp.fromDate(input.startedAt),
    completedAt:
      input.completedAt instanceof Date && !Number.isNaN(input.completedAt.getTime())
        ? Timestamp.fromDate(input.completedAt)
        : null,
    createdAt: serverTimestamp(),
  });
}

export async function deleteFocusSession(uid: string, id: string) {
  return deleteDoc(doc(firestore, `users/${uid}/focusSessions/${id}`));
}
