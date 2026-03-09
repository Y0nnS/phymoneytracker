'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

const ACTIONS = [
  {
    href: '/app/tasks?compose=task',
    title: 'Task baru',
    description: 'Tangkap tugas, prioritas, dan deadline dalam satu langkah.',
  },
  {
    href: '/app/notes?compose=note',
    title: 'Notepad baru',
    description: 'Buka draft kosong langsung di panel note sebelah kanan.',
  },
  {
    href: '/app/finance?compose=transaction',
    title: 'Transaksi',
    description: 'Catat income atau expense tanpa keluar dari workspace.',
  },
  {
    href: '/app/finance',
    title: 'Buka finance',
    description: 'Lihat cashflow, budget, dan histori keuangan bulanan.',
  },
];

export function QuickCaptureModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();

  function navigate(href: string) {
    onClose();
    router.push(href);
  }

  return (
    <Modal open={open} title="Quick Capture" onClose={onClose} className="max-w-2xl">
      <div className="flex flex-col gap-4">
        <div className="text-sm text-zinc-400">
          Satu pintu untuk masukin hal penting ke workspace kamu.
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {ACTIONS.map((action) => (
            <button
              key={action.href}
              type="button"
              onClick={() => navigate(action.href)}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 text-left transition-colors hover:bg-zinc-900">
              <div className="text-sm font-semibold text-zinc-100">{action.title}</div>
              <div className="mt-1 text-sm text-zinc-400">{action.description}</div>
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-xs text-zinc-500">
          <span>Shortcut cepat</span>
          <span className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 font-semibold text-zinc-200">
            Q
          </span>
        </div>
        <div className="flex justify-end">
          <Button variant="secondary" onClick={onClose}>
            Tutup
          </Button>
        </div>
      </div>
    </Modal>
  );
}
