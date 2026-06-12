import { describe, it, expect } from 'vitest';
import { blocksToMarkdown } from '../blocks-to-markdown';

describe('blocksToMarkdown', () => {
  it('converts headings h1-h6', () => {
    const blocks = [
      { type: 'heading', props: { level: 1 }, content: [{ type: 'text', text: 'H1', styles: {} }] },
      { type: 'heading', props: { level: 2 }, content: [{ type: 'text', text: 'H2', styles: {} }] },
      { type: 'heading', props: { level: 3 }, content: [{ type: 'text', text: 'H3', styles: {} }] },
    ];
    const md = blocksToMarkdown(blocks);
    expect(md).toBe('# H1\n\n## H2\n\n### H3');
  });

  it('converts heading with string content', () => {
    const blocks = [
      { type: 'heading', props: { level: 1 }, content: 'Title' },
    ];
    const md = blocksToMarkdown(blocks);
    expect(md).toBe('# Title');
  });

  it('converts paragraphs', () => {
    const blocks = [
      { type: 'paragraph', content: [{ type: 'text', text: 'First paragraph.', styles: {} }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'Second paragraph.', styles: {} }] },
    ];
    const md = blocksToMarkdown(blocks);
    expect(md).toBe('First paragraph.\n\nSecond paragraph.');
  });

  it('converts bold inline formatting', () => {
    const blocks = [
      { type: 'paragraph', content: [
        { type: 'text', text: 'Text with ', styles: {} },
        { type: 'text', text: 'bold', styles: { bold: true } },
      ]},
    ];
    const md = blocksToMarkdown(blocks);
    expect(md).toBe('Text with **bold**');
  });

  it('converts italic inline formatting', () => {
    const blocks = [
      { type: 'paragraph', content: [
        { type: 'text', text: 'Text with ', styles: {} },
        { type: 'text', text: 'italic', styles: { italic: true } },
      ]},
    ];
    const md = blocksToMarkdown(blocks);
    expect(md).toBe('Text with *italic*');
  });

  it('converts inline code', () => {
    const blocks = [
      { type: 'paragraph', content: [
        { type: 'text', text: 'Use ', styles: {} },
        { type: 'text', text: 'console.log()', styles: { code: true } },
      ]},
    ];
    const md = blocksToMarkdown(blocks);
    expect(md).toBe('Use `console.log()`');
  });

  it('converts links', () => {
    const blocks = [
      { type: 'paragraph', content: [
        { type: 'text', text: 'Visit ', styles: {} },
        { type: 'text', text: 'Example', styles: { link: 'https://example.com' } },
      ]},
    ];
    const md = blocksToMarkdown(blocks);
    expect(md).toBe('Visit [Example](https://example.com)');
  });

  it('converts bullet list items', () => {
    const blocks = [
      { type: 'bulletListItem', content: [{ type: 'text', text: 'Item 1', styles: {} }] },
      { type: 'bulletListItem', content: [{ type: 'text', text: 'Item 2', styles: {} }] },
    ];
    const md = blocksToMarkdown(blocks);
    expect(md).toBe('- Item 1\n- Item 2');
  });

  it('converts numbered list items', () => {
    const blocks = [
      { type: 'numberedListItem', content: [{ type: 'text', text: 'First', styles: {} }] },
      { type: 'numberedListItem', content: [{ type: 'text', text: 'Second', styles: {} }] },
    ];
    const md = blocksToMarkdown(blocks);
    expect(md).toBe('1. First\n2. Second');
  });

  it('converts images', () => {
    const blocks = [
      { type: 'image', props: { url: 'photo.jpg', alt: 'alt text' }, content: undefined as any },
    ];
    const md = blocksToMarkdown(blocks);
    expect(md).toBe('![alt text](photo.jpg)');
  });

  it('converts images without alt', () => {
    const blocks = [
      { type: 'image', props: { url: 'photo.jpg', alt: '' }, content: undefined as any },
    ];
    const md = blocksToMarkdown(blocks);
    expect(md).toBe('![](photo.jpg)');
  });

  it('converts code blocks (paragraph with code style)', () => {
    const blocks = [
      { type: 'paragraph', content: [{ type: 'text', text: 'print("hello")', styles: { code: true } }] },
    ];
    const md = blocksToMarkdown(blocks);
    expect(md).toBe('```\nprint("hello")\n```');
  });

  it('converts horizontal rules', () => {
    const blocks = [
      { type: 'paragraph', content: [{ type: 'text', text: '---', styles: {} }] },
    ];
    const md = blocksToMarkdown(blocks);
    expect(md).toBe('---');
  });

  it('converts dualLang blocks', () => {
    const blocks = [
      { type: 'dualLang', props: { contentEn: 'English summary', contentAr: 'ملخص عربي' } },
    ];
    const md = blocksToMarkdown(blocks);
    expect(md).toBe('**English:** English summary\n\n**Arabic:** ملخص عربي');
  });

  it('converts dualLang with empty English', () => {
    const blocks = [
      { type: 'dualLang', props: { contentEn: '', contentAr: 'ملخص عربي' } },
    ];
    const md = blocksToMarkdown(blocks);
    expect(md).toBe('**Arabic:** ملخص عربي');
  });

  it('converts articleReader block by recursing into blocksJson', () => {
    const innerBlocks = [
      { type: 'heading', props: { level: 2 }, content: [{ type: 'text', text: 'Chapter 1', styles: {} }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'Content here', styles: {} }] },
    ];
    const blocks = [
      { type: 'articleReader', props: {
        blocksJson: JSON.stringify(innerBlocks),
        wordCount: 5,
        readingTime: 1,
        sourceUrl: 'https://example.com',
        isExpanded: true,
        ogTitle: '',
        ogDescription: '',
        ogImage: '',
        ogSiteName: '',
      }},
    ];
    const md = blocksToMarkdown(blocks);
    expect(md).toBe('## Chapter 1\n\nContent here');
  });

  it('converts articleReader with preview card (OG data)', () => {
    const blocks = [
      { type: 'articleReader', props: {
        blocksJson: '[]',
        wordCount: 0,
        readingTime: 0,
        sourceUrl: 'https://example.com',
        isExpanded: true,
        ogTitle: 'Example Title',
        ogDescription: 'An example description',
        ogImage: 'https://example.com/image.jpg',
        ogSiteName: 'Example Site',
      }},
    ];
    const md = blocksToMarkdown(blocks);
    expect(md).toContain('[Example Title](https://example.com)');
    expect(md).toContain('Example Site');
    expect(md).toContain('An example description');
  });

  it('converts highlight block', () => {
    const blocks = [
      { type: 'highlight', props: { selectedText: 'Important text', note: 'My note', color: '#e69819' } },
    ];
    const md = blocksToMarkdown(blocks);
    expect(md).toContain('> Important text');
    expect(md).toContain('My note');
  });

  it('converts highlight without note', () => {
    const blocks = [
      { type: 'highlight', props: { selectedText: 'Important text', note: '', color: '#e69819' } },
    ];
    const md = blocksToMarkdown(blocks);
    expect(md).toBe('> Important text');
  });

  it('converts collapsibleArticle block', () => {
    const blocks = [
      { type: 'collapsibleArticle', props: { content: 'Some article content', wordCount: 3, isExpanded: false } },
    ];
    const md = blocksToMarkdown(blocks);
    expect(md).toBe('Some article content');
  });

  it('converts glossaryTerm inline as bold term with definition', () => {
    const blocks = [
      { type: 'paragraph', content: [
        { type: 'glossaryTerm', props: { term: 'API', definition: 'Application Programming Interface' } },
      ]},
    ];
    const md = blocksToMarkdown(blocks);
    expect(md).toBe('**API**: Application Programming Interface');
  });

  it('skips chat block', () => {
    const blocks = [
      { type: 'heading', props: { level: 2 }, content: [{ type: 'text', text: 'Chat', styles: {} }] },
      { type: 'chat', props: { sessionId: 'abc-123' } },
    ];
    const md = blocksToMarkdown(blocks);
    expect(md).toBe('## Chat');
  });

  it('converts tableHtml block', () => {
    const blocks = [
      { type: 'tableHtml', props: { html: '<table><tr><td>Cell</td></tr></table>' } },
    ];
    const md = blocksToMarkdown(blocks);
    expect(md).toContain('<table>');
  });

  it('converts embed block', () => {
    const blocks = [
      { type: 'embed', props: { url: 'https://youtube.com/watch?v=123' } },
    ];
    const md = blocksToMarkdown(blocks);
    expect(md).toBe('[Embed: https://youtube.com/watch?v=123](https://youtube.com/watch?v=123)');
  });

  it('converts video block', () => {
    const blocks = [
      { type: 'video', props: { url: 'https://example.com/video.mp4' } },
    ];
    const md = blocksToMarkdown(blocks);
    expect(md).toBe('[Video: https://example.com/video.mp4](https://example.com/video.mp4)');
  });

  it('converts audio block', () => {
    const blocks = [
      { type: 'audio', props: { url: 'https://example.com/audio.mp3' } },
    ];
    const md = blocksToMarkdown(blocks);
    expect(md).toBe('[Audio: https://example.com/audio.mp3](https://example.com/audio.mp3)');
  });

  it('converts referenceChip inline', () => {
    const blocks = [
      { type: 'paragraph', content: [
        { type: 'referenceChip', props: { sourceSection: 'Summary', sentence: 'Key point', sourceId: 'ref-1' } },
      ]},
    ];
    const md = blocksToMarkdown(blocks);
    expect(md).toBe('[ref: Summary]');
  });

  it('handles empty blocks array', () => {
    expect(blocksToMarkdown([])).toBe('');
  });

  it('handles Arabic text', () => {
    const blocks = [
      { type: 'heading', props: { level: 1 }, content: [{ type: 'text', text: 'العنوان', styles: {} }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'هذا نص عربي', styles: {} }] },
    ];
    const md = blocksToMarkdown(blocks);
    expect(md).toBe('# العنوان\n\nهذا نص عربي');
  });

  it('converts full bookmark document (round-trip style)', () => {
    const blocks = [
      { type: 'heading', props: { level: 1 }, content: [{ type: 'text', text: 'Test Bookmark', styles: {} }] },
      { type: 'paragraph', content: [
        { type: 'text', text: 'https://example.com', styles: { bold: true } },
      ]},
      { type: 'heading', props: { level: 2 }, content: [{ type: 'text', text: 'Summary', styles: {} }] },
      { type: 'dualLang', props: { contentEn: 'A summary', contentAr: 'ملخص' } },
      { type: 'heading', props: { level: 2 }, content: [{ type: 'text', text: 'Glossary', styles: {} }] },
      { type: 'paragraph', content: [
        { type: 'glossaryTerm', props: { term: 'API', definition: 'Application Programming Interface' } },
      ]},
    ];
    const md = blocksToMarkdown(blocks);
    expect(md).toContain('# Test Bookmark');
    expect(md).toContain('**https://example.com**');
    expect(md).toContain('## Summary');
    expect(md).toContain('**English:** A summary');
    expect(md).toContain('**Arabic:** ملخص');
    expect(md).toContain('## Glossary');
    expect(md).toContain('**API**: Application Programming Interface');
  });
});
