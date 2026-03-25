import Link from 'next/link';
import { Card } from '@/components/ui/Card';

export default function SignUpPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto flex w-full max-w-md flex-col gap-5 px-4 py-12 sm:gap-6 sm:px-6 sm:py-16">
        <div className="flex flex-col gap-2">
          <Link href="/" className="text-[13px] font-semibold text-zinc-300 sm:text-sm">
            ← Back
          </Link>
          <h1 className="text-xl font-semibold sm:text-2xl">Registration disabled</h1>
          <p className="text-[13px] text-zinc-400 sm:text-sm">Productivity Space is for personal use.</p>
        </div>

        <Card className="flex flex-col gap-3">
          <div className="text-[13px] font-semibold text-zinc-100 sm:text-sm">
            You cannot register here
          </div>
          <div className="text-[13px] text-zinc-300 sm:text-sm">
            Accounts are created manually to keep access private. Please sign in using an
            existing account.
          </div>
          <Link
            href="/sign-in"
            className="mt-2 inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm shadow-black/30 transition-colors hover:bg-blue-500 sm:text-sm">
            Go to sign in
          </Link>
        </Card>
      </div>
    </main>
  );
}
