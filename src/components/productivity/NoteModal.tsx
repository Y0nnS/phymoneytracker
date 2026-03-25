'use client';

import React from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/components/ui/Toast';
import { addNote, updateNote } from '@/lib/firebase/notes';
import { NOTE_CATEGORY_OPTIONS } from '@/lib/productivity';
import type { Note } from '@/lib/types';

export function NoteModal({
  uid,
  open,
  onClose,
  initialNote,
}: {
  uid: string;
  open: boolean;
  onClose: () => void;
  initialNote?: Note | null;
}) {
  const toast = useToast();
  const [title, setTitle] = React.useState('');
  const [content, setContent] = React.useState('');
  const [category, setCategory] = React.useState('General');
  const [pinned, setPinned] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setTitle(initialNote?.title ?? '');
    setContent(initialNote?.content ?? '');
    setCategory(initialNote?.category ?? 'General');
    setPinned(initialNote?.pinned ?? false);
    setSubmitting(false);
    setError(null);
  }, [open, initialNote]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanTitle = title.trim();
    const cleanContent = content.trim();

    if (!cleanTitle && !cleanContent) {
      setError('Please add a title or content.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        title: cleanTitle || 'Quick note',
        content: cleanContent,
        category,
        pinned,
      };

      if (initialNote) {
        await updateNote(uid, initialNote.id, payload);
        toast.success('Note updated.');
      } else {
        await addNote(uid, payload);
        toast.success('Note saved.');
      }

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save note.');
      toast.danger('Failed to save note.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} title={initialNote ? 'Edit note' : 'New note'} onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {error ? <Alert variant="danger">{error}</Alert> : null}

        <Input
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Morning dump / Meeting recap"
        />

        <div className="grid gap-4 md:grid-cols-2">
          <Select
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}>
            {NOTE_CATEGORY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-200">Pin to top</span>
            <label className="flex h-10 items-center gap-3 rounded-md border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={pinned}
                onChange={(e) => setPinned(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-blue-500"
              />
              Pinned note
            </label>
          </label>
        </div>

        <Textarea
          label="Content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write ideas, meeting notes, or reminders..."
          className="min-h-[180px]"
        />

        <div className="flex items-center justify-end gap-3">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Saving…' : initialNote ? 'Save changes' : 'Save note'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
