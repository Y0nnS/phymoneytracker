'use client';

import Link from 'next/link';
import React from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Progress } from '@/components/ui/Progress';
import { useBudget } from '@/hooks/useBudget';
import { useNotes } from '@/hooks/useNotes';
import { useTasks } from '@/hooks/useTasks';
import { useTransactions } from '@/hooks/useTransactions';
import { formatDateShort, formatDateTime, monthIdFromDate, todayDateId } from '@/lib/date';
import { transactionsForMonth, sumByType } from '@/lib/insights';
import { formatIDRCompact } from '@/lib/money';
import { priorityTone, sortTasks, taskStatusTone } from '@/lib/productivity';

function MetricCell({
  title,
  value,
  subtitle,
  toneClass = 'text-zinc-100',
}: {
  title: string;
  value: string;
  subtitle: string;
  toneClass?: string;
}) {
  return (
    <div className="app-strip-cell">
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 sm:text-xs">
        {title}
      </div>
      <div className={`mt-2 text-xl font-semibold tracking-tight sm:text-2xl ${toneClass}`}>{value}</div>
      <div className="mt-1 text-[12px] text-zinc-400 sm:text-sm">{subtitle}</div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <div className="app-list-row text-sm text-zinc-500">{message}</div>;
}

export default function WorkspacePage() {
  const { user } = useAuth();
  const monthId = React.useMemo(() => monthIdFromDate(new Date()), []);
  const todayId = React.useMemo(() => todayDateId(), []);

  const { tasks, error: taskError } = useTasks(user?.uid);
  const { notes, error: noteError } = useNotes(user?.uid);
  const { transactions, error: financeError } = useTransactions(user?.uid);
  const { budget, error: budgetError } = useBudget(user?.uid, monthId);

  const activeTasks = React.useMemo(
    () => sortTasks(tasks).filter((task) => task.status !== 'done'),
    [tasks],
  );
  const todayTasks = React.useMemo(
    () =>
      activeTasks.filter(
        (task) =>
          task.status === 'today' ||
          task.status === 'in_progress' ||
          (task.dueDate
            ? task.dueDate.toDateString() === new Date(`${todayId}T00:00:00`).toDateString()
            : false),
      ),
    [activeTasks, todayId],
  );
  const recentlyDone = React.useMemo(
    () =>
      sortTasks(tasks)
        .filter((task) => task.status === 'done')
        .slice(0, 4),
    [tasks],
  );
  const noteDesk = React.useMemo(
    () =>
      notes
        .slice()
        .sort((a, b) => {
          const pinnedDiff = Number(b.pinned) - Number(a.pinned);
          if (pinnedDiff !== 0) return pinnedDiff;
          const updatedA = a.updatedAt?.getTime() ?? a.createdAt?.getTime() ?? 0;
          const updatedB = b.updatedAt?.getTime() ?? b.createdAt?.getTime() ?? 0;
          return updatedB - updatedA;
        })
        .slice(0, 5),
    [notes],
  );

  const monthTransactions = React.useMemo(
    () => transactionsForMonth(transactions, monthId),
    [transactions, monthId],
  );
  const income = React.useMemo(() => sumByType(monthTransactions, 'income'), [monthTransactions]);
  const expense = React.useMemo(() => sumByType(monthTransactions, 'expense'), [monthTransactions]);
  const net = income - expense;
  const budgetAmount = budget?.amount ?? null;
  const budgetRatio =
    budgetAmount && budgetAmount > 0 ? Math.min(1, expense / budgetAmount) : null;
  const budgetTone =
    budgetAmount === null
      ? 'neutral'
      : expense <= budgetAmount
        ? expense / budgetAmount <= 0.8
          ? 'good'
          : 'warn'
        : 'danger';

  const combinedErrors = [taskError, noteError, financeError, budgetError].filter(Boolean);

  return (
    <div className="flex flex-col gap-6">
      <section className="app-surface overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_38%),linear-gradient(135deg,rgba(24,24,27,0.76),rgba(9,9,11,0.94))] p-5 sm:p-8">
        <div className="grid gap-5 sm:gap-8 xl:grid-cols-[minmax(0,1.2fr)_340px]">
          <div className="max-w-2xl">
            <div className="text-[13px] font-medium text-blue-200 sm:text-sm">Workspace overview</div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-4xl">
              Productivity Space
            </h1>
            <p className="mt-3 text-[13px] leading-relaxed text-zinc-300 sm:text-base">
              Dashboard utama buat ngelihat task penting, buka notepad aktif, dan pantau
              uang masuk keluar tanpa kebanyakan layer.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link href="/app/tasks?compose=task">
                <Button>Task baru</Button>
              </Link>
              <Link href="/app/notes?compose=note">
                <Button variant="secondary">Notepad baru</Button>
              </Link>
              <Link href="/app/finance">
                <Button variant="secondary">Buka finance</Button>
              </Link>
            </div>
          </div>

          <div className="app-surface-subtle p-4 sm:p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500 sm:text-xs">
              Snapshot hari ini
            </div>
            <div className="mt-4 space-y-4">
              <div>
                <div className="text-[13px] font-semibold text-zinc-100 sm:text-sm">Task fokus</div>
                <div className="mt-1 text-[12px] text-zinc-400 sm:text-sm">
                  {todayTasks.length > 0
                    ? `${todayTasks.length} task aktif, ${todayTasks.filter((task) => task.priority === 'high').length} high priority`
                    : 'Belum ada task prioritas untuk hari ini'}
                </div>
              </div>
              <div className="border-t border-white/10 pt-4">
                <div className="text-[13px] font-semibold text-zinc-100 sm:text-sm">Notepad aktif</div>
                <div className="mt-1 text-[12px] text-zinc-400 sm:text-sm">
                  {noteDesk.length > 0
                    ? `${noteDesk.length} note terakhir siap dibuka lagi`
                    : 'Mulai dari satu blank note untuk simpan ide'}
                </div>
              </div>
              <div className="border-t border-white/10 pt-4 text-[12px] text-zinc-400 sm:text-sm">
                Cashflow bulan ini:{' '}
                <span className="font-semibold text-zinc-100">{formatIDRCompact(net)}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {combinedErrors.length > 0 ? <Alert variant="danger">{combinedErrors[0]}</Alert> : null}

      <section className="app-strip">
        <div className="app-strip-grid lg:grid-cols-4">
          <MetricCell
            title="Today Tasks"
            value={String(todayTasks.length)}
            subtitle={
              todayTasks.length > 0
                ? `${todayTasks.filter((task) => task.priority === 'high').length} high priority`
                : 'Inbox masih kosong'
            }
            toneClass="text-blue-200"
          />
          <MetricCell
            title="Notes"
            value={String(notes.length)}
            subtitle={
              notes.length > 0
                ? `${noteDesk.filter((note) => note.pinned).length} pinned`
                : 'Belum ada notepad'
            }
          />
          <MetricCell
            title="Net Month"
            value={formatIDRCompact(net)}
            subtitle={`${monthTransactions.length} transaksi`}
            toneClass={net >= 0 ? 'text-emerald-200' : 'text-amber-200'}
          />
          <MetricCell
            title="Budget"
            value={
              budgetAmount === null ? 'Draft' : `${Math.round((budgetRatio ?? 0) * 100)}%`
            }
            subtitle={budgetAmount === null ? 'Set budget bulan ini' : 'Budget usage'}
          />
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,.9fr)]">
        <div className="app-surface overflow-hidden">
          <div className="app-panel-header">
            <div>
              <div className="text-sm font-semibold">Today queue</div>
              <div className="mt-1 text-xs text-zinc-500">
                Task yang perlu kamu dorong hari ini.
              </div>
            </div>
            <Link
              href="/app/tasks"
              className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-zinc-100 transition-colors hover:bg-white/[0.05]">
              Semua task
            </Link>
          </div>
          <div className="app-list">
            {todayTasks.length === 0 ? (
              <EmptyState message="Belum ada task untuk hari ini." />
            ) : (
              todayTasks.slice(0, 5).map((task) => (
                <div key={task.id} className="app-list-row">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-zinc-100">{task.title}</div>
                      <div className="mt-1 text-xs text-zinc-500">
                        {task.category}
                        {task.dueDate ? ` • Due ${formatDateShort(task.dueDate)}` : ''}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${taskStatusTone(task.status)}`}>
                        {task.status.replace('_', ' ')}
                      </span>
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${priorityTone(task.priority)}`}>
                        {task.priority}
                      </span>
                    </div>
                  </div>
                  {task.description ? (
                    <div className="mt-3 text-sm text-zinc-400">{task.description}</div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="app-surface overflow-hidden">
          <div className="app-panel-header">
            <div>
              <div className="text-sm font-semibold">Finance snapshot</div>
              <div className="mt-1 text-xs text-zinc-500">{monthId} cashflow dan budget.</div>
            </div>
            <Link
              href="/app/finance"
              className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-zinc-100 transition-colors hover:bg-white/[0.05]">
              Buka finance
            </Link>
          </div>
          <div className="grid gap-4 px-5 py-5 sm:px-6">
            <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 sm:text-xs">
                  Income
                </div>
                <div className="mt-2 text-base font-semibold text-emerald-200 sm:text-lg">
                  {formatIDRCompact(income)}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 sm:text-xs">
                  Expense
                </div>
                <div className="mt-2 text-base font-semibold text-red-200 sm:text-lg">
                  {formatIDRCompact(expense)}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 sm:text-xs">
                  Budget
                </div>
                <div className="mt-2 text-base font-semibold text-zinc-100 sm:text-lg">
                  {budgetAmount === null ? 'Draft' : `${Math.round((budgetRatio ?? 0) * 100)}%`}
                </div>
              </div>
            </div>
            {budgetRatio !== null ? (
              <Progress value={budgetRatio} tone={budgetTone} />
            ) : (
              <div className="rounded-[22px] border border-dashed border-white/10 px-4 py-4 text-sm text-zinc-500">
                Budget belum diset untuk bulan ini.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,.95fr)]">
        <div className="app-surface overflow-hidden">
          <div className="app-panel-header">
            <div>
              <div className="text-sm font-semibold">Notes desk</div>
              <div className="mt-1 text-xs text-zinc-500">
                Buka note terbaru langsung ke panel editor.
              </div>
            </div>
            <Link
              href="/app/notes"
              className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-zinc-100 transition-colors hover:bg-white/[0.05]">
              Buka notes
            </Link>
          </div>
          <div className="app-list">
            {noteDesk.length === 0 ? (
              <EmptyState message="Belum ada note yang bisa dibuka." />
            ) : (
              noteDesk.map((note) => (
                <Link
                  key={note.id}
                  href={`/app/notes/${note.id}`}
                  className="app-list-row block transition-colors hover:bg-white/[0.02]">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="truncate text-sm font-semibold text-zinc-100">
                          {note.title}
                        </div>
                        {note.pinned ? (
                          <span className="rounded-full border border-blue-500/30 bg-blue-500/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-100">
                            Pin
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-2 line-clamp-2 text-sm leading-relaxed text-zinc-400">
                        {note.content || 'Belum ada isi note.'}
                      </div>
                    </div>
                    <div className="shrink-0 text-[11px] font-medium text-zinc-500">
                      {note.updatedAt ? formatDateTime(note.updatedAt) : 'Draft'}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="app-surface overflow-hidden">
          <div className="app-panel-header">
            <div>
              <div className="text-sm font-semibold">Recently done</div>
              <div className="mt-1 text-xs text-zinc-500">
                Sedikit jejak progres biar kerjaan tetap kebaca.
              </div>
            </div>
          </div>
          <div className="app-list">
            {recentlyDone.length === 0 ? (
              <EmptyState message="Belum ada task yang selesai." />
            ) : (
              recentlyDone.map((task) => (
                <div key={task.id} className="app-list-row">
                  <div className="text-sm font-semibold text-zinc-100">{task.title}</div>
                  <div className="mt-1 text-xs text-zinc-500">
                    {task.completedAt
                      ? `Selesai ${formatDateShort(task.completedAt)}`
                      : 'Task selesai'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
