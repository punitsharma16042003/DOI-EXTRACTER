/* ===================================================
   DOI EX — Bibliography DOI Extractor
   app.js — Full Application Logic
   =================================================== */

'use strict';

// ===================================================
// SPLASH SCREEN — 3 second display
// ===================================================
const splashScreen = document.getElementById('splash-screen');
const appEl        = document.getElementById('app');

window.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    splashScreen.classList.add('hidden');
    appEl.classList.remove('hidden');
  }, 3000); // 3 seconds
});

// ===================================================
// STATE
// ===================================================
let state = {
  papers:     [],   // { id, refText, doi, isDuplicate, type, selected, crossref }
  noDoi:      [],
  others:     [],
  activeTab:  'papers-with-doi',
  searchQuery: '',
  sortBy:     'index',
};

// ===================================================
// DOM REFS
// ===================================================
const bibInput        = document.getElementById('bib-input');
const charCount       = document.getElementById('char-count');
const lineCount       = document.getElementById('line-count');
const extractBtn      = document.getElementById('extract-btn');
const clearBtn        = document.getElementById('clear-btn');
const parseStyle      = document.getElementById('parse-style');
const dropZone        = document.getElementById('drop-zone');

const statsSection    = document.getElementById('stats-section');
const progressWrap    = document.getElementById('progress-wrap');
const doiOutputSection = document.getElementById('doi-output-section');
const resultsSection  = document.getElementById('results-section');

const countTotal      = document.getElementById('count-total');
const countDoi        = document.getElementById('count-doi');
const countNoDoi      = document.getElementById('count-nodoi');
const countOther      = document.getElementById('count-other');
const countDup        = document.getElementById('count-dup');
const countSelected   = document.getElementById('count-selected');

const progressBar     = document.getElementById('progress-bar-fill');
const progressPct     = document.getElementById('progress-pct');

const doiOutputBox    = document.getElementById('doi-output-box');
const doiOutputCount  = document.getElementById('doi-output-count');
const copyAllDoisBtn  = document.getElementById('copy-all-dois-btn');

const exportBtn       = document.getElementById('export-btn');
const exportMenu      = document.getElementById('export-menu');

const tabBtns         = document.querySelectorAll('.tab-btn');
const tabPanels       = document.querySelectorAll('.tab-panel');
const tabCountDoi     = document.getElementById('tab-count-doi');
const tabCountNoDoi   = document.getElementById('tab-count-nodoi');
const tabCountOther   = document.getElementById('tab-count-other');

const selectAllCb     = document.getElementById('select-all-cb');
const copySelectedBtn = document.getElementById('copy-selected-btn');
const selCount        = document.getElementById('sel-count');

const searchInput     = document.getElementById('search-input');
const sortSelect      = document.getElementById('sort-select');

const papersList      = document.getElementById('papers-list');
const nodoiList       = document.getElementById('nodoi-list');
const otherList       = document.getElementById('other-list');

const themeToggle     = document.getElementById('theme-toggle');
const sunIcon         = document.getElementById('sun-icon');
const moonIcon        = document.getElementById('moon-icon');

const historyBtn      = document.getElementById('history-btn');
const historyPanel    = document.getElementById('history-panel');
const closeHistoryBtn = document.getElementById('close-history');
const panelOverlay    = document.getElementById('panel-overlay');
const historyList     = document.getElementById('history-list');
const clearHistoryBtn = document.getElementById('clear-history-btn');

const toast           = document.getElementById('toast');

