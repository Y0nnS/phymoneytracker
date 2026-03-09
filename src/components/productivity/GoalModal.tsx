'use client';

import React from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/components/ui/Toast';
import { dateToISO } from '@/lib/date';
import { addGoal, updateGoal } from '@/lib/firebase/goals';
import { GOAL_STATUS_OPTIONS } from '@/lib/productivity';
import type { Goal, GoalStatus } from '@/lib/types';

export function GoalModal({
  uid,
  open,
  onClose,
  initialGoal,
}: {
  uid: string;
  open: boolean;
  onClose: () => void;
  initialGoal?: Goal | null;
}) {
  const toast = useToast();
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [currentValue, setCurrentValue] = React.useState('0');
  const [targetValue, setTargetValue] = React.useState('100');
  const [unit, setUnit] = React.useState('point');
  const [deadline, setDeadline] = React.useState('');
  const [status, setStatus] = React.useState<GoalStatus>('active');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setTitle(initialGoal?.title ?? '');
    setDescription(initialGoal?.description ?? '');
    setCurrentValue(String(initialGoal?.currentValue ?? 0));
    setTargetValue(String(initialGoal?.targetValue ?? 100));
    setUnit(initialGoal?.unit ?? 'point');
    setDeadline(initialGoal?.deadline ? dateToISO(initialGoal.deadline) : '');
    setStatus(initialGoal?.status ?? 'active');
    setSubmitting(false);
    setError(null);
  }, [open, initialGoal]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanTitle = title.trim();
    const current = Number(currentValue);
    const target = Number(targetValue);
    const nextDeadline = deadline ? new Date(`${deadline}T00:00:00`) : null;

    if (!cleanTitle) {
      setError('Judul goal wajib diisi.');
      return;
    }

    if (!Number.isFinite(current) || !Number.isFinite(target) || target <= 0) {
      setError('Nilai progress dan target harus valid, target > 0.');
      return;
    }

    if (nextDeadline && Number.isNaN(nextDeadline.getTime())) {
      setError('Tanggal goal tidak valid.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        title: cleanTitle,
        description: description.trim(),
        currentValue: current,
        targetValue: target,
        unit: unit.trim() || 'point',
        deadline: nextDeadline,
        status,
      };

      if (initialGoal) {
        await updateGoal(uid, initialGoal.id, payload);
        toast.success('Goal diperbarui.');
      } else {
        await addGoal(uid, payload);
        toast.success('Goal tersimpan.');
      }

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan goal.');
      toast.danger('Gagal menyimpan goal.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} title={initialGoal ? 'Edit goal' : 'Goal baru'} onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {error ? <Alert variant="danger">{error}</Alert> : null}

        <Input
          label="Judul"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Publish 8 artikel bulan ini"
          required
        />

        <Textarea
          label="Deskripsi"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Catatan atau konteks target ini"
        />

        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Progress sekarang"
            type="number"
            min={0}
            step={1}
            value={currentValue}
            onChange={(e) => setCurrentValue(e.target.value)}
          />
          <Input
            label="Target"
            type="number"
            min={1}
            step={1}
            value={targetValue}
            onChange={(e) => setTargetValue(e.target.value)}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Input
            label="Unit"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="artikel, jam, task"
          />
          <Input
            label="Deadline"
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
          <Select
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as GoalStatus)}>
            {GOAL_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex items-center justify-end gap-3">
          <Button variant="secondary" type="button" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Menyimpan…' : initialGoal ? 'Simpan perubahan' : 'Simpan goal'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
