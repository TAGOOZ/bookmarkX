export interface ClassificationResult {
  priority: 'high' | 'medium' | 'low';
  topic: string;
  hashtags: string[];
  reading_time_min: number;
}

export interface ClassifierOptions {
  apiKey?: string;
  model?: string;
}
