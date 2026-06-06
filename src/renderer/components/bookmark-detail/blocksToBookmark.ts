import { Block } from '@blocknote/core';
import { BookmarkDetailData, GlossaryTerm, Highlight, ChatMessage } from './types';

function getBlockText(block: Block): string {
  if (!block.content) return '';
  if (typeof block.content === 'string') return block.content;
  if (Array.isArray(block.content)) {
    return block.content
      .map((item: { type: string; text?: string }) => item.text || '')
      .join('');
  }
  return '';
}

function getSection(blocks: Block[], startIdx: number): { text: string; endIdx: number } {
  const lines: string[] = [];
  let i = startIdx + 1;
  while (i < blocks.length) {
    const block = blocks[i];
    if (block.type === 'heading' || (block.type === 'divider')) break;
    const text = getBlockText(block);
    if (text) lines.push(text);
    i++;
  }
  return { text: lines.join('\n\n'), endIdx: i };
}

function getGlossaryItems(blocks: Block[], startIdx: number): { terms: GlossaryTerm[]; endIdx: number } {
  const terms: GlossaryTerm[] = [];
  let i = startIdx + 1;
  while (i < blocks.length) {
    const block = blocks[i];
    if (block.type === 'heading' || block.type === 'divider') break;
    if (block.type === 'bulletListItem') {
      const text = getBlockText(block);
      const colonIdx = text.indexOf(':');
      if (colonIdx > 0) {
        terms.push({
          term: text.slice(0, colonIdx).trim(),
          definition: text.slice(colonIdx + 1).trim(),
        });
      }
    }
    i++;
  }
  return { terms, endIdx: i };
}

function getHighlights(blocks: Block[], startIdx: number): { highlights: Highlight[]; endIdx: number } {
  const highlights: Highlight[] = [];
  let i = startIdx + 1;
  while (i < blocks.length) {
    const block = blocks[i];
    if (block.type === 'heading' || block.type === 'divider') break;
    if (block.type === 'checkListItem' || block.type === 'bulletListItem') {
      const text = getBlockText(block);
      if (text) {
        highlights.push({ id: `hl-${i}`, text });
      }
    } else if (block.type === 'paragraph') {
      const text = getBlockText(block);
      if (text.startsWith('Note:') && highlights.length > 0) {
        highlights[highlights.length - 1].note = text.slice(5).trim();
      }
    }
    i++;
  }
  return { highlights, endIdx: i };
}

function getChatMessages(blocks: Block[], startIdx: number): { messages: ChatMessage[]; endIdx: number } {
  const messages: ChatMessage[] = [];
  let i = startIdx + 1;
  while (i < blocks.length) {
    const block = blocks[i];
    if (block.type === 'heading' || block.type === 'divider') break;
    if (block.type === 'paragraph') {
      const text = getBlockText(block);
      const userMatch = text.match(/^\*\*You:\*\*\s*(.*)/);
      const assistantMatch = text.match(/^\*\*Assistant:\*\*\s*(.*)/);
      if (userMatch) {
        messages.push({ id: `msg-${i}`, role: 'user', content: userMatch[1] });
      } else if (assistantMatch) {
        messages.push({ id: `msg-${i}`, role: 'assistant', content: assistantMatch[1] });
      }
    }
    i++;
  }
  return { messages, endIdx: i };
}

export function blocksToBookmark(
  blocks: Block[],
  base: Partial<BookmarkDetailData> = {},
): Partial<BookmarkDetailData> {
  const result: Partial<BookmarkDetailData> = { ...base };
  const sections: string[] = [];
  let currentSection = '';
  let sectionStart = -1;

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    if (block.type === 'heading') {
      if (currentSection && sectionStart >= 0) {
        processSection(currentSection, blocks, sectionStart, i, result, sections);
      }
      currentSection = getBlockText(block);
      sectionStart = i;
      sections.push(currentSection);
    }
  }

  if (currentSection && sectionStart >= 0) {
    processSection(currentSection, blocks, sectionStart, blocks.length, result, sections);
  }

  return result;
}

function processSection(
  name: string,
  blocks: Block[],
  start: number,
  end: number,
  result: Partial<BookmarkDetailData>,
  _sections: string[],
): void {
  const sectionName = name.toLowerCase();

  if (sectionName === 'summary') {
    const { text } = getSection(blocks, start);
    if (text) {
      if (!result.summary) result.summary = text;
      else result.summaryAr = text;
    }
  } else if (sectionName === 'glossary') {
    const { terms } = getGlossaryItems(blocks, start);
    if (terms.length > 0) result.glossaryTerms = terms;
  } else if (sectionName === 'article') {
    const { text } = getSection(blocks, start);
    if (text) result.content = text;
  } else if (sectionName === 'highlights') {
    const { highlights } = getHighlights(blocks, start);
    if (highlights.length > 0) result.highlights = highlights;
  } else if (sectionName === 'notes') {
    const notesBlocks = blocks.slice(start + 1, end).filter(
      (b) => b.type !== 'divider',
    );
    if (notesBlocks.length > 0) {
      result.notes = JSON.stringify(notesBlocks);
    }
  } else if (sectionName === 'chat') {
    const { messages } = getChatMessages(blocks, start);
    if (messages.length > 0) result.chatMessages = messages;
  }
}