// ===================================================
// DOI REGEX PATTERNS
// ===================================================
const DOI_PATTERNS = [
  // doi.org URL forms
  /https?:\/\/doi\.org\/(10\.\d{4,9}\/[^\s,;)"'>\]]+)/i,
  /https?:\/\/dx\.doi\.org\/(10\.\d{4,9}\/[^\s,;)"'>\]]+)/i,
  // doi: prefix forms
  /\bdoi:\s*(10\.\d{4,9}\/[^\s,;)"'>\]]+)/i,
  /\bDOI:\s*(10\.\d{4,9}\/[^\s,;)"'>\]]+)/i,
  /\[doi\]:\s*(10\.\d{4,9}\/[^\s,;)"'>\]]+)/i,
  // Bare DOI — must start with 10.
  /\b(10\.\d{4,9}\/[^\s,;)"'>\]]+)/,
];

// Reference type classifiers (for non-paper categorization)
const TYPE_CLASSIFIERS = {
  website:  /https?:\/\/(?!doi\.org|dx\.doi\.org)/i,
  book:     /\b(publisher|edition|ed\.|isbn|pp\.|pages|chapter)\b/i,
  thesis:   /\b(thesis|dissertation|phd|master'?s|doctoral)\b/i,
  report:   /\b(report|technical report|white paper|working paper|nber|oecd|who)\b/i,
  standard: /\b(standard|iso |iec |ieee std|astm|bs\s?\d+)\b/i,
  patent:   /\b(patent|us\s?\d+|ep\s?\d+)\b/i,
  conf:     /\b(proceedings|conference|symposium|workshop|congress|summit)\b/i,
};

// ===================================================
// UTILITY FUNCTIONS
// ===================================================
function extractDOI(text) {
  for (const pattern of DOI_PATTERNS) {
    const m = text.match(pattern);
    if (m) {
      // Clean trailing punctuation
      let doi = m[1].replace(/[.,;:)\]'"]+$/, '');
      return doi;
    }
  }
  return null;
}

function classifyRef(text) {
  for (const [type, re] of Object.entries(TYPE_CLASSIFIERS)) {
    if (re.test(text)) return type;
  }
  return 'paper'; // default assume paper
}

function isLikelyPaper(text) {
  const t = classifyRef(text);
  // websites and books without DOI go to "others"
  if (['website', 'book', 'report', 'standard', 'patent'].includes(t) && !extractDOI(text)) {
    return false;
  }
  return true;
}

// Animated stat number update
function animateNumber(el, target) {
  const start = parseInt(el.textContent) || 0;
  if (start === target) return;
  const diff = target - start;
  const steps = 20;
  let step = 0;
  const timer = setInterval(() => {
    step++;
    const val = Math.round(start + (diff * step / steps));
    el.textContent = val;
    if (step >= steps) { el.textContent = target; clearInterval(timer); }
  }, 16);
}

// ===================================================
// PARSE BIBLIOGRAPHY INPUT
// ===================================================
function parseEntries(raw, style) {
  if (!raw.trim()) return [];

  // Normalize Windows \r\n to \n
  const text = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  if (style === 'numbered') {
    return parseNumbered(text);
  } else if (style === 'blank') {
    return parseByBlankLines(text);
  } else if (style === 'newline') {
    return text.split('\n').map(l => l.trim()).filter(Boolean);
  }

  // AUTO / SMART DETECT MODE (Default)

  // 1. Check if input has numbered patterns: [1], 1., (1), 1)
  const isNumberedPattern = /\n\s*[\[\(]?\d+[\]\).]?\s+[A-Z0-9]/i.test(text) || /^\s*[\[\(]?\d+[\]\).]?\s+[A-Z0-9]/i.test(text);
  if (isNumberedPattern) {
    const numbered = parseNumbered(text);
    if (numbered.length > 1) return numbered;
  }

  // 2. Check if input uses blank lines (\n\n) as entry separators
  const blocks = text.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
  if (blocks.length > 1) {
    return blocks.map(b => b.replace(/\s*\n\s*/g, ' '));
  }

  // 3. Smart Author / Line Continuation Detection (No blank lines, no numbers)
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length <= 1) return lines;

  const smartEntries = [];
  let currentEntry = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!currentEntry) {
      currentEntry = line;
      continue;
    }

    // Indicators that `line` is a CONTINUATION of `currentEntry`:
    const isDoiLine = /^(https?:\/\/|doi:|DOI:|dx\.doi\.org|10\.\d{4,})/i.test(line);
    const startsLowercase = /^[a-z]/.test(line);
    const isContinuationKeyword = /^(doi|https?|dx\.doi|vol|no|pp|pages|issue|chapter|ed|editor|volume|journal|in\b|retrieved|available|isbn|issn)\b/i.test(line);
    const isNumberStart = /^\s*[\[\(]?\d+[\]\).]?\s+/.test(line);
    const endsWithConnector = /[,&:\-]\s*$/.test(currentEntry) || /\b(and|et\s+al|in|by|of|for|with)\s*$/i.test(currentEntry);
    
    // Does current entry already contain a DOI?
    const currentHasDoi = extractDOI(currentEntry) !== null;

    // Check if line looks like a brand new author entry start (e.g. "Smith, J.", "Johnson, A. B. (2021)")
    const isNewAuthorPattern = /^[A-Z][a-zA-Z'\-]+\s*,\s*[A-Z]\.?/.test(line) || /^[A-Z][a-zA-Z'\-]+\s+[A-Z]\.?\s*\(?\d{4}\)?/.test(line);

    let isContinuation = false;

    if (isDoiLine || startsLowercase || isContinuationKeyword || endsWithConnector) {
      isContinuation = true;
    } else if (!isNewAuthorPattern && !isNumberStart && !currentHasDoi) {
      // If it doesn't look like a clear new author start and current entry doesn't have a DOI yet, treat as continuation
      isContinuation = true;
    }

    if (isContinuation) {
      currentEntry += ' ' + line;
    } else {
      smartEntries.push(currentEntry.trim());
      currentEntry = line;
    }
  }

  if (currentEntry) {
    smartEntries.push(currentEntry.trim());
  }

  return smartEntries;
}

function parseNumbered(text) {
  const parts = text.split(/\n(?=\s*[\[\(]?\d+[\]\).]?\s+)/);
  return parts.map(p => {
    const cleaned = p.replace(/^\s*[\[\(]?\d+[\]\).]?\s*/, '');
    return cleaned.replace(/\s*\n\s*/g, ' ').trim();
  }).filter(Boolean);
}

function parseByBlankLines(text) {
  const blocks = text.split(/\n\s*\n/);
  return blocks.map(b => b.replace(/\s*\n\s*/g, ' ').trim()).filter(Boolean);
}


// ===================================================
// EXTRACT & CLASSIFY
// ===================================================
function processEntries(entries) {
  const seenDOIs = new Map();
  const papers   = [];
  const noDoi    = [];
  const others   = [];

  entries.forEach((ref, idx) => {
    const doi = extractDOI(ref);
    const type = classifyRef(ref);
    const id = `entry-${idx}`;

    if (doi) {
      const isDup = seenDOIs.has(doi);
      if (!isDup) seenDOIs.set(doi, idx);
      papers.push({ id, refText: ref, doi, isDuplicate: isDup, type: 'paper', selected: false, crossref: null, originalIdx: idx + 1 });
    } else {
      // Classify as paper-without-doi or other reference
      if (['website', 'book', 'report', 'standard', 'patent'].includes(type)) {
        others.push({ id, refText: ref, doi: null, isDuplicate: false, type, selected: false, crossref: null, originalIdx: idx + 1 });
      } else {
        // Looks like a paper but no DOI found
        noDoi.push({ id, refText: ref, doi: null, isDuplicate: false, type: 'paper-nodoi', selected: false, crossref: null, originalIdx: idx + 1 });
      }
    }
  });

  return { papers, noDoi, others };
}

// ===================================================
// RENDER ENTRIES
// ===================================================
function getTypeTag(entry) {
  if (entry.isDuplicate) return `<span class="doi-tag dup">DUPLICATE</span>`;
  if (entry.doi)         return `<span class="doi-tag doi">DOI</span>`;
  if (entry.type === 'website')  return `<span class="doi-tag web">WEB</span>`;
  if (entry.type === 'book')     return `<span class="doi-tag book">BOOK</span>`;
  if (entry.type === 'thesis')   return `<span class="doi-tag thesis">THESIS</span>`;
  if (entry.type === 'report')   return `<span class="doi-tag book">REPORT</span>`;
  if (entry.type === 'standard') return `<span class="doi-tag web">STD</span>`;
  if (entry.type === 'patent')   return `<span class="doi-tag thesis">PATENT</span>`;
  return `<span class="doi-tag nodoi">NO DOI</span>`;
}

function renderEntry(entry, listEl) {
  const row = document.createElement('div');
  row.className = `entry-row${entry.selected ? ' selected' : ''}`;
  row.dataset.id = entry.id;

  const doiHtml = entry.doi
    ? `<div class="entry-doi">
        ${getTypeTag(entry)}
        <a class="doi-link" href="https://doi.org/${entry.doi}" target="_blank" rel="noopener noreferrer" title="Open DOI: ${entry.doi}">${entry.doi}</a>
       </div>`
    : `<div class="entry-doi">${getTypeTag(entry)}</div>`;

  const crossrefHtml = entry.crossref
    ? `<div class="crossref-info">${entry.crossref}</div>`
    : '';

  const actionsHtml = entry.doi
    ? `<div class="entry-actions">
        <button class="copy-doi-btn" data-doi="${entry.doi}" title="Copy DOI">
          <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          Copy
        </button>
        <button class="open-doi-btn" data-doi="${entry.doi}" title="Open in browser">
          <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          Open
        </button>
        <button class="lookup-btn" data-doi="${entry.doi}" data-id="${entry.id}" title="Fetch metadata from Crossref">
          <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          Lookup
        </button>
       </div>`
    : `<div class="entry-actions"></div>`;

  row.innerHTML = `
    <label class="checkbox-label" style="margin-top:0.15rem">
      <input type="checkbox" class="entry-cb" data-id="${entry.id}" ${entry.selected ? 'checked' : ''} aria-label="Select reference ${entry.originalIdx}" />
      <span class="checkbox-custom"></span>
    </label>
    <span class="entry-num">${entry.originalIdx}</span>
    <div class="entry-content">
      <p class="entry-ref" title="Click to expand">${escapeHtml(entry.refText)}</p>
      ${doiHtml}
      ${crossrefHtml}
    </div>
    ${actionsHtml}
  `;

  // Expand/collapse reference text
  row.querySelector('.entry-ref').addEventListener('click', function () {
    this.classList.toggle('expanded');
  });

  // Copy DOI btn
  const copyBtn = row.querySelector('.copy-doi-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => copyToClipboard(entry.doi, 'DOI copied!'));
  }

  // Open DOI btn
  const openBtn = row.querySelector('.open-doi-btn');
  if (openBtn) {
    openBtn.addEventListener('click', () => window.open(`https://doi.org/${entry.doi}`, '_blank'));
  }

  // Crossref lookup btn
  const lookupBtn = row.querySelector('.lookup-btn');
  if (lookupBtn) {
    lookupBtn.addEventListener('click', () => fetchCrossref(entry.doi, entry.id));
  }

  // Checkbox
  const cb = row.querySelector('.entry-cb');
  cb.addEventListener('change', () => {
    entry.selected = cb.checked;
    row.classList.toggle('selected', cb.checked);
    updateSelectionUI();
  });

  listEl.appendChild(row);
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(str));
  return d.innerHTML;
}

// ===================================================
// RENDER ALL LISTS
// ===================================================
function getFilteredSorted(arr) {
  let filtered = arr;
  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    filtered = arr.filter(e =>
      e.refText.toLowerCase().includes(q) ||
      (e.doi && e.doi.toLowerCase().includes(q))
    );
  }
  if (state.sortBy === 'doi') {
    filtered = [...filtered].sort((a, b) => (a.doi || '').localeCompare(b.doi || ''));
  } else if (state.sortBy === 'alpha') {
    filtered = [...filtered].sort((a, b) => a.refText.localeCompare(b.refText));
  }
  return filtered;
}

function renderAll() {
  papersList.innerHTML = '';
  nodoiList.innerHTML  = '';
  otherList.innerHTML  = '';

  const filteredPapers = getFilteredSorted(state.papers);
  const filteredNoDoi  = getFilteredSorted(state.noDoi);
  const filteredOthers = getFilteredSorted(state.others);

  if (filteredPapers.length === 0) {
    papersList.innerHTML = emptyState('No papers with DOI found');
  } else {
    filteredPapers.forEach(e => renderEntry(e, papersList));
  }

  if (filteredNoDoi.length === 0) {
    nodoiList.innerHTML = emptyState('No papers without DOI');
  } else {
    filteredNoDoi.forEach(e => renderEntry(e, nodoiList));
  }

  if (filteredOthers.length === 0) {
    otherList.innerHTML = emptyState('No other references found');
  } else {
    filteredOthers.forEach(e => renderEntry(e, otherList));
  }
}

function emptyState(msg) {
  return `<div class="empty-state">
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="8" y1="15" x2="16" y2="15"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
    <p>${msg}</p>
  </div>`;
}

// ===================================================
// UPDATE STATS
// ===================================================
function updateStats() {
  const total    = state.papers.length + state.noDoi.length + state.others.length;
  const withDoi  = state.papers.length;
  const noDoi    = state.noDoi.length;
  const other    = state.others.length;
  const dups     = state.papers.filter(p => p.isDuplicate).length;
  const selected = [...state.papers, ...state.noDoi, ...state.others].filter(e => e.selected).length;
  const pct      = total > 0 ? Math.round((withDoi / total) * 100) : 0;

  animateNumber(countTotal,    total);
  animateNumber(countDoi,      withDoi);
  animateNumber(countNoDoi,    noDoi);
  animateNumber(countOther,    other);
  animateNumber(countDup,      dups);
  animateNumber(countSelected, selected);

  progressBar.style.width = `${pct}%`;
  progressPct.textContent = `${pct}%`;

  tabCountDoi.textContent   = withDoi;
  tabCountNoDoi.textContent = noDoi;
  tabCountOther.textContent = other;

  // DOI output box
  const dois = state.papers.filter(p => !p.isDuplicate).map(p => p.doi);
  doiOutputBox.value = dois.join('\n');
  doiOutputCount.textContent = dois.length;
}

function updateSelectionUI() {
  const all      = getActiveEntries();
  const selItems = all.filter(e => e.selected);
  const selected = selItems.length;

  animateNumber(countSelected, [...state.papers, ...state.noDoi, ...state.others].filter(e => e.selected).length);
  selCount.textContent = selected;

  copySelectedBtn.disabled = selected === 0;

  // Update select-all checkbox state
  selectAllCb.indeterminate = selected > 0 && selected < all.length;
  selectAllCb.checked       = selected === all.length && all.length > 0;
}

function getActiveEntries() {
  switch (state.activeTab) {
    case 'papers-with-doi': return getFilteredSorted(state.papers);
    case 'papers-no-doi':   return getFilteredSorted(state.noDoi);
    case 'other-refs':      return getFilteredSorted(state.others);
    default: return [];
  }
}

// ===================================================
// MAIN EXTRACT
// ===================================================
function extract() {
  const raw = bibInput.value;
  if (!raw.trim()) {
    showToast('Please paste some bibliography references first!', 'error');
    return;
  }

  const style   = parseStyle.value;
  const entries = parseEntries(raw, style);

  if (entries.length === 0) {
    showToast('No entries could be parsed. Try changing the Parse Style.', 'error');
    return;
  }

  const result = processEntries(entries);
  state.papers = result.papers;
  state.noDoi  = result.noDoi;
  state.others = result.others;
  state.searchQuery = '';
  state.sortBy = 'index';
  searchInput.value = '';
  sortSelect.value  = 'index';

  // Show sections
  statsSection.classList.remove('hidden');
  progressWrap.classList.remove('hidden');
  doiOutputSection.classList.remove('hidden');
  resultsSection.classList.remove('hidden');

  // Animate
  [statsSection, progressWrap, doiOutputSection, resultsSection].forEach(el => {
    el.style.animation = 'none';
    el.offsetHeight; // reflow
    el.style.animation = '';
  });

  updateStats();
  renderAll();
  saveToHistory(entries.length, result.papers.length, result.noDoi.length, result.others.length, raw);

  showToast(`✅ Extracted ${result.papers.length} DOIs from ${entries.length} entries!`, 'success');

  // Scroll to stats
  statsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ===================================================
// CLIPBOARD
// ===================================================
async function copyToClipboard(text, successMsg) {
  try {
    await navigator.clipboard.writeText(text);
    showToast(successMsg || 'Copied!', 'success');
  } catch {
    // fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity  = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast(successMsg || 'Copied!', 'success');
  }
}

// ===================================================
// CROSSREF API LOOKUP
// ===================================================
async function fetchCrossref(doi, entryId) {
  const btn = document.querySelector(`.lookup-btn[data-id="${entryId}"]`);
  if (btn) { btn.textContent = '⏳'; btn.disabled = true; }

  try {
    const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, {
      headers: { 'User-Agent': 'DOI-EX/1.0 (mailto:research@doiex.app)' }
    });

    if (!res.ok) throw new Error('Not found');
    const data = await res.json();
    const w    = data.message;

    const title   = w.title?.[0] || 'Unknown Title';
    const journal = w['container-title']?.[0] || '';
    const year    = w.published?.['date-parts']?.[0]?.[0] || '';
    const info    = `${title}${journal ? ' — ' + journal : ''}${year ? ' (' + year + ')' : ''}`;

    // Update state
    const entry = state.papers.find(p => p.id === entryId);
    if (entry) {
      entry.crossref = info;
      // Update DOM
      const row = document.querySelector(`[data-id="${entryId}"]`);
      if (row) {
        const existing = row.querySelector('.crossref-info');
        if (existing) {
          existing.textContent = info;
        } else {
          const contentDiv = row.querySelector('.entry-content');
          const infoDiv = document.createElement('div');
          infoDiv.className = 'crossref-info';
          infoDiv.textContent = info;
          contentDiv.appendChild(infoDiv);
        }
      }
    }
    showToast('📚 Metadata fetched from Crossref!', 'success');
  } catch (err) {
    showToast('❌ Crossref lookup failed for this DOI', 'error');
  } finally {
    if (btn) { btn.textContent = 'Lookup'; btn.disabled = false; }
  }
}

// ===================================================
// EXPORT
// ===================================================
function exportData(format) {
  const entries = state.papers.map((e, i) => ({
    index:    e.originalIdx,
    doi:      e.doi,
    ref:      e.refText,
    duplicate: e.isDuplicate,
    crossref: e.crossref || '',
  }));

  const ts = new Date().toISOString().slice(0, 10);
  let content = '', filename = '', mime = 'text/plain';

  switch (format) {
    case 'txt':
      content  = entries.map(e => e.doi).join('\n');
      filename = `dois-${ts}.txt`;
      break;
    case 'csv':
      const csvHeader = 'Index,DOI,Duplicate,Crossref Info,Reference\n';
      const csvRows   = entries.map(e =>
        `${e.index},"${e.doi}","${e.duplicate}","${e.crossref.replace(/"/g,'""')}","${e.ref.replace(/"/g,'""')}"`
      ).join('\n');
      content  = csvHeader + csvRows;
      filename = `doi-references-${ts}.csv`;
      mime     = 'text/csv';
      break;
    case 'json':
      content  = JSON.stringify({ extracted: ts, total: entries.length, entries }, null, 2);
      filename = `doi-references-${ts}.json`;
      mime     = 'application/json';
      break;
    case 'bib':
      content  = entries.map(e => {
        const key = e.doi.replace(/[^\w]/g, '_').slice(0, 20);
        return `@article{${key},\n  doi = {${e.doi}},\n  note = {${e.ref.replace(/[{}]/g,'').slice(0, 80)}}\n}`;
      }).join('\n\n');
      filename = `references-${ts}.bib`;
      break;
  }

  // Check if running in Electron environment
  if (window.electronAPI && window.electronAPI.exportFile) {
    window.electronAPI.exportFile(content, filename, format).then(res => {
      if (res && res.success) {
        showToast(`📁 Exported to ${res.filePath}`, 'success');
      } else if (res && res.error) {
        showToast(`❌ Export failed: ${res.error}`, 'error');
      }
    });
    return;
  }

  const blob = new Blob([content], { type: mime });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  showToast(`📁 Exported as ${filename}`, 'success');
}

// ===================================================
// HISTORY
// ===================================================
const HISTORY_KEY = 'doi-ex-history';

function saveToHistory(total, withDoi, noDoi, others, raw) {
  const history = loadHistory();
  history.unshift({
    date:    new Date().toLocaleString(),
    total,
    withDoi,
    noDoi,
    others,
    preview: raw.slice(0, 80).replace(/\n/g, ' ') + '…',
    raw,
  });
  // Keep only last 5
  const trimmed = history.slice(0, 5);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
  renderHistory();
}

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch { return []; }
}

function renderHistory() {
  const history = loadHistory();
  historyList.innerHTML = '';

  if (history.length === 0) {
    historyList.innerHTML = '<p style="color:var(--text-muted);font-size:0.82rem;text-align:center;margin-top:1rem;">No history yet</p>';
    return;
  }

  history.forEach((item, idx) => {
    const div = document.createElement('div');
    div.className = 'history-item';
    div.innerHTML = `
      <div class="history-item-date">🕐 ${item.date}</div>
      <div class="history-item-meta">
        ${item.total} entries · ${item.withDoi} DOIs · ${item.noDoi} no-DOI · ${item.others} other
      </div>
      <div class="history-item-date" style="margin-top:0.25rem">${item.preview}</div>
    `;
    div.addEventListener('click', () => {
      bibInput.value = item.raw;
      updateInputMeta();
      closeHistoryPanel();
      showToast('📋 Session restored from history', 'info');
    });
    historyList.appendChild(div);
  });
}

// ===================================================
// TOAST
// ===================================================
let toastTimer = null;

function showToast(msg, type = 'info') {
  toast.textContent = msg;
  toast.className   = `toast ${type}`;
  toast.classList.remove('hidden');

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add('hidden'), 3000);
}

