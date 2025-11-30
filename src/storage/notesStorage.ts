import type { BlinkNoteItem } from '../types';

export const STORAGE_KEY = 'blinknote-items';

const DEFAULT_COLOR = '#ffbd59';

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

export const normalizeNote = (
  item: BlinkNoteItem | (Partial<BlinkNoteItem> & { id: string; content: string; type: BlinkNoteItem['type']; createdAt?: number })
) => {
  const createdAt = item.createdAt ?? Date.now();
  const updatedAt = item.updatedAt ?? createdAt;
  const color = item.color ?? DEFAULT_COLOR;
  const title = item.title ?? (item.type === 'link' ? 'Link' : item.type === 'image' ? 'Image' : 'Note');
  const order = item.order ?? createdAt;
  return {
    id: item.id,
    title,
    type: item.type,
    content: item.content,
    createdAt,
    updatedAt,
    order,
    color,
    pinned: item.pinned ?? false,
    reminder: item.reminder ?? null,
    lineage: Array.isArray(item.lineage) ? item.lineage : [],
    sourceUrl: item.sourceUrl
  } satisfies BlinkNoteItem;
};

export const readNotes = async (): Promise<BlinkNoteItem[]> => {
  const parse = (payload: BlinkNoteItem[] | undefined) => (payload ?? []).map((item) => normalizeNote(item));
  if (hasChromeStorage()) {
    return new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_KEY], (result) => {
        resolve(parse(result[STORAGE_KEY] as BlinkNoteItem[] | undefined));
      });
    });
  }
  return parse(readLocalFallback());
};

export const writeNotes = async (notes: BlinkNoteItem[]) => {
  if (hasChromeStorage()) {
    return new Promise<void>((resolve) => {
      chrome.storage.local.set({ [STORAGE_KEY]: notes }, () => resolve());
    });
  }
  writeLocalFallback(notes);
};

export const replaceNotes = async (updater: (existing: BlinkNoteItem[]) => BlinkNoteItem[]) => {
  const existing = await readNotes();
  const next = updater(existing);
  await writeNotes(next);
  return next;
};

export const appendNote = async (
  note: Partial<BlinkNoteItem> & { id: string; type: BlinkNoteItem['type']; content: string; createdAt?: number }
) => {
  const timestamp = note.createdAt ?? Date.now();
  return replaceNotes((existing) => {
    const order = note.order ?? (existing.length ? Math.max(...existing.map((item) => item.order)) + 1 : 1);
    const normalized = normalizeNote({
      ...note,
      createdAt: timestamp,
      updatedAt: note.updatedAt ?? timestamp,
      order
    });
    return [...existing, normalized].sort((a, b) => (a.pinned === b.pinned ? a.order - b.order : b.pinned ? 1 : -1));
  });
};

export const deleteNote = async (id: string) =>
  replaceNotes((existing) => existing.filter((note) => note.id !== id));

export const clearNotes = async () => writeNotes([]);
