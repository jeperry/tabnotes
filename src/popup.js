import { getNote, saveNote, deleteNote } from './storage.js';

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
const notedListEl  = document.getElementById('noted-list');
const notedCountEl = document.getElementById('noted-count');
const tabBtns      = document.querySelectorAll('.tab-btn');
const viewCurrent  = document.getElementById('view-current');
const viewNoted    = document.getElementById('view-noted');

const TITLE_MARKER = '✎ ';

let currentUrl = null;
let currentTabId = null;
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

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max) + '…' : str;
}

function stripMarker(title) {
  return (title || '').startsWith(TITLE_MARKER)
    ? title.slice(TITLE_MARKER.length)
    : title || '';
}

// ── View switching ──────────────────────────────────────────────────

tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.view;
    tabBtns.forEach(b => b.classList.toggle('active', b === btn));
    viewCurrent.classList.toggle('hidden', target !== 'current');
    viewNoted.classList.toggle('hidden', target !== 'noted');
    if (target === 'noted') renderNotedTabs();
  });
});

// ── Load current tab data ───────────────────────────────────────────

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  currentUrl = tab.url;
  currentTabId = tab.id;
  titleEl.textContent = stripMarker(tab.title) || tab.url || 'Untitled';
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

  // Update the badge count on the "Noted Tabs" button
  updateNotedCount();
}

// ── Noted tabs: count badge ─────────────────────────────────────────

async function updateNotedCount() {
  const tabs = await chrome.tabs.query({});
  let count = 0;
  for (const tab of tabs) {
    if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) continue;
    const record = await getNote(tab.url);
    if (record && record.note && record.note.trim().length > 0) count++;
  }
  notedCountEl.textContent = count > 0 ? count : '';
}

// ── Noted tabs: render list ─────────────────────────────────────────

async function renderNotedTabs() {
  const tabs = await chrome.tabs.query({});
  const items = [];

  for (const tab of tabs) {
    if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) continue;
    const record = await getNote(tab.url);
    if (record && record.note && record.note.trim().length > 0) {
      items.push({ tab, record });
    }
  }

  if (items.length === 0) {
    notedListEl.innerHTML = '<div class="noted-empty">No open tabs have notes yet.</div>';
    return;
  }

  items.sort((a, b) => (b.record.openedAt || 0) - (a.record.openedAt || 0));

  notedListEl.innerHTML = items.map(({ tab, record }) => {
    const title = stripMarker(tab.title) || record.title || tab.url;
    const icon = tab.favIconUrl || faviconUrl(tab.url);
    const note = truncate(record.note.trim(), 60);
    const time = record.openedAt ? timeAgo(record.openedAt) : '';

    return `
      <div class="noted-tab" data-tab-id="${tab.id}" data-window-id="${tab.windowId}">
        <img class="noted-tab-icon" src="${escapeHtml(icon)}" width="16" height="16" alt="">
        <div class="noted-tab-content">
          <div class="noted-tab-title">${escapeHtml(title)}</div>
          <div class="noted-tab-note">${escapeHtml(note)}</div>
        </div>
        ${time ? `<span class="noted-tab-time">${time}</span>` : ''}
      </div>
    `;
  }).join('');

  // Click handler: switch to that tab
  notedListEl.querySelectorAll('.noted-tab').forEach(el => {
    el.addEventListener('click', async () => {
      const tabId = Number(el.dataset.tabId);
      const windowId = Number(el.dataset.windowId);
      await chrome.tabs.update(tabId, { active: true });
      await chrome.windows.update(windowId, { focused: true });
      window.close();
    });
  });
}

// ── Auto-save on typing (debounced 500ms) ───────────────────────────

noteEl.addEventListener('input', () => {
  clearTimeout(saveTimer);
  saveStatusEl.textContent = '';
  saveTimer = setTimeout(async () => {
    if (!currentUrl) return;
    await saveNote(currentUrl, { note: noteEl.value });
    saveStatusEl.textContent = 'Saved';
    updateNotedCount();
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
  updateNotedCount();
  setTimeout(() => { saveStatusEl.textContent = ''; }, 1500);
});

// ── All Notes link → opens notes page in new tab ────────────────────

allNotesLink.addEventListener('click', (e) => {
  e.preventDefault();
  chrome.tabs.create({ url: chrome.runtime.getURL('src/notes.html') });
});

// ── Start ───────────────────────────────────────────────────────────

init();
