import { Block } from '@blocknote/core';
import { BookmarkDetailData, GlossaryTerm, Highlight, ChatMessage } from './types';

function getBlockText(block: Block): string {
  const b = block as Record<string, any>;
  if (!b.content) return '';
  if (typeof b.content === 'string') return b.content;
  if (Array.isArray(b.content)) {
    return b.content
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
    if (block.type === 'heading') break;
    const text = getBlockText(block);
    if (text) lines.push(text);
    i++;
  }
  return { text: lines.join('\n\n'), endIdx: i };
}

function getDualLangContent(blocks: Block[], startIdx: number): { summaryEn: string; summaryAr: string; endIdx: number } {
  let summaryEn = '';
  let summaryAr = '';
  let i = startIdx + 1;
  while (i < blocks.length) {
    const block = blocks[i];
    if (block.type === 'heading') break;
    if ((block as Record<string, unknown>).type === 'dualLang') {
      const props = (block as Record<string, unknown>).props as Record<string, unknown> | undefined;
      if (props) {
        summaryEn = (props.contentEn as string) || '';
        summaryAr = (props.contentAr as string) || '';
      }
      i++;
      break;
    }
    i++;
  }
  return { summaryEn, summaryAr, endIdx: i };
}

function getCollapsibleArticleContent(blocks: Block[], startIdx: number): { content: string; endIdx: number } {
  let content = '';
  let i = startIdx + 1;
  while (i < blocks.length) {
    const block = blocks[i];
    if (block.type === 'heading') break;
    if ((block as Record<string, unknown>).type === 'collapsibleArticle') {
      const props = (block as Record<string, unknown>).props as Record<string, unknown> | undefined;
      if (props) {
        content = (props.content as string) || '';
      }
      i++;
      break;
    }
    i++;
  }
  return { content, endIdx: i };
}

function getArticleReaderContent(blocks: Block[], startIdx: number): { blocksJson: string; wordCount: number; readingTime: number; endIdx: number } {
  let blocksJson = '';
  let wordCount = 0;
  let readingTime = 0;
  let i = startIdx + 1;
  while (i < blocks.length) {
    const block = blocks[i];
    if (block.type === 'heading') break;
    if ((block as Record<string, unknown>).type === 'articleReader') {
      const props = (block as Record<string, unknown>).props as Record<string, unknown> | undefined;
      if (props) {
        blocksJson = (props.blocksJson as string) || '';
        wordCount = (props.wordCount as number) || 0;
        readingTime = (props.readingTime as number) || 0;
      }
      i++;
      break;
    }
    i++;
  }
  return { blocksJson, wordCount, readingTime, endIdx: i };
}

function getGlossaryItems(blocks: Block[], startIdx: number): { terms: GlossaryTerm[]; endIdx: number } {
  const terms: GlossaryTerm[] = [];
  let i = startIdx + 1;
  while (i < blocks.length) {
    const block = blocks[i];
    if (block.type === 'heading') break;
    if (block.type === 'bulletListItem') {
      const text = getBlockText(block);
      const colonIdx = text.indexOf(':');
      if (colonIdx > 0) {
        terms.push({
          term: text.slice(0, colonIdx).trim(),
          definition: text.slice(colonIdx + 1).trim(),
        });
      }
    } else if (block.type === 'paragraph' && Array.isArray(block.content)) {
      const glossaryItem = block.content.find(
        (item: { type: string }) => item.type === 'glossaryTerm',
      );
      if (glossaryItem) {
        const props = (glossaryItem as Record<string, unknown>).props as Record<string, unknown> | undefined;
        if (props) {
          terms.push({
            term: (props.term as string) || '',
            definition: (props.definition as string) || '',
          });
        }
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
    if (block.type === 'heading') break;
    if ((block as Record<string, unknown>).type === 'highlight') {
      const props = (block as Record<string, unknown>).props as Record<string, unknown> | undefined;
      if (props) {
        highlights.push({
          id: `hl-${i}`,
          text: (props.selectedText as string) || '',
          note: (props.note as string) || undefined,
          color: (props.color as string) || undefined,
        });
      }
    } else if (block.type === 'checkListItem' || block.type === 'bulletListItem') {
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

function getChatMessages(blocks: Block[], startIdx: number): { messages: ChatMessage[]; sessionId: string | null; endIdx: number } {
  const messages: ChatMessage[] = [];
  let sessionId: string | null = null;
  let i = startIdx + 1;
  while (i < blocks.length) {
    const block = blocks[i];
    if (block.type === 'heading') break;
    if ((block as Record<string, unknown>).type === 'chat') {
      const props = (block as Record<string, unknown>).props as Record<string, unknown> | undefined;
      if (props?.sessionId) {
        sessionId = props.sessionId as string;
      }
    } else if (block.type === 'paragraph') {
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
  return { messages, sessionId, endIdx: i };
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
    const { summaryEn, summaryAr } = getDualLangContent(blocks, start);
    if (summaryEn || summaryAr) {
      if (summaryEn) result.summary = summaryEn;
      if (summaryAr) result.summaryAr = summaryAr;
    } else {
      const { text } = getSection(blocks, start);
      if (text) {
        if (!result.summary) result.summary = text;
        else result.summaryAr = text;
      }
    }
  } else if (sectionName === 'glossary') {
    const { terms } = getGlossaryItems(blocks, start);
    if (terms.length > 0) result.glossaryTerms = terms;
  } else if (sectionName === 'article') {
    const articleReader = getArticleReaderContent(blocks, start);
    if (articleReader.blocksJson) {
      result.articleBlocks = articleReader.blocksJson;
      result.articleWordCount = articleReader.wordCount;
      result.articleReadingTime = articleReader.readingTime;
    } else {
      const { content } = getCollapsibleArticleContent(blocks, start);
      if (content) {
        (result as Record<string, unknown>).content = content;
      } else {
        const { text } = getSection(blocks, start);
        if (text) (result as Record<string, unknown>).content = text;
      }
    }
  } else if (sectionName === 'highlights') {
    const { highlights } = getHighlights(blocks, start);
    if (highlights.length > 0) result.highlights = highlights;
  } else if (sectionName === 'notes') {
    const notesBlocks = blocks.slice(start + 1, end);
    if (notesBlocks.length > 0) {
      result.notes = JSON.stringify(notesBlocks);
    }
  } else if (sectionName === 'chat') {
    const { messages, sessionId } = getChatMessages(blocks, start);
    if (messages.length > 0) result.chatMessages = messages;
    if (sessionId) result.chatSessionId = sessionId;
  } else {
    const KNOWN_SECTIONS = ['summary', 'glossary', 'article', 'highlights', 'notes', 'chat'];
    if (!KNOWN_SECTIONS.includes(sectionName)) {
      const { text } = getSection(blocks, start);
      if (!result.customSections) result.customSections = [];
      result.customSections.push({
        id: `custom-${start}`,
        bookmark_id: '',
        title: name,
        content: text,
        sort_order: result.customSections.length,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  }
}
