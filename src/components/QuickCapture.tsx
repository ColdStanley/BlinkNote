import { useState } from 'react';
import type { BlinkNoteType } from '../types';

interface QuickCaptureProps {
  onCapture: (type: BlinkNoteType, content: string) => Promise<void>;
}

const QuickCapture = ({ onCapture }: QuickCaptureProps) => {
  const [value, setValue] = useState('');
  const [dropping, setDropping] = useState(false);

  const detectType = (input: string): BlinkNoteType => {
    if (/^https?:\/\//i.test(input.trim())) return 'link';
    return 'text';
  };

  const handleSubmit = async () => {
    if (!value.trim()) return;
    await onCapture(detectType(value), value.trim());
    setValue('');
  };

  const handleKeyDown = async (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      await handleSubmit();
    }
  };

  const readFile = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleFiles = async (incoming: FileList | File | null) => {
    let file: File | null = null;
    if (!incoming) return;
    if (incoming instanceof File) {
      file = incoming;
    } else if (incoming.length > 0) {
      file = incoming[0];
    }
    if (!file) return;
    const base64 = await readFile(file);
    await onCapture('image', base64);
  };

  const handlePaste = async (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = event.clipboardData.items;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        event.preventDefault();
        const file = item.getAsFile();
        await handleFiles(file);
        return;
      }
    }
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDropping(false);
    await handleFiles(event.dataTransfer.files);
  };

  return (
    <div
      className={`rounded-2xl border border-neutral-medium bg-surface-base p-4 shadow-card transition ${dropping ? 'border-brand-accent' : ''}`}
      onDragEnter={(event) => {
        event.preventDefault();
        setDropping(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        event.preventDefault();
        setDropping(false);
      }}
      onDrop={handleDrop}
    >
      <p className="text-sm font-semibold text-brand-primary">What do you want to note?</p>
      <textarea
        className="mt-3 w-full resize-none rounded-xl border border-neutral-medium bg-surface-subtle px-3 py-2 text-sm text-brand-primary outline-none transition focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/30"
        rows={3}
        placeholder="Press Enter to capture"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
      />
      <div className="mt-2 text-right text-xs text-brand-muted">Enter to save · Paste or drop images</div>
    </div>
  );
};

export default QuickCapture;
