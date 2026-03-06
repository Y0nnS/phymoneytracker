import Link from 'next/link';
import { PublicDashboardPreview } from '@/components/public/PublicDashboardPreview';

export default function HomePage() {
  return (
    <main className="min-h-dvh bg-zinc-950 text-zinc-100">
      <div className="relative isolate overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(59,130,246,0.22),_transparent_55%)]"
        />
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-40">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:64px_64px]" />
        </div>

        <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-4 py-6 sm:px-6 sm:py-10">
          <header className="flex items-center justify-between">
            <div className="text-sm font-semibold tracking-wide text-zinc-200">
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="#recap"
                className="hidden rounded-md border border-zinc-800 bg-zinc-950/40 px-4 py-2 text-sm font-medium text-zinc-100 hover:bg-zinc-900 sm:inline-flex">
                Recap publik
              </Link>
              <Link
                href="/sign-in"
                className="rounded-md border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-100 hover:bg-zinc-800">
                Masuk
              </Link>
            </div>
          </header>

          <section className="flex flex-1 flex-col justify-center gap-6 py-6 sm:gap-10 sm:py-10">
            <div className="flex flex-col gap-6">
              <h1 className="text-balance text-3xl font-semibold leading-tight tracking-tight sm:text-4xl md:text-5xl lg:text-6xl">
                Dashboard keuangan
              </h1>
              <p className="max-w-2xl text-pretty text-sm leading-relaxed text-zinc-300 sm:text-base md:text-lg">
                Catat pemasukan dan pengeluaran, cek ringkasan bulanan, dan pantau tren beberapa
                bulan terakhir. Halaman utama menampilkan recap transaksi secara read-only.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3">
                <Link
                  href="#recap"
                  className="rounded-md bg-blue-600 px-5 py-2.5 text-center text-sm font-semibold text-white shadow-sm shadow-black/40 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 sm:text-left">
                  Lihat recap transaksi
                </Link>
                <Link
                  href="/sign-in"
                  className="rounded-md border border-zinc-800 bg-zinc-900 px-5 py-2.5 text-center text-sm font-semibold text-zinc-100 hover:bg-zinc-800 sm:text-left">
                  Masuk ke Dashboard
                </Link>
              </div>
            </div>

            <section className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/30 p-5 shadow-sm shadow-black/30 ring-1 ring-white/5">
                <div className="text-sm font-semibold text-zinc-100">Transaksi</div>
                <div className="mt-2 text-sm text-zinc-300">
                  Detail pemasukan/pengeluaran, kategori, dan catatan belanja.
                </div>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/30 p-5 shadow-sm shadow-black/30 ring-1 ring-white/5">
                <div className="text-sm font-semibold text-zinc-100">Ringkasan</div>
                <div className="mt-2 text-sm text-zinc-300">
                  Total income, expense, dan net per bulan untuk cepat lihat kondisi.
                </div>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/30 p-5 shadow-sm shadow-black/30 ring-1 ring-white/5">
                <div className="text-sm font-semibold text-zinc-100">Trend</div>
                <div className="mt-2 text-sm text-zinc-300">
                  Recap beberapa bulan terakhir untuk lihat pola pengeluaran.
                </div>
              </div>
            </section>

            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <span className="inline-flex rounded-md border border-zinc-800 bg-zinc-950/40 px-2 py-1 font-semibold text-zinc-300">
                Read-only
              </span>
              <span>Untuk edit data, login ke dashboard.</span>
            </div>
          </section>

          <div className="pb-2 text-center text-xs text-zinc-500">
            <Link href="#recap" className="hover:text-zinc-300">
              Scroll untuk recap transaksi ↓
            </Link>
          </div>
        </div>
      </div>

      <section id="recap" className="border-t border-zinc-800/70 bg-zinc-950">
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-14">
          <PublicDashboardPreview />
        </div>
      </section>

      <footer className="border-t border-zinc-800/70 bg-zinc-950">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-6 py-10 text-sm text-zinc-500 md:flex-row md:items-center md:justify-between">
          <div>©{new Date().getFullYear()} MoneyTracker by Phy0</div>
          <div className="flex flex-wrap gap-3">
            <Link href="/sign-in" className="hover:text-zinc-300">
              Masuk
            </Link>
            <Link href="/app" className="hover:text-zinc-300">
              Dashboard
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
