import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-16">
        <header className="flex items-center justify-between">
          <div className="text-sm font-semibold tracking-wide text-zinc-200">
            MoneyTracker
          </div>
          <Link
            href="/sign-in"
            className="rounded-md border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-100 hover:bg-zinc-800"
          >
            Masuk
          </Link>
        </header>

        <section className="flex flex-col gap-6">
          <h1 className="text-balance text-4xl font-semibold leading-tight md:text-5xl">
            Money management yang rapi, simpel, dan gelap.
          </h1>
          <p className="max-w-2xl text-pretty text-base leading-relaxed text-zinc-300">
            Catat pemasukan dan pengeluaran, atur budget bulanan, dan pantau
            ringkasan bulan ini. Data tersimpan aman di Firebase per akun.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/sign-in"
              className="rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500"
            >
              Masuk ke Dashboard
            </Link>
            <Link
              href="/sign-in"
              className="rounded-md border border-zinc-800 bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-zinc-100 hover:bg-zinc-800"
            >
              Masuk
            </Link>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="text-sm font-semibold text-zinc-100">
              Transaksi
            </div>
            <div className="mt-2 text-sm text-zinc-300">
              Tambah pemasukan/pengeluaran dengan cepat dan konsisten.
            </div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="text-sm font-semibold text-zinc-100">
              Budget Bulanan
            </div>
            <div className="mt-2 text-sm text-zinc-300">
              Tetapkan budget per bulan dan lihat sisa budget secara real-time.
            </div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="text-sm font-semibold text-zinc-100">Ringkasan</div>
            <div className="mt-2 text-sm text-zinc-300">
              Lihat total income, expense, dan net bulan ini.
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
