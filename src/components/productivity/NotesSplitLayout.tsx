'use client';

import Link from 'next/link';
import React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { useNotes } from '@/hooks/useNotes';
import { formatDateTime } from '@/lib/date';
import { addNote, deleteAllNotes } from '@/lib/firebase/notes';
import { NOTE_CATEGORY_OPTIONS } from '@/lib/productivity';
import type { Note } from '@/lib/types';
import { cn } from '@/lib/utils';

type CategoryFilter = 'all' | string;

function sortNotes(notes: Note[]) {
  return notes.slice().sort((a, b) => {
    const pinnedDiff = Number(b.pinned) - Number(a.pinned);
    if (pinnedDiff !== 0) return pinnedDiff;
    const updatedA = a.updatedAt?.getTime() ?? a.createdAt?.getTime() ?? 0;
    const updatedB = b.updatedAt?.getTime() ?? b.createdAt?.getTime() ?? 0;
    return updatedB - updatedA;
  });
}

function notePreview(note: Note) {
  const clean = note.content.replace(/\s+/g, ' ').trim();
  if (!clean) return 'No note content yet.';
  return clean.length > 110 ? `${clean.slice(0, 110)}...` : clean;
}

function EmptySidebarState({ message }: { message: string }) {
  return <div className="px-5 py-8 text-sm text-zinc-500">{message}</div>;
}

