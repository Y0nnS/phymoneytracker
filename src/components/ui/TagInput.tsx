'use client';

import React from 'react';
import { MAX_TAG_ITEMS, dedupeTags, normalizeTagLabel } from '@/lib/productivity';
import { cn } from '@/lib/utils';

export function TagInput({
  label,
  value,
  onChange,
  suggestions = [],
  hint,
  placeholder = 'Type a tag and press Enter',
  maxTags = MAX_TAG_ITEMS,
  className,
}: {
  label?: string;
  value: string[];
  onChange: (value: string[]) => void;
  suggestions?: string[];
  hint?: string;
  placeholder?: string;
  maxTags?: number;
  className?: string;
}) {
  const rootRef = React.useRef<HTMLLabelElement | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [draft, setDraft] = React.useState('');
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

  const normalizedDraft = React.useMemo(() => normalizeTagLabel(draft), [draft]);
  const selectedKeys = React.useMemo(
    () => new Set(value.map((tag) => normalizeTagLabel(tag).toLowerCase())),
    [value],
  );
  const normalizedSuggestions = React.useMemo(
    () => dedupeTags(suggestions, maxTags),
    [maxTags, suggestions],
  );
  const suggestionMatches = React.useMemo(() => {
    const needle = normalizedDraft.toLowerCase();
    return normalizedSuggestions.filter((tag) => {
      const normalized = normalizeTagLabel(tag);
      if (!normalized || selectedKeys.has(normalized.toLowerCase())) return false;
      if (!needle) return true;
      return normalized.toLowerCase().includes(needle);
    });
  }, [normalizedDraft, normalizedSuggestions, selectedKeys]);

  const limitReached = value.length >= maxTags;
  const canCreate = Boolean(normalizedDraft) && !selectedKeys.has(normalizedDraft.toLowerCase());

  function addTag(tag: string) {
    const normalized = normalizeTagLabel(tag);
    if (!normalized) return;

    onChange(dedupeTags([...value, normalized], maxTags));
    setDraft('');
    setOpen(true);
    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }

  function commitDraft() {
    if (!canCreate || limitReached) return;
    addTag(normalizedDraft);
  }

  function removeTag(tagToRemove: string) {
    onChange(value.filter((tag) => tag !== tagToRemove));
    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if ((event.key === 'Enter' || event.key === ',' || event.key === 'Tab') && normalizedDraft) {
      event.preventDefault();
      commitDraft();
      return;
    }

    if (event.key === 'Backspace' && !draft) {
      event.preventDefault();
      onChange(value.slice(0, -1));
    }
  }

  return (
    <label ref={rootRef} className={cn('flex w-full flex-col gap-1.5', className)}>
      {label ? (
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
          {label}
        </span>
      ) : null}

      <div className="relative">
        <div
          className="rounded-[22px] border border-white/10 bg-white/[0.03] px-3 py-3 transition-colors focus-within:border-blue-500/40 focus-within:bg-white/[0.05]">
          <div className="flex flex-wrap items-center gap-2">
            {value.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => removeTag(tag)}
                className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/12 px-3 py-1.5 text-[11px] font-semibold text-blue-100 transition-colors hover:border-blue-400/40 hover:bg-blue-500/18 sm:text-xs">
                <span>{tag}</span>
                <span aria-hidden="true" className="text-blue-200/70">
                  ×
                </span>
              </button>
            ))}

            <input
              ref={inputRef}
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onBlur={() => {
                window.setTimeout(() => {
                  if (!rootRef.current?.contains(document.activeElement)) {
                    commitDraft();
                    setOpen(false);
                  }
                }, 0);
              }}
              onKeyDown={onKeyDown}
              disabled={limitReached}
              placeholder={
                limitReached
                  ? 'Tag limit reached'
                  : value.length > 0
                    ? 'Add another tag'
                    : placeholder
              }
              className="min-w-[160px] flex-1 border-0 bg-transparent px-1 py-1 text-[13px] text-zinc-100 outline-none placeholder:text-zinc-500 disabled:cursor-not-allowed disabled:text-zinc-500 sm:text-sm"
            />
          </div>
        </div>

        {open && !limitReached && (suggestionMatches.length > 0 || canCreate) ? (
          <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 overflow-hidden rounded-[20px] border border-white/10 bg-zinc-950/95 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur">
            {canCreate ? (
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => addTag(normalizedDraft)}
                className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-[13px] text-zinc-200 transition-colors hover:bg-white/[0.05] sm:text-sm">
                <span>Create tag</span>
                <span className="rounded-full border border-blue-500/30 bg-blue-500/12 px-2.5 py-1 text-[11px] font-semibold text-blue-100">
                  {normalizedDraft}
                </span>
              </button>
            ) : null}

            {suggestionMatches.map((tag) => (
              <button
                key={tag}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => addTag(tag)}
                className="flex w-full items-center justify-between gap-3 border-t border-white/5 px-3 py-2.5 text-left text-[13px] text-zinc-200 transition-colors first:border-t-0 hover:bg-white/[0.05] sm:text-sm">
                <span>{tag}</span>
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                  Use
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {hint ? <span className="text-[11px] text-zinc-500 sm:text-xs">{hint}</span> : null}
    </label>
  );
}
