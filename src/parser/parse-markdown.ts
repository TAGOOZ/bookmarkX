/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PartialBlock } from '@blocknote/core';

type InlineItem = { type: 'text'; text: string; styles: Record<string, any> };

function parseInlineFormatting(text: string): InlineItem[] {
  const items: InlineItem[] = [];
  let remaining = text;

  const patterns: Array<{ regex: RegExp; style: string }> = [
    { regex: /\*\*(.+?)\*\*/, style: 'bold' },
    { regex: /__(.+?)__/, style: 'bold' },
    { regex: /\*(.+?)\*/, style: 'italic' },
    { regex: /_(.+?)_/, style: 'italic' },
    { regex: /`(.+?)`/, style: 'code' },
    { regex: /\[(.+?)\]\((.+?)\)/, style: 'link' },
  ];

  while (remaining.length > 0) {
    let earliestMatch: { index: number; end: number; style: string; text: string; url?: string } | null = null;

    for (const { regex, style } of patterns) {
      const match = remaining.match(regex);
      if (match && match.index !== undefined) {
        if (!earliestMatch || match.index < earliestMatch.index) {
          if (style === 'link') {
            earliestMatch = { index: match.index, end: match.index + match[0].length, style, text: match[1], url: match[2] };
          } else {
            earliestMatch = { index: match.index, end: match.index + match[0].length, style, text: match[1] };
          }
        }
      }
    }

    if (!earliestMatch) {
      if (remaining.trim()) {
        items.push({ type: 'text', text: remaining, styles: {} });
      }
      break;
    }

    if (earliestMatch.index > 0) {
      const before = remaining.substring(0, earliestMatch.index);
      if (before.trim()) {
        items.push({ type: 'text', text: before, styles: {} });
      }
    }

    const styles: Record<string, any> = {};
    if (earliestMatch.style === 'link') {
      styles.link = earliestMatch.url;
    } else {
      styles[earliestMatch.style] = true;
    }
    items.push({ type: 'text', text: earliestMatch.text, styles });

    remaining = remaining.substring(earliestMatch.end);
  }

  return items.length > 0 ? items : [{ type: 'text', text, styles: {} }];
}

function parseTableRow(line: string): string[] {
  return line
    .split('|')
    .map((cell) => cell.trim())
    .filter((cell) => cell.length > 0);
}

function isTableSeparator(line: string): boolean {
  return /^\|?[\s-:|]+\|?$/.test(line);
}

export function parseMDToBlocks(markdown: string): PartialBlock[] {
  const blocks: PartialBlock[] = [];
  const lines = markdown.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      const level = Math.min(headingMatch[1].length, 6) as 1 | 2 | 3 | 4 | 5 | 6;
      blocks.push({
        type: 'heading',
        props: { level },
        content: headingMatch[2].trim(),
      } as any);
      i++;
      continue;
    }

    if (line.startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      const codeContent = codeLines.join('\n');
      if (codeContent.trim()) {
        blocks.push({
          type: 'paragraph',
          content: [{ type: 'text', text: codeContent, styles: { code: true } }],
        } as any);
      }
      continue;
    }

    if (line.match(/^[-*_]{3,}\s*$/)) {
      blocks.push({ type: 'paragraph', content: [{ type: 'text', text: '---', styles: {} }] } as PartialBlock);
      i++;
      continue;
    }

    if (line.match(/^[-+]\s+/) || line.match(/^\d+\.\s+/)) {
      const isOrdered = /^\d+\.\s+/.test(line);
      const text = line.replace(/^[-+]\s+/, '').replace(/^\d+\.\s+/, '');
      blocks.push({
        type: isOrdered ? 'numberedListItem' : 'bulletListItem',
        content: text.trim(),
      } as any);
      i++;
      continue;
    }

    if (line.startsWith('> ')) {
      const quoteText = line.substring(2);
      blocks.push({
        type: 'paragraph',
        content: [{ type: 'text', text: quoteText, styles: { italic: true } }],
      } as any);
      i++;
      continue;
    }

    const imgMatch = line.match(/^!\[(.*?)\]\((.*?)\)$/);
    if (imgMatch) {
      blocks.push({
        type: 'image',
        props: { url: imgMatch[2], alt: imgMatch[1] || '' },
        content: undefined,
      } as any);
      i++;
      continue;
    }

    if (line.includes('|') && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const headerCells = parseTableRow(line);
      i += 2; // skip header + separator

      const tableLines: string[][] = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim().length > 0) {
        tableLines.push(parseTableRow(lines[i]));
        i++;
      }

      const rows = [headerCells, ...tableLines];
      const tableHtml = renderTableHtml(rows);
      blocks.push({
        type: 'tableHtml',
        props: { html: tableHtml },
        content: undefined,
      } as any);
      continue;
    }

    const videoMatch = line.match(/^\[Video:\s*(.*?)\]\((.*?)\)$/);
    if (videoMatch) {
      blocks.push({
        type: 'video',
        props: { url: videoMatch[2] },
        content: undefined,
      } as any);
      i++;
      continue;
    }

    const audioMatch = line.match(/^\[Audio:\s*(.*?)\]\((.*?)\)$/);
    if (audioMatch) {
      blocks.push({
        type: 'audio',
        props: { url: audioMatch[2] },
        content: undefined,
      } as any);
      i++;
      continue;
    }

    const embedMatch = line.match(/^\[Embed:\s*(.*?)\]\((.*?)\)$/);
    if (embedMatch) {
      blocks.push({
        type: 'embed',
        props: { url: embedMatch[2] },
        content: undefined,
      } as any);
      i++;
      continue;
    }

    if (line.trim().length === 0) {
      i++;
      continue;
    }

    const inlineItems = parseInlineFormatting(line);
    if (inlineItems.length > 0 && inlineItems.some((item) => item.text.trim())) {
      blocks.push({
        type: 'paragraph',
        content: inlineItems,
      } as any);
    }
    i++;
  }

  return blocks;
}

function escapeCellContent(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderTableHtml(rows: string[][]): string {
  if (rows.length === 0) return '';

  let html = '<table>';
  if (rows.length > 0) {
    html += '<thead><tr>';
    for (const cell of rows[0]) {
      html += `<th>${escapeCellContent(cell)}</th>`;
    }
    html += '</tr></thead>';
  }
  if (rows.length > 1) {
    html += '<tbody>';
    for (let r = 1; r < rows.length; r++) {
      html += '<tr>';
      for (const cell of rows[r]) {
        html += `<td>${escapeCellContent(cell)}</td>`;
      }
      html += '</tr>';
    }
    html += '</tbody>';
  }
  html += '</table>';
  return html;
}
