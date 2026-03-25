import { FirebaseError } from 'firebase/app';

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'auth/invalid-email': 'Email address is invalid.',
  'auth/invalid-credential': 'Email or password is incorrect.',
  'auth/wrong-password': 'Email or password is incorrect.',
  'auth/user-not-found': 'Account not found.',
  'auth/email-already-in-use': 'Email is already registered.',
  'auth/weak-password': 'Password is too weak (min 6 characters).',
  'auth/too-many-requests':
    'Too many attempts. Please try again later.',
};

export function getFirebaseErrorMessage(error: unknown) {
  if (error instanceof FirebaseError) {
    return AUTH_ERROR_MESSAGES[error.code] ?? error.message;
  }
  if (error instanceof Error) return error.message;
  return 'Something went wrong. Please try again.';
}

