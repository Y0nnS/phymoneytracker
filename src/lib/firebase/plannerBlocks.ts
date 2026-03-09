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
import type { PlannerBlock, PlannerBlockInput, PlannerBlockType } from '@/lib/types';

function toDate(value: unknown) {
  return value instanceof Timestamp ? value.toDate() : undefined;
}

function normalizeType(value: unknown): PlannerBlockType {
  if (value === 'admin' || value === 'meeting' || value === 'personal') return value;
  return 'deep_work';
}

function buildSortKey(date: string, startTime: string) {
  return `${date}T${startTime}`;
}

function mapPlannerBlock(id: string, data: Record<string, unknown>): PlannerBlock {
  const date = typeof data.date === 'string' ? data.date : '';
  const startTime = typeof data.startTime === 'string' ? data.startTime : '09:00';

  return {
    id,
    title: typeof data.title === 'string' ? data.title : 'Untitled block',
    notes: typeof data.notes === 'string' ? data.notes : '',
    type: normalizeType(data.type),
    date,
    startTime,
    endTime: typeof data.endTime === 'string' ? data.endTime : '10:00',
    sortKey:
      typeof data.sortKey === 'string' && data.sortKey.length > 0
        ? data.sortKey
        : buildSortKey(date, startTime),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

function serializePlannerBlockInput(input: Partial<PlannerBlockInput>) {
  const payload: Record<string, unknown> = {};
  const date = typeof input.date === 'string' ? input.date : undefined;
  const startTime = typeof input.startTime === 'string' ? input.startTime : undefined;

  if (typeof input.title === 'string') payload.title = input.title.trim();
  if (typeof input.notes === 'string') payload.notes = input.notes.trim();
  if (typeof input.type === 'string') payload.type = input.type;
  if (date) payload.date = date;
  if (startTime) payload.startTime = startTime;
  if (typeof input.endTime === 'string') payload.endTime = input.endTime;
  if (date && startTime) payload.sortKey = buildSortKey(date, startTime);

  return payload;
}

export function subscribePlannerBlocks(
  uid: string,
  onChange: (blocks: PlannerBlock[]) => void,
  onError?: (err: unknown) => void,
) {
  const q = query(
    collection(firestore, `users/${uid}/plannerBlocks`),
    orderBy('sortKey', 'asc'),
    limit(240),
  );
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map((item) => mapPlannerBlock(item.id, item.data()))),
    (err) => onError?.(err),
  );
}

export async function addPlannerBlock(uid: string, input: PlannerBlockInput) {
  return addDoc(collection(firestore, `users/${uid}/plannerBlocks`), {
    ...serializePlannerBlockInput(input),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updatePlannerBlock(
  uid: string,
  id: string,
  input: Partial<PlannerBlockInput>,
) {
  return updateDoc(doc(firestore, `users/${uid}/plannerBlocks/${id}`), {
    ...serializePlannerBlockInput(input),
    updatedAt: serverTimestamp(),
  });
}

export async function deletePlannerBlock(uid: string, id: string) {
  return deleteDoc(doc(firestore, `users/${uid}/plannerBlocks/${id}`));
}
