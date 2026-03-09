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
import type { Note, NoteInput } from '@/lib/types';

function toDate(value: unknown) {
  return value instanceof Timestamp ? value.toDate() : undefined;
}

function mapNote(id: string, data: Record<string, unknown>): Note {
  return {
    id,
    title: typeof data.title === 'string' ? data.title : 'Untitled note',
    content: typeof data.content === 'string' ? data.content : '',
    category: typeof data.category === 'string' ? data.category : 'General',
    pinned: Boolean(data.pinned),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

function serializeNoteInput(input: Partial<NoteInput>) {
  const payload: Record<string, unknown> = {};
  if (typeof input.title === 'string') payload.title = input.title.trim();
  if (typeof input.content === 'string') payload.content = input.content.trim();
  if (typeof input.category === 'string') payload.category = input.category.trim() || 'General';
  if (typeof input.pinned === 'boolean') payload.pinned = input.pinned;
  return payload;
}

export function subscribeNotes(
  uid: string,
  onChange: (notes: Note[]) => void,
  onError?: (err: unknown) => void,
) {
  const q = query(collection(firestore, `users/${uid}/notes`), orderBy('updatedAt', 'desc'), limit(200));
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map((item) => mapNote(item.id, item.data()))),
    (err) => onError?.(err),
  );
}

export async function addNote(uid: string, input: NoteInput) {
  return addDoc(collection(firestore, `users/${uid}/notes`), {
    ...serializeNoteInput(input),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateNote(uid: string, id: string, input: Partial<NoteInput>) {
  return updateDoc(doc(firestore, `users/${uid}/notes/${id}`), {
    ...serializeNoteInput(input),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteNote(uid: string, id: string) {
  return deleteDoc(doc(firestore, `users/${uid}/notes/${id}`));
}
