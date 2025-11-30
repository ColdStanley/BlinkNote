import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { nanoid } from 'nanoid';
import type { BlinkNoteItem } from './types';
import { STORAGE_KEY, normalizeNote, readNotes, writeNotes } from './storage/notesStorage';
import {
  IconCalendar,
  IconChevronLeft,
  IconChevronRight,
  IconClock,
  IconDownload,
  IconDots,
  IconGear,
  IconPin,
  IconPinOff,
  IconSave,
  IconSearch,
  IconTrash,
  IconUpload,
  IconPlus,
  IconList,
  IconColumns
} from './components/icons';
import './styles.css';

const COLOR_OPTIONS = [
  { name: 'Onyx', value: '#111111' },
  { name: 'Golden Hour', value: '#ffbd59' },
  { name: 'Slate', value: '#4b5563' },
  { name: 'Olive', value: '#6b8e23' },
  { name: 'Ocean', value: '#0f4c81' },
  { name: 'Rose', value: '#b83280' }
] as const;

const TAB_ITEMS = [
  { key: 'write', label: 'Write' },
  { key: 'notes', label: 'Notes' },
  { key: 'find', label: 'Find' }
] as const;

const TYPE_TABS = [
  { key: 'text', label: 'Text' },
  { key: 'image', label: 'Image' },
  { key: 'link', label: 'Url' },
  { key: 'all', label: 'All' }
] as const;

type TabKey = (typeof TAB_ITEMS)[number]['key'];
type TypeTabKey = (typeof TYPE_TABS)[number]['key'];

type ComposePanel = 'title' | 'color' | 'reminder' | null;

const THEME_KEY = 'blinknote.theme';
type ThemeOption = 'light' | 'dark' | 'system';

type SortOrder = 'recent' | 'oldest';


declare const chrome:
  | {
      storage?: {
        onChanged?: {
          addListener: (callback: (changes: Record<string, { newValue?: unknown }>, areaName: string) => void) => void;
          removeListener: (callback: (changes: Record<string, { newValue?: unknown }>, areaName: string) => void) => void;
        };
      };
    }
  | undefined;

const detectType = (value: string) => {
  if (/^https?:\/\//i.test(value.trim())) return 'link';
  if (/^data:image|\.(png|jpe?g|gif|webp)$/i.test(value.trim())) return 'image';
  return 'text';
};

const formatDate = (date: Date, options: Intl.DateTimeFormatOptions) => date.toLocaleDateString(undefined, options);

const formatTimestamp = (timestamp?: number | null, includeTime = true) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return formatDate(
    date,
    includeTime
      ? { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }
      : { year: 'numeric', month: '2-digit', day: '2-digit' }
  );
};

const sortNotes = (items: BlinkNoteItem[]) =>
  [...items].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.updatedAt - a.updatedAt;
  });

