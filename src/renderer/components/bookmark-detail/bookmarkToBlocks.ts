import { PartialBlock } from '@blocknote/core';
import { BookmarkDetailData } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */
// Helper to create blocks with custom types not in the default BlockNote schema.
// These types are registered at runtime via editor's blockSpecs/inlineContentSpecs.
function customBlock(type: string, props: Record<string, unknown> = {}): PartialBlock {
  return { type, props } as any;
}

function heading(text: string, level: 1 | 2 | 3 = 2): PartialBlock {
  return { type: 'heading', props: { level }, content: text };
}

function paragraph(text: string): PartialBlock {
  return { type: 'paragraph', content: text };
}

function styledText(text: string, styles: Record<string, boolean> = {}): { type: 'text'; text: string; styles: Record<string, boolean> } {
  return { type: 'text', text, styles };
}

function bulletListItem(text: string): PartialBlock {
  return { type: 'bulletListItem', content: text };
}

function splitParagraphs(text: string): PartialBlock[] {
  return text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => paragraph(p));
}

const ICONS: Record<string, string> = {
  topic: '📁',
  type: '📄',
  priority: '⚡',
  time: '⏱️',
  calendar: '📅',
  link: '🔗',
};

export function bookmarkToBlocks(bookmark: BookmarkDetailData): PartialBlock[] {
  const blocks: PartialBlock[] = [];

  blocks.push(heading(bookmark.title, 1));

  if (bookmark.url) {
    blocks.push({
      type: 'paragraph',
      content: [
        styledText(`${ICONS.link} `),
        styledText(bookmark.url, { bold: true }),
      ],
    });
  }

  const metaParts: { type: 'text'; text: string; styles: Record<string, boolean> }[] = [];
  if (bookmark.topic) {
    metaParts.push(styledText(`${ICONS.topic} ${bookmark.topic}`, { bold: true }));
    metaParts.push(styledText('   '));
  }
  if (bookmark.contentType) {
    metaParts.push(styledText(`${ICONS.type} ${bookmark.contentType}`, { bold: true }));
    metaParts.push(styledText('   '));
  }
  if (bookmark.priority) {
    metaParts.push(styledText(`${ICONS.priority} ${bookmark.priority.toUpperCase()}`, { bold: true }));
    metaParts.push(styledText('   '));
  }
  if (bookmark.readingTime) {
    metaParts.push(styledText(`${ICONS.time} ${bookmark.readingTime} min read`));
    metaParts.push(styledText('   '));
  }
  if (metaParts.length > 0) {
    metaParts.pop();
    blocks.push({ type: 'paragraph', content: metaParts });
  }

  if (bookmark.createdAt) {
    const date = new Date(bookmark.createdAt);
    blocks.push({
      type: 'paragraph',
      content: [
        styledText(`${ICONS.calendar} `, {}),
        styledText('Created: ', { bold: true }),
        styledText(date.toLocaleDateString()),
      ],
    });
  }

  if (bookmark.summaryAr && bookmark.summary) {
    blocks.push(heading('Summary', 2));
    blocks.push(customBlock('dualLang', { contentEn: bookmark.summary, contentAr: bookmark.summaryAr }));
  } else if (bookmark.summaryAr) {
    blocks.push(heading('Summary', 2));
    blocks.push(customBlock('dualLang', { contentEn: '', contentAr: bookmark.summaryAr }));
  } else if (bookmark.summary) {
    blocks.push(heading('Summary', 2));
    blocks.push(customBlock('dualLang', { contentEn: bookmark.summary, contentAr: '' }));
  }

  if (bookmark.glossaryTerms && bookmark.glossaryTerms.length > 0) {
    blocks.push(heading('Glossary', 2));
    for (const term of bookmark.glossaryTerms) {
      blocks.push({
        type: 'paragraph',
        content: [
          {
            type: 'glossaryTerm',
            props: {
              term: term.term,
              definition: term.definition,
            },
          } as any,
        ],
      });
    }
  }

  if (bookmark.articleBlocks) {
    blocks.push(heading('Article', 2));
    try {
      const parsed = JSON.parse(bookmark.articleBlocks);
      if (Array.isArray(parsed) && parsed.length > 0) {
        blocks.push(customBlock('articleReader', {
          blocksJson: bookmark.articleBlocks,
          wordCount: bookmark.articleWordCount || 0,
          readingTime: bookmark.articleReadingTime || 0,
          sourceUrl: bookmark.url || '',
          isExpanded: false,
        }));
      }
    } catch {
      // Fall back to collapsibleArticle
      const wordCount = (bookmark.content || '').split(/\s+/).filter(Boolean).length;
      blocks.push(customBlock('collapsibleArticle', { content: bookmark.content || '', wordCount, isExpanded: false }));
    }
  } else if (bookmark.content) {
    blocks.push(heading('Article', 2));
    const wordCount = bookmark.content.split(/\s+/).filter(Boolean).length;
    blocks.push(customBlock('collapsibleArticle', { content: bookmark.content, wordCount, isExpanded: false }));
  }

  if (bookmark.highlights && bookmark.highlights.length > 0) {
    blocks.push(heading('Highlights', 2));
    for (const highlight of bookmark.highlights) {
      blocks.push(customBlock('highlight', {
        selectedText: highlight.text,
        note: highlight.note || '',
        color: highlight.color || '#e69819',
      }));
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

  if (bookmark.chatSessionId) {
    blocks.push(heading('Chat', 2));
    blocks.push(customBlock('chat', { sessionId: bookmark.chatSessionId }));
  }

  if (blocks.length === 0) {
    blocks.push(paragraph(''));
  }

  return blocks;
}
