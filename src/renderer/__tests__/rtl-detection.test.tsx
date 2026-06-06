/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { isArabic, detectDir } from '../components/bookmark-detail/rtl-detect';

describe('isArabic', () => {
  it('returns true for Arabic text', () => {
    expect(isArabic('مرحبا بالعالم')).toBe(true);
  });

  it('returns true for Arabic text with diacritics', () => {
    expect(isArabic('مَرْحَبًا')).toBe(true);
  });

  it('returns false for English text', () => {
    expect(isArabic('Hello World')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isArabic('')).toBe(false);
  });

  it('returns true for mixed text containing Arabic', () => {
    expect(isArabic('Hello مرحبا World')).toBe(true);
  });

  it('returns true for Arabic numbers', () => {
    expect(isArabic('١٢٣')).toBe(true);
  });

  it('returns false for numbers only', () => {
    expect(isArabic('12345')).toBe(false);
  });

  it('returns true for Arabic punctuation', () => {
    expect(isArabic('؟')).toBe(true);
  });
});

describe('detectDir', () => {
  it('returns rtl for Arabic title', () => {
    expect(detectDir({ title: 'مقال عن الذكاء الاصطناعي' })).toBe('rtl');
  });

  it('returns ltr for English title', () => {
    expect(detectDir({ title: 'AI Article' })).toBe('ltr');
  });

  it('returns rtl for Arabic content', () => {
    expect(detectDir({ title: 'English', content: 'محتوى عربي' })).toBe('rtl');
  });

  it('returns rtl for Arabic summary', () => {
    expect(detectDir({ title: 'English', content: 'English content', summary: 'ملخص عربي' })).toBe('rtl');
  });

  it('returns ltr when all fields are English', () => {
    expect(detectDir({ title: 'Title', content: 'Content', summary: 'Summary' })).toBe('ltr');
  });

  it('returns ltr when all fields are empty', () => {
    expect(detectDir({ title: '', content: '', summary: '' })).toBe('ltr');
  });

  it('returns ltr when no fields provided', () => {
    expect(detectDir({})).toBe('ltr');
  });

  it('returns rtl when only summary is Arabic', () => {
    expect(detectDir({ title: 'English Title', content: 'English content', summary: 'ملخص بالعربي' })).toBe('rtl');
  });
});
