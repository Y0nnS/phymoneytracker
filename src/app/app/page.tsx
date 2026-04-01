'use client';

import Link from 'next/link';
import React from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { ExpenseByCategoryChart } from '@/components/charts/ExpenseByCategoryChart';
import { MonthlyNetChart } from '@/components/charts/MonthlyNetChart';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { useFocusSessions } from '@/hooks/useFocusSessions';
import { useGoals } from '@/hooks/useGoals';
import { useNotes } from '@/hooks/useNotes';
import { usePlannerBlocks } from '@/hooks/usePlannerBlocks';
import { useTasks } from '@/hooks/useTasks';
import { useTransactions } from '@/hooks/useTransactions';
import { formatDateShort, formatDateTime, monthIdFromDate, todayDateId } from '@/lib/date';
import {
  isTrackedTransaction,
  monthIdLabel,
  monthlyFinanceSnapshot,
  sortTransactionsNewestFirst,
  transactionsForMonth,
} from '@/lib/insights';
import { formatIDRCompact } from '@/lib/money';
import {
  goalProgress,
  goalTone,
  minutesLabel,
  plannerTone,
  priorityTone,
  sortGoals,
  sortPlannerBlocks,
  sortTasks,
  taskStatusTone,
} from '@/lib/productivity';
import type { PlannerBlock } from '@/lib/types';

