
export enum BackgroundType {
  METEOR = '流星',
  GALAXY = '璀璨银河',
  AURORA = '北极极光'
}

export enum FileStatus {
  IDLE = 'idle',
  READING = 'reading',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  ERROR = 'error'
}

export interface ProcessedFile {
  id: string;
  originalName: string;
  originalContent: string;
  processedContent: string | null;
  status: FileStatus;
  errorMessage?: string;
  processingDetail?: string;
}

export type AIProvider = 'gemini' | 'custom';

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;      // Only used for custom
  baseUrl: string;     // Only used for custom
  model: string;       // Only used for custom
  targetParagraphLength?: number; // Target length for paragraphs (300-500)
}

export interface AppConfig {
  removeFillerWords: boolean;
  background: BackgroundType;
}
