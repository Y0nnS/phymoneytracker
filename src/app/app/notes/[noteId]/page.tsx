import { NoteEditorPane } from '@/components/productivity/NoteEditorPane';

export default function NoteDetailPage({
  params,
}: {
  params: { noteId: string };
}) {
  return <NoteEditorPane noteId={params.noteId} />;
}