// ===================================================
// THEME
// ===================================================
function initTheme() {
  const saved = localStorage.getItem('doi-ex-theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeIcons(saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next    = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('doi-ex-theme', next);
  updateThemeIcons(next);
}

function updateThemeIcons(theme) {
  if (theme === 'light') {
    sunIcon.classList.add('hidden');
    moonIcon.classList.remove('hidden');
  } else {
    sunIcon.classList.remove('hidden');
    moonIcon.classList.add('hidden');
  }
}

// ===================================================
// INPUT META
// ===================================================
function updateInputMeta() {
  const val = bibInput.value;
  charCount.textContent = `${val.length.toLocaleString()} chars`;
  lineCount.textContent = `${val.split('\n').filter(l => l.trim()).length} lines`;
}

// ===================================================
// DRAG & DROP FILE
// ===================================================
function initDragDrop() {
  dropZone.addEventListener('dragover', e => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));

  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (!/\.(txt|bib|ris|csv)$/i.test(file.name)) {
      showToast('Only .txt, .bib, .ris, .csv files are supported', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      bibInput.value = ev.target.result;
      updateInputMeta();
      showToast(`📂 File "${file.name}" loaded`, 'success');
    };
    reader.readAsText(file);
  });

  dropZone.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type  = 'file';
    input.accept = '.txt,.bib,.ris,.csv';
    input.onchange = ev => {
      const file = ev.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = e => {
        bibInput.value = e.target.result;
        updateInputMeta();
        showToast(`📂 File "${file.name}" loaded`, 'success');
      };
      reader.readAsText(file);
    };
    input.click();
  });
}