const getHost = (value: string) => {
  try {
    const url = new URL(value);
    return url.hostname;
  } catch {
    return value.replace(/^https?:\/\//i, '').split('/')[0];
  }
};

const truncateText = (value: string, length = 120) => {
  const trimmed = value.replace(/\s+/g, ' ').trim();
  if (!trimmed) return 'Empty note';
  return trimmed.length > length ? `${trimmed.slice(0, length - 1)}…` : trimmed;
};

const DropZone = ({ onDrop, isActive, onActivate }: { onDrop: () => void; isActive: boolean; onActivate: () => void }) => (
  <div
    className={`h-4 rounded-full transition-all ${isActive ? 'bg-[#dfe3f0]' : 'bg-transparent'}`}
    onDragOver={(event) => {
      event.preventDefault();
      onActivate();
    }}
    onDrop={(event) => {
      event.preventDefault();
      onDrop();
    }}
  />
);

type NoteRowProps = {
  note: BlinkNoteItem;
  selected: boolean;
  selectionMode: boolean;
  onSelect: (note: BlinkNoteItem, mode: 'view' | 'edit') => void;
  onToggleSelected: (id: string) => void;
  onDelete: (id: string) => void;
  onTogglePin: (id: string) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDragOverRow: (id: string) => void;
  onDropOnRow: (id: string) => void;
  draggingId: string | null;
  dragOverId: string | null;
  showTimestamp: boolean;
  variant?: 'default' | 'image';
};

const NoteRow = ({
  note,
  selected,
  selectionMode,
  onSelect,
  onToggleSelected,
  onDelete,
  onTogglePin,
  onDragStart,
  onDragEnd,
  onDragOverRow,
  onDropOnRow,
  draggingId,
  dragOverId,
  showTimestamp,
  variant = 'default'
}: NoteRowProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const type = note.type;
  const isImageVariant = variant === 'image';
  const host = type === 'link' ? getHost(note.content) : null;
  const summary = host || truncateText(note.content, 140);
  const meta: string[] = [];
  if (note.sourceUrl && !host) meta.push(getHost(note.sourceUrl));
  if (note.reminder) meta.push(formatTimestamp(note.reminder, true));

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (isImageVariant) {
    return (
      <div className={`group relative ${draggingId === note.id ? 'opacity-60' : ''}`} draggable onDragStart={() => onDragStart(note.id)} onDragEnd={onDragEnd}>
        {selectionMode && (
          <input type="checkbox" className="absolute left-2 top-2 h-4 w-4 accent-[#111111]" checked={selected} onChange={() => onToggleSelected(note.id)} aria-label="Select note" />
        )}
        <button type="button" className="block w-full overflow-hidden rounded-3xl shadow-[0_12px_25px_rgba(15,23,42,0.15)]" onClick={() => onSelect(note, 'view')}>
          <img src={note.content} alt={note.title || 'Image note'} className="aspect-[4/3] w-full object-cover" />
        </button>
        <div className="absolute right-2 top-2" ref={menuRef}>
          <button type="button" aria-label="Note actions" className="rounded-full bg-white/80 p-2 text-[#111111] shadow-sm" onClick={(event) => { event.stopPropagation(); setMenuOpen((prev) => !prev); }}>
            <IconDots className="h-4 w-4" />
          </button>
          {menuOpen && (
            <div className="fade-in soft-menu absolute right-0 top-10 min-w-[9.5rem] p-3 text-sm">
              <button type="button" className="flex w-full items-center justify-between border-b border-dashed border-[#d8d3c8] py-1 text-left" onClick={() => { onSelect(note, 'view'); setMenuOpen(false); }}>
                <span>View</span>
                <IconList className="h-4 w-4" />
              </button>
              <button type="button" className="flex w-full items-center justify-between border-b border-dashed border-[#d8d3c8] py-1 text-left" onClick={() => { onSelect(note, 'edit'); setMenuOpen(false); }}>
                <span>Edit</span>
                <IconColumns className="h-4 w-4" />
              </button>
              <button type="button" className="flex w-full items-center justify-between border-b border-dashed border-[#d8d3c8] py-1 text-left" onClick={() => { onTogglePin(note.id); setMenuOpen(false); }}>
                <span>{note.pinned ? 'Unpin' : 'Pin'}</span>
                {note.pinned ? <IconPinOff className="h-4 w-4" /> : <IconPin className="h-4 w-4" />}
              </button>
              <button type="button" className="mt-2 flex w-full items-center justify-between border-b border-dashed border-[#d8d3c8] py-1 text-left text-red-500" onClick={() => { onDelete(note.id); setMenuOpen(false); }}>
                <span>Delete</span>
                <IconTrash className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group soft-row flex w-full items-start gap-3 px-4 py-3 transition ${draggingId === note.id ? 'opacity-60' : ''} ${
        dragOverId === note.id ? 'ring-2 ring-[#dfe3f0]' : ''
      }`}
      draggable
      onDragStart={() => onDragStart(note.id)}
      onDragEnd={onDragEnd}
      onDragOver={(event) => {
        event.preventDefault();
        onDragOverRow(note.id);
      }}
      onDrop={(event) => {
        event.preventDefault();
        onDropOnRow(note.id);
      }}
    >
      {selectionMode && (
        <input
          type="checkbox"
          className="mt-2 h-4 w-4 flex-shrink-0 accent-[#111111]"
          checked={selected}
          onChange={() => onToggleSelected(note.id)}
          aria-label="Select note"
        />
      )}
      <button
        type="button"
        className="flex flex-1 flex-col gap-1 text-left outline-none focus-visible:underline focus-visible:decoration-dotted focus-visible:underline-offset-4"
        onClick={() => onSelect(note, 'view')}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onSelect(note, 'view');
          }
        }}
      >
        {host ? (
          <a href={note.content} target="_blank" rel="noreferrer" className="text-sm font-medium text-[#111111] underline-offset-4 hover:underline" onClick={(event) => event.stopPropagation()}>
            {host}
          </a>
        ) : (
          <p className="line-clamp-2 text-sm text-[#111111]">{summary}</p>
        )}
        {(meta.length > 0 || showTimestamp) && (
          <p className="text-xs text-[#9ca3af]">
            {[...meta, showTimestamp ? formatTimestamp(note.updatedAt, true) : null].filter(Boolean).join(' • ')}
          </p>
        )}
      </button>
      <div className="relative flex-shrink-0 pl-2" ref={menuRef}>
        <button
          type="button"
          aria-label="Note actions"
          className="rounded-full bg-white/70 p-2 text-[#111111] shadow-sm transition hover:shadow"
          onClick={(event) => {
            event.stopPropagation();
            setMenuOpen((prev) => !prev);
          }}
        >
          <IconDots className="h-4 w-4" />
        </button>
        {menuOpen && (
          <div className="fade-in soft-menu absolute right-0 top-12 z-10 min-w-[11rem] p-3 text-sm">
            <button
              type="button"
              className="flex w-full items-center justify-between border-b border-dashed border-[#d8d3c8] py-1 text-left"
              onClick={() => {
                onSelect(note, 'view');
                setMenuOpen(false);
              }}
            >
              <span>View</span>
              <IconList className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="flex w-full items-center justify-between border-b border-dashed border-[#d8d3c8] py-1 text-left"
              onClick={() => {
                onSelect(note, 'edit');
                setMenuOpen(false);
              }}
            >
              <span>Edit</span>
              <IconColumns className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="flex w-full items-center justify-between border-b border-dashed border-[#d8d3c8] py-1 text-left"
              onClick={() => {
                onTogglePin(note.id);
                setMenuOpen(false);
              }}
            >
              <span>{note.pinned ? 'Unpin' : 'Pin'}</span>
              {note.pinned ? <IconPinOff className="h-4 w-4" /> : <IconPin className="h-4 w-4" />}
            </button>
            <button
              type="button"
              className="mt-2 flex w-full items-center justify-between border-b border-dashed border-[#d8d3c8] py-1 text-left text-red-500"
              onClick={() => {
                onDelete(note.id);
                setMenuOpen(false);
              }}
            >
              <span>Delete</span>
              <IconTrash className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const ReminderPanel = ({
  value,
  onChange,
  onClose
}: {
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
}) => {
  const dateValue = value ? value.slice(0, 10) : '';
  const timeValue = value ? value.slice(11, 16) : '';
  const handleDateChange = (next: string) => {
    if (!next && !timeValue) {
      onChange('');
      return;
    }
    const time = timeValue || '09:00';
    onChange(`${next}T${time}`);
  };
  const handleTimeChange = (next: string) => {
    if (!next && !dateValue) {
      onChange('');
      return;
    }
    const date = dateValue || new Date().toISOString().slice(0, 10);
    onChange(`${date}T${next || '09:00'}`);
  };
  const quickFill = (offsetDays: number, hour: number, minute: number) => {
    const base = new Date();
    base.setDate(base.getDate() + offsetDays);
    base.setHours(hour, minute, 0, 0);
    onChange(base.toISOString().slice(0, 16));
  };
  return (
    <div className="fade-in soft-panel px-4 py-4 space-y-3">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-medium text-[#6b7280]">
          Date
          <input
            type="date"
            value={dateValue}
            onChange={(event) => handleDateChange(event.target.value)}
            className="soft-input mt-1 w-full bg-transparent px-3 py-2 text-sm"
          />
        </label>
        <label className="text-xs font-medium text-[#6b7280]">
          Time
          <input
            type="time"
            value={timeValue}
            onChange={(event) => handleTimeChange(event.target.value)}
            className="soft-input mt-1 w-full bg-transparent px-3 py-2 text-sm"
          />
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="soft-chip text-xs text-[#6b7280] hover:text-[#111111]"
          onClick={() => quickFill(0, 9, 0)}
        >
          Today 09:00
        </button>
        <button
          type="button"
          className="soft-chip text-xs text-[#6b7280] hover:text-[#111111]"
          onClick={() => quickFill(0, 14, 0)}
        >
          Today 14:00
        </button>
        <button
          type="button"
          className="soft-chip text-xs text-[#6b7280] hover:text-[#111111]"
          onClick={() => quickFill(1, 9, 0)}
        >
          Tomorrow 09:00
        </button>
      </div>
      <div className="flex justify-end gap-4 text-xs">
        <button type="button" className="text-[#6b7280] hover:text-[#111111]" onClick={() => onChange('')}>
          Clear
        </button>
        <button type="button" className="text-[#111111] underline underline-offset-4" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
};

const App = () => {
  const [notes, setNotes] = useState<BlinkNoteItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [noteDraft, setNoteDraft] = useState({ title: '', content: '', color: COLOR_OPTIONS[1].value, reminder: '' });
  const [activeTab, setActiveTab] = useState<TabKey>('write');
  const [composeMenuOpen, setComposeMenuOpen] = useState(false);
  const [composePanel, setComposePanel] = useState<ComposePanel>(null);
  const composeMenuRef = useRef<HTMLDivElement | null>(null);
  const composePanelRef = useRef<HTMLDivElement | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [activeNote, setActiveNote] = useState<BlinkNoteItem | null>(null);
  const [isEditingActiveNote, setIsEditingActiveNote] = useState(false);
  const [editorDraft, setEditorDraft] = useState({ title: '', content: '', color: COLOR_OPTIONS[0].value, reminder: '' });
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [settingsView, setSettingsView] = useState<'root' | 'layout' | 'data' | 'filters' | 'theme'>('root');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const calendarRef = useRef<HTMLDivElement | null>(null);
  const [listMenuOpen, setListMenuOpen] = useState(false);
  const listMenuRef = useRef<HTMLDivElement | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const syncingFromStorage = useRef(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importing, setImporting] = useState(false);
  const [preferences, setPreferences] = useState({
    collapsedSections: [] as string[],
    selectedDateFilter: null as string | null,
    calendarMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
  });
  const [theme, setTheme] = useState<ThemeOption>('system');
  const [activeTypeTab, setActiveTypeTab] = useState<TypeTabKey>('all');

  useEffect(() => {
    const run = async () => {
      const stored = await readNotes();
      setNotes(sortNotes(stored));
      setLoaded(true);
    };
    void run();
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(THEME_KEY) as ThemeOption | null;
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      setTheme(stored);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const root = document.body;
    const resolve = (value: ThemeOption) => {
      if (value === 'system') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      return value;
    };
    const apply = (mode: ThemeOption) => {
      root.setAttribute('data-theme', mode);
    };
    const current = resolve(theme);
    apply(current);
    localStorage.setItem(THEME_KEY, theme);
    if (theme !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => apply(media.matches ? 'dark' : 'light');
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, [theme]);

  useEffect(() => {
    if (!loaded) return;
    if (syncingFromStorage.current) {
      syncingFromStorage.current = false;
      return;
    }
    void writeNotes(notes);
  }, [notes, loaded]);

  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.storage?.onChanged) return;
    const handler = (changes: Record<string, { newValue?: unknown }>, areaName: string) => {
      if (!loaded || areaName !== 'local') return;
      const change = changes[STORAGE_KEY];
      if (!change || !Array.isArray(change.newValue)) return;
      syncingFromStorage.current = true;
      setNotes(sortNotes(change.newValue.map((item) => normalizeNote(item as BlinkNoteItem))));
    };
    chrome.storage.onChanged?.addListener(handler);
    return () => chrome.storage.onChanged?.removeListener(handler);
  }, [loaded]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setSettingsOpen(false);
        setSettingsView('root');
      }
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setCalendarOpen(false);
      }
      if (composeMenuRef.current && !composeMenuRef.current.contains(event.target as Node)) {
        setComposeMenuOpen(false);
      }
      if (listMenuRef.current && !listMenuRef.current.contains(event.target as Node)) {
        setListMenuOpen(false);
      }
      if (composePanelRef.current && !composePanelRef.current.contains(event.target as Node)) {
        setComposePanel(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    setDropIndex(null);
  }, [activeTypeTab]);

  useEffect(() => {
    if (!activeNote) return;
    setEditorDraft({
      title: activeNote.title,
      content: activeNote.content,
      color: activeNote.color,
      reminder: activeNote.reminder ? new Date(activeNote.reminder).toISOString().slice(0, 16) : ''
    });
    setIsEditingActiveNote(false);
  }, [activeNote]);

  const sortedNotes = useMemo(() => sortNotes(notes), [notes]);

  const filteredByDate = useMemo(() => {
    if (!preferences.selectedDateFilter) return sortedNotes;
    return sortedNotes.filter((note) => {
      const reference = note.reminder ?? note.createdAt;
      return new Date(reference).toISOString().slice(0, 10) === preferences.selectedDateFilter;
    });
  }, [sortedNotes, preferences.selectedDateFilter]);

  const searchResults = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    if (!term) return [];
    return sortedNotes.filter((note) =>
      [note.title, note.content].some((value) => value.toLowerCase().includes(term))
    );
  }, [sortedNotes, searchQuery]);

  const typedByFilter = useMemo(() => {
    const groups: Record<TypeTabKey, BlinkNoteItem[]> = {
      all: filteredByDate,
      text: filteredByDate.filter((note) => note.type === 'text'),
      image: filteredByDate.filter((note) => note.type === 'image'),
      link: filteredByDate.filter((note) => note.type === 'link')
    };
    return groups;
  }, [filteredByDate]);
  const currentNotes = typedByFilter[activeTypeTab];
  const isImageView = activeTypeTab === 'image';

  const updateNotes = useCallback((updater: (prev: BlinkNoteItem[]) => BlinkNoteItem[]) => {
    setNotes((prev) => updater(prev));
  }, []);

  const handleCreateNote = () => {
    if (!noteDraft.content.trim()) return;
    const timestamp = Date.now();
    const newNote: BlinkNoteItem = {
      id: nanoid(),
      title: noteDraft.title.trim() || 'Untitled note',
      type: detectType(noteDraft.content),
      content: noteDraft.content.trim(),
      createdAt: timestamp,
      updatedAt: timestamp,
      order: notes.length ? Math.max(...notes.map((note) => note.order)) + 1 : 1,
      color: noteDraft.color,
      pinned: false,
      reminder: noteDraft.reminder ? new Date(noteDraft.reminder).getTime() : null,
      lineage: []
    };
    updateNotes((prev) => [newNote, ...prev]);
    setNoteDraft({ title: '', content: '', color: COLOR_OPTIONS[1].value, reminder: '' });
    setComposePanel(null);
    setComposeMenuOpen(false);
  };

  const handleDeleteNote = (id: string) => {
    updateNotes((prev) => prev.filter((note) => note.id !== id));
    setSelectedIds((prev) => prev.filter((noteId) => noteId !== id));
  };

  const handleTogglePin = (id: string) => {
    updateNotes((prev) =>
      prev.map((note) => (note.id === id ? { ...note, pinned: !note.pinned, updatedAt: Date.now() } : note))
    );
  };

  const handleToggleSelection = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((noteId) => noteId !== id) : [...prev, id]));
  };

  const handleBatchDelete = () => {
    updateNotes((prev) => prev.filter((note) => !selectedIds.includes(note.id)));
    setSelectedIds([]);
  };

  const handleBatchPin = (pinned: boolean) => {
    updateNotes((prev) =>
      prev.map((note) => (selectedIds.includes(note.id) ? { ...note, pinned, updatedAt: Date.now() } : note))
    );
  };



  const handleDragStart = (id: string) => setDraggingId(id);
  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverId(null);
    setDropIndex(null);
  };

  const handleDropAtIndex = (index: number) => {
    if (!draggingId) return;
    const ordered = filteredByDate.map((note) => note.id);
    const currentIndex = ordered.indexOf(draggingId);
    if (currentIndex === -1) return;
    const activeList = typedByFilter[activeTypeTab];
    const marker = activeList[index];
    ordered.splice(currentIndex, 1);
    const insertIndex = marker ? ordered.indexOf(marker.id) : ordered.length;
    ordered.splice(insertIndex, 0, draggingId);
    updateNotes((prev) => {
      const weight = new Map(ordered.map((id, idx) => [id, idx]));
      return prev.map((note) => (weight.has(note.id) ? { ...note, order: weight.get(note.id)! } : note));
    });
    handleDragEnd();
  };

  const handleDropOnRow = (targetId: string) => {
    if (!draggingId || draggingId === targetId) return;
    const ordered = filteredByDate.map((note) => note.id);
    const currentIndex = ordered.indexOf(draggingId);
    const targetIndex = ordered.indexOf(targetId);
    if (currentIndex === -1 || targetIndex === -1) return;
    ordered.splice(currentIndex, 1);
    ordered.splice(targetIndex, 0, draggingId);
    updateNotes((prev) => {
      const weight = new Map(ordered.map((id, idx) => [id, idx]));
      return prev.map((note) => (weight.has(note.id) ? { ...note, order: weight.get(note.id)! } : note));
    });
    handleDragEnd();
  };

  const handleImport = (file?: File | null) => {
    if (!file) return;
    setImporting(true);
    file
      .text()
      .then((text) => {
        const payload = JSON.parse(text);
        if (!Array.isArray(payload.notes)) throw new Error('Invalid payload');
        const normalized = payload.notes.map((note: BlinkNoteItem) => normalizeNote(note));
        updateNotes(() => sortNotes(normalized));
      })
      .catch((error) => {
        console.error('Import failed', error);
      })
      .finally(() => {
        setImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      });
  };

  const handleSelectNote = (note: BlinkNoteItem, mode: 'view' | 'edit') => {
    setActiveNote(note);
    setIsEditingActiveNote(mode === 'edit');
  };

  const handleSaveActiveNote = () => {
    if (!activeNote) return;
    updateNotes((prev) =>
      prev.map((note) =>
        note.id === activeNote.id
          ? {
              ...note,
              title: editorDraft.title.trim() || 'Untitled note',
              content: editorDraft.content.trim(),
              color: editorDraft.color,
              reminder: editorDraft.reminder ? new Date(editorDraft.reminder).getTime() : null,
              updatedAt: Date.now()
            }
          : note
      )
    );
    setActiveNote(null);
  };

  const listMenuItems = [
    {
      label: isSelectionMode ? 'Exit selection' : 'Multi-select',
      action: () => {
        setIsSelectionMode((prev) => !prev);
        setSelectedIds([]);
      }
    },
    {
      label: 'Clear selections',
      action: () => setSelectedIds([])
    }
  ];

  return (
    <div className="relative min-h-screen px-4 py-10 text-[#111111]" style={{ background: 'radial-gradient(circle at top, #ffffff, #f5f7fb)' }}>
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <header className="soft-panel px-6 py-5">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold tracking-tight">BlinkNote</h1>
            <div className="flex items-center gap-2" ref={settingsRef}>
              <button
                type="button"
                className="rounded-full bg-white/70 p-2 text-[#111111] shadow-sm transition hover:shadow"
                aria-label="Settings"
                onClick={() => {
                  setSettingsOpen((prev) => !prev);
                  setSettingsView('root');
                }}
              >
                <IconGear className="h-4 w-4" />
              </button>
              {settingsOpen && (
                <div className="fade-in soft-menu absolute right-4 top-24 z-20 min-w-[11rem] p-4 text-sm">
                  {settingsView === 'root' && (
                    <div className="space-y-1">
                      <button
                        type="button"
                        className="flex w-full items-center justify-between py-2 text-left text-sm text-[#6b7280] hover:text-[#111111]"
                        onClick={() => setSettingsView('theme')}
                      >
                        Theme
                        <IconChevronRight className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between py-2 text-left text-sm text-[#6b7280] hover:text-[#111111]"
                        onClick={() => setSettingsView('layout')}
                      >
                        Layout
                        <IconChevronRight className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between py-2 text-left text-sm text-[#6b7280] hover:text-[#111111]"
                        onClick={() => setSettingsView('data')}
                      >
                        Data
                        <IconChevronRight className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between py-2 text-left text-sm text-[#6b7280] hover:text-[#111111]"
                        onClick={() => setSettingsView('filters')}
                      >
                        Filters
                        <IconChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                  {settingsView === 'layout' && (
                    <div className="space-y-2">
                      <button type="button" className="text-xs text-[#6b7280]" onClick={() => setSettingsView('root')}>
                        ← Back
                      </button>
                      <p className="text-sm font-semibold">Layout</p>
                      <p className="text-xs text-[#6b7280]">Tabs control the main sections. Drag notes to reorder.</p>
                    </div>
                  )}
                  {settingsView === 'data' && (
                    <div className="space-y-3">
                      <button type="button" className="text-xs text-[#6b7280]" onClick={() => setSettingsView('root')}>
                        ← Back
                      </button>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between border-b border-dashed border-[#d8d3c8] py-2 text-left hover:text-[#111111]"
                        onClick={() => {
                          const payload = { exportedAt: new Date().toISOString(), notes };
                          const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const link = document.createElement('a');
                          link.href = url;
                          link.download = `blinknote-backup-${formatDate(new Date(), {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit'
                          })}.json`;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          URL.revokeObjectURL(url);
                        }}
                      >
                        Export JSON
                        <IconDownload className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between border-b border-dashed border-[#d8d3c8] py-2 text-left hover:text-[#111111]"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={importing}
                      >
                        {importing ? 'Importing…' : 'Import JSON'}
                        <IconUpload className="h-4 w-4" />
                      </button>
                      <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={(event) => handleImport(event.target.files?.[0])} />
                    </div>
                  )}
                  {settingsView === 'filters' && (
                    <div className="space-y-2" ref={calendarRef}>
                      <button type="button" className="text-xs text-[#6b7280]" onClick={() => setSettingsView('root')}>
                        ← Back
                      </button>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between border-b border-dashed border-[#d8d3c8] py-2 text-left"
                        onClick={() => setCalendarOpen((prev) => !prev)}
                      >
                        Calendar filter
                        <IconChevronRight className={`h-3.5 w-3.5 transition ${calendarOpen ? 'rotate-90' : ''}`} />
                      </button>
                      {preferences.selectedDateFilter && (
                        <button
                          type="button"
                          className="text-xs text-[#6b7280] underline underline-offset-4"
                          onClick={() => setPreferences((prev) => ({ ...prev, selectedDateFilter: null }))}
                        >
                          Clear selected date
                        </button>
                      )}
                      {calendarOpen && (
                        <div className="fade-in border-t border-[#e5e5e5] pt-3">
                          <MiniCalendar
                            month={new Date(preferences.calendarMonth)}
                            notes={notes}
                            selectedDay={preferences.selectedDateFilter}
                            onChangeMonth={(value) => setPreferences((prev) => ({ ...prev, calendarMonth: value.toISOString() }))}
                            onSelectDay={(value) => setPreferences((prev) => ({ ...prev, selectedDateFilter: value }))}
                          />
                        </div>
                      )}
                    </div>
                  )}
                  {settingsView === 'theme' && (
                    <div className="space-y-3">
                      <button type="button" className="text-xs text-[#6b7280]" onClick={() => setSettingsView('root')}>
                        ← Back
                      </button>
                      <p className="text-sm font-semibold">Theme</p>
                      <p className="text-xs text-[#6b7280]">Choose how BlinkNote adapts to light or dark preference.</p>
                      <div className="space-y-2">
                        {(['light', 'dark', 'system'] as ThemeOption[]).map((option) => (
                          <button
                            key={option}
                            type="button"
                            className={`w-full border-b border-[#d8d3c8] py-2 text-left capitalize transition ${
                              theme === option ? 'text-[#111111]' : 'text-[#6b7280] hover:text-[#111111]'
                            }`}
                            onClick={() => setTheme(option)}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            {TAB_ITEMS.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  className={`soft-tab ${isActive ? 'soft-tab--active' : ''}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </header>

        <section className="space-y-8">
          {activeTab === 'write' && (
            <div className="soft-panel px-6 py-5 space-y-3">
              <div className="flex items-center justify-end gap-3" ref={composeMenuRef}>
                <button type="button" className="soft-button px-4 py-2 text-sm" onClick={handleCreateNote}>
                  Save
                </button>
                <div className="relative">
                  <button
                    type="button"
                    className="rounded-full bg-white/70 p-2 text-[#111111] shadow-sm transition hover:shadow"
                    aria-label="Composer options"
                    onClick={() => setComposeMenuOpen((prev) => !prev)}
                  >
                    <IconDots className="h-4 w-4" />
                  </button>
                  {composeMenuOpen && (
                    <div className="fade-in soft-menu absolute right-0 top-12 z-10 min-w-[12rem] p-3 text-sm">
                      {['title', 'color', 'reminder'].map((item) => (
                        <button
                          key={item}
                          type="button"
                          className="flex w-full items-center justify-between py-1 capitalize text-[#6b7280] hover:text-[#111111]"
                          onClick={() => setComposePanel(item as ComposePanel)}
                        >
                          {item}
                          <IconChevronRight className="h-3.5 w-3.5" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <textarea
                rows={4}
                placeholder="Capture an idea…"
                value={noteDraft.content}
                onChange={(event) => setNoteDraft((prev) => ({ ...prev, content: event.target.value }))}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                    event.preventDefault();
                    handleCreateNote();
                  }
                }}
                className="soft-input w-full bg-transparent px-4 py-3 text-sm"
              />
              {composePanel && (
                <div ref={composePanelRef}>
                  {composePanel === 'title' && (
                    <div className="fade-in space-y-2 pt-3">
                      <p className="text-xs font-semibold text-[#6b7280]">Title</p>
                      <input
                        value={noteDraft.title}
                        onChange={(event) => setNoteDraft((prev) => ({ ...prev, title: event.target.value }))}
                        className="soft-input w-full bg-transparent px-4 py-2 text-sm"
                        placeholder="Add a title"
                      />
                    </div>
                  )}
                  {composePanel === 'color' && (
                    <div className="fade-in space-y-2 pt-3">
                      <p className="text-xs font-semibold text-[#6b7280]">Color</p>
                      <div className="flex flex-wrap gap-3">
                        {COLOR_OPTIONS.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setNoteDraft((prev) => ({ ...prev, color: option.value }))}
                            className={`h-6 w-6 rounded-full border border-transparent transition ${
                              noteDraft.color === option.value ? 'ring-1 ring-[#111111]' : ''
                            }`}
                            style={{ backgroundColor: option.value }}
                            aria-label={option.name}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  {composePanel === 'reminder' && (
                    <ReminderPanel value={noteDraft.reminder} onChange={(value) => setNoteDraft((prev) => ({ ...prev, reminder: value }))} onClose={() => setComposePanel(null)} />
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="soft-panel px-6 py-5 space-y-4">
              <div className="relative pt-1 text-sm">
                <div className="grid grid-cols-4 gap-2 pr-12">
                  {TYPE_TABS.map((tab) => {
                    const isActive = activeTypeTab === tab.key;
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        className={`soft-tab inline-flex w-full items-center justify-center text-xs ${isActive ? 'soft-tab--active' : ''}`}
                        onClick={() => setActiveTypeTab(tab.key)}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
                <div className="absolute right-0 top-1/2 -translate-y-1/2" ref={listMenuRef}>
                  <button
                    type="button"
                    className="rounded-full bg-white/70 p-2 text-[#111111] shadow-sm transition hover:shadow"
                    onClick={() => setListMenuOpen((prev) => !prev)}
                    aria-label="List options"
                  >
                    <IconDots className="h-4 w-4" />
                  </button>
                  {listMenuOpen && (
                    <div className="fade-in soft-menu absolute right-0 top-10 z-10 min-w-[12rem] p-3 text-sm">
                      {listMenuItems.map((item) => (
                        <button
                          key={item.label}
                          type="button"
                          className="w-full py-1 text-left text-[#6b7280] hover:text-[#111111]"
                          onClick={() => {
                            item.action();
                            setListMenuOpen(false);
                          }}
                        >
                          {item.label}
                        </button>
                      ))}
                      {selectedIds.length > 0 && (
                        <button
                          type="button"
                          className="w-full py-1 text-left text-red-500"
                          onClick={() => {
                            handleBatchDelete();
                            setListMenuOpen(false);
                          }}
                        >
                          Delete selected ({selectedIds.length})
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
              {preferences.selectedDateFilter && (
                <p className="text-xs text-[#6b7280]">Filtered by {preferences.selectedDateFilter}</p>
              )}
              {isSelectionMode && selectedIds.length > 0 && (
                <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-white/60 px-4 py-2 text-xs shadow">
                  <p className="font-medium text-[#111111]">Selected {selectedIds.length} notes</p>
                  <button
                    type="button"
                    className="text-[#111111]"
                    onClick={() => handleBatchPin(true)}
                  >
                    Pin
                  </button>
                  <button
                    type="button"
                    className="text-[#111111]"
                    onClick={() => handleBatchPin(false)}
                  >
                    Unpin
                  </button>
                  <button
                    type="button"
                    className="text-red-500"
                    onClick={handleBatchDelete}
                  >
                    Delete
                  </button>
                </div>
              )}
              {isImageView ? (
                <div className="grid grid-cols-2 gap-4">
                  {currentNotes.map((note) => (
                    <NoteRow
                      key={note.id}
                      note={note}
                      selected={selectedIds.includes(note.id)}
                      selectionMode={isSelectionMode}
                      onSelect={handleSelectNote}
                      onToggleSelected={handleToggleSelection}
                      onDelete={handleDeleteNote}
                      onTogglePin={handleTogglePin}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                      onDragOverRow={setDragOverId}
                      onDropOnRow={handleDropOnRow}
                      draggingId={draggingId}
                      dragOverId={dragOverId}
                      showTimestamp={false}
                      variant="image"
                    />
                  ))}
                  {!currentNotes.length && <p className="col-span-2 p-6 text-center text-sm text-[#6b7280]">No notes yet.</p>}
                </div>
              ) : (
                <div className="space-y-4">
                  {currentNotes.map((note, index) => (
                    <div key={note.id}>
                      <DropZone onDrop={() => handleDropAtIndex(index)} isActive={dropIndex === index} onActivate={() => setDropIndex(index)} />
                      <NoteRow
                        note={note}
                        selected={selectedIds.includes(note.id)}
                        selectionMode={isSelectionMode}
                        onSelect={handleSelectNote}
                        onToggleSelected={handleToggleSelection}
                        onDelete={handleDeleteNote}
                        onTogglePin={handleTogglePin}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        onDragOverRow={setDragOverId}
                        onDropOnRow={handleDropOnRow}
                        draggingId={draggingId}
                        dragOverId={dragOverId}
                        showTimestamp={false}
                        variant={note.type === 'image' ? 'image' : 'default'}
                      />
                    </div>
                  ))}
                  <DropZone
                    onDrop={() => handleDropAtIndex(currentNotes.length)}
                    isActive={dropIndex === currentNotes.length}
                    onActivate={() => setDropIndex(currentNotes.length)}
                  />
                  {!currentNotes.length && <p className="p-6 text-center text-sm text-[#6b7280]">No notes yet.</p>}
                </div>
              )}
            </div>
          )}

          {activeTab === 'find' && (
            <div className="soft-panel px-6 py-5 space-y-3">
              <div className="relative">
                <IconSearch className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-[#6b7280]" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search title or content…"
                  className="soft-input w-full bg-transparent py-3 pl-9 pr-3 text-sm"
                />
              </div>
              <div className="space-y-4">
                {searchResults.map((note) => (
                  <NoteRow
                    key={note.id}
                    note={note}
                    selected={false}
                    selectionMode={false}
                    onSelect={handleSelectNote}
                    onToggleSelected={() => undefined}
                    onDelete={handleDeleteNote}
                    onTogglePin={handleTogglePin}
                    onDragStart={() => undefined}
                    onDragEnd={() => undefined}
                    onDragOverRow={() => undefined}
                    onDropOnRow={() => undefined}
                    draggingId={null}
                    dragOverId={null}
                    showTimestamp
                    variant={note.type === 'image' ? 'image' : 'default'}
                  />
                ))}
                {!searchResults.length && searchQuery && <p className="p-6 text-center text-sm text-[#6b7280]">No matches.</p>}
                {!searchQuery && <p className="p-6 text-center text-sm text-[#6b7280]">Start typing to search.</p>}
              </div>
            </div>
          )}
        </section>
      </div>

      {activeNote && (
        <div className="fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-6 backdrop-blur-sm" onClick={() => setActiveNote(null)}>
          <div className="soft-panel w-full max-w-2xl px-6 py-6" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-[#6b7280]">Note</p>
                <p className="text-lg font-semibold text-[#111111]">{activeNote.title || 'Untitled note'}</p>
                <p className="text-xs text-[#6b7280]">Updated {formatTimestamp(activeNote.updatedAt, true)}</p>
              </div>
              <div className="flex items-center gap-2">
                {!isEditingActiveNote && (
                  <button
                    type="button"
                    className="soft-chip text-xs text-[#111111]"
                    onClick={() => setIsEditingActiveNote(true)}
                  >
                    Edit
                  </button>
                )}
                <button
                  type="button"
                  className="soft-chip text-xs text-[#6b7280]"
                  onClick={() => setActiveNote(null)}
                >
                  Close
                </button>
              </div>
            </div>
            {!isEditingActiveNote ? (
              <div className="space-y-4">
                <div className="soft-input space-y-3 rounded-3xl bg-transparent p-4 text-sm text-[#111111] shadow-inner">
                  {activeNote.type === 'image' ? (
                    <div className="space-y-3">
                      <img src={activeNote.content} alt={activeNote.title} className="max-h-[420px] w-full object-contain" />
                      <a
                        href={activeNote.content}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex text-sm text-[#111111] underline"
                      >
                        Open original
                      </a>
                    </div>
                  ) : activeNote.type === 'link' ? (
                    <div className="space-y-3 text-sm">
                      <p className="break-all text-[#111111]">{activeNote.content}</p>
                      <a href={activeNote.content} target="_blank" rel="noreferrer" className="inline-flex text-[#111111] underline">
                        Visit link
                      </a>
                    </div>
                  ) : (
                    <p className="whitespace-pre-line text-sm leading-relaxed text-[#111111]">
                      {activeNote.content || 'Empty note'}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-[#6b7280]">
                  <span className="inline-flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: activeNote.color }} />
                    Color
                  </span>
                  {activeNote.reminder && (
                    <span className="inline-flex items-center gap-1 text-[#111111]">
                      <IconClock className="h-3.5 w-3.5" />
                      {formatTimestamp(activeNote.reminder, true)}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <input
                  value={editorDraft.title}
                  onChange={(event) => setEditorDraft((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="Title"
                  className="soft-input w-full bg-transparent px-4 py-2 text-sm"
                />
                {activeNote.type === 'image' ? (
                  <div className="space-y-3 text-sm text-[#6b7280]">
                    <img src={activeNote.content} alt={activeNote.title} className="max-h-[320px] w-full object-contain" />
                    Image source is managed automatically.
                  </div>
                ) : (
                  <textarea
                    rows={8}
                    value={editorDraft.content}
                    onChange={(event) => setEditorDraft((prev) => ({ ...prev, content: event.target.value }))}
                    placeholder="Content"
                    className="soft-input w-full bg-transparent px-4 py-3 text-sm"
                  />
                )}
                <div className="flex flex-wrap gap-3">
                  {COLOR_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setEditorDraft((prev) => ({ ...prev, color: option.value }))}
                      className={`h-7 w-7 rounded-full border border-transparent transition ${
                        editorDraft.color === option.value ? 'ring-1 ring-[#111111] scale-105' : ''
                      }`}
                      style={{ backgroundColor: option.value }}
                      aria-label={option.name}
                    />
                  ))}
                </div>
                <input
                  type="datetime-local"
                  value={editorDraft.reminder}
                  onChange={(event) => setEditorDraft((prev) => ({ ...prev, reminder: event.target.value }))}
                  className="soft-input w-full bg-transparent px-4 py-2 text-sm"
                />
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    className="soft-chip text-xs text-[#6b7280]"
                    onClick={() => {
                      if (!activeNote) return;
                      setEditorDraft({
                        title: activeNote.title,
                        content: activeNote.content,
                        color: activeNote.color,
                        reminder: activeNote.reminder ? new Date(activeNote.reminder).toISOString().slice(0, 16) : ''
                      });
                      setIsEditingActiveNote(false);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="soft-button flex items-center gap-1"
                    onClick={handleSaveActiveNote}
                  >
                    <IconSave className="h-4 w-4" />
                    Save
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

const MiniCalendar = ({
  month,
  notes,
  selectedDay,
  onChangeMonth,
  onSelectDay
}: {
  month: Date;
  notes: BlinkNoteItem[];
  selectedDay: string | null;
  onChangeMonth: (next: Date) => void;
  onSelectDay: (value: string | null) => void;
}) => {
  const cells = useMemo(() => {
    const start = new Date(month.getFullYear(), month.getMonth(), 1);
    const startWeekday = start.getDay();
    const firstCell = new Date(start);
    firstCell.setDate(start.getDate() - startWeekday);
    return Array.from({ length: 42 }, (_, index) => {
      const cell = new Date(firstCell);
      cell.setDate(cell.getDate() + index);
      return cell;
    });
  }, [month]);

  const noteMap = useMemo(() => {
    const map = new Map<string, number>();
    notes.forEach((note) => {
      const reference = note.reminder ?? note.createdAt;
      const key = new Date(reference).toISOString().slice(0, 10);
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [notes]);

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#111111]">
          <IconCalendar className="h-5 w-5" />
          <span>{formatDate(month, { year: 'numeric', month: 'long' })}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-full border border-neutral-200 p-1 text-[#111111]"
            onClick={() => onChangeMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
            aria-label="Previous month"
          >
            <IconChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="rounded-full border border-neutral-200 p-1 text-[#111111]"
            onClick={() => onChangeMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
            aria-label="Next month"
          >
            <IconChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-[#6b7280]">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label) => (
          <span key={label} className="py-1 font-medium">
            {label}
          </span>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1">
        {cells.map((date) => {
          const key = date.toISOString().slice(0, 10);
          const isCurrentMonth = date.getMonth() === month.getMonth();
          const count = noteMap.get(key) || 0;
          const isActive = selectedDay === key;
          return (
            <button
              key={key}
              type="button"
              disabled={!isCurrentMonth}
              className={`flex h-12 flex-col items-center justify-center rounded-lg border text-xs transition ${
                !isCurrentMonth
                  ? 'border-transparent text-[#6b7280]/40'
                  : isActive
                    ? 'border-[#ffbd59] bg-[#ffbd59]/20 text-[#111111]'
                    : 'border-transparent hover:border-[#ffbd59]/40 hover:bg-neutral-50'
              }`}
              onClick={() => onSelectDay(isActive ? null : key)}
            >
              <span>{date.getDate()}</span>
              {count > 0 && <span className="text-[10px] text-[#ffbd59]">{count}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default App;
