/* eslint-disable @typescript-eslint/no-explicit-any */
import * as cheerio from 'cheerio';
import type { PartialBlock } from '@blocknote/core';
import type { ParserResult } from './types';
import { extractContent } from './extract-content';
import { createTurndownService } from './turndown-setup';
import { parseMDToBlocks } from './parse-markdown';

function htmlToMarkdown(html: string): string {
  const td = createTurndownService();
  return td.turndown(html);
}

export async function parseURL(url: string, options: { timeoutMs?: number } = {}): Promise<ParserResult> {
  const timeoutMs = options.timeoutMs || 15000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'BookmarkX/1.0' },
      signal: controller.signal,
    });
    const html = await response.text();

    let cleanHtml: string;
    try {
      const extracted = await extractContent(html, url);
      cleanHtml = extracted.html;
    } catch {
      cleanHtml = html;
    }

    const markdown = htmlToMarkdown(cleanHtml);
    const blocks = parseMDToBlocks(markdown);

    const text = blocks
      .filter((b: any) => typeof b.content === 'string')
      .map((b: any) => b.content)
      .join(' ');
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const readingTime = Math.max(1, Math.round(wordCount / 200));

    return { blocks, wordCount, readingTime };
  } finally {
    clearTimeout(timer);
  }
}

/* Legacy cheerio-based parser — kept as fallback */

type InlineItem = { type: string; text: string; styles: Record<string, any> };

function extractInlineContent(el: any): InlineItem[] {
  const $ = cheerio.load(el);
  const items: InlineItem[] = [];

  function walk(node: any) {
    if (node.type === 'text') {
      const text = node.data || '';
      if (text.trim()) {
        items.push({ type: 'text', text, styles: {} });
      }
      return;
    }

    if (node.type === 'tag') {
      const tag = node.name;
      const children = node.children || [];

      if (tag === 'strong' || tag === 'b') {
        for (const child of children) {
          if (child.type === 'text') {
            const text = child.data || '';
            if (text.trim()) {
              items.push({ type: 'text', text, styles: { bold: true } });
            }
          } else if (child.type === 'tag') {
            const inner = extractInlineContent(child);
            for (const item of inner) {
              items.push({ ...item, styles: { ...item.styles, bold: true } });
            }
          }
        }
      } else if (tag === 'em' || tag === 'i') {
        for (const child of children) {
          if (child.type === 'text') {
            const text = child.data || '';
            if (text.trim()) {
              items.push({ type: 'text', text, styles: { italic: true } });
            }
          } else if (child.type === 'tag') {
            const inner = extractInlineContent(child);
            for (const item of inner) {
              items.push({ ...item, styles: { ...item.styles, italic: true } });
            }
          }
        }
      } else if (tag === 'code') {
        for (const child of children) {
          if (child.type === 'text') {
            const text = child.data || '';
            if (text.trim()) {
              items.push({ type: 'text', text, styles: { code: true } });
            }
          }
        }
      } else if (tag === 'a') {
        const href = node.attribs?.href || '';
        for (const child of children) {
          if (child.type === 'text') {
            const text = child.data || '';
            if (text.trim()) {
              items.push({ type: 'text', text, styles: { link: href } });
            }
          }
        }
      } else {
        for (const child of children) {
          walk(child);
        }
      }
    }
  }

  for (const child of el.children || []) {
    walk(child);
  }

  if (items.length === 0) {
    const text = $(el).text().trim();
    if (text) {
      items.push({ type: 'text', text, styles: {} });
    }
  }

  return items;
}

function textFromChildren(el: any): string {
  const $ = cheerio.load(el);
  return $(el).text().trim();
}

function parseNode($: any, el: any): PartialBlock[] {
  const blocks: PartialBlock[] = [];
  const tag = el.name;

  if (!tag) return blocks;

  if (/^h[1-6]$/.test(tag)) {
    const level = parseInt(tag[1]);
    const text = textFromChildren(el);
    if (text) {
      blocks.push({ type: 'heading', props: { level: Math.min(level, 6) as 1 | 2 | 3 | 4 | 5 | 6 }, content: text } as any);
    }
    return blocks;
  }

  if (tag === 'p') {
    const items = extractInlineContent(el);
    if (items.length > 0) {
      const text = items.map((i) => i.text).join('');
      if (text.trim()) {
        blocks.push({ type: 'paragraph', content: items } as any);
      }
    }
    return blocks;
  }

  if (tag === 'ul') {
    $(el)
      .children('li')
      .each((_: number, li: any) => {
        const text = textFromChildren(li);
        if (text) {
          blocks.push({ type: 'bulletListItem', content: text } as any);
        }
      });
    return blocks;
  }

  if (tag === 'ol') {
    $(el)
      .children('li')
      .each((_: number, li: any) => {
        const text = textFromChildren(li);
        if (text) {
          blocks.push({ type: 'numberedListItem', content: text } as any);
        }
      });
    return blocks;
  }

  if (tag === 'pre') {
    const codeEl = $(el).find('code').first();
    const text = codeEl.length ? codeEl.text() : $(el).text();
    if (text.trim()) {
      blocks.push({
        type: 'paragraph',
        content: [{ type: 'text', text: text.trim(), styles: { code: true } }],
      } as any);
    }
    return blocks;
  }

  if (tag === 'blockquote') {
    const text = textFromChildren(el);
    if (text) {
      blocks.push({
        type: 'paragraph',
        content: [{ type: 'text', text, styles: { italic: true } }],
      } as any);
    }
    return blocks;
  }

  if (tag === 'img') {
    const alt = el.attribs?.alt || '';
    const placeholder = alt ? `[Image: ${alt}]` : '[Image]';
    blocks.push({
      type: 'paragraph',
      content: [{ type: 'text', text: placeholder, styles: { italic: true } }],
    } as any);
    return blocks;
  }

  if (tag === 'table') {
    const caption = $(el).find('caption').first().text().trim();
    const placeholder = caption ? `[Table: ${caption}]` : '[Table]';
    blocks.push({
      type: 'paragraph',
      content: [{ type: 'text', text: placeholder, styles: { italic: true } }],
    } as any);
    return blocks;
  }

  if (tag === 'hr') {
    blocks.push({
      type: 'paragraph',
      content: [{ type: 'text', text: '---', styles: {} }],
    } as any);
    return blocks;
  }

  return blocks;
}

export function parseHTMLToBlocks(html: string): PartialBlock[] {
  const $ = cheerio.load(html);
  const blocks: PartialBlock[] = [];

  $('body')
    .children()
    .each((_: number, el: any) => {
      const parsed = parseNode($, el);
      blocks.push(...parsed);
    });

  return blocks;
}
