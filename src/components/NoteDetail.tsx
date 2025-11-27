import type { BlinkNoteItem } from '../types';
import { exportJSON, exportMarkdown, exportPDF } from '../utils/exporters';

interface NoteDetailProps {
  note: BlinkNoteItem;
  onBack: () => void;
  onDelete?: (id: string) => Promise<void> | void;
}

const formatFullTime = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleString();
};

const NoteDetail = ({ note, onBack, onDelete }: NoteDetailProps) => {
  const handleDelete = async () => {
    if (onDelete) {
      await onDelete(note.id);
    }
    onBack();
  };

  return (
    <div className="space-y-4 rounded-2xl border border-neutral-medium bg-white p-4 shadow-card">
      <div className="flex items-center justify-between text-sm">
        <button className="text-brand-muted" onClick={onBack} type="button">
          ← Back
        </button>
        <span className="font-semibold text-brand-primary">BlinkNote</span>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-brand-muted">Type</span>
          <span className="font-medium capitalize">{note.type}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-brand-muted">Created</span>
          <span>{formatFullTime(note.createdAt)}</span>
        </div>
        {note.sourceUrl && (
          <div className="flex items-center justify-between">
            <span className="text-brand-muted">Source</span>
            <a href={note.sourceUrl} target="_blank" rel="noreferrer" className="text-brand-primary underline">
              Open
            </a>
          </div>
        )}
      </div>
      <div className="rounded-xl border border-neutral-medium bg-surface-subtle p-3 text-sm leading-relaxed text-brand-primary">
        {note.type === 'image' ? (
          <img src={note.content} alt="Captured" className="w-full rounded-lg object-contain" />
        ) : note.type === 'link' ? (
          <a href={note.content} target="_blank" rel="noreferrer" className="text-brand-primary underline">
            {note.content}
          </a>
        ) : (
          note.content.split('\n').map((line, idx) => (
            <p key={idx} className="mb-2 last:mb-0">
              {line}
            </p>
          ))
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="flex-1 rounded-xl border border-neutral-medium px-3 py-2 text-sm text-brand-primary transition hover:border-brand-accent"
          onClick={() => exportMarkdown(note)}
        >
          .md
        </button>
        <button
          type="button"
          className="flex-1 rounded-xl border border-neutral-medium px-3 py-2 text-sm text-brand-primary transition hover:border-brand-accent"
          onClick={() => exportJSON(note)}
        >
          .json
        </button>
        <button
          type="button"
          className="flex-1 rounded-xl border border-neutral-medium px-3 py-2 text-sm text-brand-primary transition hover:border-brand-accent"
          onClick={() => exportPDF(note)}
        >
          .pdf
        </button>
      </div>
      {onDelete && (
        <button
          type="button"
          className="mt-2 w-full rounded-xl border border-red-200 px-3 py-2 text-sm text-red-500"
          onClick={handleDelete}
        >
          Delete
        </button>
      )}
    </div>
  );
};

export default NoteDetail;
