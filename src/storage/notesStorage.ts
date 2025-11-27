import type { BlinkNoteItem } from '../types';

export const STORAGE_KEY = 'blinknote-items';

const hasChromeStorage = () => typeof chrome !== 'undefined' && !!chrome.storage?.local;

const readLocalFallback = (): BlinkNoteItem[] => {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as BlinkNoteItem[]) : [];
};

const writeLocalFallback = (notes: BlinkNoteItem[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
};

export const readNotes = async (): Promise<BlinkNoteItem[]> => {
  if (hasChromeStorage()) {
    return new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_KEY], (result) => {
        resolve((result[STORAGE_KEY] as BlinkNoteItem[]) ?? []);
      });
    });
  }
  return readLocalFallback();
};

export const writeNotes = async (notes: BlinkNoteItem[]) => {
  if (hasChromeStorage()) {
    return new Promise<void>((resolve) => {
      chrome.storage.local.set({ [STORAGE_KEY]: notes }, () => resolve());
    });
  }
  writeLocalFallback(notes);
};

export const appendNote = async (note: BlinkNoteItem) => {
  const notes = await readNotes();
  const updated = [note, ...notes].sort((a, b) => b.createdAt - a.createdAt);
  await writeNotes(updated);
  return updated;
};

export const deleteNote = async (id: string) => {
  const notes = await readNotes();
  const updated = notes.filter((item) => item.id !== id);
  await writeNotes(updated);
  return updated;
};

export const clearNotes = async () => writeNotes([]);
