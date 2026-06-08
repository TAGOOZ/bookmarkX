import { describe, it, expect } from 'vitest';
import { parseMDToBlocks } from '../parse-markdown';

describe('parseMDToBlocks', () => {
  it('converts headings h1-h6', () => {
    const md = '# H1\n## H2\n### H3\n#### H4\n##### H5\n###### H6';
    const blocks = parseMDToBlocks(md);
    expect(blocks).toEqual([
      { type: 'heading', props: { level: 1 }, content: 'H1' },
      { type: 'heading', props: { level: 2 }, content: 'H2' },
      { type: 'heading', props: { level: 3 }, content: 'H3' },
      { type: 'heading', props: { level: 4 }, content: 'H4' },
      { type: 'heading', props: { level: 5 }, content: 'H5' },
      { type: 'heading', props: { level: 6 }, content: 'H6' },
    ]);
  });

  it('converts paragraphs', () => {
    const md = 'First paragraph.\n\nSecond paragraph.';
    const blocks = parseMDToBlocks(md);
    expect(blocks).toEqual([
      { type: 'paragraph', content: [{ type: 'text', text: 'First paragraph.', styles: {} }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'Second paragraph.', styles: {} }] },
    ]);
  });

  it('converts bold and italic', () => {
    const md = 'Text with **bold** and *italic*';
    const blocks = parseMDToBlocks(md);
    const content = (blocks[0] as any).content;
    expect(content).toEqual([
      { type: 'text', text: 'Text with ', styles: {} },
      { type: 'text', text: 'bold', styles: { bold: true } },
      { type: 'text', text: ' and ', styles: {} },
      { type: 'text', text: 'italic', styles: { italic: true } },
    ]);
  });

  it('converts inline code', () => {
    const md = 'Use `console.log()` to debug';
    const blocks = parseMDToBlocks(md);
    const content = (blocks[0] as any).content;
    expect(content).toEqual([
      { type: 'text', text: 'Use ', styles: {} },
      { type: 'text', text: 'console.log()', styles: { code: true } },
      { type: 'text', text: ' to debug', styles: {} },
    ]);
  });

  it('converts links', () => {
    const md = 'Visit [Example](https://example.com)';
    const blocks = parseMDToBlocks(md);
    const content = (blocks[0] as any).content;
    expect(content).toEqual([
      { type: 'text', text: 'Visit ', styles: {} },
      { type: 'text', text: 'Example', styles: { link: 'https://example.com' } },
    ]);
  });

  it('converts unordered lists', () => {
    const md = '- Item 1\n- Item 2';
    const blocks = parseMDToBlocks(md);
    expect(blocks).toEqual([
      { type: 'bulletListItem', content: 'Item 1' },
      { type: 'bulletListItem', content: 'Item 2' },
    ]);
  });

  it('converts ordered lists', () => {
    const md = '1. First\n2. Second';
    const blocks = parseMDToBlocks(md);
    expect(blocks).toEqual([
      { type: 'numberedListItem', content: 'First' },
      { type: 'numberedListItem', content: 'Second' },
    ]);
  });

  it('converts code blocks', () => {
    const md = '```python\nprint("hello")\n```';
    const blocks = parseMDToBlocks(md);
    expect(blocks).toEqual([
      { type: 'paragraph', content: [{ type: 'text', text: 'print("hello")', styles: { code: true } }] },
    ]);
  });

  it('converts blockquotes', () => {
    const md = '> A wise quote';
    const blocks = parseMDToBlocks(md);
    expect(blocks).toEqual([
      { type: 'paragraph', content: [{ type: 'text', text: 'A wise quote', styles: { italic: true } }] },
    ]);
  });

  it('converts images', () => {
    const md = '![alt text](photo.jpg)';
    const blocks = parseMDToBlocks(md);
    expect(blocks).toEqual([
      { type: 'image', props: { url: 'photo.jpg', alt: 'alt text' }, content: undefined },
    ]);
  });

  it('converts images without alt', () => {
    const md = '![](photo.jpg)';
    const blocks = parseMDToBlocks(md);
    expect(blocks).toEqual([
      { type: 'image', props: { url: 'photo.jpg', alt: '' }, content: undefined },
    ]);
  });

  it('converts tables', () => {
    const md = '| Col1 | Col2 |\n|------|------|\n| A    | B    |';
    const blocks = parseMDToBlocks(md);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({ type: 'tableHtml' });
    const html = (blocks[0] as any).props.html;
    expect(html).toContain('<table>');
    expect(html).toContain('<th>Col1</th>');
    expect(html).toContain('<td>A</td>');
  });

  it('converts horizontal rules', () => {
    const md = '---';
    const blocks = parseMDToBlocks(md);
    expect(blocks).toEqual([
      { type: 'paragraph', content: [{ type: 'text', text: '---', styles: {} }] },
    ]);
  });

  it('converts embeds', () => {
    const md = '[Embed: https://youtube.com/watch?v=123](https://youtube.com/watch?v=123)';
    const blocks = parseMDToBlocks(md);
    expect(blocks).toEqual([
      { type: 'embed', props: { url: 'https://youtube.com/watch?v=123' }, content: undefined },
    ]);
  });

  it('converts video', () => {
    const md = '[Video: https://example.com/video.mp4](https://example.com/video.mp4)';
    const blocks = parseMDToBlocks(md);
    expect(blocks).toEqual([
      { type: 'video', props: { url: 'https://example.com/video.mp4' }, content: undefined },
    ]);
  });

  it('converts audio', () => {
    const md = '[Audio: https://example.com/audio.mp3](https://example.com/audio.mp3)';
    const blocks = parseMDToBlocks(md);
    expect(blocks).toEqual([
      { type: 'audio', props: { url: 'https://example.com/audio.mp3' }, content: undefined },
    ]);
  });

  it('skips empty lines', () => {
    const md = '\n\nParagraph\n\n\n';
    const blocks = parseMDToBlocks(md);
    expect(blocks).toEqual([
      { type: 'paragraph', content: [{ type: 'text', text: 'Paragraph', styles: {} }] },
    ]);
  });

  it('returns empty array for empty markdown', () => {
    expect(parseMDToBlocks('')).toEqual([]);
  });

  it('handles Arabic text', () => {
    const md = '# العنوان\nهذا نص عربي';
    const blocks = parseMDToBlocks(md);
    expect(blocks).toEqual([
      { type: 'heading', props: { level: 1 }, content: 'العنوان' },
      { type: 'paragraph', content: [{ type: 'text', text: 'هذا نص عربي', styles: {} }] },
    ]);
  });
});
