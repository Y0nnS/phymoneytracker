import type { ReactNode } from 'react';
import { NotesSplitLayout } from '@/components/productivity/NotesSplitLayout';

export default function NotesLayout({ children }: { children: ReactNode }) {
  return <NotesSplitLayout>{children}</NotesSplitLayout>;
}