export function NotesSplitLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const toast = useToast();
  const { notes, loading, error } = useNotes(user?.uid);

  const [query, setQuery] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState<CategoryFilter>('all');
  const [pinnedOnly, setPinnedOnly] = React.useState(false);
  const [creatingNote, setCreatingNote] = React.useState(false);
  const [deleteAllOpen, setDeleteAllOpen] = React.useState(false);
  const [deletingAll, setDeletingAll] = React.useState(false);
  const creatingNoteRef = React.useRef(false);
  const composeRequestKeyRef = React.useRef<string | null>(null);

  const sorted = React.useMemo(() => sortNotes(notes), [notes]);
  const selectedId = React.useMemo(() => {
    const match = pathname.match(/^\/app\/notes\/(.+)$/);
    return match ? decodeURIComponent(match[1]) : null;
  }, [pathname]);

  const categoryOptions = React.useMemo(
    () =>
      Array.from(
        new Set([...NOTE_CATEGORY_OPTIONS, ...notes.map((note) => note.category)]),
      ).sort(),
    [notes],
  );

  const filteredNotes = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    return sorted.filter((note) => {
      if (categoryFilter !== 'all' && note.category !== categoryFilter) return false;
      if (pinnedOnly && !note.pinned) return false;
      if (!needle) return true;
      return (
        note.title.toLowerCase().includes(needle) ||
        note.content.toLowerCase().includes(needle) ||
        note.category.toLowerCase().includes(needle)
      );
    });
  }, [categoryFilter, pinnedOnly, query, sorted]);

  const createAndOpenNote = React.useCallback(
    async ({
      replaceHistory = false,
      requestKey,
    }: {
      replaceHistory?: boolean;
      requestKey?: string;
    } = {}) => {
      if (!user || creatingNoteRef.current) return;

      creatingNoteRef.current = true;
      setCreatingNote(true);

      try {
        const ref = await addNote(user.uid, {
          title: 'Untitled note',
          content: '',
          category: 'General',
          pinned: false,
        });
        const href = `/app/notes/${ref.id}`;
        if (replaceHistory) {
          router.replace(href);
        } else {
          router.push(href);
        }
        toast.success('New note is ready.');
      } catch (err) {
        if (requestKey && composeRequestKeyRef.current === requestKey) {
          composeRequestKeyRef.current = null;
        }
        toast.danger(err instanceof Error ? err.message : 'Failed to create a new note.');
      } finally {
        creatingNoteRef.current = false;
        setCreatingNote(false);
      }
    },
    [router, toast, user],
  );

  React.useEffect(() => {
    const composeMode = searchParams.get('compose');

    if (composeMode !== 'note') {
      composeRequestKeyRef.current = null;
      return;
    }

    const requestKey = `${pathname}?${searchParams.toString()}`;
    if (!user || creatingNoteRef.current || composeRequestKeyRef.current === requestKey) return;

    composeRequestKeyRef.current = requestKey;
    void createAndOpenNote({ replaceHistory: true, requestKey });
  }, [createAndOpenNote, pathname, searchParams, user]);

  const handleDeleteAllNotes = React.useCallback(async () => {
    if (!user || deletingAll || notes.length === 0) return;

    setDeletingAll(true);

    try {
      const deletedCount = await deleteAllNotes(user.uid);
      setDeleteAllOpen(false);
      router.replace('/app/notes');
      toast.success(
        deletedCount > 0 ? `${deletedCount} notes deleted.` : 'No notes to delete.',
      );
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : 'Failed to delete all notes.');
    } finally {
      setDeletingAll(false);
    }
  }, [deletingAll, notes.length, router, toast, user]);

  return (
    <>
      <div className="flex flex-col gap-4">
        <section className="note-shell">
          <aside className="note-sidebar">
            <div className="border-b border-white/10 px-4 py-4 sm:px-5 sm:py-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500 sm:text-xs">
                    Second brain
                  </div>
                  <h1 className="mt-2 text-xl font-semibold tracking-tight text-zinc-100 sm:text-2xl">
                    Notes
                  </h1>
                  <div className="mt-2 text-[12px] text-zinc-400 sm:text-sm">
                    {filteredNotes.length} of {notes.length} notes
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {notes.length > 0 ? (
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => setDeleteAllOpen(true)}
                      disabled={deletingAll}>
                      {deletingAll ? 'Deleting…' : 'Delete all'}
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    onClick={() => void createAndOpenNote()}
                    disabled={creatingNote || deletingAll}>
                    {creatingNote ? 'Creating…' : 'New'}
                  </Button>
                </div>
              </div>
            </div>

            <div className="border-b border-white/10 px-4 py-4 sm:px-5">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search title, content, or category"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setPinnedOnly((value) => !value)}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors sm:text-xs',
                    pinnedOnly
                      ? 'border-blue-500/40 bg-blue-500/15 text-blue-100'
                      : 'border-white/10 bg-white/[0.03] text-zinc-300 hover:bg-white/[0.05]',
                  )}>
                  {pinnedOnly ? 'Pinned only' : 'All notes'}
                </button>
                {categoryOptions.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() =>
                      setCategoryFilter((current) =>
                        current === category ? 'all' : category,
                      )
                    }
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors sm:text-xs',
                      categoryFilter === category
                        ? 'border-white/20 bg-white/[0.08] text-zinc-100'
                        : 'border-white/10 bg-transparent text-zinc-400 hover:bg-white/[0.03] hover:text-zinc-200',
                    )}>
                    {category}
                  </button>
                ))}
              </div>
            </div>

            {error ? <Alert variant="danger">{error}</Alert> : null}

            <div className="min-h-0 flex-1 overflow-y-auto">
              {loading ? (
                <EmptySidebarState message="Loading notes..." />
              ) : filteredNotes.length === 0 ? (
                <EmptySidebarState message="No notes match this filter." />
              ) : (
                filteredNotes.map((note) => (
                  <Link
                    key={note.id}
                    href={`/app/notes/${note.id}`}
                    className={cn(
                      'note-list-row',
                      selectedId === note.id && 'note-list-row-active',
                    )}>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="truncate text-[13px] font-semibold text-zinc-100 sm:text-sm">
                            {note.title}
                          </div>
                          {note.pinned ? (
                            <span className="rounded-full border border-blue-500/30 bg-blue-500/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-100">
                              Pin
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-2 line-clamp-2 text-[12px] leading-relaxed text-zinc-400 sm:text-sm">
                          {notePreview(note)}
                        </div>
                      </div>
                      <div className="shrink-0 text-[11px] font-medium text-zinc-500">
                        {note.updatedAt ? formatDateTime(note.updatedAt) : 'Draft'}
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                      <span>{note.category}</span>
                      {selectedId === note.id ? <span>Open</span> : null}
                    </div>
                  </Link>
                ))
              )}
            </div>
          </aside>

          <main className="note-pane">{children}</main>
        </section>
      </div>

      <ConfirmDialog
        open={deleteAllOpen}
        title="Delete all notes?"
        description={`This will permanently delete all ${notes.length} notes in your workspace. This action cannot be undone.`}
        confirmText="Yes, delete all"
        cancelText="Cancel"
        confirmVariant="danger"
        confirming={deletingAll}
        onConfirm={handleDeleteAllNotes}
        onClose={() => {
          if (!deletingAll) setDeleteAllOpen(false);
        }}
      />
    </>
  );
}
