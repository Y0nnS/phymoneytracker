import { cn } from '@/lib/utils';

export function Input({
  className,
  label,
  hint,
  error,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
}) {
  return (
    <label className="flex w-full flex-col gap-1.5">
      {label ? (
        <span className="text-xs font-medium text-zinc-200 sm:text-sm">{label}</span>
      ) : null}
      <input
        {...props}
        className={cn(
          'w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-[13px] text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 sm:text-sm',
          error ? 'border-red-600 focus:border-red-500 focus:ring-red-500/20' : null,
          className,
        )}/>
      {error ? (
        <span className="text-[11px] text-red-300 sm:text-xs">{error}</span>
      ) : hint ? (
        <span className="text-[11px] text-zinc-500 sm:text-xs">{hint}</span>
      ) : null}
    </label>
  );
}
