const ansi = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  underline: '\x1b[4m',
  gray: '\x1b[90m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgBlack: '\x1b[40m',
};

const keywordPattern =
  /\b(async|await|break|case|catch|class|const|continue|default|do|else|export|extends|finally|for|from|function|if|import|in|interface|let|new|of|return|switch|throw|try|type|typeof|var|while|yield|public|private|protected|readonly|static)\b/g;

const shellKeywordPattern = /\b(cd|echo|export|git|bun|npm|npx|node|curl|rg|ls|cat|sed|mkdir|touch)\b/g;

function color(text: string, code: string): string {
  return `${code}${text}${ansi.reset}`;
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightCode(code: string, language = ''): string {
  const lang = language.toLowerCase();
  const placeholders = new Map<string, string>();
  let index = 0;

  const stash = (value: string, style: string) => {
    const key = `__CLI_MD_TOKEN_${index++}__`;
    placeholders.set(key, color(value, style));
    return key;
  };

  let output = code
    .replace(/(["'`])(?:\\.|(?!\1).)*\1/g, (match) => stash(match, ansi.green))
    .replace(/\b\d+(?:\.\d+)?\b/g, (match) => stash(match, ansi.yellow));

  if (['bash', 'sh', 'shell', 'zsh'].includes(lang)) {
    output = output
      .replace(/(^|\s)(#[^\n]*)/g, (_match, prefix: string, comment: string) => `${prefix}${stash(comment, ansi.gray)}`)
      .replace(shellKeywordPattern, (match) => color(match, ansi.cyan));
  } else {
    output = output
      .replace(/(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/g, (match) => stash(match, ansi.gray))
      .replace(keywordPattern, (match) => color(match, ansi.magenta))
      .replace(/\b([A-Z][A-Za-z0-9_]*)\b/g, (match) => color(match, ansi.cyan));
  }

  for (const [key, value] of placeholders) {
    output = output.replaceAll(key, value);
  }

  return output;
}

function renderInline(text: string): string {
  let output = text;
  const inlineCode = new Map<string, string>();
  let index = 0;

  output = output.replace(/`([^`]+)`/g, (_match, code: string) => {
    const key = `@@CLIMDINLINE${index++}@@`;
    inlineCode.set(key, color(` ${code} `, `${ansi.bgBlack}${ansi.cyan}`));
    return key;
  });

  output = output
    .replace(/\*\*([^*]+)\*\*/g, (_match, value: string) => color(value, ansi.bold))
    .replace(/__([^_]+)__/g, (_match, value: string) => color(value, ansi.bold))
    .replace(/\*([^*]+)\*/g, (_match, value: string) => color(value, ansi.italic))
    .replace(/_([^_]+)_/g, (_match, value: string) => color(value, ansi.italic))
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label: string, href: string) => {
      return `${color(label, ansi.underline)} ${color(`(${href})`, ansi.gray)}`;
    });

  for (const [key, value] of inlineCode) {
    output = output.replaceAll(key, value);
  }

  return output;
}

function renderHeading(line: string): string {
  const match = /^(#{1,6})\s+(.*)$/.exec(line);

  if (!match) {
    return line;
  }

  const level = match[1].length;
  const marker = level <= 2 ? '━' : '─';
  const title = renderInline(match[2]);
  const prefix = level === 1 ? '\n' : '';

  return `${prefix}${color(title, level <= 2 ? `${ansi.bold}${ansi.cyan}` : `${ansi.bold}${ansi.white}`)}\n${color(marker.repeat(Math.min(72, Math.max(12, match[2].length))), ansi.gray)}`;
}

function splitTableRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  const cells: string[] = [];
  let current = '';
  let escaped = false;

  for (const char of trimmed) {
    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      continue;
    }

    if (char === '|') {
      cells.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  cells.push(current.trim());

  return cells;
}

function isTableSeparator(line: string): boolean {
  const cells = splitTableRow(line);

  if (cells.length < 2) {
    return false;
  }

  return cells.every((cell) => /^:?-{2,}:?$/.test(cell.trim()));
}

function tableAlignments(separatorLine: string): ('left' | 'center' | 'right')[] {
  return splitTableRow(separatorLine).map((cell) => {
    const trimmed = cell.trim();

    if (trimmed.startsWith(':') && trimmed.endsWith(':')) {
      return 'center';
    }

    if (trimmed.endsWith(':')) {
      return 'right';
    }

    return 'left';
  });
}

function charWidth(char: string): number {
  const codePoint = char.codePointAt(0) ?? 0;

  if (codePoint === 0) {
    return 0;
  }

  if (codePoint < 32 || (codePoint >= 0x7f && codePoint < 0xa0)) {
    return 0;
  }

  if (
    codePoint >= 0x1100 &&
    (codePoint <= 0x115f ||
      codePoint === 0x2329 ||
      codePoint === 0x232a ||
      (codePoint >= 0x2e80 && codePoint <= 0xa4cf && codePoint !== 0x303f) ||
      (codePoint >= 0xac00 && codePoint <= 0xd7a3) ||
      (codePoint >= 0xf900 && codePoint <= 0xfaff) ||
      (codePoint >= 0xfe10 && codePoint <= 0xfe19) ||
      (codePoint >= 0xfe30 && codePoint <= 0xfe6f) ||
      (codePoint >= 0xff00 && codePoint <= 0xff60) ||
      (codePoint >= 0xffe0 && codePoint <= 0xffe6) ||
      (codePoint >= 0x1f300 && codePoint <= 0x1faff))
  ) {
    return 2;
  }

  return 1;
}

function terminalWidth(text: string): number {
  return Array.from(text).reduce((width, char) => width + charWidth(char), 0);
}

function visibleMarkdownWidth(text: string): number {
  return terminalWidth(
    text
      .replace(/`([^`]+)`/g, ' $1 ')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/__([^_]+)__/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/_([^_]+)_/g, '$1')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)'),
  );
}

function tableAvailableWidth(columnCount: number): number {
  const envColumns = Number.parseInt(process.env.COLUMNS ?? '', 10);
  const terminalColumns = Number.isFinite(envColumns) ? envColumns : process.stdout.columns || 100;
  const borderWidth = columnCount + 1;
  const cellPaddingWidth = columnCount * 2;

  return Math.max(columnCount * 3, terminalColumns - borderWidth - cellPaddingWidth);
}

function fitTableWidths(idealWidths: number[], minWidths: number[]): number[] {
  const availableWidth = tableAvailableWidth(idealWidths.length);
  const widths = [...idealWidths];
  let overflow = widths.reduce((sum, width) => sum + width, 0) - availableWidth;

  while (overflow > 0) {
    let widestIndex = -1;
    let widestReducibleWidth = -1;

    for (let index = 0; index < widths.length; index++) {
      const reducibleWidth = widths[index] - minWidths[index];

      if (reducibleWidth > widestReducibleWidth) {
        widestReducibleWidth = reducibleWidth;
        widestIndex = index;
      }
    }

    if (widestIndex === -1 || widestReducibleWidth <= 0) {
      break;
    }

    widths[widestIndex]--;
    overflow--;
  }

  return widths;
}

function wrapPlainText(text: string, width: number): string[] {
  const normalized = text.replace(/\s+/g, ' ').trim();

  if (!normalized) {
    return [''];
  }

  const lines: string[] = [];
  let current = '';
  let currentWidth = 0;
  const tokens = normalized.match(/\S+\s*/g) ?? [normalized];

  const pushCurrent = () => {
    lines.push(current.trimEnd());
    current = '';
    currentWidth = 0;
  };

  for (const token of tokens) {
    const tokenWidth = terminalWidth(token);

    if (current && currentWidth + tokenWidth <= width) {
      current += token;
      currentWidth += tokenWidth;
      continue;
    }

    if (current) {
      pushCurrent();
    }

    if (tokenWidth <= width) {
      current = token;
      currentWidth = tokenWidth;
      continue;
    }

    let segment = '';
    let segmentWidth = 0;

    for (const char of Array.from(token.trimEnd())) {
      const widthToAdd = charWidth(char);

      if (segment && segmentWidth + widthToAdd > width) {
        lines.push(segment);
        segment = '';
        segmentWidth = 0;
      }

      segment += char;
      segmentWidth += widthToAdd;
    }

    current = segment;
    currentWidth = segmentWidth;
  }

  if (current || lines.length === 0) {
    pushCurrent();
  }

  return lines;
}

function splitInlineMarkdownSegments(text: string): { text: string; protected: boolean }[] {
  const segments: { text: string; protected: boolean }[] = [];
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;

  for (const match of text.matchAll(pattern)) {
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index), protected: false });
    }

    segments.push({ text: match[0], protected: true });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), protected: false });
  }

  return segments;
}

