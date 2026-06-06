export interface ServiceOptions {
  apiKey?: string;
  model?: string;
}

export interface SummarizeResult {
  content_en: string;
  content_ar: string;
}

export interface ExtractResult {
  extracted_text: string;
  word_count: number;
}

export interface EnhanceResult {
  enhanced_text: string;
}

export interface ChatResult {
  response: string;
}