// ===================================================
// HISTORY PANEL
// ===================================================
function openHistoryPanel() {
  historyPanel.classList.remove('hidden');
  panelOverlay.classList.remove('hidden');
  renderHistory();
}

function closeHistoryPanel() {
  historyPanel.classList.add('hidden');
  panelOverlay.classList.add('hidden');
}

// ===================================================
// TABS
// ===================================================
function switchTab(tabId) {
  state.activeTab = tabId;

  tabBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });

  tabPanels.forEach(panel => {
    const panelId = `tab-${tabId.replace(/-/g, '-')}`;
    panel.classList.toggle('active', panel.id === `tab-${tabId}`);
  });

  updateSelectionUI();
}

// ===================================================
// SELECT ALL / COPY SELECTED
// ===================================================
function handleSelectAll() {
  const checked  = selectAllCb.checked;
  const entries  = getActiveEntries();
  entries.forEach(e => { e.selected = checked; });
  renderAll();
  updateSelectionUI();
}

function copySelectedDOIs() {
  const entries  = [...state.papers, ...state.noDoi, ...state.others].filter(e => e.selected && e.doi);
  if (entries.length === 0) {
    showToast('No selected entries have DOIs', 'error');
    return;
  }
  const dois = entries.map(e => e.doi).join('\n');
  copyToClipboard(dois, `✅ ${entries.length} DOI(s) copied!`);
}

