'use client';

export const dynamic = 'force-dynamic';

import React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { TaskModal } from '@/components/productivity/TaskModal';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import { useTasks } from '@/hooks/useTasks';
import { deleteTask, updateTask } from '@/lib/firebase/tasks';
import { formatDateShort } from '@/lib/date';
import {
  TASK_PRIORITY_OPTIONS,
  TASK_STATUS_OPTIONS,
  priorityTone,
  sortTasks,
  taskStatusTone,
} from '@/lib/productivity';
import type { Task, TaskPriority, TaskStatus } from '@/lib/types';

type StatusFilter = 'all' | TaskStatus;
type PriorityFilter = 'all' | TaskPriority;

function TaskEmpty({ message }: { message: string }) {
  return <div className="px-4 py-4 text-[12px] text-zinc-500 sm:py-5 sm:text-sm">{message}</div>;
}

export default function TasksPage() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const toast = useToast();
  const { tasks, loading, error } = useTasks(user?.uid);

  const [query, setQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('all');
  const [priorityFilter, setPriorityFilter] = React.useState<PriorityFilter>('all');
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingTask, setEditingTask] = React.useState<Task | null>(null);
  const [pendingDelete, setPendingDelete] = React.useState<Task | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [updatingId, setUpdatingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (searchParams.get('compose') === 'task') {
      setEditingTask(null);
      setModalOpen(true);
    }
  }, [searchParams]);

  function closeModal() {
    setModalOpen(false);
    setEditingTask(null);
    if (searchParams.get('compose')) router.replace(pathname);
  }

  const filteredTasks = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    return sortTasks(tasks).filter((task) => {
      if (statusFilter !== 'all' && task.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;
      if (!needle) return true;
      return (
        task.title.toLowerCase().includes(needle) ||
        task.description.toLowerCase().includes(needle) ||
        task.category.toLowerCase().includes(needle) ||
        task.tags.some((tag) => tag.toLowerCase().includes(needle))
      );
    });
  }, [tasks, query, statusFilter, priorityFilter]);

  const groups = React.useMemo(
    () =>
      TASK_STATUS_OPTIONS.map((status) => ({
        ...status,
        items: filteredTasks.filter((task) => task.status === status.value),
      })),
    [filteredTasks],
  );

  async function moveTask(task: Task, nextStatus: TaskStatus) {
    if (!user) return;
    setUpdatingId(task.id);
    try {
      await updateTask(user.uid, task.id, {
        status: nextStatus,
        completedAt: nextStatus === 'done' ? task.completedAt ?? new Date() : null,
      });
      toast.success('Status task diperbarui.');
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : 'Gagal update status task.');
    } finally {
      setUpdatingId(null);
    }
  }

  async function onDeleteTask() {
    if (!user || !pendingDelete) return;
    setDeleting(true);
    try {
      await deleteTask(user.uid, pendingDelete.id);
      toast.success('Task dihapus.');
      setPendingDelete(null);
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : 'Gagal menghapus task.');
    } finally {
      setDeleting(false);
    }
  }

  const doneCount = tasks.filter((task) => task.status === 'done').length;
  const activeCount = tasks.filter((task) => task.status !== 'done').length;
  const highPriorityCount = tasks.filter(
    (task) => task.status !== 'done' && task.priority === 'high',
  ).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-[13px] text-zinc-400 sm:text-sm">Execution layer</div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Tasks</h1>
          </div>
          <Button onClick={() => setModalOpen(true)}>Task baru</Button>
        </div>

        <section className="app-strip">
          <div className="app-strip-grid md:grid-cols-3">
            <div className="app-strip-cell">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">Active</div>
              <div className="mt-2 text-2xl font-semibold text-blue-200">{activeCount}</div>
            </div>
            <div className="app-strip-cell">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">High priority</div>
              <div className="mt-2 text-2xl font-semibold text-red-200">{highPriorityCount}</div>
            </div>
            <div className="app-strip-cell">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">Done</div>
              <div className="mt-2 text-2xl font-semibold text-emerald-200">{doneCount}</div>
            </div>
          </div>
        </section>

        <section className="app-surface">
          <div className="grid gap-3 px-4 py-4 sm:px-5 md:grid-cols-[1.2fr_180px_180px]">
            <Input
              label="Cari task"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Judul, kategori, tag, atau deskripsi"
            />
            <Select
              label="Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}>
              <option value="all">Semua status</option>
              {TASK_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <Select
              label="Prioritas"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as PriorityFilter)}>
              <option value="all">Semua prioritas</option>
              {TASK_PRIORITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        </section>
      </div>

      {error ? <Alert variant="danger">{error}</Alert> : null}

      <section className="app-surface overflow-hidden">
        <div className="grid gap-0 xl:grid-cols-4 xl:divide-x xl:divide-white/10">
        {groups.map((group) => (
          <section key={group.value} className="min-w-0 border-b border-white/10 xl:border-b-0">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3.5 sm:py-4">
              <div>
                <div className="text-[13px] font-semibold sm:text-sm">{group.label}</div>
                <div className="text-[11px] text-zinc-500 sm:text-xs">{group.items.length} task</div>
              </div>
              <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${taskStatusTone(group.value)}`}>
                {group.label}
              </span>
            </div>

            <div className="divide-y divide-white/10">
              {loading ? (
                <TaskEmpty message="Memuat…" />
              ) : group.items.length === 0 ? (
                <TaskEmpty message="Tidak ada task." />
              ) : (
                group.items.map((task) => (
                  <div key={task.id} className="px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="break-words text-[13px] font-semibold text-zinc-100 sm:text-sm">{task.title}</div>
                        <div className="mt-1 text-[11px] text-zinc-500 sm:text-xs">
                          {task.category}
                          {task.dueDate ? ` • ${formatDateShort(task.dueDate)}` : ''}
                        </div>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${priorityTone(task.priority)}`}>
                        {task.priority}
                      </span>
                    </div>

                    {task.description ? (
                      <div className="mt-3 break-words text-[12px] leading-relaxed text-zinc-400 sm:text-sm">
                        {task.description}
                      </div>
                    ) : null}

                    {task.tags.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {task.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-[11px] font-semibold text-zinc-300">
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    <div className="mt-4 flex flex-wrap gap-2">
                      {task.status !== 'today' ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="min-w-[92px] flex-1 sm:flex-none"
                          onClick={() => moveTask(task, 'today')}
                          disabled={updatingId === task.id}>
                          Today
                        </Button>
                      ) : null}
                      {task.status !== 'in_progress' ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="min-w-[92px] flex-1 sm:flex-none"
                          onClick={() => moveTask(task, 'in_progress')}
                          disabled={updatingId === task.id}>
                          Doing
                        </Button>
                      ) : null}
                      {task.status !== 'done' ? (
                        <Button
                          size="sm"
                          className="min-w-[92px] flex-1 sm:flex-none"
                          onClick={() => moveTask(task, 'done')}
                          disabled={updatingId === task.id}>
                          Done
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="min-w-[92px] flex-1 sm:flex-none"
                          onClick={() => moveTask(task, 'today')}
                          disabled={updatingId === task.id}>
                          Reopen
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="min-w-[92px] flex-1 sm:flex-none"
                        onClick={() => {
                          setEditingTask(task);
                          setModalOpen(true);
                        }}>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        className="min-w-[92px] flex-1 sm:flex-none"
                        onClick={() => setPendingDelete(task)}>
                        Hapus
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        ))}
        </div>
      </section>

      {user ? (
        <TaskModal
          uid={user.uid}
          open={modalOpen}
          onClose={closeModal}
          initialTask={editingTask}
        />
      ) : null}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Hapus task?"
        description={
          pendingDelete
            ? `Task “${pendingDelete.title}” akan dihapus permanen dari workspace.`
            : 'Task akan dihapus permanen.'
        }
        confirmText="Hapus"
        confirmVariant="danger"
        confirming={deleting}
        onConfirm={onDeleteTask}
        onClose={() => {
          if (!deleting) setPendingDelete(null);
        }}
      />
    </div>
  );
}
