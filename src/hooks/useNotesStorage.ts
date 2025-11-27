import { useCallback, useEffect, useState } from 'react';
import { nanoid } from 'nanoid';
import type { BlinkNoteItem, BlinkNoteType } from '../types';
import { STORAGE_KEY, appendNote, deleteNote, readNotes } from '../storage/notesStorage';

const hasChromeStorage = () => typeof chrome !== 'undefined' && !!chrome.storage?.local;

export const useNotesStorage = () => {
  const [notes, setNotes] = useState<BlinkNoteItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const data = await readNotes();
    setNotes(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!hasChromeStorage()) return;
    const listener = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
      if (areaName === 'local' && changes[STORAGE_KEY]) {
        void load();
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, [load]);

  const addNote = async (type: BlinkNoteType, content: string, sourceUrl?: string) => {
    const note: BlinkNoteItem = {
      id: nanoid(),
      type,
      content,
      createdAt: Date.now(),
      sourceUrl
    };
    const updated = await appendNote(note);
    setNotes(updated);
    return note;
  };

  const removeNote = async (id: string) => {
    const updated = await deleteNote(id);
    setNotes(updated);
  };

  return { notes, loading, addNote, removeNote, reload: load };
};
