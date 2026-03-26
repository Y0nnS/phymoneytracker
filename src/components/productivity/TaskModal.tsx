'use client';

import React from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/components/ui/Toast';
import { addTask, updateTask } from '@/lib/firebase/tasks';
import { dateToISO } from '@/lib/date';
import {
  TASK_PRIORITY_OPTIONS,
  TASK_STATUS_OPTIONS,
} from '@/lib/productivity';
import type { Task, TaskPriority, TaskStatus } from '@/lib/types';

const MAX_TASK_TAGS = 12;

function normalizeTag(tag: string) {
  return tag.trim().replace(/\s+/g, ' ');
}

function dedupeTags(values: string[]) {
  const next: string[] = [];
  const seen = new Set<string>();

  values.forEach((value) => {
    const tag = normalizeTag(value);
    const key = tag.toLowerCase();

    if (!tag || seen.has(key) || next.length >= MAX_TASK_TAGS) return;

    seen.add(key);
    next.push(tag);
  });

  return next;
}

function parseTagDraft(value: string) {
  return dedupeTags(value.split(','));
}

function mergeTags(existing: string[], draft: string) {
  return dedupeTags([...existing, ...parseTagDraft(draft)]);
}

function initialTaskTags(task?: Task | null) {
  if (!task) return [];
  if (task.tags.length > 0) return dedupeTags(task.tags);

  const fallback = normalizeTag(task.category);
  if (!fallback || fallback.toLowerCase() === 'general') return [];

  return [fallback];
}

export function TaskModal({
  uid,
  open,
  onClose,
  initialTask,
}: {
  uid: string;
  open: boolean;
  onClose: () => void;
  initialTask?: Task | null;
}) {
  const toast = useToast();
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [status, setStatus] = React.useState<TaskStatus>('inbox');
  const [priority, setPriority] = React.useState<TaskPriority>('medium');
  const [dueDate, setDueDate] = React.useState('');
  const [estimateMinutes, setEstimateMinutes] = React.useState('');
  const [tags, setTags] = React.useState<string[]>([]);
  const [tagInput, setTagInput] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const isEditing = Boolean(initialTask);
  const tagLimitReached = tags.length >= MAX_TASK_TAGS;

  React.useEffect(() => {
    if (!open) return;
    setTitle(initialTask?.title ?? '');
    setDescription(initialTask?.description ?? '');
    setStatus(initialTask?.status ?? 'inbox');
    setPriority(initialTask?.priority ?? 'medium');
    setDueDate(initialTask?.dueDate ? dateToISO(initialTask.dueDate) : '');
    setEstimateMinutes(
      typeof initialTask?.estimateMinutes === 'number'
        ? String(initialTask.estimateMinutes)
        : '',
    );
    setTags(initialTaskTags(initialTask));
    setTagInput('');
    setSubmitting(false);
    setError(null);
  }, [open, initialTask]);

  function commitTagInput() {
    if (!tagInput.trim()) return;
    setTags((current) => mergeTags(current, tagInput));
    setTagInput('');
  }

  function removeTag(tagToRemove: string) {
    setTags((current) => current.filter((tag) => tag !== tagToRemove));
  }

  function onTagKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if ((event.key === 'Enter' || event.key === ',' || event.key === 'Tab') && tagInput.trim()) {
      event.preventDefault();
      commitTagInput();
      return;
    }

    if (event.key === 'Backspace' && !tagInput) {
      event.preventDefault();
      setTags((current) => current.slice(0, -1));
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError('Task title is required.');
      return;
    }

    const numericEstimate = estimateMinutes.trim() ? Number(estimateMinutes) : null;
    if (
      numericEstimate !== null &&
      (!Number.isFinite(numericEstimate) || numericEstimate < 0)
    ) {
      setError('Estimate must be a valid number.');
      return;
    }

    const nextDueDate = dueDate ? new Date(`${dueDate}T00:00:00`) : null;
    if (nextDueDate && Number.isNaN(nextDueDate.getTime())) {
      setError('Task date is invalid.');
      return;
    }

    const nextTags = mergeTags(tags, tagInput);

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        title: cleanTitle,
        description: description.trim(),
        status,
        priority,
        category: nextTags[0] ?? 'General',
        dueDate: nextDueDate,
        estimateMinutes: numericEstimate === null ? null : Math.round(numericEstimate),
        tags: nextTags,
        completedAt: status === 'done' ? initialTask?.completedAt ?? new Date() : null,
      };

      if (initialTask) {
        await updateTask(uid, initialTask.id, payload);
        toast.success('Task updated.');
      } else {
        await addTask(uid, payload);
        toast.success('Task saved.');
      }

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save task.');
      toast.danger('Failed to save task.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} title={isEditing ? 'Edit task' : 'New task'} onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {error ? <Alert variant="danger">{error}</Alert> : null}

        <Input
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Example: Finalize landing page"
          required
        />

        <Textarea
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Short details or extra checklist"
        />

        <div className="grid gap-4 md:grid-cols-2">
          <Select
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as TaskStatus)}>
            {TASK_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Select
            label="Priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as TaskPriority)}>
            {TASK_PRIORITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Due date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
          <Input
            label="Estimate (minutes)"
            type="number"
            min={0}
            step={5}
            value={estimateMinutes}
            onChange={(e) => setEstimateMinutes(e.target.value)}
            placeholder="25"
          />
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-zinc-200">Tags</span>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 px-3 py-3 transition-colors focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20">
            <div className="flex flex-wrap items-center gap-2">
              {tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/12 px-3 py-1.5 text-[12px] font-semibold text-blue-100 transition-colors hover:border-blue-400/40 hover:bg-blue-500/18">
                  <span>{tag}</span>
                  <span aria-hidden="true" className="text-blue-200/70">×</span>
                </button>
              ))}

              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={onTagKeyDown}
                onBlur={() => commitTagInput()}
                placeholder={tagLimitReached ? 'Tag limit reached' : tags.length > 0 ? 'Add another tag' : 'Type a tag and press Enter'}
                disabled={tagLimitReached}
                className="min-w-[160px] flex-1 border-0 bg-transparent px-1 py-1 text-[13px] text-zinc-100 outline-none placeholder:text-zinc-500 disabled:cursor-not-allowed disabled:text-zinc-500 sm:text-sm"
              />
            </div>
          </div>
          <span className="text-[11px] text-zinc-500 sm:text-xs">
            Press Enter, comma, or Tab to add tags. Click a tag to remove it.
          </span>
        </label>

        <div className="flex items-center justify-end gap-3">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Saving…' : isEditing ? 'Save changes' : 'Save task'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
