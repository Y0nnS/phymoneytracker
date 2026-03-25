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
  parseTags,
  tagsToInput,
} from '@/lib/productivity';
import type { Task, TaskPriority, TaskStatus } from '@/lib/types';

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
  const [category, setCategory] = React.useState('General');
  const [dueDate, setDueDate] = React.useState('');
  const [estimateMinutes, setEstimateMinutes] = React.useState('');
  const [tags, setTags] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const isEditing = Boolean(initialTask);

  React.useEffect(() => {
    if (!open) return;
    setTitle(initialTask?.title ?? '');
    setDescription(initialTask?.description ?? '');
    setStatus(initialTask?.status ?? 'inbox');
    setPriority(initialTask?.priority ?? 'medium');
    setCategory(initialTask?.category ?? 'General');
    setDueDate(initialTask?.dueDate ? dateToISO(initialTask.dueDate) : '');
    setEstimateMinutes(
      typeof initialTask?.estimateMinutes === 'number'
        ? String(initialTask.estimateMinutes)
        : '',
    );
    setTags(initialTask?.tags ? tagsToInput(initialTask.tags) : '');
    setSubmitting(false);
    setError(null);
  }, [open, initialTask]);

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

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        title: cleanTitle,
        description: description.trim(),
        status,
        priority,
        category: category.trim() || 'General',
        dueDate: nextDueDate,
        estimateMinutes: numericEstimate === null ? null : Math.round(numericEstimate),
        tags: parseTags(tags),
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
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Work, Personal, Study"
          />
          <Input
            label="Due date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Estimate (minutes)"
            type="number"
            min={0}
            step={5}
            value={estimateMinutes}
            onChange={(e) => setEstimateMinutes(e.target.value)}
            placeholder="25"
          />
          <Input
            label="Tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="frontend, urgent, deep work"
            hint="Separate with commas"
          />
        </div>

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
