export type BlinkNoteType = 'text' | 'link' | 'image';

export interface BlinkNoteItem {
  id: string;
  type: BlinkNoteType;
  content: string;
  createdAt: number;
  sourceUrl?: string;
}
