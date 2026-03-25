import {
  Timestamp,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { firebaseStorage, firestore } from './client';
import type { UserProfile } from '@/lib/types';

function toDate(value: unknown) {
  return value instanceof Timestamp ? value.toDate() : undefined;
}

function mapUserProfile(uid: string, data: Record<string, unknown> | undefined): UserProfile | null {
  if (!data) return null;
  const displayName = typeof data.displayName === 'string' ? data.displayName : '';
  const photoURL = typeof data.photoURL === 'string' ? data.photoURL : '';
  const createdAt = toDate(data.createdAt);
  const updatedAt = toDate(data.updatedAt);

  if (!displayName && !photoURL) return null;

  return {
    uid,
    displayName,
    photoURL: photoURL || undefined,
    createdAt,
    updatedAt,
  };
}

export function subscribeUserProfile(
  uid: string,
  onChange: (profile: UserProfile | null) => void,
  onError?: (err: unknown) => void,
) {
  const ref = doc(firestore, `users/${uid}`);
  return onSnapshot(
    ref,
    (snap) => onChange(mapUserProfile(uid, snap.exists() ? snap.data() : undefined)),
    (err) => onError?.(err),
  );
}

export async function setUserProfile(
  uid: string,
  input: { displayName: string; photoURL?: string | null },
) {
  const ref = doc(firestore, `users/${uid}`);
  return setDoc(
    ref,
    {
      displayName: input.displayName.trim(),
      photoURL: input.photoURL?.trim() || null,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function updateUserProfile(
  uid: string,
  input: { displayName?: string; photoURL?: string | null },
) {
  const ref = doc(firestore, `users/${uid}`);
  const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (typeof input.displayName === 'string') {
    payload.displayName = input.displayName.trim();
  }
  if (input.photoURL !== undefined) {
    payload.photoURL = input.photoURL ? input.photoURL.trim() : null;
  }
  return updateDoc(ref, payload);
}

export async function deleteUserProfile(uid: string) {
  const ref = doc(firestore, `users/${uid}`);
  return deleteDoc(ref);
}

export async function uploadUserProfilePhoto(uid: string, file: File) {
  const objectRef = ref(firebaseStorage, `users/${uid}/profile`);
  await uploadBytes(objectRef, file, { contentType: file.type });
  return getDownloadURL(objectRef);
}

export async function deleteUserProfilePhoto(uid: string) {
  const objectRef = ref(firebaseStorage, `users/${uid}/profile`);
  return deleteObject(objectRef);
}
