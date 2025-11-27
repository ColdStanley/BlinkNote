import { jsPDF } from 'jspdf';
import type { BlinkNoteItem } from '../types';

const formatTimestamp = (timestamp: number) => new Date(timestamp).toISOString().replace('T', ' ').slice(0, 16);

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

export const exportMarkdown = (note: BlinkNoteItem) => {
  const header = `# BlinkNote\n\n- Type: ${note.type}\n- Created: ${formatTimestamp(note.createdAt)}\n\n`;
  const body = note.type === 'image' ? `![image](${note.content})` : note.content;
  const blob = new Blob([header + body], { type: 'text/markdown' });
  downloadBlob(blob, `${note.id}.md`);
};

export const exportJSON = (note: BlinkNoteItem) => {
  const blob = new Blob([JSON.stringify(note, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `${note.id}.json`);
};

export const exportPDF = async (note: BlinkNoteItem) => {
  const doc = new jsPDF();
  let cursorY = 20;
  doc.setFontSize(16);
  doc.text('BlinkNote', 14, cursorY);
  cursorY += 10;
  doc.setFontSize(12);
  doc.text(`Type: ${note.type}`, 14, cursorY);
  cursorY += 6;
  doc.text(`Created: ${formatTimestamp(note.createdAt)}`, 14, cursorY);
  cursorY += 10;

  if (note.type === 'image') {
    try {
      const imgProps = doc.getImageProperties(note.content);
      const width = 180;
      const height = (imgProps.height * width) / imgProps.width;
      doc.addImage(note.content, 'PNG', 14, cursorY, width, height);
    } catch (error) {
      doc.text('[Image could not be rendered]', 14, cursorY);
    }
  } else {
    const text = doc.splitTextToSize(note.content, 180);
    doc.text(text, 14, cursorY);
  }
  doc.save(`${note.id}.pdf`);
};
