'use client';

import Link from 'next/link';
import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { useNotes } from '@/hooks/useNotes';
import { formatDateTime } from '@/lib/date';
import { deleteNote, updateNote } from '@/lib/firebase/notes';
import { NOTE_CATEGORY_OPTIONS } from '@/lib/productivity';
import type { Note } from '@/lib/types';
import { cn } from '@/lib/utils';

type Draft = {
  title: string;
  content: string;
  category: string;
  pinned: boolean;
};

type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

function draftFromNote(note: Note): Draft {
  return {
    title: note.title === 'Untitled note' ? '' : note.title,
    content: note.content,
    category: note.category || 'General',
    pinned: note.pinned,
  };
}

function normalizeDraft(draft: Draft) {
  return {
    title: draft.title.trim() || 'Untitled note',
    content: draft.content.trim(),
    category: draft.category.trim() || 'General',
    pinned: draft.pinned,
  };
}

function snapshotFromDraft(draft: Draft) {
  return JSON.stringify(normalizeDraft(draft));
}

function snapshotFromNote(note: Note) {
  return JSON.stringify({
    title: note.title.trim() || 'Untitled note',
    content: note.content.trim(),
    category: note.category.trim() || 'General',
    pinned: note.pinned,
  });
}

function saveLabel(state: SaveState, note?: Note) {
  if (state === 'dirty') return 'Unsaved changes';
  if (state === 'saving') return 'Saving changes...';
  if (state === 'error') return 'Autosave failed, try saving again';
  if (note?.updatedAt) return `Saved ${formatDateTime(note.updatedAt)}`;
  return 'Ready to write';
}

