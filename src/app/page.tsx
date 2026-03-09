import Link from 'next/link';

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

        <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-4 py-5 sm:px-6 sm:py-10">
          <header className="flex items-center justify-between">
            <div className="text-[13px] font-semibold tracking-wide text-zinc-200 sm:text-sm">
              Productivity Space
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/sign-in"
                className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-[13px] font-medium text-zinc-100 hover:bg-zinc-800 sm:px-4 sm:text-sm">
                Masuk
              </Link>
            </div>
          </header>

          <section className="flex flex-1 flex-col justify-center gap-6 py-6 sm:gap-10 sm:py-10">
            <div className="flex flex-col gap-6">
              <h1 className="text-balance text-2xl font-semibold leading-tight tracking-tight sm:text-4xl md:text-5xl lg:text-6xl">
                Productivity Space
              </h1>
              <p className="max-w-2xl text-pretty text-[13px] leading-relaxed text-zinc-300 sm:text-base md:text-lg">
                Tempat dimana rasa malas dilarang masuk.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3">
                <Link
                  href="/sign-in"
                  className="rounded-md bg-blue-600 px-5 py-2.5 text-center text-sm font-semibold text-white shadow-sm shadow-black/40 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 sm:text-left">
                  Masuk ke Workspace
                </Link>
                <Link
                  href="#preview"
                  className="rounded-md border border-zinc-800 bg-zinc-900 px-5 py-2.5 text-center text-sm font-semibold text-zinc-100 hover:bg-zinc-800 sm:text-left">
                  Lihat preview
                </Link>
              </div>
            </div>

            <section className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/30 p-4 shadow-sm shadow-black/30 ring-1 ring-white/5 sm:p-5">
                <div className="text-[13px] font-semibold text-zinc-100 sm:text-sm">Tasks</div>
                <div className="mt-2 text-[12px] text-zinc-300 sm:text-sm">
                  Atur inbox, today, in progress, dan done dengan prioritas jelas.
                </div>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/30 p-4 shadow-sm shadow-black/30 ring-1 ring-white/5 sm:p-5">
                <div className="text-[13px] font-semibold text-zinc-100 sm:text-sm">Notes</div>
                <div className="mt-2 text-[12px] text-zinc-300 sm:text-sm">
                  Simpan ide, recap meeting, dan quick thoughts dalam notepad yang clean.
                </div>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/30 p-4 shadow-sm shadow-black/30 ring-1 ring-white/5 sm:p-5">
                <div className="text-[13px] font-semibold text-zinc-100 sm:text-sm">Finance</div>
                <div className="mt-2 text-[12px] text-zinc-300 sm:text-sm">
                  Income, expense, budget, dan trend tetap ada sebagai satu modul.
                </div>
              </div>
            </section>
          </section>

          <div className="pb-2 text-center text-xs text-zinc-500">
            <Link href="#preview" className="hover:text-zinc-300">
              Scroll untuk lihat preview ↓
            </Link>
          </div>
        </div>
      </div>

      {/* <section id="preview" className="border-t border-zinc-800/70 bg-zinc-950">
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-14">
          <PublicDashboardPreview />
        </div>
      </section> */}

      <footer className="border-t border-zinc-800/70 bg-zinc-950">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-6 py-10 text-sm text-zinc-500 md:flex-row md:items-center md:justify-between">
          <div>©{new Date().getFullYear()} Productivity Space by Phy0</div>
          <div className="flex flex-wrap gap-3">
            <Link href="/sign-in" className="hover:text-zinc-300">
              Masuk
            </Link>
            <Link href="/app" className="hover:text-zinc-300">
              Workspace
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
