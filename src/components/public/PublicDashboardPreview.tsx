'use client';

import { Card } from '@/components/ui/Card';

export function PublicDashboardPreview() {
  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <Card className="lg:col-span-7">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Workspace preview
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">Productivity Space</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
              Bayangkan satu layar yang merangkum task penting, notepad aktif, dan
              finance snapshot tanpa pindah-pindah tool.
            </p>
          </div>
          <span className="rounded-full border border-blue-900/60 bg-blue-950/30 px-3 py-1 text-xs font-semibold text-blue-200">
            Personal
          </span>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
            <div className="text-xs font-semibold text-zinc-500">Today Queue</div>
            <div className="mt-2 text-2xl font-semibold text-blue-200">4 task</div>
            <div className="mt-1 text-sm text-zinc-400">2 high priority, 1 due hari ini</div>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
            <div className="text-xs font-semibold text-zinc-500">Notes Desk</div>
            <div className="mt-2 text-2xl font-semibold text-zinc-100">3 note</div>
            <div className="mt-1 text-sm text-zinc-400">Meeting recap, idea dump, checklist</div>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
            <div className="text-xs font-semibold text-zinc-500">Finance Month</div>
            <div className="mt-2 text-2xl font-semibold text-emerald-200">+Rp1.8jt</div>
            <div className="mt-1 text-sm text-zinc-400">Cashflow bersih dan budget usage</div>
          </div>
        </div>
      </Card>

      <Card className="lg:col-span-5">
        <div className="text-sm font-semibold">What you can manage</div>
        <div className="mt-4 space-y-3">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
            <div className="text-sm font-semibold text-zinc-100">Tasks</div>
            <div className="mt-1 text-sm text-zinc-400">
              Inbox, today, in progress, done. Fokus ke alur kerja yang simple tapi jelas.
            </div>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
            <div className="text-sm font-semibold text-zinc-100">Notes & Quick Capture</div>
            <div className="mt-1 text-sm text-zinc-400">
              Tangkap ide cepat, buka tiap note di panel kanan, dan jaga semuanya tetap rapi.
            </div>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
            <div className="text-sm font-semibold text-zinc-100">Finance</div>
            <div className="mt-1 text-sm text-zinc-400">
              Income, expense, budget, dan money tracking tetap ada dalam satu sistem.
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
