import { nanoid } from 'nanoid';
import type { BlinkNoteType } from './types';
import { appendNote } from './storage/notesStorage';

const createNote = async (type: BlinkNoteType, content: string, sourceUrl?: string) => {
  await appendNote({
    id: nanoid(),
    type,
    content,
    createdAt: Date.now(),
    sourceUrl
  });
};

chrome.runtime.onInstalled.addListener(async () => {
  await chrome.sidePanel.setOptions({ path: 'sidepanel.html' });
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'blinknote-text',
      title: 'Add selected text to BlinkNote',
      contexts: ['selection']
    });
    chrome.contextMenus.create({
      id: 'blinknote-link',
      title: 'Add page link to BlinkNote',
      contexts: ['page']
    });
    chrome.contextMenus.create({
      id: 'blinknote-image',
      title: 'Add image to BlinkNote',
      contexts: ['image']
    });
  });
});

chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id) {
    await chrome.sidePanel.open({ tabId: tab.id });
  }
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const source = info.pageUrl ?? tab?.url ?? undefined;
  switch (info.menuItemId) {
    case 'blinknote-text':
      if (info.selectionText) {
        await createNote('text', info.selectionText, source);
      }
      break;
    case 'blinknote-link':
      if (info.pageUrl) {
        await createNote('link', info.pageUrl, source);
      }
      break;
    case 'blinknote-image':
      if (info.srcUrl) {
        await createNote('image', info.srcUrl, source);
      }
      break;
    default:
      break;
  }
});