function wrapMarkdownCell(text: string, width: number): string[] {
  if (visibleMarkdownWidth(text) <= width) {
    return [text];
  }

  const lines: string[] = [];
  let current = '';

  const pushCurrent = () => {
    lines.push(current.trimEnd());
    current = '';
  };

  for (const segment of splitInlineMarkdownSegments(text)) {
    const parts = segment.protected ? [segment.text] : wrapPlainText(segment.text, width);

    for (const part of parts) {
      if (!part) {
        continue;
      }

      const candidate = current ? `${current}${part.startsWith(' ') ? '' : ' '}${part}` : part;

      if (current && visibleMarkdownWidth(candidate) > width) {
        pushCurrent();
      }

      if (visibleMarkdownWidth(part) > width) {
        for (const wrappedPart of wrapPlainText(part, width)) {
          if (current) {
            pushCurrent();
          }
          current = wrappedPart;
          pushCurrent();
        }
      } else {
        current = current ? `${current}${part.startsWith(' ') ? '' : ' '}${part}` : part;
      }
    }
  }

  if (current || lines.length === 0) {
    pushCurrent();
  }

  return lines;
}

function padCell(text: string, width: number, alignment: 'left' | 'center' | 'right'): string {
  const visibleWidth = visibleMarkdownWidth(text);
  const padding = Math.max(0, width - visibleWidth);

  if (alignment === 'right') {
    return `${' '.repeat(padding)}${text}`;
  }

  if (alignment === 'center') {
    const left = Math.floor(padding / 2);
    const right = padding - left;
    return `${' '.repeat(left)}${text}${' '.repeat(right)}`;
  }

  return `${text}${' '.repeat(padding)}`;
}

