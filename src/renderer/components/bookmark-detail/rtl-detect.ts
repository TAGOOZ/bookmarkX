export const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

export function isArabic(text: string): boolean {
  return ARABIC_RE.test(text);
}

export function detectDir(bookmark: { title?: string; content?: string; summary?: string }): string {
  if (bookmark.title && isArabic(bookmark.title)) return 'rtl';
  if (bookmark.content && isArabic(bookmark.content)) return 'rtl';
  if (bookmark.summary && isArabic(bookmark.summary)) return 'rtl';
  return 'ltr';
}