// ===================================================
// CLEAR
// ===================================================
function clearAll() {
  bibInput.value = '';
  updateInputMeta();
  state.papers = [];
  state.noDoi  = [];
  state.others = [];

  statsSection.classList.add('hidden');
  progressWrap.classList.add('hidden');
  doiOutputSection.classList.add('hidden');
  resultsSection.classList.add('hidden');

  showToast('🗑️ Cleared all data', 'info');
}

// ===================================================
// EVENT LISTENERS
// ===================================================
// Input live update
bibInput.addEventListener('input', updateInputMeta);

// Extract
extractBtn.addEventListener('click', extract);

// Keyboard shortcut: Ctrl+Enter
bibInput.addEventListener('keydown', e => {
  if (e.ctrlKey && e.key === 'Enter') extract();
});

// Clear
clearBtn.addEventListener('click', clearAll);

// Theme
themeToggle.addEventListener('click', toggleTheme);

// Tabs
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// Select All
selectAllCb.addEventListener('change', handleSelectAll);

// Copy Selected
copySelectedBtn.addEventListener('click', copySelectedDOIs);

// Copy All DOIs
copyAllDoisBtn.addEventListener('click', () => {
  if (!doiOutputBox.value.trim()) {
    showToast('No DOIs to copy', 'error');
    return;
  }
  copyToClipboard(doiOutputBox.value, '✅ All DOIs copied!');
});

