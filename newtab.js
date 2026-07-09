/* ===================== DOM Ref ===================== */

const editor = document.getElementById('editor');
const preview = document.getElementById('preview');
const statusEl = document.getElementById('status');
const wordCountEl = document.getElementById('word-count');
const searchBar = document.getElementById('search-bar');
const searchInput = document.getElementById('search-input');
const searchCount = document.getElementById('search-count');
const searchClose = document.getElementById('search-close');
const divider = document.getElementById('divider');
const app = document.getElementById('app');

let cleanHTML = '';
let saveTimeout = null;

/* ===================== Storage ===================== */

function loadContent() {
  browser.storage.local.get('content').then((result) => {
    editor.value = result.content || '';
    renderPreview();
    updateStatusBar();
  }).catch(() => {
    editor.value = '';
    renderPreview();
  });
}

function saveContent() {
  browser.storage.local.set({ content: editor.value }).then(() => {
    statusEl.textContent = '✓ Salvo';
    statusEl.className = '';
  }).catch(() => {
    statusEl.textContent = '✗ Erro ao salvar';
    statusEl.className = '';
  });
}

function scheduleSave() {
  statusEl.textContent = 'Salvando...';
  statusEl.className = 'saving';
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(saveContent, 400);
}

/* ===================== Markdown Parser ===================== */

function escapeHtml(str) {
  return str.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
}

