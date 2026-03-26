'use client';

import Link from 'next/link';
import React from 'react';
import { useRouter } from 'next/navigation';
import { IconPin } from '@/components/icons';
import { useAuth } from '@/components/auth/AuthProvider';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { TagInput } from '@/components/ui/TagInput';
import { useToast } from '@/components/ui/Toast';
import { useNotes } from '@/hooks/useNotes';
import { formatDateTime } from '@/lib/date';
import { deleteNote, updateNote } from '@/lib/firebase/notes';
import { NOTE_TAG_SUGGESTIONS, dedupeTags } from '@/lib/productivity';
import type { Note } from '@/lib/types';
import { cn } from '@/lib/utils';

type Draft = {
  title: string;
  content: string;
  tags: string[];
  pinned: boolean;
};

type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

function draftFromNote(note: Note): Draft {
  return {
    title: note.title === 'Untitled note' ? '' : note.title,
    content: note.content,
    tags: dedupeTags(note.tags),
    pinned: note.pinned,
  };
}

function normalizeDraft(draft: Draft) {
  const tags = dedupeTags(draft.tags);

  return {
    title: draft.title.trim() || 'Untitled note',
    content: draft.content.trim(),
    category: tags[0] ?? 'General',
    tags,
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
    tags: dedupeTags(note.tags),
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

  const tagSuggestions = React.useMemo(
    () =>
      dedupeTags([
        ...NOTE_TAG_SUGGESTIONS,
        ...notes.flatMap((item) => item.tags),
      ]).sort((a, b) => a.localeCompare(b)),
    [notes],
  );

  const [draft, setDraft] = React.useState<Draft>({
    title: '',
    content: '',
    tags: [],
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

  function removeDraftTag(tagToRemove: string) {
    setDraft((current) => ({
      ...current,
      tags: current.tags.filter((tag) => tag !== tagToRemove),
    }));
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
                'inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-semibold transition-colors sm:text-xs',
                draft.pinned
                  ? 'bg-blue-500/12 text-blue-100'
                  : 'bg-transparent text-zinc-300 hover:bg-white/[0.05] hover:text-zinc-100',
              )}>
              {IconPin({ className: 'h-3.5 w-3.5' })}
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

        <div className="grid gap-4 border-b border-white/10 pb-5 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-start">
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

            {draft.tags.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {draft.tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => removeDraftTag(tag)}
                    className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-[11px] font-semibold text-blue-100 transition-colors hover:border-blue-400/40 hover:bg-blue-500/16 sm:text-xs">
                    <span className="text-blue-200/75">#</span>
                    <span>{tag}</span>
                    <span aria-hidden="true" className="text-blue-200/70">
                      ×
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </label>

          <TagInput
            label="Tags"
            value={draft.tags}
            onChange={(tags) => setDraft((current) => ({ ...current, tags }))}
            suggestions={tagSuggestions}
            placeholder="Type a tag and press Enter"
            hideSelectedTags
            className="xl:justify-self-end xl:w-full"
          />
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