// Search
searchInput.addEventListener('input', e => {
  state.searchQuery = e.target.value.trim();
  renderAll();
  updateSelectionUI();
});

// Sort
sortSelect.addEventListener('change', e => {
  state.sortBy = e.target.value;
  renderAll();
});

// Export dropdown
exportBtn.addEventListener('click', e => {
  e.stopPropagation();
  exportMenu.classList.toggle('hidden');
});

document.addEventListener('click', () => exportMenu.classList.add('hidden'));

exportMenu.querySelectorAll('.dropdown-item').forEach(item => {
  item.addEventListener('click', e => {
    e.stopPropagation();
    exportData(item.dataset.format);
    exportMenu.classList.add('hidden');
  });
});

// History
historyBtn.addEventListener('click', openHistoryPanel);
closeHistoryBtn.addEventListener('click', closeHistoryPanel);
panelOverlay.addEventListener('click', closeHistoryPanel);
clearHistoryBtn.addEventListener('click', () => {
  localStorage.removeItem(HISTORY_KEY);
  renderHistory();
  showToast('🗑️ History cleared', 'info');
});

// ===================================================
// INIT
// ===================================================
initTheme();
initDragDrop();
updateInputMeta();
renderHistory();

// Keyboard shortcut help
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeHistoryPanel();
    exportMenu.classList.add('hidden');
  }
});
