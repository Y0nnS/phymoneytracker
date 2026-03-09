'use client';

import Link from 'next/link';
import React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { useNotes } from '@/hooks/useNotes';
import { formatDateTime } from '@/lib/date';
import { addNote } from '@/lib/firebase/notes';
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
  if (!clean) return 'Belum ada isi note.';
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
    async (replaceHistory = false) => {
      if (!user || creatingNote) return;
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
        toast.success('Notepad baru siap dipakai.');
      } catch (err) {
        toast.danger(err instanceof Error ? err.message : 'Gagal membuat notepad baru.');
      } finally {
        setCreatingNote(false);
      }
    },
    [creatingNote, router, toast, user],
  );

  React.useEffect(() => {
    if (searchParams.get('compose') !== 'note') return;
    if (!user || creatingNote) return;
    void createAndOpenNote(true);
  }, [createAndOpenNote, creatingNote, searchParams, user]);

  return (
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
                  {filteredNotes.length} dari {notes.length} note
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => void createAndOpenNote()}
                disabled={creatingNote}>
                {creatingNote ? 'Membuat…' : 'New'}
              </Button>
            </div>
          </div>

          <div className="border-b border-white/10 px-4 py-4 sm:px-5">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari judul, isi, atau kategori"
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
                {pinnedOnly ? 'Pinned only' : 'Semua note'}
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
              <EmptySidebarState message="Memuat notepad..." />
            ) : filteredNotes.length === 0 ? (
              <EmptySidebarState message="Belum ada note yang cocok dengan filter ini." />
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
  );
}
