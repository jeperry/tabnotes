const STORAGE_KEY_PREFIX = 'tabnote:';

function storageKey(url) {
  return STORAGE_KEY_PREFIX + url;
}

export async function getNote(url) {
  const key = storageKey(url);
  const result = await chrome.storage.local.get(key);
  return result[key] || null;
}

export async function saveNote(url, fields) {
  const key = storageKey(url);
  const existing = await getNote(url);
  const record = {
    ...existing,
    url,
    ...fields,
    updatedAt: Date.now(),
  };
  await chrome.storage.local.set({ [key]: record });
  return record;
}

export async function deleteNote(url) {
  const key = storageKey(url);
  await chrome.storage.local.remove(key);
}

export async function getAllNotes() {
  const all = await chrome.storage.local.get(null);
  return Object.entries(all)
    .filter(([key]) => key.startsWith(STORAGE_KEY_PREFIX))
    .map(([, value]) => value);
}

/**
 * Write opener/timestamp metadata only if no record exists yet for this URL.
 * Prevents overwriting a user's note when the same URL is re-navigated.
 */
export async function ensureMetadata(url, metadata) {
  const existing = await getNote(url);
  if (existing) return existing;
  const record = {
    url,
    note: '',
    ...metadata,
    openedAt: metadata.openedAt || Date.now(),
  };
  const key = storageKey(url);
  await chrome.storage.local.set({ [key]: record });
  return record;
}
