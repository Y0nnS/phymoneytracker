import Link from 'next/link';

export default function NotesIndexPage() {
  return (
    <div className="flex min-h-[72vh] items-center justify-center px-6 py-10">
      <div className="mx-auto flex max-w-xl flex-col items-center text-center">
        <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
          Notes Workspace
        </div>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-zinc-100 sm:text-4xl">
          Pick a note from the left
        </h1>
        <p className="mt-3 text-[13px] leading-relaxed text-zinc-400 sm:text-base">
          Each note opens its own detail panel on the right. Create a new note or open a
          draft to start writing.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/app/notes?compose=note"
            className="rounded-full bg-blue-600 px-5 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-blue-500 sm:text-sm">
            New note
          </Link>
          <Link
            href="/app/tasks"
            className="rounded-full border border-white/10 bg-white/[0.03] px-5 py-2.5 text-[13px] font-semibold text-zinc-200 transition-colors hover:bg-white/[0.05] sm:text-sm">
            Open tasks
          </Link>
        </div>
      </div>
    </div>
  );
}