function renderMarkdown(md) {
  if (!md) return '';

  const codeBlocks = [];
  md = md.replace(/```(\w*)\n([\s\S]*?)```/gm, (_, lang, code) => {
    const n = codeBlocks.length;
    codeBlocks.push({ lang, code: escapeHtml(code) });
    return `\x00CB${n}\x00`;
  });

  const inlineCodes = [];
  md = md.replace(/`([^`]+)`/g, (_, code) => {
    const n = inlineCodes.length;
    inlineCodes.push(escapeHtml(code));
    return `\x00IC${n}\x00`;
  });

  md = escapeHtml(md);

  md = md.replace(/\x00IC(\d+)\x00/g, (_, n) => `\x00IC${n}\x00`);
  md = md.replace(/\x00CB(\d+)\x00/g, (_, n) => `\x00CB${n}\x00`);

  const lines = md.split('\n');
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const raw = lines[i];
    const trimmed = raw.trimEnd();

    if (/^\x00CB\d+\x00$/.test(trimmed)) {
      const idx = parseInt(trimmed.match(/\d+/)[0]);
      const cb = codeBlocks[idx];
      out.push(`<pre><code class="lang-${cb.lang}">${cb.code}</code></pre>`);
      i++;
      continue;
    }

    if (trimmed === '') { i++; continue; }

    const hMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (hMatch) {
      out.push(`<h${hMatch[1].length}>${inlineFormat(hMatch[2])}</h${hMatch[1].length}>`);
      i++;
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      out.push('<hr>');
      i++;
      continue;
    }

    if (trimmed.startsWith('> ')) {
      const quotes = [];
      while (i < lines.length && lines[i].trimStart().startsWith('> ')) {
        quotes.push(lines[i].trimStart().slice(2));
        i++;
      }
      out.push(`<blockquote>${inlineFormat(quotes.join('<br>'))}</blockquote>`);
      continue;
    }

    if (/^[-*+]\s/.test(trimmed)) {
      const items = [];
      while (i < lines.length && /^[-*+]\s/.test(lines[i].trimStart())) {
        const l = lines[i].trimStart();
        const taskMatch = l.match(/^[-*+]\s+\[([ x])\]\s+(.*)$/);
        const plainMatch = l.match(/^[-*+]\s+(.*)$/);
        if (taskMatch) {
          const checked = taskMatch[1] === 'x';
          items.push(`<li class="task-item" data-line="${i}"><input type="checkbox" ${checked ? 'checked' : ''}> ${inlineFormat(taskMatch[2])}</li>`);
        } else if (plainMatch) {
          items.push(`<li>${inlineFormat(plainMatch[1])}</li>`);
        }
        i++;
      }
      out.push(`<ul>${items.join('')}</ul>`);
      continue;
    }

    if (/^\d+\.\s/.test(trimmed)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trimStart())) {
        const l = lines[i].trimStart().replace(/^\d+\.\s+/, '');
        items.push(`<li>${inlineFormat(l)}</li>`);
        i++;
      }
      out.push(`<ol>${items.join('')}</ol>`);
      continue;
    }

    const para = [];
    while (i < lines.length) {
      const l = lines[i];
      const t = l.trimEnd();
      if (t === '' || /^(#{1,6}\s|> |[-*+]\s|\d+\.\s)/.test(t) ||
          /^(-{3,}|\*{3,}|_{3,})$/.test(t) || /^\x00CB\d+\x00$/.test(t)) break;
      para.push(l);
      i++;
    }
    if (para.length > 0) {
      out.push(`<p>${inlineFormat(para.join('<br>'))}</p>`);
    } else { i++; }
  }

  return out.join('\n');
}

function inlineFormat(text) {
  text = text.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/(?<![*])\*(?!\*)(.+?)(?<![*])\*(?!\*)/g, (m, c) => {
    if (c.trim()) return `<em>${c}</em>`;
    return m;
  });
  text = text.replace(/~~(.+?)~~/g, '<s>$1</s>');
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');
  return text;
}

/* ===================== Preview ===================== */

function renderPreview() {
  const html = renderMarkdown(editor.value);
  cleanHTML = html;
  preview.innerHTML = html;
  applySearch();
}

function updateStatusBar() {
  const text = editor.value.trim();
  if (!text) {
    wordCountEl.textContent = '';
    return;
  }
  const words = text.split(/\s+/).filter(Boolean).length;
  const chars = text.length;
  wordCountEl.textContent = `${words} ${words === 1 ? 'palavra' : 'palavras'} · ${chars} caracteres`;
}

/* ===================== Search ===================== */

function applySearch() {
  const query = searchInput.value.trim();
  if (!query) {
    preview.innerHTML = cleanHTML;
    searchCount.textContent = '';
    return;
  }

  preview.innerHTML = cleanHTML;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(escaped, 'gi');

  const walker = document.createTreeWalker(preview, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  while (walker.nextNode()) {
    if (walker.currentNode.textContent.trim()) {
      textNodes.push(walker.currentNode);
    }
  }

  let total = 0;
  for (const node of textNodes) {
    const text = node.textContent;
    const frag = document.createDocumentFragment();
    let lastIdx = 0;
    let match;
    let count = 0;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIdx) {
        frag.appendChild(document.createTextNode(text.slice(lastIdx, match.index)));
      }
      const mark = document.createElement('mark');
      mark.textContent = match[0];
      frag.appendChild(mark);
      lastIdx = regex.lastIndex;
      count++;
    }

    if (count > 0) {
      total += count;
      if (lastIdx < text.length) {
        frag.appendChild(document.createTextNode(text.slice(lastIdx)));
      }
      node.parentNode.replaceChild(frag, node);
    }
  }

  searchCount.textContent = total > 0 ? `${total} ${total === 1 ? 'resultado' : 'resultados'}` : '0 resultados';
}

/* ===================== Toolbar ===================== */

function insertMarkdown(action) {
  const start = editor.selectionStart;
  const end = editor.selectionEnd;
  const val = editor.value;
  const sel = val.substring(start, end);

  let prefix = '', suffix = '', insert = '';
  let newCursor = start;

  switch (action) {
    case 'bold':
      prefix = '**'; suffix = '**';
      break;
    case 'italic':
      prefix = '*'; suffix = '*';
      break;
    case 'strike':
      prefix = '~~'; suffix = '~~';
      break;
    case 'code':
      prefix = '`'; suffix = '`';
      break;
    case 'link': {
      const url = prompt('URL do link:');
      if (url) {
        const text = sel || 'texto';
        insert = `[${text}](${url})`;
        newCursor = start + insert.length;
      }
      break;
    }
    case 'heading': {
      const lineStart = val.lastIndexOf('\n', start - 1) + 1;
      insert = '## ';
      editor.value = val.slice(0, lineStart) + insert + val.slice(lineStart);
      newCursor = lineStart + insert.length;
      editor.selectionStart = editor.selectionEnd = newCursor;
      editor.focus();
      scheduleSave();
      renderPreview();
      return;
    }
    case 'ul': {
      const lineStart = val.lastIndexOf('\n', start - 1) + 1;
      insert = '- ';
      editor.value = val.slice(0, lineStart) + insert + val.slice(lineStart);
      newCursor = lineStart + insert.length;
      editor.selectionStart = editor.selectionEnd = newCursor;
      editor.focus();
      scheduleSave();
      renderPreview();
      return;
    }
    case 'ol': {
      const lineStart = val.lastIndexOf('\n', start - 1) + 1;
      insert = '1. ';
      editor.value = val.slice(0, lineStart) + insert + val.slice(lineStart);
      newCursor = lineStart + insert.length;
      editor.selectionStart = editor.selectionEnd = newCursor;
      editor.focus();
      scheduleSave();
      renderPreview();
      return;
    }
    case 'task': {
      const lineStart = val.lastIndexOf('\n', start - 1) + 1;
      insert = '- [ ] ';
      editor.value = val.slice(0, lineStart) + insert + val.slice(lineStart);
      newCursor = lineStart + insert.length;
      editor.selectionStart = editor.selectionEnd = newCursor;
      editor.focus();
      scheduleSave();
      renderPreview();
      return;
    }
  }

  if (insert) {
    editor.value = val.slice(0, start) + insert + val.slice(end);
    editor.selectionStart = editor.selectionEnd = newCursor;
  } else if (sel) {
    editor.value = val.slice(0, start) + prefix + sel + suffix + val.slice(end);
    editor.selectionStart = start + prefix.length;
    editor.selectionEnd = start + prefix.length + sel.length;
  } else {
    editor.value = val.slice(0, start) + prefix + suffix + val.slice(end);
    editor.selectionStart = editor.selectionEnd = start + prefix.length;
  }

  editor.focus();
  scheduleSave();
  renderPreview();
}

/* ===================== Export ===================== */

function downloadFile(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportMarkdown() {
  const content = editor.value || '(nota vazia)';
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  downloadFile(content, `mynotefoxy-${date}.md`, 'text/markdown');
}

function exportTxt() {
  const content = editor.value || '(nota vazia)';
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  downloadFile(content, `mynotefoxy-${date}.txt`, 'text/plain');
}

function copyContent() {
  const content = editor.value || '';
  navigator.clipboard.writeText(content).then(() => {
    statusEl.textContent = '✓ Copiado!';
    statusEl.className = '';
    setTimeout(() => {
      statusEl.textContent = '✓ Salvo';
    }, 1500);
  }).catch(() => {
    statusEl.textContent = '✗ Erro ao copiar';
  });
}

/* ===================== Zen Mode ===================== */

let zenActive = false;

function toggleZen() {
  zenActive = !zenActive;
  app.classList.toggle('zen', zenActive);
  document.getElementById('btn-zen').textContent = zenActive ? '✕' : '✧';
  document.getElementById('btn-zen').title = zenActive ? 'Sair do Modo Zen' : 'Modo Zen';
}

/* ===================== Divider Resize ===================== */

let isResizing = false;

divider.addEventListener('mousedown', (e) => {
  isResizing = true;
  divider.classList.add('active');
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
});

document.addEventListener('mousemove', (e) => {
  if (!isResizing) return;
  const rect = app.getBoundingClientRect();
  let pct = ((e.clientX - rect.left) / rect.width) * 100;
  if (pct < 20) pct = 20;
  if (pct > 80) pct = 80;
  document.getElementById('editor-pane').style.flex = `0 0 ${pct}%`;
  document.getElementById('preview-pane').style.flex = `0 0 ${100 - pct}%`;
});

document.addEventListener('mouseup', () => {
  if (isResizing) {
    isResizing = false;
    divider.classList.remove('active');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }
});

/* ===================== Checkboxes ===================== */

preview.addEventListener('change', (e) => {
  if (e.target.type === 'checkbox') {
    const li = e.target.closest('.task-item');
    if (!li) return;
    const lineIdx = parseInt(li.dataset.line);
    const lines = editor.value.split('\n');
    const line = lines[lineIdx];
    if (!line) return;

    if (e.target.checked) {
      lines[lineIdx] = line.replace(/\[ \]/, '[x]');
    } else {
      lines[lineIdx] = line.replace(/\[x\]/, '[ ]');
    }

    editor.value = lines.join('\n');
    scheduleSave();
    renderPreview();
  }
});

/* ===================== Events ===================== */

// Auto-save on input
editor.addEventListener('input', () => {
  scheduleSave();
  renderPreview();
  updateStatusBar();
});

// Tab: insert 2 spaces
editor.addEventListener('keydown', (e) => {
  if (e.key === 'Tab') {
    e.preventDefault();
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    editor.value = editor.value.substring(0, start) + '  ' + editor.value.substring(end);
    editor.selectionStart = editor.selectionEnd = start + 2;
    scheduleSave();
    renderPreview();
  }
});

// Global keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey) {
    switch (e.key.toLowerCase()) {
      case 'b': e.preventDefault(); insertMarkdown('bold'); break;
      case 'i': e.preventDefault(); insertMarkdown('italic'); break;
      case 's': e.preventDefault(); break;
      case 'f': e.preventDefault(); toggleSearch(); break;
    }
  }
  if (e.key === 'Escape') {
    if (!searchBar.classList.contains('hidden')) {
      hideSearch();
    } else if (zenActive) {
      toggleZen();
    }
  }
});

// Toolbar buttons
document.querySelectorAll('[data-action]').forEach((btn) => {
  btn.addEventListener('click', () => insertMarkdown(btn.dataset.action));
});

// Search
document.getElementById('btn-search').addEventListener('click', toggleSearch);

searchInput.addEventListener('input', applySearch);

searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') hideSearch();
});

searchClose.addEventListener('click', hideSearch);

function toggleSearch() {
  if (searchBar.classList.contains('hidden')) {
    searchBar.classList.remove('hidden');
    searchInput.focus();
    searchInput.select();
  } else {
    hideSearch();
  }
}

function hideSearch() {
  searchBar.classList.add('hidden');
  searchInput.value = '';
  searchCount.textContent = '';
  preview.innerHTML = cleanHTML;
}

// Export
document.getElementById('btn-export-md').addEventListener('click', exportMarkdown);
document.getElementById('btn-export-txt').addEventListener('click', exportTxt);
document.getElementById('btn-copy').addEventListener('click', copyContent);

// Zen
document.getElementById('btn-zen').addEventListener('click', toggleZen);

/* ===================== Init ===================== */

loadContent();
