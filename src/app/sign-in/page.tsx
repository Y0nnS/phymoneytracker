'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React from 'react';
import { signInWithEmail } from '@/lib/firebase/auth';
import { getFirebaseErrorMessage } from '@/lib/firebase/errors';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Alert } from '@/components/ui/Alert';

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signInWithEmail(email.trim(), password);
      router.push('/app');
    } catch (err) {
      setError(getFirebaseErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto flex w-full max-w-md flex-col gap-5 px-4 py-12 sm:gap-6 sm:px-6 sm:py-16">
        <div className="flex flex-col gap-2">
          <Link href="/" className="text-[13px] font-semibold text-zinc-300 sm:text-sm">
            ← Kembali
          </Link>
          <h1 className="text-xl font-semibold sm:text-2xl">Masuk</h1>
          <p className="text-[13px] text-zinc-400 sm:text-sm">
            Masuk ke Productivity Space pakai email dan password yang sudah dibuat.
          </p>
        </div>

        {error ? <Alert variant="danger">{error}</Alert> : null}

        <form
          onSubmit={onSubmit}
          className="flex flex-col gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4 sm:p-6">
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            required
          />
          <PasswordInput
            label="Password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
          <Button type="submit" disabled={loading}>
            {loading ? 'Masuk…' : 'Masuk'}
          </Button>
          <div className="text-center text-sm text-zinc-500">
            Registrasi dinonaktifkan karena workspace ini untuk pemakaian pribadi.
          </div>
        </form>
      </div>
    </main>
  );
}
