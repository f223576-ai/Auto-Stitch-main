const INLINE_PATTERN = /\*\*(.+?)\*\*|\[([^\]]+)\]\(((?:https?:\/\/|\/)[^\s)]+)\)|`([^`]+)`|\*([^*\n]+)\*|\(?(?:PKR|Rs\.?)\s*\d[\d,\s]*\d(?:\s*(?:–|-|to)\s*\d[\d,\s]*\d)?\)?|\(?\d[\d,\s]*\d(?:\s*(?:–|-|to)\s*\d[\d,\s]*\d)?\s*(?:PKR|Rs\.?)\)?/gi;

function flushParagraph(blocks, paragraph) {
  const text = paragraph.join(' ').replace(/\s+/g, ' ').trim();
  paragraph.length = 0;
  if (text) blocks.push({ type: 'p', text });
}

function flushList(blocks, list) {
  if (list?.items.length) blocks.push(list);
  return null;
}

function flushQuote(blocks, quote) {
  const text = quote.join(' ').replace(/\s+/g, ' ').trim();
  quote.length = 0;
  if (text) blocks.push({ type: 'quote', text });
}

function flushTable(blocks, table) {
  const rows = table.filter((row) => !/^\|?\s*:?-{3,}[\s|:-]*$/.test(row));
  table.length = 0;
  if (rows.length === 0) return;

  const cells = (row) => row
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());

  blocks.push({
    type: 'table',
    headers: cells(rows[0]),
    rows: rows.slice(1).map(cells),
  });
}

export function normalizeChatText(raw) {
  return String(raw || '')
    .replace(/\r\n/g, '\n')
    .replace(/[\u00a0\u202f]/g, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/__(.+?)__/g, '**$1**')
    .replace(/([:.!?])\s+[-•–]\s+/g, '$1\n- ')
    .replace(/\s+[-•–]\s+(?=\*\*)/g, '\n- ')
    .replace(/(^|\n)\s*[•–]\s+/g, '$1- ')
    .replace(/(^|\n)\s*\*\s+(?=\S)/g, '$1- ')
    .replace(/([:.!?])\s+(\d{1,2}[.)]\s+)(?=[A-Z*"“])/g, '$1\n$2')
    .replace(/([^\d\n])(\d{1,2}[.)]\s+)(?=[A-Z*"“])/g, '$1\n$2')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s+-\s*$/g, '')
    .trim();
}

export function parseChatBlocks(raw) {
  const lines = normalizeChatText(raw).split('\n');
  const blocks = [];
  const paragraph = [];
  const quote = [];
  const table = [];
  let list = null;
  let code = null;

  const flushProse = () => {
    flushParagraph(blocks, paragraph);
    flushQuote(blocks, quote);
    flushTable(blocks, table);
    list = flushList(blocks, list);
  };

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (trimmed.startsWith('```')) {
      if (code) {
        blocks.push({ type: 'code', text: code.join('\n') });
        code = null;
      } else {
        flushProse();
        code = [];
      }
      return;
    }

    if (code) {
      code.push(line);
      return;
    }

    if (!trimmed || /^(-{3,}|\*{3,})$/.test(trimmed)) {
      flushProse();
      return;
    }

    if (trimmed.includes('|') && trimmed.split('|').length > 2) {
      flushParagraph(blocks, paragraph);
      flushQuote(blocks, quote);
      list = flushList(blocks, list);
      table.push(trimmed);
      return;
    }

    if (table.length) flushTable(blocks, table);

    const heading = trimmed.match(/^#{1,3}\s+(.+)$/);
    if (heading) {
      flushProse();
      blocks.push({ type: 'h', text: heading[1].replace(/\*\*/g, '').trim() });
      return;
    }

    const onlyBold = trimmed.match(/^\*\*(.+?)\*\*:?$/);
    if (onlyBold && onlyBold[1].length <= 48) {
      flushProse();
      blocks.push({ type: 'h', text: onlyBold[1].trim() });
      return;
    }

    if (trimmed.startsWith('>')) {
      flushParagraph(blocks, paragraph);
      list = flushList(blocks, list);
      quote.push(trimmed.replace(/^>\s?/, ''));
      return;
    }

    if (quote.length) flushQuote(blocks, quote);

    const numbered = trimmed.match(/^\d{1,2}[.)]\s+(.*)$/);
    const bullet = trimmed.match(/^[-]\s+(.*)$/);
    if (numbered || bullet) {
      flushParagraph(blocks, paragraph);
      const ordered = Boolean(numbered);
      const body = (numbered ? numbered[1] : bullet[1]).trim();
      if (!body || body === '-') return;
      if (!list || list.ordered !== ordered) {
        list = flushList(blocks, list);
        list = { type: ordered ? 'ol' : 'ul', ordered, items: [] };
      }
      list.items.push(body);
      return;
    }

    list = flushList(blocks, list);
    paragraph.push(trimmed);
  });

  if (code) blocks.push({ type: 'code', text: code.join('\n') });
  flushProse();
  return blocks;
}

function amountLabel(value) {
  const digits = String(value).replace(/[^\d]/g, '');
  if (!digits) return value;
  return Number(digits).toLocaleString('en-US');
}

export function formatPriceLabel(token) {
  const range = token.match(/(\d[\d,\s]*\d)\s*(?:–|-|to)\s*(\d[\d,\s]*\d)/i);
  if (range) return `PKR ${amountLabel(range[1])}–${amountLabel(range[2])}`;
  return `PKR ${amountLabel(token)}`;
}

export function splitInline(text) {
  const parts = [];
  const pattern = new RegExp(INLINE_PATTERN.source, 'gi');
  let last = 0;
  let match = pattern.exec(text);

  while (match) {
    if (match.index > last) {
      parts.push({ type: 'text', value: text.slice(last, match.index) });
    }

    if (match[1] != null) parts.push({ type: 'strong', value: match[1] });
    else if (match[2] != null) parts.push({ type: 'link', value: match[2], href: match[3] });
    else if (match[4] != null) parts.push({ type: 'code', value: match[4] });
    else if (match[5] != null) parts.push({ type: 'em', value: match[5] });
    else parts.push({ type: 'price', value: formatPriceLabel(match[0]) });

    last = match.index + match[0].length;
    match = pattern.exec(text);
  }

  if (last < text.length) parts.push({ type: 'text', value: text.slice(last) });
  return parts.length ? parts : [{ type: 'text', value: text }];
}
