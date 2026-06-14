# Plan 078: Fix word count excluding paragraphs

## Problem

BlockNote blocks can have `content` as either:
- A `string` (e.g., headings, bullet list items)
- An `Array` of inline items (e.g., paragraphs with `{ type: "text", text: "...", styles: {} }`)

The current word count and extracted text logic only handles string content, silently skipping paragraph blocks with inline content arrays. This underestimates word count and produces incomplete extracted text.

## Fix

Add a shared `extractTextFromBlock(b: any): string` helper that extracts text from both formats, then use it in:

1. `src/parser/local-parser.ts` (lines 44–50) — word count
2. `src/services/extract.ts` (lines 82–85) — extracted_text
3. `src/parser/gemini-fallback.ts` (lines 41–46) — word count

## Files to change

- `src/parser/local-parser.ts` — add helper, fix word count extraction
- `src/services/extract.ts` — add helper, fix extracted_text extraction
- `src/parser/gemini-fallback.ts` — add helper, fix word count extraction
- `src/parser/__tests__/local-parser.test.ts` — add test for paragraph word counting
- `plans/README.md` — mark 078 as DONE