function renderTable(tableLines: string[]): string[] {
  const header = splitTableRow(tableLines[0]);
  const alignments = tableAlignments(tableLines[1]);
  const rows = tableLines.slice(2).map(splitTableRow);
  const columnCount = Math.max(header.length, ...rows.map((row) => row.length));
  const idealWidths = Array.from({ length: columnCount }, (_, columnIndex) => {
    const values = [header, ...rows].map((row) => row[columnIndex] ?? '');
    return Math.max(3, ...values.map(visibleMarkdownWidth));
  });
  const minWidths = idealWidths.map((width) => Math.min(width, 12));
  const widths = fitTableWidths(idealWidths, minWidths);

  const border = (left: string, separator: string, right: string) =>
    color(`${left}${widths.map((width) => '─'.repeat(width + 2)).join(separator)}${right}`, ansi.gray);

  const renderRow = (cells: string[], isHeader = false): string[] => {
    const wrappedCells = widths.map((width, columnIndex) => wrapMarkdownCell(cells[columnIndex] ?? '', width));
    const rowHeight = Math.max(...wrappedCells.map((cellLines) => cellLines.length));

    return Array.from({ length: rowHeight }, (_, lineIndex) => {
      const renderedCells = widths.map((width, columnIndex) => {
        const rawCell = padCell(wrappedCells[columnIndex][lineIndex] ?? '', width, alignments[columnIndex] ?? 'left');
        const renderedCell = renderInline(rawCell);
        return isHeader ? color(renderedCell, `${ansi.bold}${ansi.cyan}`) : renderedCell;
      });

      return `${color('│', ansi.gray)} ${renderedCells.join(` ${color('│', ansi.gray)} `)} ${color('│', ansi.gray)}`;
    });
  };

  return [
    border('┌', '┬', '┐'),
    ...renderRow(header, true),
    border('├', '┼', '┤'),
    ...rows.flatMap((row) => renderRow(row)),
    border('└', '┴', '┘'),
  ];
}

function renderMarkdownLine(line: string): string {
  if (/^#{1,6}\s+/.test(line)) {
    return renderHeading(line);
  }

  if (/^\s*[-*_]{3,}\s*$/.test(line)) {
    return color('─'.repeat(72), ansi.gray);
  }

  const blockquote = /^>\s?(.*)$/.exec(line);
  if (blockquote) {
    return `${color('│', ansi.gray)} ${color(renderInline(blockquote[1]), ansi.gray)}`;
  }

  const unordered = /^(\s*)[-*+]\s+(.*)$/.exec(line);
  if (unordered) {
    return `${unordered[1]}${color('•', ansi.cyan)} ${renderInline(unordered[2])}`;
  }

  const ordered = /^(\s*)\d+[.)]\s+(.*)$/.exec(line);
  if (ordered) {
    const number = line.trimStart().split(/[.)]\s+/, 1)[0];
    return `${ordered[1]}${color(`${number}.`, ansi.cyan)} ${renderInline(ordered[2])}`;
  }

  return renderInline(line);
}

export function renderMarkdown(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const output: string[] = [];
  let inCodeBlock = false;
  let codeLanguage = '';
  let codeLines: string[] = [];

  const flushCodeBlock = () => {
    const languageLabel = codeLanguage ? ` ${codeLanguage} ` : ' code ';
    output.push(color(`┌─${languageLabel}${'─'.repeat(Math.max(0, 72 - languageLabel.length - 2))}`, ansi.gray));
    output.push(
      ...highlightCode(codeLines.join('\n'), codeLanguage)
        .split('\n')
        .map((line) => `${color('│', ansi.gray)} ${line}`),
    );
    output.push(color(`└${'─'.repeat(72)}`, ansi.gray));
    codeLines = [];
    codeLanguage = '';
  };

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const fence = /^```([\w.+-]*)\s*$/.exec(line);

    if (fence) {
      if (inCodeBlock) {
        flushCodeBlock();
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
        codeLanguage = fence[1] ?? '';
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    if (line.includes('|') && lines[index + 1] && isTableSeparator(lines[index + 1])) {
      const tableLines = [line, lines[index + 1]];
      index += 2;

      while (index < lines.length && lines[index].includes('|') && lines[index].trim() !== '') {
        tableLines.push(lines[index]);
        index++;
      }

      index--;
      output.push(...renderTable(tableLines));
      continue;
    }

    output.push(renderMarkdownLine(line));
  }

  if (inCodeBlock) {
    flushCodeBlock();
  }

  return output.join('\n').replace(new RegExp(escapeRegExp(ansi.reset) + `(${escapeRegExp(ansi.reset)})+`, 'g'), ansi.reset);
}
