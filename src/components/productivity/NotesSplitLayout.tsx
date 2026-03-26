'use client';

import Link from 'next/link';
import React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { IconChevronRight } from '@/components/icons';
import { useAuth } from '@/components/auth/AuthProvider';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { useNotes } from '@/hooks/useNotes';
import { formatDateTime } from '@/lib/date';
import { addNote, deleteAllNotes } from '@/lib/firebase/notes';
import { dedupeTags } from '@/lib/productivity';
import type { Note } from '@/lib/types';
import { cn } from '@/lib/utils';

type TagFilter = 'all' | '__untagged__' | string;

type TagFilterOption = {
  value: TagFilter;
  label: string;
  count: number;
};

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

function NoteTagFilterDropdown({
  value,
  options,
  onChange,
}: {
  value: TagFilter;
  options: TagFilterOption[];
  onChange: (value: TagFilter) => void;
}) {
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  const selected = options.find((option) => option.value === value) ?? options[0];

  return (
    <div ref={rootRef} className="relative min-w-[168px] flex-1">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-left transition-colors hover:bg-white/[0.05]">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Tag filter
          </div>
          <div className="truncate text-[12px] font-semibold text-zinc-100 sm:text-sm">
            {selected.label}
          </div>
        </div>
        <span className={cn('text-zinc-500 transition-transform', open && 'rotate-90')}>
          {IconChevronRight({ className: 'h-4 w-4' })}
        </span>
      </button>

      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 overflow-hidden rounded-[20px] border border-white/10 bg-zinc-950/95 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={cn(
                'flex w-full items-center justify-between gap-3 border-t border-white/5 px-3 py-2.5 text-left text-[13px] transition-colors first:border-t-0 sm:text-sm',
                value === option.value
                  ? 'bg-white/[0.06] text-zinc-100'
                  : 'text-zinc-300 hover:bg-white/[0.04] hover:text-zinc-100',
              )}>
              <span className="truncate">{option.label}</span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                {option.count}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function NotesSplitLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const toast = useToast();
  const { notes, loading, error } = useNotes(user?.uid);

  const [query, setQuery] = React.useState('');
  const [tagFilter, setTagFilter] = React.useState<TagFilter>('all');
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

  const tagFilterOptions = React.useMemo(() => {
    const tagCounts = new Map<string, number>();
    let untaggedCount = 0;

    notes.forEach((note) => {
      if (note.tags.length === 0) {
        untaggedCount += 1;
        return;
      }

      note.tags.forEach((tag) => {
        tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
      });
    });

    const options: TagFilterOption[] = [
      { value: 'all', label: 'All tags', count: notes.length },
    ];

    if (untaggedCount > 0) {
      options.push({ value: '__untagged__', label: 'Untagged', count: untaggedCount });
    }

    options.push(
      ...Array.from(tagCounts.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([tag, count]) => ({ value: tag, label: tag, count })),
    );

    return options;
  }, [notes]);

  const filteredNotes = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    return sorted.filter((note) => {
      if (tagFilter === '__untagged__' && note.tags.length > 0) return false;
      if (tagFilter !== 'all' && tagFilter !== '__untagged__' && !note.tags.includes(tagFilter)) {
        return false;
      }
      if (pinnedOnly && !note.pinned) return false;
      if (!needle) return true;
      return (
        note.title.toLowerCase().includes(needle) ||
        note.content.toLowerCase().includes(needle) ||
        note.tags.some((tag) => tag.toLowerCase().includes(needle))
      );
    });
  }, [pinnedOnly, query, sorted, tagFilter]);

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
          tags: [],
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
                placeholder="Search title, content, or tag"
              />
              <div className="mt-3 flex flex-wrap items-start gap-2">
                <button
                  type="button"
                  onClick={() => setPinnedOnly((value) => !value)}
                  className={cn(
                    'rounded-full border px-3 py-2 text-[11px] font-semibold transition-colors sm:text-xs',
                    pinnedOnly
                      ? 'border-blue-500/40 bg-blue-500/15 text-blue-100'
                      : 'border-white/10 bg-white/[0.03] text-zinc-300 hover:bg-white/[0.05]',
                  )}>
                  {pinnedOnly ? 'Pinned only' : 'All notes'}
                </button>

                <NoteTagFilterDropdown
                  value={tagFilter}
                  options={tagFilterOptions}
                  onChange={setTagFilter}
                />
              </div>
            </div>

            {error ? <Alert variant="danger">{error}</Alert> : null}

            <div className="min-h-0 flex-1 overflow-y-auto">
              {loading ? (
                <EmptySidebarState message="Loading notes..." />
              ) : filteredNotes.length === 0 ? (
                <EmptySidebarState message="No notes match this filter." />
              ) : (
                filteredNotes.map((note) => {
                  const visibleTags = dedupeTags(note.tags).slice(0, 2);
                  const hiddenTagCount = Math.max(0, note.tags.length - visibleTags.length);

                  return (
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
                        <div className="flex flex-wrap items-center gap-2 normal-case tracking-normal">
                          {visibleTags.length > 0 ? (
                            visibleTags.map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] font-semibold text-zinc-300">
                                {tag}
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                              Untagged
                            </span>
                          )}
                          {hiddenTagCount > 0 ? (
                            <span className="text-[10px] font-semibold text-zinc-500">
                              +{hiddenTagCount}
                            </span>
                          ) : null}
                        </div>
                        {selectedId === note.id ? <span>Open</span> : null}
                      </div>
                    </Link>
                  );
                })
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
