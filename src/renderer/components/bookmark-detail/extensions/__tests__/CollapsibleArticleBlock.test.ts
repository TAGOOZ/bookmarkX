import { describe, it, expect } from 'vitest';
import { createCollapsibleArticleBlock } from '../CollapsibleArticleBlock';

describe('CollapsibleArticleBlock', () => {
  const block = createCollapsibleArticleBlock();

  it('has correct type', () => {
    expect(block.config.type).toBe('collapsibleArticle');
  });

  it('has content mode none', () => {
    expect(block.config.content).toBe('none');
  });

  it('has content and wordCount props', () => {
    const props = block.config.propSchema;
    expect(props.content).toBeDefined();
    expect(props.wordCount).toBeDefined();
    expect((props.content as any).default).toBe('');
    expect((props.wordCount as any).default).toBe(0);
  });

  it('has isExpanded prop defaulting to false', () => {
    const props = block.config.propSchema;
    expect(props.isExpanded).toBeDefined();
    expect((props.isExpanded as any).default).toBe(false);
  });
});
