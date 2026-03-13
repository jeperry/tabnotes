import { getNote, saveNote, deleteNote, getAllNotes } from './storage.js';

// ── DOM refs ────────────────────────────────────────────────────────

const faviconEl    = document.getElementById('favicon');
const titleEl      = document.getElementById('page-title');
const openedAtEl   = document.getElementById('opened-at');
const sourceEl     = document.getElementById('source');
const transitionEl = document.getElementById('transition');
const noteEl       = document.getElementById('note');
const saveStatusEl = document.getElementById('save-status');
const deleteBtn    = document.getElementById('delete-btn');
const allNotesLink = document.getElementById('all-notes-link');

let currentUrl = null;
let saveTimer  = null;

// ── Helpers ─────────────────────────────────────────────────────────

function timeAgo(ts) {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function transitionLabel(type) {
  const labels = {
    link: 'link',
    typed: 'typed / pasted',
    auto_bookmark: 'bookmark',
    auto_subframe: 'subframe',
    manual_subframe: 'subframe',
    generated: 'generated',
    start_page: 'start page',
    form_submit: 'form',
    reload: 'reload',
    keyword: 'keyword',
    keyword_generated: 'keyword',
  };
  return labels[type] || type || '';
}

function faviconUrl(pageUrl) {
  try {
    const u = new URL(pageUrl);
    return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=32`;
  } catch {
    return '';
  }
}

// ── Load current tab data ───────────────────────────────────────────

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  currentUrl = tab.url;
  titleEl.textContent = tab.title || tab.url || 'Untitled';
  faviconEl.src = tab.favIconUrl || faviconUrl(tab.url);

  const record = await getNote(currentUrl);

  if (record) {
    noteEl.value = record.note || '';

    if (record.openedAt) {
      openedAtEl.textContent = `Opened ${timeAgo(record.openedAt)}`;
    }

    if (record.openerUrl) {
      const linkText = record.openerTitle || record.openerUrl;
      sourceEl.innerHTML = `From: <a href="${escapeHtml(record.openerUrl)}" target="_blank" title="${escapeHtml(record.openerUrl)}">${escapeHtml(truncate(linkText, 40))}</a>`;
    }

    if (record.transition) {
      transitionEl.textContent = transitionLabel(record.transition);
    }
  }

  noteEl.focus();
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max) + '…' : str;
}

// ── Auto-save on typing (debounced 500ms) ───────────────────────────

noteEl.addEventListener('input', () => {
  clearTimeout(saveTimer);
  saveStatusEl.textContent = '';
  saveTimer = setTimeout(async () => {
    if (!currentUrl) return;
    await saveNote(currentUrl, { note: noteEl.value });
    saveStatusEl.textContent = 'Saved';
    setTimeout(() => { saveStatusEl.textContent = ''; }, 1500);
  }, 500);
});

// ── Delete ──────────────────────────────────────────────────────────

deleteBtn.addEventListener('click', async () => {
  if (!currentUrl) return;
  await deleteNote(currentUrl);
  noteEl.value = '';
  openedAtEl.textContent = '';
  sourceEl.innerHTML = '';
  transitionEl.textContent = '';
  saveStatusEl.textContent = 'Deleted';
  setTimeout(() => { saveStatusEl.textContent = ''; }, 1500);
});

// ── All Notes link → opens notes page in new tab ────────────────────

allNotesLink.addEventListener('click', (e) => {
  e.preventDefault();
  chrome.tabs.create({ url: chrome.runtime.getURL('src/notes.html') });
});

// ── Start ───────────────────────────────────────────────────────────

init();
