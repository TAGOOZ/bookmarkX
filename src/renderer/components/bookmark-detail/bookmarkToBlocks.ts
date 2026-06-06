import { PartialBlock } from '@blocknote/core';
import { BookmarkDetailData } from './types';

function heading(text: string, level: 1 | 2 | 3 = 2): PartialBlock {
  return { type: 'heading', props: { level }, content: text };
}

function paragraph(text: string): PartialBlock {
  return { type: 'paragraph', content: text };
}

function boldParagraph(text: string): PartialBlock {
  return { type: 'paragraph', content: [{ type: 'text', text, styles: { bold: true } }] };
}

function styledParagraph(label: string, value: string): PartialBlock {
  return {
    type: 'paragraph',
    content: [
      { type: 'text', text: label, styles: { bold: true } },
      { type: 'text', text: value, styles: {} },
    ],
  };
}

function bulletListItem(text: string): PartialBlock {
  return { type: 'bulletListItem', content: text };
}

function checkListItem(text: string, checked = false): PartialBlock {
  return { type: 'checkListItem', props: { checked }, content: text };
}

function splitParagraphs(text: string): PartialBlock[] {
  return text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => paragraph(p));
}

export function bookmarkToBlocks(bookmark: BookmarkDetailData): PartialBlock[] {
  const blocks: PartialBlock[] = [];

  blocks.push(heading(bookmark.title, 1));

  if (bookmark.url) {
    blocks.push(paragraph(bookmark.url));
  }

  const meta: string[] = [];
  if (bookmark.topic) meta.push(bookmark.topic);
  if (bookmark.contentType) meta.push(bookmark.contentType);
  if (bookmark.priority) meta.push(bookmark.priority);
  if (bookmark.readingTime) meta.push(`${bookmark.readingTime} min`);
  if (meta.length > 0) {
    blocks.push(paragraph(meta.join(' · ')));
  }

  if (bookmark.createdAt) {
    const date = new Date(bookmark.createdAt);
    blocks.push(styledParagraph('Created: ', date.toLocaleDateString()));
  }

  if (bookmark.summaryAr) {
    blocks.push(heading('Summary', 2));
    blocks.push(paragraph(bookmark.summaryAr));
  }

  if (bookmark.summary) {
    if (!bookmark.summaryAr) blocks.push(heading('Summary', 2));
    blocks.push(paragraph(bookmark.summary));
  }

  if (bookmark.glossaryTerms && bookmark.glossaryTerms.length > 0) {
    blocks.push(heading('Glossary', 2));
    for (const term of bookmark.glossaryTerms) {
      blocks.push(bulletListItem(`${term.term}: ${term.definition}`));
    }
  }

  if (bookmark.content) {
    blocks.push(heading('Article', 2));
    blocks.push(...splitParagraphs(bookmark.content));
  }

  if (bookmark.highlights && bookmark.highlights.length > 0) {
    blocks.push(heading('Highlights', 2));
    for (const highlight of bookmark.highlights) {
      blocks.push(checkListItem(highlight.text));
      if (highlight.note) {
        blocks.push(paragraph(`Note: ${highlight.note}`));
      }
    }
  }

  if (bookmark.notes) {
    blocks.push(heading('Notes', 2));
    try {
      const parsed = JSON.parse(bookmark.notes);
      if (Array.isArray(parsed) && parsed.length > 0) {
        blocks.push(...parsed);
      } else {
        blocks.push(paragraph(bookmark.notes));
      }
    } catch {
      blocks.push(paragraph(bookmark.notes));
    }
  }

  if (bookmark.chatMessages && bookmark.chatMessages.length > 0) {
    blocks.push(heading('Chat', 2));
    for (const msg of bookmark.chatMessages) {
      const label = msg.role === 'user' ? 'You' : 'Assistant';
      blocks.push(paragraph(`**${label}:** ${msg.content}`));
    }
  }

  if (blocks.length === 0) {
    blocks.push(paragraph(''));
  }

  return blocks;
}
