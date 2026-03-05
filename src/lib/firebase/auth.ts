import {
  browserLocalPersistence,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { firebaseAuth } from './client';

export async function signInWithEmail(email: string, password: string) {
  await setPersistence(firebaseAuth, browserLocalPersistence);
  return signInWithEmailAndPassword(firebaseAuth, email, password);
}

export async function signOutUser() {
  return signOut(firebaseAuth);
}
