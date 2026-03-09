import { cn } from '@/lib/utils';

export function Button({
  children,
  className,
  variant = 'primary',
  size = 'md',
  type = 'button',
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  onClick?: () => void;
}) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-[background-color,border-color,color,transform,box-shadow] duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/30 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60';
  const sizes = {
    sm: 'px-2.5 py-1.5 text-[12px] sm:px-3 sm:py-2 sm:text-sm',
    md: 'px-3 py-2 text-[13px] sm:px-4 sm:py-2.5 sm:text-sm',
  };
  const variants = {
    primary:
      'bg-blue-600 text-white shadow-sm shadow-black/40 hover:bg-blue-500 active:shadow-none',
    secondary:
      'border border-zinc-800 bg-zinc-900 text-zinc-100 shadow-sm shadow-black/30 hover:bg-zinc-800 active:shadow-none',
    ghost: 'text-zinc-100 hover:bg-zinc-900',
    danger: 'bg-red-600 text-white shadow-sm shadow-black/40 hover:bg-red-500 active:shadow-none',
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cn(base, sizes[size], variants[variant], className)}>
      {children}
    </button>
  );
}
