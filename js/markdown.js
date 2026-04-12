// ════════════════════════════════════════
// ── Lightweight Markdown Renderer ──
// ════════════════════════════════════════

function _escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function _safeUrl(url) {
  const raw = String(url ?? '').trim();
  if (!raw) return '#';
  if (/^(https?:|mailto:)/i.test(raw)) return _escapeHtml(raw);
  if (/^[\w./#?=&%-]+$/.test(raw) && !raw.startsWith('javascript:')) return _escapeHtml(raw);
  return '#';
}

function _inline(markdown) {
  const code = [];
  let html = _escapeHtml(markdown).replace(/`([^`]+)`/g, (_m, body) => {
    const token = `@@CODE${code.length}@@`;
    code.push(`<code>${body}</code>`);
    return token;
  });

  html = html
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, label, url) =>
      `<a href="${_safeUrl(url)}" target="_blank" rel="noopener">${label}</a>`)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1<em>$2</em>');

  code.forEach((snippet, i) => {
    html = html.replace(`@@CODE${i}@@`, snippet);
  });
  return html;
}

function _closeList(out, listType) {
  if (!listType) return '';
  out.push(`</${listType}>`);
  return '';
}

export function renderMarkdown(markdown) {
  const src = String(markdown ?? '').replace(/\r\n?/g, '\n');
  if (!src.trim()) return '';

  const lines = src.split('\n');
  const out = [];
  let paragraph = [];
  let listType = '';
  let inCode = false;
  let codeLang = '';
  let codeLines = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    out.push(`<p>${_inline(paragraph.join(' '))}</p>`);
    paragraph = [];
  };

  for (const line of lines) {
    const fence = line.match(/^```(\w+)?\s*$/);
    if (fence) {
      if (inCode) {
        out.push(`<pre><code${codeLang ? ` data-lang="${_escapeHtml(codeLang)}"` : ''}>${_escapeHtml(codeLines.join('\n'))}</code></pre>`);
        inCode = false;
        codeLang = '';
        codeLines = [];
      } else {
        flushParagraph();
        _closeList(out, listType); listType = '';
        inCode = true;
        codeLang = fence[1] || '';
      }
      continue;
    }
    if (inCode) { codeLines.push(line); continue; }

    if (!line.trim()) {
      flushParagraph();
      _closeList(out, listType); listType = '';
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      _closeList(out, listType); listType = '';
      const level = heading[1].length;
      out.push(`<h${level}>${_inline(heading[2].trim())}</h${level}>`);
      continue;
    }

    const quote = line.match(/^>\s?(.+)$/);
    if (quote) {
      flushParagraph();
      _closeList(out, listType); listType = '';
      out.push(`<blockquote>${_inline(quote[1].trim())}</blockquote>`);
      continue;
    }

    const checked = line.match(/^\s*[-*]\s+\[(x| )\]\s+(.+)$/i);
    if (checked) {
      flushParagraph();
      if (listType !== 'ul') { _closeList(out, listType); listType = 'ul'; out.push('<ul>'); }
      out.push(`<li class="md-task ${checked[1].toLowerCase() === 'x' ? 'done' : ''}"><span class="md-check">${checked[1].toLowerCase() === 'x' ? '✓' : ''}</span>${_inline(checked[2])}</li>`);
      continue;
    }

    const bullet = line.match(/^\s*[-*]\s+(.+)$/);
    if (bullet) {
      flushParagraph();
      if (listType !== 'ul') { _closeList(out, listType); listType = 'ul'; out.push('<ul>'); }
      out.push(`<li>${_inline(bullet[1])}</li>`);
      continue;
    }

    const numbered = line.match(/^\s*\d+\.\s+(.+)$/);
    if (numbered) {
      flushParagraph();
      if (listType !== 'ol') { _closeList(out, listType); listType = 'ol'; out.push('<ol>'); }
      out.push(`<li>${_inline(numbered[1])}</li>`);
      continue;
    }

    paragraph.push(line.trim());
  }

  if (inCode) out.push(`<pre><code${codeLang ? ` data-lang="${_escapeHtml(codeLang)}"` : ''}>${_escapeHtml(codeLines.join('\n'))}</code></pre>`);
  flushParagraph();
  _closeList(out, listType);
  return `<div class="markdown-body">${out.join('')}</div>`;
}

export function markdownExcerpt(markdown, max = 120) {
  const plain = String(markdown ?? '')
    .replace(/```[\s\S]*?```/g, ' code block ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[#>*_`~-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.length > max ? plain.slice(0, max - 1) + '…' : plain;
}

export function applyMarkdownShortcut(textarea, command) {
  if (!textarea) return;
  const start = textarea.selectionStart ?? 0;
  const end = textarea.selectionEnd ?? start;
  const value = textarea.value || '';
  const selected = value.slice(start, end);
  let next = value;
  let selStart = start;
  let selEnd = end;

  const wrap = (prefix, suffix = prefix, fallback = 'text') => {
    const body = selected || fallback;
    next = value.slice(0, start) + prefix + body + suffix + value.slice(end);
    selStart = start + prefix.length;
    selEnd = selStart + body.length;
  };

  if (command === 'bold') wrap('**', '**', 'important');
  else if (command === 'italic') wrap('*', '*', 'note');
  else if (command === 'code') wrap('`', '`', 'formula');
  else if (command === 'link') wrap('[', '](https://)', 'source');
  else if (command === 'heading') {
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    next = value.slice(0, lineStart) + '# ' + value.slice(lineStart);
    selStart = selEnd = start + 2;
  } else if (command === 'list' || command === 'checkbox') {
    const prefix = command === 'checkbox' ? '- [ ] ' : '- ';
    const lines = (selected || 'item').split('\n').map(line => prefix + line.replace(/^\s*[-*]\s+/, ''));
    next = value.slice(0, start) + lines.join('\n') + value.slice(end);
    selStart = start + prefix.length;
    selEnd = start + lines.join('\n').length;
  } else if (command === 'fence') {
    const body = selected || 'key idea';
    next = value.slice(0, start) + '```\n' + body + '\n```' + value.slice(end);
    selStart = start + 4;
    selEnd = selStart + body.length;
  }

  textarea.value = next;
  textarea.focus();
  textarea.setSelectionRange(selStart, selEnd);
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
}
