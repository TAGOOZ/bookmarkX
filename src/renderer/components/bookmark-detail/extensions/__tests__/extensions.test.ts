import { describe, it, expect } from 'vitest';
import { createCollapsibleArticleBlock } from '../CollapsibleArticleBlock';
import { createChatBlock } from '../ChatBlock';
import { createHighlightBlock } from '../HighlightBlock';
import { createGlossaryTermInline } from '../GlossaryTermInline';
import { createReferenceChipInline } from '../ReferenceChipInline';

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

describe('ChatBlock', () => {
  const block = createChatBlock();

  it('has correct type', () => {
    expect(block.config.type).toBe('chat');
  });

  it('has content mode none', () => {
    expect(block.config.content).toBe('none');
  });

  it('has sessionId prop', () => {
    expect(block.config.propSchema.sessionId).toBeDefined();
    expect((block.config.propSchema.sessionId as any).default).toBe('');
  });
});

describe('HighlightBlock', () => {
  const block = createHighlightBlock();

  it('has correct type', () => {
    expect(block.config.type).toBe('highlight');
  });

  it('has content mode none', () => {
    expect(block.config.content).toBe('none');
  });

  it('has selectedText, note, and color props', () => {
    const props = block.config.propSchema;
    expect(props.selectedText).toBeDefined();
    expect(props.note).toBeDefined();
    expect(props.color).toBeDefined();
    expect((props.selectedText as any).default).toBe('');
    expect((props.note as any).default).toBe('');
    expect((props.color as any).default).toBe('#e69819');
  });
});

describe('GlossaryTermInline', () => {
  const ic = createGlossaryTermInline();

  it('has correct type', () => {
    expect(ic.config.type).toBe('glossaryTerm');
  });

  it('has content mode none', () => {
    expect(ic.config.content).toBe('none');
  });

  it('has term and definition props', () => {
    expect(ic.config.propSchema.term).toBeDefined();
    expect(ic.config.propSchema.definition).toBeDefined();
  });
});

describe('ReferenceChipInline', () => {
  const ic = createReferenceChipInline();

  it('has correct type', () => {
    expect(ic.config.type).toBe('referenceChip');
  });

  it('has content mode none', () => {
    expect(ic.config.content).toBe('none');
  });

  it('has sourceSection, sentence, sourceId props', () => {
    const props = ic.config.propSchema;
    expect(props.sourceSection).toBeDefined();
    expect(props.sentence).toBeDefined();
    expect(props.sourceId).toBeDefined();
  });
});
