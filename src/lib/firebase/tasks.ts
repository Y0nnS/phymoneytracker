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
import type { Task, TaskInput, TaskPriority, TaskStatus } from '@/lib/types';

function toDate(value: unknown) {
  return value instanceof Timestamp ? value.toDate() : null;
}

function normalizeStatus(value: unknown): TaskStatus {
  if (value === 'today' || value === 'in_progress' || value === 'done') return value;
  return 'inbox';
}

function normalizePriority(value: unknown): TaskPriority {
  if (value === 'low' || value === 'high') return value;
  return 'medium';
}

function mapTask(id: string, data: Record<string, unknown>): Task {
  return {
    id,
    title: typeof data.title === 'string' ? data.title : 'Untitled task',
    description: typeof data.description === 'string' ? data.description : '',
    status: normalizeStatus(data.status),
    priority: normalizePriority(data.priority),
    category: typeof data.category === 'string' ? data.category : 'General',
    dueDate: toDate(data.dueDate),
    estimateMinutes:
      typeof data.estimateMinutes === 'number'
        ? data.estimateMinutes
        : Number.isFinite(Number(data.estimateMinutes))
          ? Number(data.estimateMinutes)
          : null,
    tags: Array.isArray(data.tags)
      ? data.tags.filter((tag): tag is string => typeof tag === 'string')
      : [],
    completedAt: toDate(data.completedAt),
    createdAt: toDate(data.createdAt) ?? undefined,
    updatedAt: toDate(data.updatedAt) ?? undefined,
  };
}

function serializeTaskInput(input: Partial<TaskInput>) {
  const payload: Record<string, unknown> = {};

  if (typeof input.title === 'string') payload.title = input.title.trim();
  if (typeof input.description === 'string') payload.description = input.description.trim();
  if (typeof input.status === 'string') payload.status = input.status;
  if (typeof input.priority === 'string') payload.priority = input.priority;
  if (typeof input.category === 'string') payload.category = input.category.trim() || 'General';
  if (Array.isArray(input.tags)) payload.tags = input.tags.map((tag) => tag.trim()).filter(Boolean);
  if (typeof input.estimateMinutes === 'number' && Number.isFinite(input.estimateMinutes)) {
    payload.estimateMinutes = Math.max(0, Math.round(input.estimateMinutes));
  } else if (input.estimateMinutes === null) {
    payload.estimateMinutes = null;
  }

  if (input.dueDate instanceof Date && !Number.isNaN(input.dueDate.getTime())) {
    payload.dueDate = Timestamp.fromDate(input.dueDate);
  } else if (input.dueDate === null) {
    payload.dueDate = null;
  }

  if (input.completedAt instanceof Date && !Number.isNaN(input.completedAt.getTime())) {
    payload.completedAt = Timestamp.fromDate(input.completedAt);
  } else if (input.completedAt === null) {
    payload.completedAt = null;
  }

  return payload;
}

export function subscribeTasks(
  uid: string,
  onChange: (tasks: Task[]) => void,
  onError?: (err: unknown) => void,
) {
  const q = queryTasks(uid);
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map((item) => mapTask(item.id, item.data()))),
    (err) => onError?.(err),
  );
}

function queryTasks(uid: string) {
  return query(collection(firestore, `users/${uid}/tasks`), orderBy('createdAt', 'desc'), limit(300));
}

export async function addTask(uid: string, input: TaskInput) {
  return addDoc(collection(firestore, `users/${uid}/tasks`), {
    ...serializeTaskInput(input),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateTask(uid: string, id: string, input: Partial<TaskInput>) {
  return updateDoc(doc(firestore, `users/${uid}/tasks/${id}`), {
    ...serializeTaskInput(input),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteTask(uid: string, id: string) {
  return deleteDoc(doc(firestore, `users/${uid}/tasks/${id}`));
}
