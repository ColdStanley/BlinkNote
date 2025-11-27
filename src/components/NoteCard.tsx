import type { BlinkNoteItem } from '../types';

interface NoteCardProps {
  note: BlinkNoteItem;
  onSelect: (note: BlinkNoteItem) => void;
}

const typeIcon: Record<BlinkNoteItem['type'], string> = {
  text: '✏️',
  link: '🔗',
  image: '🖼️'
};

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const summarize = (note: BlinkNoteItem) => {
  if (note.type === 'image') return 'Image';
  return note.content.length > 60 ? `${note.content.slice(0, 57)}…` : note.content;
};

const NoteCard = ({ note, onSelect }: NoteCardProps) => {
  return (
    <button
      type="button"
      className="flex w-full items-center gap-3 rounded-2xl border border-neutral-medium bg-white px-3 py-2 text-left text-sm text-brand-primary shadow-sm transition hover:border-brand-accent"
      onClick={() => onSelect(note)}
    >
      <span className="text-lg">{typeIcon[note.type]}</span>
      <div className="flex-1 overflow-hidden">
        <p className="truncate font-medium">{summarize(note)}</p>
        <p className="text-xs text-brand-muted flex items-center gap-2">
          {formatTime(note.createdAt)}
          {note.sourceUrl && <span className="text-[10px] text-brand-muted">↗</span>}
        </p>
      </div>
      <span className="text-brand-muted">›</span>
    </button>
  );
};

export default NoteCard;
