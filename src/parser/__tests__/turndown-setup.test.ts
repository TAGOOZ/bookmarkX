import { describe, it, expect } from 'vitest';
import { createTurndownService } from '../turndown-setup';

describe('createTurndownService', () => {
  it('converts basic HTML to markdown', () => {
    const td = createTurndownService();
    const md = td.turndown('<h1>Title</h1><p>Paragraph</p>');
    expect(md).toContain('# Title');
    expect(md).toContain('Paragraph');
  });

  it('converts iframes to embed links', () => {
    const td = createTurndownService();
    const md = td.turndown('<iframe src="https://youtube.com/embed/123"></iframe>');
    expect(md).toBe('[Embed: https://youtube.com/embed/123](https://youtube.com/embed/123)');
  });

  it('converts video to video links', () => {
    const td = createTurndownService();
    const md = td.turndown('<video src="movie.mp4"></video>');
    expect(md).toBe('[Video: movie.mp4](movie.mp4)');
  });

  it('converts video with source element', () => {
    const td = createTurndownService();
    const md = td.turndown('<video><source src="movie.mp4"></video>');
    expect(md).toBe('[Video: movie.mp4](movie.mp4)');
  });

  it('converts audio to audio links', () => {
    const td = createTurndownService();
    const md = td.turndown('<audio src="song.mp3"></audio>');
    expect(md).toBe('[Audio: song.mp3](song.mp3)');
  });

  it('removes nav, footer, header, aside elements', () => {
    const td = createTurndownService();
    const md = td.turndown('<nav>Navigation</nav><p>Content</p><footer>Footer</footer>');
    expect(md).not.toContain('Navigation');
    expect(md).not.toContain('Footer');
    expect(md).toContain('Content');
  });

  it('converts figure content', () => {
    const td = createTurndownService();
    const md = td.turndown('<figure><img src="pic.jpg" alt="A picture"><figcaption>Caption</figcaption></figure>');
    expect(md).toContain('Caption');
  });

  it('converts bold and italic', () => {
    const td = createTurndownService();
    const md = td.turndown('<p><strong>Bold</strong> and <em>italic</em></p>');
    expect(md).toContain('**Bold**');
    expect(md).toContain('*italic*');
  });

  it('converts links', () => {
    const td = createTurndownService();
    const md = td.turndown('<p><a href="https://example.com">Example</a></p>');
    expect(md).toContain('[Example](https://example.com)');
  });

  it('converts code blocks', () => {
    const td = createTurndownService();
    const md = td.turndown('<pre><code>const x = 1;</code></pre>');
    expect(md).toContain('const x = 1;');
  });

  it('removes script and style tags', () => {
    const td = createTurndownService();
    const md = td.turndown('<script>alert("xss")</script><style>.red{color:red}</style><p>Content</p>');
    expect(md).not.toContain('alert');
    expect(md).not.toContain('color:red');
    expect(md).toContain('Content');
  });
});
