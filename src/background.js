import { getNote, saveNote, ensureMetadata } from './storage.js';

// ── Badge helpers ───────────────────────────────────────────────────

async function updateBadge(tabId, url) {
  if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://')) {
    chrome.action.setBadgeText({ tabId, text: '' });
    return;
  }
  const record = await getNote(url);
  const hasNote = record && record.note && record.note.trim().length > 0;
  chrome.action.setBadgeText({ tabId, text: hasNote ? '●' : '' });
  chrome.action.setBadgeBackgroundColor({ tabId, color: '#6366f1' });
}

// ── Pending metadata map (tabId → partial metadata) ─────────────────
// Needed because tabs.onCreated fires before the URL is known.
const pendingMeta = new Map();

// ── Tab creation: capture opener info + timestamp ───────────────────

chrome.tabs.onCreated.addListener(async (tab) => {
  const meta = { openedAt: Date.now() };

  if (tab.openerTabId != null) {
    try {
      const opener = await chrome.tabs.get(tab.openerTabId);
      meta.openerUrl = opener.url || null;
      meta.openerTitle = opener.title || null;
    } catch {
      // opener tab may have already closed
    }
  }

  // URL may not be available yet; stash metadata for onCommitted
  if (tab.url && tab.url !== 'chrome://newtab/') {
    await ensureMetadata(tab.url, meta);
    updateBadge(tab.id, tab.url);
  } else {
    pendingMeta.set(tab.id, meta);
  }
});

// ── webNavigation.onCreatedNavigationTarget: fallback opener capture ─

chrome.webNavigation.onCreatedNavigationTarget.addListener(async (details) => {
  const existing = pendingMeta.get(details.tabId) || {};
  if (!existing.openerUrl && details.sourceTabId != null) {
    try {
      const source = await chrome.tabs.get(details.sourceTabId);
      existing.openerUrl = source.url || null;
      existing.openerTitle = source.title || null;
    } catch {
      // source tab gone
    }
  }
  existing.openedAt = existing.openedAt || Date.now();
  pendingMeta.set(details.tabId, existing);
});

// ── webNavigation.onCommitted: capture transition type + flush meta ──

chrome.webNavigation.onCommitted.addListener(async (details) => {
  if (details.frameId !== 0) return; // only top-level frame

  const url = details.url;
  if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://')) return;

  const pending = pendingMeta.get(details.tabId) || {};
  pendingMeta.delete(details.tabId);

  const meta = {
    ...pending,
    transition: details.transitionType || null,
    openedAt: pending.openedAt || Date.now(),
  };

  // Also grab the page title (may not be ready yet, will be updated in onUpdated)
  try {
    const tab = await chrome.tabs.get(details.tabId);
    meta.title = tab.title || '';
  } catch {
    // tab gone
  }

  await ensureMetadata(url, meta);
  updateBadge(details.tabId, url);
});

// ── Tab update: refresh badge + capture title once loaded ───────────

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const record = await getNote(tab.url);
    if (record && !record.title && tab.title) {
      await saveNote(tab.url, { title: tab.title });
    }
    updateBadge(tabId, tab.url);
  }
});

// ── Tab activation: update badge for newly focused tab ──────────────

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    updateBadge(activeInfo.tabId, tab.url);
  } catch {
    // tab gone
  }
});

// ── Listen for storage changes to keep badge in sync ────────────────

chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area !== 'local') return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    updateBadge(tab.id, tab.url);
  }
});
