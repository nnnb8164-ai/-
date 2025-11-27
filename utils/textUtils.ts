
// Specified filler words/phrases to remove
// “啊。”、“啊，”、“嗯，”、“嗯。”、“呃，”、"呃。"、“哎，”、“哎。”
const FILLER_PATTERNS = [
  "啊。", "啊，",
  "嗯，", "嗯。",
  "呃，", "呃。",
  "哎，", "哎。"
];

export const removeFillerWords = (text: string): string => {
  let cleanedText = text;
  FILLER_PATTERNS.forEach(pattern => {
    // Create a global regex to replace all occurrences. 
    // We escape special characters just in case.
    const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedPattern, 'g');
    cleanedText = cleanedText.replace(regex, '');
  });
  return cleanedText;
};

// --- Heuristic Helpers ---
const isPunctuation = (char: string) => /[。！？.!?，,、;；:：]/.test(char);
const isSentenceEnd = (char: string) => /[。！？.!?]/.test(char);
// Common sentence ending particles in Chinese
const SENTENCE_PARTICLES = /[吗呢吧呀]$/; 

/**
 * Preprocess text to merge lines and infer missing punctuation based on context/heuristics.
 */
const preprocessWithHeuristicPunctuation = (text: string): string => {
  // Normalize line endings and split
  const lines = text.split(/\r?\n/);
  let result = '';
  let currentSentenceLength = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const lastChar = trimmed.slice(-1);
    
    // Case 1: Line already has punctuation
    if (isPunctuation(lastChar)) {
      result += trimmed;
      if (isSentenceEnd(lastChar)) {
        currentSentenceLength = 0;
      } else {
        currentSentenceLength += trimmed.length;
      }
    } 
    // Case 2: Line missing punctuation - Infer it
    else {
      let punct = '，'; // Default to comma for flow
      
      // Heuristic A: Explicit sentence ending particle
      if (SENTENCE_PARTICLES.test(trimmed)) {
        punct = '。';
      } 
      // Heuristic B: Length threshold 
      // If the current sentence is getting too long (> 60 chars), force a period to break it up.
      // This enables the "8 sentences per paragraph" logic to actually work on unpunctuated text.
      else if (currentSentenceLength + trimmed.length > 60) {
        punct = '。';
      }

      result += trimmed + punct;
      
      if (punct === '。') {
        currentSentenceLength = 0;
      } else {
        currentSentenceLength += trimmed.length;
      }
    }
  }
  return result;
};

/**
 * Algorithmic formatter (Rule-based)
 * 1. Merges broken lines & infers punctuation.
 * 2. Splits by sentence.
 * 3. Groups every 8 sentences into a paragraph.
 */
export const formatTextAlgorithmic = (text: string): string => {
  if (!text) return '';
  
  // 1. Preprocess: Ensure punctuation and merge lines into a continuous stream
  const rawStream = preprocessWithHeuristicPunctuation(text);
  
  // 2. Split by punctuation to identify sentences.
  // Matches: 。 ！ ？ . ! ?
  const sentenceRegex = /([。！？.!?]+)/;
  const parts = rawStream.split(sentenceRegex);
  
  const sentences: string[] = [];
  // Reassemble [content, delim, content, delim...] -> [content+delim, content+delim...]
  for (let i = 0; i < parts.length; i += 2) {
    const part = parts[i];
    const delim = parts[i + 1] || '';
    // Filter out empty parts but keep meaningful whitespace if inside a sentence
    if (part || delim) {
      sentences.push(part + delim);
    }
  }
  
  // 3. Group by 8 sentences
  const PARAGRAPH_SIZE = 8;
  const paragraphs: string[] = [];
  let chunk: string[] = [];
  
  sentences.forEach(s => {
    if(!s.trim()) return;
    chunk.push(s);
    if (chunk.length >= PARAGRAPH_SIZE) {
      paragraphs.push(chunk.join(''));
      chunk = [];
    }
  });
  
  if (chunk.length > 0) {
    paragraphs.push(chunk.join(''));
  }
  
  return paragraphs.join('\n\n');
};

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 9);
};

export const downloadFile = (filename: string, content: string) => {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
