import { getAllNotes } from './storage.js';

const listEl = document.getElementById('notes-list');
const searchEl = document.getElementById('search');

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

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function faviconUrl(pageUrl) {
  try {
    const hostname = new URL(pageUrl).hostname;
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=32`;
  } catch {
    return '';
  }
}

async function render(filter = '') {
  try {
    const notes = await getAllNotes();
    const q = filter.toLowerCase();

    const filtered = notes
      .filter(n => n.note && n.note.trim().length > 0)
      .filter(n => {
        if (!q) return true;
        return (n.title || '').toLowerCase().includes(q)
          || (n.note || '').toLowerCase().includes(q)
          || (n.url || '').toLowerCase().includes(q);
      })
      .sort((a, b) => (b.openedAt || 0) - (a.openedAt || 0));

    if (filtered.length === 0) {
      listEl.innerHTML = `<div class="empty-state">${q ? 'No matching notes.' : 'No notes yet. Click the TabNotes icon on any tab to add one.'}</div>`;
      return;
    }

    listEl.innerHTML = filtered.map(n => {
      const icon = faviconUrl(n.url);
      const title = escapeHtml(n.title || n.url || 'Untitled');
      const url = escapeHtml(n.url || '');

      return `
        <div class="note-card">
          <div class="note-card-header">
            ${icon ? `<img src="${escapeHtml(icon)}" width="14" height="14" style="border-radius:2px">` : ''}
            <span class="note-card-title"><a href="${url}" target="_blank">${title}</a></span>
          </div>
          ${n.note ? `<div class="note-card-body">${escapeHtml(n.note)}</div>` : ''}
          <div class="note-card-meta">
            ${n.openedAt ? `Opened ${timeAgo(n.openedAt)}` : ''}
            ${n.openerTitle ? ` · from ${escapeHtml(n.openerTitle)}` : ''}
            ${n.transition ? ` · ${n.transition}` : ''}
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    listEl.innerHTML = `<div class="empty-state">Error loading notes: ${err.message}</div>`;
  }
}

searchEl.addEventListener('input', () => render(searchEl.value));
render();
