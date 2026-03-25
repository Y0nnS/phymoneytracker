'use client';

import React from 'react';
import { Input } from './Input';

export function PasswordInput(
  props: Omit<React.ComponentProps<typeof Input>, 'type'>,
) {
  const [visible, setVisible] = React.useState(false);

  return (
    <div className="relative">
      <Input {...props} type={visible ? 'text' : 'password'} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-2 top-[30px] rounded-md px-2 py-1 text-[11px] font-semibold text-zinc-300 hover:bg-zinc-900 sm:top-8 sm:text-xs"
        aria-label={visible ? 'Hide password' : 'Show password'}>
        {visible ? 'Hide' : 'Show'}
      </button>
    </div>
  );
}
