/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { createDualLangBlock } from '../DualLangBlock';

describe('DualLangBlock config', () => {
  const block = createDualLangBlock();

  it('has correct type', () => {
    expect(block.config.type).toBe('dualLang');
  });

  it('has content mode none', () => {
    expect(block.config.content).toBe('none');
  });

  it('has contentEn and contentAr props with empty defaults', () => {
    const props = block.config.propSchema;
    expect(props.contentEn).toBeDefined();
    expect(props.contentAr).toBeDefined();
    expect((props.contentEn as any).default).toBe('');
    expect((props.contentAr as any).default).toBe('');
  });
});
