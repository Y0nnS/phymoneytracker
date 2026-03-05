import { FirebaseError } from 'firebase/app';

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'auth/invalid-email': 'Email tidak valid.',
  'auth/invalid-credential': 'Email atau password salah.',
  'auth/wrong-password': 'Email atau password salah.',
  'auth/user-not-found': 'Akun tidak ditemukan.',
  'auth/email-already-in-use': 'Email sudah terdaftar.',
  'auth/weak-password': 'Password terlalu lemah (minimal 6 karakter).',
  'auth/too-many-requests':
    'Terlalu banyak percobaan. Coba lagi beberapa saat.',
};

export function getFirebaseErrorMessage(error: unknown) {
  if (error instanceof FirebaseError) {
    return AUTH_ERROR_MESSAGES[error.code] ?? error.message;
  }
  if (error instanceof Error) return error.message;
  return 'Terjadi kesalahan. Coba lagi.';
}

