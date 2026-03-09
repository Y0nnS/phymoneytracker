'use client';

import React from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/components/ui/Toast';
import { addPlannerBlock, updatePlannerBlock } from '@/lib/firebase/plannerBlocks';
import { PLANNER_BLOCK_TYPES } from '@/lib/productivity';
import type { PlannerBlock, PlannerBlockType } from '@/lib/types';

export function PlannerBlockModal({
  uid,
  open,
  onClose,
  defaultDate,
  initialBlock,
}: {
  uid: string;
  open: boolean;
  onClose: () => void;
  defaultDate: string;
  initialBlock?: PlannerBlock | null;
}) {
  const toast = useToast();
  const [title, setTitle] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [type, setType] = React.useState<PlannerBlockType>('deep_work');
  const [date, setDate] = React.useState(defaultDate);
  const [startTime, setStartTime] = React.useState('09:00');
  const [endTime, setEndTime] = React.useState('10:00');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setTitle(initialBlock?.title ?? '');
    setNotes(initialBlock?.notes ?? '');
    setType(initialBlock?.type ?? 'deep_work');
    setDate(initialBlock?.date ?? defaultDate);
    setStartTime(initialBlock?.startTime ?? '09:00');
    setEndTime(initialBlock?.endTime ?? '10:00');
    setSubmitting(false);
    setError(null);
  }, [open, initialBlock, defaultDate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanTitle = title.trim();

    if (!cleanTitle) {
      setError('Judul block wajib diisi.');
      return;
    }

    if (!date) {
      setError('Tanggal block wajib diisi.');
      return;
    }

    if (!startTime || !endTime || endTime <= startTime) {
      setError('Waktu selesai harus setelah waktu mulai.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        title: cleanTitle,
        notes: notes.trim(),
        type,
        date,
        startTime,
        endTime,
      };

      if (initialBlock) {
        await updatePlannerBlock(uid, initialBlock.id, payload);
        toast.success('Planner block diperbarui.');
      } else {
        await addPlannerBlock(uid, payload);
        toast.success('Planner block tersimpan.');
      }

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan planner block.');
      toast.danger('Gagal menyimpan planner block.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      title={initialBlock ? 'Edit planner block' : 'Planner block baru'}
      onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {error ? <Alert variant="danger">{error}</Alert> : null}

        <Input
          label="Judul"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Deep work - dashboard redesign"
          required
        />

        <div className="grid gap-4 md:grid-cols-2">
          <Select
            label="Tipe"
            value={type}
            onChange={(e) => setType(e.target.value as PlannerBlockType)}>
            {PLANNER_BLOCK_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Input
            label="Tanggal"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Mulai"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
          />
          <Input
            label="Selesai"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            required
          />
        </div>

        <Textarea
          label="Catatan"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Outcome yang ingin dicapai, agenda rapat, dsb."
        />

        <div className="flex items-center justify-end gap-3">
          <Button variant="secondary" type="button" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Menyimpan…' : initialBlock ? 'Simpan perubahan' : 'Simpan block'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
