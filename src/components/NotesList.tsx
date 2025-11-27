import NoteCard from './NoteCard';
import type { BlinkNoteItem } from '../types';

interface NotesListProps {
  notes: BlinkNoteItem[];
  onSelect: (note: BlinkNoteItem) => void;
}

const NotesList = ({ notes, onSelect }: NotesListProps) => {
  if (!notes.length) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-medium bg-surface-subtle p-6 text-center text-sm text-brand-muted">
        No notes yet. Capture something!
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {notes.map((note) => (
        <NoteCard key={note.id} note={note} onSelect={onSelect} />
      ))}
    </div>
  );
};

export default NotesList;
