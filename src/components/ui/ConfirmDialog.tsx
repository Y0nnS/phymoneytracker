'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

export function ConfirmDialog({
  open,
  title,
  description,
  confirmText = 'Konfirmasi',
  cancelText = 'Batal',
  confirmVariant = 'danger',
  confirming,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  confirming?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal open={open} title={title} onClose={onClose} className="max-w-md">
      <div className="flex flex-col gap-4">
        <div className="text-sm text-zinc-300">{description}</div>
        <div className="flex items-center justify-end gap-3">
          <Button variant="secondary" onClick={onClose} type="button" disabled={confirming}>
            {cancelText}
          </Button>
          <Button
            variant={confirmVariant}
            onClick={onConfirm}
            type="button"
            disabled={confirming}
          >
            {confirming ? 'Memproses…' : confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