function SectionCard({
  eyebrow,
  title,
  description,
  action,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(16,16,18,0.97),rgba(7,7,8,0.98))] shadow-[0_30px_80px_-58px_rgba(0,0,0,0.95)]">
      <div className="flex flex-col gap-4 border-b border-white/10 px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div className="min-w-0">
          {eyebrow ? (
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
              {eyebrow}
            </div>
          ) : null}
          <h2 className="mt-2 text-lg font-semibold tracking-tight text-white">{title}</h2>
          {description ? <p className="mt-1 text-sm text-zinc-400">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

function StatTile({
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
    <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">{title}</div>
      <div className={`mt-3 text-2xl font-semibold tracking-tight ${toneClass}`}>{value}</div>
      <div className="mt-1 text-sm text-zinc-400">{subtitle}</div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-[22px] border border-dashed border-white/10 bg-black/20 px-4 py-5 text-sm text-zinc-500">
      {message}
    </div>
  );
}

function formatEnumLabel(value: string) {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return 0;
  return hours * 60 + minutes;
}

function plannerBlockMinutes(block: PlannerBlock) {
  return Math.max(0, timeToMinutes(block.endTime) - timeToMinutes(block.startTime));
}

export default function WorkspacePage() {
  const { user } = useAuth();
  const monthId = React.useMemo(() => monthIdFromDate(new Date()), []);
  const todayId = React.useMemo(() => todayDateId(), []);
  const todayLabel = React.useMemo(() => formatDateShort(new Date()), []);
  const currentMonthLabel = React.useMemo(() => monthIdLabel(monthId), [monthId]);

  const { tasks, error: taskError } = useTasks(user?.uid);
  const { notes, error: noteError } = useNotes(user?.uid);
  const { transactions, error: financeError } = useTransactions(user?.uid);
  const { blocks, error: plannerError } = usePlannerBlocks(user?.uid);
  const { goals, error: goalError } = useGoals(user?.uid);
  const { sessions, error: focusError } = useFocusSessions(user?.uid);

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
  const highPriorityTodayCount = React.useMemo(
    () => todayTasks.filter((task) => task.priority === 'high').length,
    [todayTasks],
  );
  const recentlyDone = React.useMemo(
    () => sortTasks(tasks).filter((task) => task.status === 'done').slice(0, 4),
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
  const featuredNote = noteDesk[0] ?? null;
  const supportingNotes = noteDesk.slice(1, 5);
  const pinnedNotes = React.useMemo(() => notes.filter((note) => note.pinned).length, [notes]);

  const trackedTransactions = React.useMemo(
    () => sortTransactionsNewestFirst(transactions.filter((transaction) => isTrackedTransaction(transaction))),
    [transactions],
  );
  const monthTransactions = React.useMemo(
    () => transactionsForMonth(trackedTransactions, monthId),
    [trackedTransactions, monthId],
  );
  const financeSnapshot = React.useMemo(
    () => monthlyFinanceSnapshot(trackedTransactions, monthId),
    [trackedTransactions, monthId],
  );
  const income = financeSnapshot.availableIncome;
  const expense = financeSnapshot.expense;
  const monthDelta = financeSnapshot.monthChange;
  const net = financeSnapshot.closingBalance;
  const openingBalance = financeSnapshot.openingBalance;

  const todayPlannerBlocks = React.useMemo(
    () => sortPlannerBlocks(blocks).filter((block) => block.date === todayId),
    [blocks, todayId],
  );
  const plannedTodayMinutes = React.useMemo(
    () => todayPlannerBlocks.reduce((sum, block) => sum + plannerBlockMinutes(block), 0),
    [todayPlannerBlocks],
  );
  const currentTimeMinutes = React.useMemo(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  }, []);
  const nextPlannerBlock = React.useMemo(
    () =>
      todayPlannerBlocks.find((block) => timeToMinutes(block.endTime) >= currentTimeMinutes) ??
      todayPlannerBlocks[0] ??
      null,
    [currentTimeMinutes, todayPlannerBlocks],
  );

  const activeGoals = React.useMemo(
    () => sortGoals(goals).filter((goal) => goal.status !== 'completed'),
    [goals],
  );
  const completedGoalsCount = React.useMemo(
    () => goals.filter((goal) => goal.status === 'completed').length,
    [goals],
  );

  const recentSessions = React.useMemo(
    () => sessions.slice().sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime()),
    [sessions],
  );
  const latestSession = recentSessions[0] ?? null;
  const sessionsThisMonth = React.useMemo(
    () => sessions.filter((session) => monthIdFromDate(session.startedAt) === monthId),
    [sessions, monthId],
  );
  const focusMonthMinutes = React.useMemo(
    () => sessionsThisMonth.reduce((sum, session) => sum + session.actualMinutes, 0),
    [sessionsThisMonth],
  );

  const combinedErrors = [
    taskError,
    noteError,
    financeError,
    plannerError,
    goalError,
    focusError,
  ].filter(Boolean);

  return (
    <div className="mx-auto flex w-full max-w-[1560px] flex-col gap-6 pb-8">
      {combinedErrors.length > 0 ? <Alert variant="danger">{combinedErrors[0]}</Alert> : null}

      <section className="overflow-hidden rounded-[34px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.09),transparent_26%),radial-gradient(circle_at_82%_18%,rgba(34,197,94,0.08),transparent_24%),linear-gradient(180deg,rgba(15,15,17,0.99),rgba(5,5,6,0.98))] p-5 shadow-[0_34px_110px_-62px_rgba(0,0,0,0.98)] sm:p-7">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.16fr)_360px]">
          <div className="min-w-0">
            <div className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-300">
              Workspace overview
            </div>
            <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-4xl xl:text-[3.35rem]">
              Run the whole workspace from one clean surface.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-300 sm:text-base">
              Money, tasks, notes, goals, and focus are arranged as one operating board with a
              darker, calmer layout and fewer cramped panels.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/app/tasks?compose=task">
                <Button>New task</Button>
              </Link>
              <Link href="/app/notes?compose=note">
                <Button variant="secondary">New note</Button>
              </Link>
              <Link href="/app/finance">
                <Button variant="secondary">Open finance</Button>
              </Link>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
              <StatTile
                title="Net balance"
                value={formatIDRCompact(net)}
                subtitle="Current closing balance."
                toneClass={net >= 0 ? 'text-emerald-200' : 'text-red-200'}
              />
              <StatTile
                title="Today queue"
                value={String(todayTasks.length)}
                subtitle={`${highPriorityTodayCount} high priority tasks live now.`}
              />
              <StatTile
                title="Focus month"
                value={minutesLabel(focusMonthMinutes)}
                subtitle={`${sessionsThisMonth.length} sessions recorded.`}
                toneClass="text-sky-200"
              />
              <StatTile
                title="Pinned notes"
                value={String(pinnedNotes)}
                subtitle={`${noteDesk.length} notes ready to reopen.`}
              />
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-[24px] border border-white/10 bg-black/28 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                    Live board
                  </div>
                  <div className="mt-2 text-sm text-zinc-400">Core signals for today and this month.</div>
                </div>
                <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-100">
                  Live
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-[18px] border border-white/10 bg-white/[0.03] p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                    Today
                  </div>
                  <div className="mt-2 text-lg font-semibold text-white">{todayLabel}</div>
                  <div className="mt-1 text-sm text-zinc-400">{currentMonthLabel}</div>
                </div>
                <div className="rounded-[18px] border border-white/10 bg-white/[0.03] p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                    Next planner block
                  </div>
                  {nextPlannerBlock ? (
                    <>
                      <div className="mt-2 truncate text-lg font-semibold text-white">{nextPlannerBlock.title}</div>
                      <div className="mt-1 text-sm text-zinc-400">
                        {nextPlannerBlock.startTime} - {nextPlannerBlock.endTime} • {formatEnumLabel(nextPlannerBlock.type)}
                      </div>
                    </>
                  ) : (
                    <div className="mt-2 text-sm text-zinc-400">No planner block scheduled yet.</div>
                  )}
                </div>
                <div className="rounded-[18px] border border-white/10 bg-white/[0.03] p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                    Month delta
                  </div>
                  <div className={`mt-2 text-lg font-semibold ${monthDelta >= 0 ? 'text-emerald-200' : 'text-red-200'}`}>
                    {formatIDRCompact(monthDelta)}
                  </div>
                  <div className="mt-1 text-sm text-zinc-400">Income minus expense this month.</div>
                </div>
                <div className="rounded-[18px] border border-white/10 bg-white/[0.03] p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                    Carry-over
                  </div>
                  <div className="mt-2 text-lg font-semibold text-white">
                    {formatIDRCompact(openingBalance)}
                  </div>
                  <div className="mt-1 text-sm text-zinc-400">
                    Balance brought in from previous months.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <SectionCard
        eyebrow="Finance"
        title="Finance command"
        description={`A full-width finance view for ${currentMonthLabel}, with simple monthly totals and carry-over balance.`}
        action={
          <Link
            href="/app/finance"
            className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-zinc-100 transition-colors hover:bg-white/[0.06]">
            Open finance
          </Link>
        }>
          <div className="grid gap-5 px-5 py-5 sm:px-6">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <StatTile title="Income" value={formatIDRCompact(income)} subtitle="Carry-over plus income this month." toneClass="text-emerald-200" />
              <StatTile title="Expense" value={formatIDRCompact(expense)} subtitle="Cash out this month." toneClass="text-red-200" />
              <StatTile title="Net total" value={formatIDRCompact(net)} subtitle="Closing balance for the current month." toneClass={net >= 0 ? 'text-sky-200' : 'text-red-200'} />
              <StatTile title="Entries" value={String(monthTransactions.length)} subtitle="Recorded income and expense entries." />
            </div>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_360px]">
              <div className="min-w-0 rounded-[24px] border border-white/10 bg-black/20 px-4 py-4">
                <MonthlyNetChart monthId={monthId} transactions={trackedTransactions} rangeMonths={6} />
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-[20px] border border-white/10 bg-black/20 px-4 py-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                    Opening balance
                  </div>
                  <div className="mt-3 text-2xl font-semibold tracking-tight text-zinc-100">
                    {formatIDRCompact(openingBalance)}
                  </div>
                  <div className="mt-2 text-sm text-zinc-400">
                    Balance carried from previous months.
                  </div>
                </div>
                <div className="rounded-[20px] border border-white/10 bg-black/20 px-4 py-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                    Month move
                  </div>
                  <div className={`mt-3 text-2xl font-semibold tracking-tight ${monthDelta >= 0 ? 'text-emerald-200' : 'text-red-200'}`}>
                    {formatIDRCompact(monthDelta)}
                  </div>
                  <div className="mt-2 text-sm text-zinc-400">
                    Income minus expense for {currentMonthLabel}.
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-black/20 px-4 py-4">
              <ExpenseByCategoryChart monthTransactions={monthTransactions} />
            </div>
          </div>
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(320px,.92fr)]">
        <SectionCard
          eyebrow="Tasks"
          title="Daily execution"
          description="Current tasks that deserve attention before the day drifts."
          action={
            <Link
              href="/app/tasks"
              className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-zinc-100 transition-colors hover:bg-white/[0.06]">
              Open tasks
            </Link>
          }>
          <div className="space-y-3 px-5 py-5 sm:px-6">
            {todayTasks.length === 0 ? (
              <EmptyState message="No tasks scheduled for today." />
            ) : (
              todayTasks.slice(0, 5).map((task) => (
                <div key={task.id} className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-zinc-100 sm:text-base">{task.title}</div>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-500">
                        {task.category ? <span>{task.category}</span> : null}
                        {task.dueDate ? <span>Due {formatDateShort(task.dueDate)}</span> : null}
                        {task.estimateMinutes ? <span>{minutesLabel(task.estimateMinutes)}</span> : null}
                      </div>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${taskStatusTone(task.status)}`}>
                        {formatEnumLabel(task.status)}
                      </span>
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${priorityTone(task.priority)}`}>
                        {task.priority}
                      </span>
                    </div>
                  </div>
                  {task.description ? <div className="mt-3 text-sm leading-relaxed text-zinc-400">{task.description}</div> : null}
                </div>
              ))
            )}
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Rhythm"
          title="Today plan"
          description="Planner blocks and focus signals arranged in a simpler column.">
          <div className="grid gap-3 px-5 py-5 sm:px-6">
            <div className="grid gap-3 sm:grid-cols-2">
              <StatTile title="Planned time" value={minutesLabel(plannedTodayMinutes)} subtitle={`${todayPlannerBlocks.length} blocks scheduled.`} />
              <StatTile title="Latest focus" value={latestSession ? minutesLabel(latestSession.actualMinutes) : '0m'} subtitle={latestSession ? formatEnumLabel(latestSession.mode) : 'No session recorded yet.'} toneClass="text-sky-200" />
            </div>

            <div className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Upcoming block</div>
              {nextPlannerBlock ? (
                <div className="mt-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-base font-semibold text-white">{nextPlannerBlock.title}</div>
                    <div className="mt-1 text-sm text-zinc-400">
                      {nextPlannerBlock.startTime} - {nextPlannerBlock.endTime} • {minutesLabel(plannerBlockMinutes(nextPlannerBlock))}
                    </div>
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${plannerTone(nextPlannerBlock.type)}`}>
                    {formatEnumLabel(nextPlannerBlock.type)}
                  </span>
                </div>
              ) : (
                <div className="mt-3 text-sm text-zinc-400">No upcoming block for today.</div>
              )}
            </div>

            <div className="space-y-3">
              {todayPlannerBlocks.length === 0 ? (
                <EmptyState message="No planner blocks set for today." />
              ) : (
                todayPlannerBlocks.slice(0, 3).map((block) => (
                  <div key={block.id} className="rounded-[20px] border border-white/10 bg-black/20 px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-zinc-100">{block.title}</div>
                        <div className="mt-1 text-sm text-zinc-400">{block.startTime} - {block.endTime}</div>
                      </div>
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${plannerTone(block.type)}`}>
                        {formatEnumLabel(block.type)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.06fr)_minmax(320px,.94fr)]">
        <SectionCard
          eyebrow="Notes"
          title="Notes desk"
          description="One featured note and a tighter reopen list with more breathing room."
          action={
            <Link
              href="/app/notes"
              className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-zinc-100 transition-colors hover:bg-white/[0.06]">
              Open notes
            </Link>
          }>
          <div className="grid gap-4 px-5 py-5 sm:px-6 lg:grid-cols-[minmax(0,1.14fr)_280px]">
            <div className="min-w-0 rounded-[24px] border border-white/10 bg-black/20 p-5">
              {featuredNote ? (
                <Link href={`/app/notes/${featuredNote.id}`} className="block">
                  <div className="flex items-center gap-2">
                    <div className="text-lg font-semibold tracking-tight text-white">{featuredNote.title}</div>
                    {featuredNote.pinned ? (
                      <span className="rounded-full border border-sky-400/20 bg-sky-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-100">
                        Pin
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-3 line-clamp-6 text-sm leading-7 text-zinc-300">{featuredNote.content || 'No note content yet.'}</div>
                  <div className="mt-4 text-xs text-zinc-500">{featuredNote.updatedAt ? formatDateTime(featuredNote.updatedAt) : 'Draft'}</div>
                </Link>
              ) : (
                <EmptyState message="No notes available yet." />
              )}
            </div>

            <div className="space-y-3">
              {supportingNotes.length === 0 ? (
                <EmptyState message="No additional notes to show." />
              ) : (
                supportingNotes.map((note) => (
                  <Link key={note.id} href={`/app/notes/${note.id}`} className="block rounded-[20px] border border-white/10 bg-black/20 px-4 py-4 transition-colors hover:bg-white/[0.03]">
                    <div className="truncate text-sm font-semibold text-zinc-100">{note.title}</div>
                    <div className="mt-2 line-clamp-2 text-sm text-zinc-400">{note.content || 'No note content yet.'}</div>
                    <div className="mt-3 text-xs text-zinc-500">{note.updatedAt ? formatDateTime(note.updatedAt) : 'Draft'}</div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </SectionCard>

        <div className="grid gap-6">
          <SectionCard
            eyebrow="Goals"
            title="Momentum"
            description="Goals and progress with a quieter layout and clearer spacing.">
            <div className="grid gap-3 px-5 py-5 sm:px-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <StatTile title="Active goals" value={String(activeGoals.length)} subtitle={`${completedGoalsCount} completed overall.`} />
                <StatTile title="Focus rhythm" value={minutesLabel(focusMonthMinutes)} subtitle={`${sessionsThisMonth.length} sessions this month.`} toneClass="text-sky-200" />
              </div>

              {activeGoals.length === 0 ? (
                <EmptyState message="No active goals right now." />
              ) : (
                activeGoals.slice(0, 3).map((goal) => {
                  const progressValue = Math.round(goalProgress(goal) * 100);
                  const progressLabel = `${goal.currentValue.toLocaleString('en-US')} / ${goal.targetValue.toLocaleString('en-US')}${goal.unit ? ` ${goal.unit}` : ''}`;

                  return (
                    <div key={goal.id} className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-zinc-100 sm:text-base">{goal.title}</div>
                          <div className="mt-1 text-sm text-zinc-400">{goal.deadline ? `Due ${formatDateShort(goal.deadline)}` : 'No deadline set'}</div>
                        </div>
                        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${goalTone(goal.status)}`}>
                          {formatEnumLabel(goal.status)}
                        </span>
                      </div>
                      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/6">
                        <div className="h-full rounded-full bg-sky-300" style={{ width: `${Math.max(progressValue, goal.targetValue > 0 ? 6 : 0)}%` }} />
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-3 text-xs text-zinc-400">
                        <span className="truncate">{progressLabel}</span>
                        <span>{progressValue}%</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="Done"
            title="Recently completed"
            description="A short trail of finished work to keep progress visible.">
            <div className="space-y-3 px-5 py-5 sm:px-6">
              {recentlyDone.length === 0 ? (
                <EmptyState message="No tasks completed yet." />
              ) : (
                recentlyDone.map((task) => (
                  <div key={task.id} className="rounded-[20px] border border-white/10 bg-black/20 px-4 py-4">
                    <div className="text-sm font-semibold text-zinc-100">{task.title}</div>
                    <div className="mt-2 text-xs text-zinc-500">{task.completedAt ? `Completed ${formatDateShort(task.completedAt)}` : 'Task completed'}</div>
                  </div>
                ))
              )}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
