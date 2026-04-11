// ════════════════════════════════════════
// ── Goodreads Integration & Reading List ──
// ════════════════════════════════════════

import { CONFIG } from './config.js';
import { state, saveReadingList, READING_LIST_DEFAULT, haptic } from './state.js';
import { Storage } from './storage.js';

// ── CSV Parsing ──

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { current += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { result.push(current); current = ''; }
      else { current += ch; }
    }
  }
  result.push(current);
  return result;
}

export function parseGoodreadsCSV(text) {
  const lines = text.split('\n');
  if (lines.length < 2) return [];
  const header = parseCSVLine(lines[0]);
  const titleIdx = header.findIndex(h => h.toLowerCase().trim() === 'title');
  const authorIdx = header.findIndex(h => h.toLowerCase().trim() === 'author');
  const shelfIdx = header.findIndex(h => h.toLowerCase().trim() === 'exclusive shelf');
  if (titleIdx < 0 || authorIdx < 0) return [];
  const books = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cols = parseCSVLine(lines[i]);
    const shelf = shelfIdx >= 0 ? cols[shelfIdx]?.trim() : '';
    if (shelfIdx >= 0 && shelf !== 'to-read') continue;
    const title = cols[titleIdx]?.trim();
    const author = cols[authorIdx]?.trim();
    if (title) books.push({ title, author: author || '' });
  }
  return books;
}

// ── CSV import via textarea ──
export function saveGoodreadsCSV(render, showToast) {
  const ta = document.getElementById('goodreads-csv-input');
  if (!ta || !ta.value.trim()) { showToast('Paste CSV data first'); return; }
  const books = parseGoodreadsCSV(ta.value);
  if (books.length === 0) {
    showToast('No to-read books found in CSV. Make sure you exported from Goodreads.');
    return;
  }
  state.readingList = books;
  saveReadingList();
  const ts = new Date().toISOString();
  state.readingLastSync = ts;
  Storage.setRaw('reading-sync-ts', ts);
  state.readingShowCSV = false;
  state.readingSyncStatus = 'ok';
  haptic('success');
  render();
  showToast(`Loaded ${books.length} books from Goodreads CSV`);
}

// ── CSV import via file upload ──
export function handleGoodreadsFile(render, showToast) {
  const input = document.getElementById('goodreads-file-input');
  if (!input || !input.files[0]) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const books = parseGoodreadsCSV(e.target.result);
    if (books.length === 0) {
      showToast('No to-read books found in CSV');
      return;
    }
    state.readingList = books;
    saveReadingList();
    const ts = new Date().toISOString();
    state.readingLastSync = ts;
    Storage.setRaw('reading-sync-ts', ts);
    state.readingShowCSV = false;
    state.readingSyncStatus = 'ok';
    haptic('success');
    render();
    showToast(`Loaded ${books.length} books from CSV file`);
  };
  reader.readAsText(input.files[0]);
}

// ── RSS sync ──
export async function syncGoodreads(render, showToast) {
  state.readingSyncStatus = 'syncing';
  render();
  const allBooks = [];
  try {
    for (let page = 1; page <= 10; page++) {
      const url = `${CONFIG.goodreadsRss}&per_page=200&page=${page}`;
      const res = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`, {
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const xml = await res.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(xml, 'text/xml');
      const items = doc.querySelectorAll('item');
      if (items.length === 0) break;
      items.forEach(item => {
        const rawTitle = item.querySelector('title')?.textContent?.trim() || '';
        const authorName = item.querySelector('author_name')?.textContent?.trim() || '';
        let title = rawTitle.replace(/\s+by\s+.+\(\d{4}(?:-\d{2}(?:-\d{2})?)?\)\s*$/, '').trim();
        if (title.length > 80) {
          title = title.replace(/\s*\([^)]{20,}\)\s*$/, '').trim();
        }
        if (title && !allBooks.some(b => b.title === title)) {
          allBooks.push({ title, author: authorName });
        }
      });
    }
    if (allBooks.length > 0) {
      state.readingList = allBooks;
      saveReadingList();
      const ts = new Date().toISOString();
      state.readingLastSync = ts;
      Storage.setRaw('reading-sync-ts', ts);
      state.readingSyncStatus = 'ok';
      render();
      showToast(`Synced ${allBooks.length} books from Goodreads RSS`);
    } else {
      throw new Error('No books found');
    }
  } catch (e) {
    console.warn('Goodreads RSS sync failed:', e.message);
    state.readingSyncStatus = 'error';
    state.readingShowCSV = true;
    render();
    showToast('RSS sync failed \u2014 use CSV import instead');
  }
}