export function NoteEditorPane({ noteId }: { noteId: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const { notes, loading, error } = useNotes(user?.uid);
  const note = React.useMemo(
    () => notes.find((item) => item.id === noteId),
    [noteId, notes],
  );

  const categoryOptions = React.useMemo(
    () =>
      Array.from(
        new Set([...NOTE_CATEGORY_OPTIONS, ...notes.map((item) => item.category)]),
      ).sort(),
    [notes],
  );

  const [draft, setDraft] = React.useState<Draft>({
    title: '',
    content: '',
    category: 'General',
    pinned: false,
  });
  const [saveState, setSaveState] = React.useState<SaveState>('idle');
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const lastSyncedSnapshotRef = React.useRef('');
  const currentNoteIdRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!note) return;

    const incomingSnapshot = snapshotFromNote(note);
    if (currentNoteIdRef.current !== note.id) {
      currentNoteIdRef.current = note.id;
      lastSyncedSnapshotRef.current = incomingSnapshot;
      setDraft(draftFromNote(note));
      setSaveState('saved');
      setSaveError(null);
      return;
    }

    const localSnapshot = snapshotFromDraft(draft);
    if (localSnapshot !== lastSyncedSnapshotRef.current) return;
    if (incomingSnapshot === lastSyncedSnapshotRef.current) return;

    lastSyncedSnapshotRef.current = incomingSnapshot;
    setDraft(draftFromNote(note));
    setSaveState('saved');
    setSaveError(null);
  }, [draft, note]);

  const normalizedSnapshot = React.useMemo(() => snapshotFromDraft(draft), [draft]);
  const wordCount = React.useMemo(() => {
    const trimmed = draft.content.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  }, [draft.content]);

  const persistDraft = React.useCallback(
    async (mode: 'auto' | 'manual') => {
      if (!user || !note) return;
      const nextSnapshot = snapshotFromDraft(draft);
      if (mode === 'auto' && nextSnapshot === lastSyncedSnapshotRef.current) {
        setSaveState('saved');
        return;
      }

      setSaveState('saving');
      setSaveError(null);

      try {
        await updateNote(user.uid, note.id, normalizeDraft(draft));
        lastSyncedSnapshotRef.current = nextSnapshot;
        setSaveState('saved');
        if (mode === 'manual') {
          toast.success('Note saved.');
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save note.';
        setSaveError(message);
        setSaveState('error');
        if (mode === 'manual') {
          toast.danger(message);
        }
      }
    },
    [draft, note, toast, user],
  );

  React.useEffect(() => {
    if (!user || !note) return;
    if (normalizedSnapshot === lastSyncedSnapshotRef.current) {
      if (saveState !== 'saving') setSaveState('saved');
      return;
    }

    setSaveState('dirty');
    const timeout = window.setTimeout(() => {
      void persistDraft('auto');
    }, 800);

    return () => window.clearTimeout(timeout);
  }, [normalizedSnapshot, note, persistDraft, saveState, user]);

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey)) return;
      if (event.key.toLowerCase() !== 's') return;
      event.preventDefault();
      void persistDraft('manual');
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [persistDraft]);

  async function onDelete() {
    if (!user || !note) return;
    setDeleting(true);
    try {
      await deleteNote(user.uid, note.id);
      toast.success('Note deleted.');
      router.push('/app/notes');
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : 'Failed to delete note.');
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  }

  if (error) {
    return <Alert variant="danger">{error}</Alert>;
  }

  if (loading && !note) {
    return <div className="px-6 py-8 text-sm text-zinc-400">Loading notes...</div>;
  }

  if (!note) {
    return (
      <div className="flex min-h-[72vh] items-center justify-center px-6 py-10">
        <div className="max-w-md text-center">
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Note not found
          </div>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            This note may have been deleted or the link is no longer valid.
          </p>
          <Link
            href="/app/notes"
            className="mt-5 inline-flex rounded-full border border-white/10 bg-white/[0.03] px-5 py-2.5 text-sm font-semibold text-zinc-200 transition-colors hover:bg-white/[0.05]">
            Back to notes
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="border-b border-white/10 px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500 sm:text-xs">
              Note detail
            </div>
            <div
              className={cn(
                'mt-2 text-[12px] sm:text-sm',
                saveState === 'error' ? 'text-amber-300' : 'text-zinc-400',
              )}>
              {saveLabel(saveState, note)}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setDraft((current) => ({ ...current, pinned: !current.pinned }))
              }
              className={cn(
                'rounded-full border px-3 py-2 text-[11px] font-semibold transition-colors sm:text-xs',
                draft.pinned
                  ? 'border-blue-500/40 bg-blue-500/15 text-blue-100'
                  : 'border-white/10 bg-white/[0.03] text-zinc-300 hover:bg-white/[0.05]',
              )}>
              {draft.pinned ? 'Pinned' : 'Pin note'}
            </button>
            <Button size="sm" variant="secondary" onClick={() => void persistDraft('manual')}>
              Save
            </Button>
            <Button size="sm" variant="danger" onClick={() => setDeleteOpen(true)}>
              Delete
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-5 px-4 py-4 sm:gap-6 sm:px-6 sm:py-6">
        {saveError ? <Alert variant="danger">{saveError}</Alert> : null}

        <div className="grid gap-4 border-b border-white/10 pb-5 xl:grid-cols-[minmax(0,1fr)_220px_180px]">
          <label className="flex flex-col gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Title
            </span>
            <input
              value={draft.title}
              onChange={(event) =>
                setDraft((current) => ({ ...current, title: event.target.value }))
              }
              placeholder="Untitled note"
              className="w-full border-0 bg-transparent p-0 text-2xl font-semibold tracking-tight text-zinc-100 outline-none placeholder:text-zinc-600 sm:text-4xl"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Category
            </span>
            <select
              value={draft.category}
              onChange={(event) =>
                setDraft((current) => ({ ...current, category: event.target.value }))
              }
              className="h-10 rounded-2xl border border-white/10 bg-white/[0.03] px-3 text-[13px] font-medium text-zinc-100 outline-none transition-colors focus:border-blue-500/40 sm:h-11 sm:px-4 sm:text-sm">
              {categoryOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3 rounded-[20px] border border-white/10 bg-white/[0.02] px-3 py-3.5 sm:rounded-[24px] sm:px-4 sm:py-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                Words
              </div>
              <div className="mt-2 text-base font-semibold text-zinc-100 sm:text-lg">{wordCount}</div>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                Chars
              </div>
              <div className="mt-2 text-base font-semibold text-zinc-100 sm:text-lg">
                {draft.content.length}
              </div>
            </div>
          </div>
        </div>

        <div className="note-editor">
          <textarea
            value={draft.content}
            onChange={(event) =>
              setDraft((current) => ({ ...current, content: event.target.value }))
            }
            placeholder="Write ideas, meeting notes, journaling, or anything you want to keep here..."
            className="note-editor-area"
          />
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        title="Delete note?"
        description={`Note “${note.title}” will be permanently deleted.`}
        confirmText="Delete"
        confirmVariant="danger"
        confirming={deleting}
        onConfirm={onDelete}
        onClose={() => {
          if (!deleting) setDeleteOpen(false);
        }}
      />
    </>
  );
}
