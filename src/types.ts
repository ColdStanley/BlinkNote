export type BlinkNoteType = 'text' | 'link' | 'image';

export interface BlinkNoteItem {
  id: string;
  title: string;
  type: BlinkNoteType;
  content: string;
  createdAt: number;
  updatedAt: number;
  order: number;
  color: string;
  pinned: boolean;
  reminder?: number | null;
  lineage: string[];
  sourceUrl?: string;
}

export type ViewMode = 'list' | 'grouped';
export type LayoutMode = 'single' | 'double';

export interface BlinkNotePreferences {
  viewMode: ViewMode;
  layout: LayoutMode;
  collapsedSections: string[];
  selectedDateFilter: string | null;
  calendarMonth: string;
}
