import { useMemo, useState } from 'react';
import QuickCapture from './components/QuickCapture';
import NotesList from './components/NotesList';
import NoteDetail from './components/NoteDetail';
import { useNotesStorage } from './hooks/useNotesStorage';
import type { BlinkNoteItem, BlinkNoteType } from './types';

const App = () => {
  const { notes, loading, addNote, removeNote } = useNotesStorage();
  const [activeId, setActiveId] = useState<string | null>(null);

  const activeNote = useMemo(() => notes.find((n) => n.id === activeId) ?? null, [notes, activeId]);

  const handleCapture = async (type: BlinkNoteType, content: string) => {
    await addNote(type, content);
  };

  const sortedNotes = useMemo(() => notes.slice().sort((a, b) => b.createdAt - a.createdAt), [notes]);

  return (
    <div className="min-h-screen bg-surface-subtle text-brand-primary">
      <div className="space-y-4 px-4 py-5">
        <header className="flex items-center justify-between">
          <h1 className="text-lg font-semibold tracking-tight">BlinkNote</h1>
          <span className="text-xs text-brand-muted">{notes.length} notes</span>
        </header>

        {!activeNote ? (
          <>
            <QuickCapture onCapture={handleCapture} />
            <section className="space-y-3">
              <div className="flex items-center justify-between text-sm font-semibold text-brand-primary">
                <span>Notes</span>
              </div>
              {loading ? (
                <div className="rounded-2xl border border-neutral-medium bg-surface-subtle p-4 text-center text-sm text-brand-muted">
                  Loading…
                </div>
              ) : (
                <NotesList notes={sortedNotes} onSelect={(note: BlinkNoteItem) => setActiveId(note.id)} />
              )}
            </section>
          </>
        ) : (
          <NoteDetail
            note={activeNote}
            onBack={() => setActiveId(null)}
            onDelete={async (id) => {
              await removeNote(id);
              setActiveId(null);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default App;
