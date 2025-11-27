
import { GoogleGenAI } from "@google/genai";
import { AIConfig } from "../types";

// Initialize the default Gemini client (uses System Env Key)
// Note: This is only used if provider is 'gemini'
const defaultAi = new GoogleGenAI({ apiKey: process.env.API_KEY });

const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

// --- System Instructions ---

const BASE_INSTRUCTION = `
你是一位专业的字幕排版专家。你的任务是处理移除时间轴后的字幕文本。
核心目标：将破碎的字幕行重组为通顺、可读的段落，同时进行排版优化和语气词过滤。

核心处理任务：
1. **排版优化**：
   - 将破碎的行（半句）根据语义合并为完整的句子。
   - 修正标点符号，确保使用全角符号。
   - 优化段落结构，保持阅读流畅。

2. **语气词过滤**：
   - 删除明确无意义的填充词（仅限“嗯”、“啊”、“呃”）。
   - **必须保留**具有情感色彩、迟疑、肯定或对语境有帮助的语气词。

3. **内容完整性**：
   - 严禁删改实质性对话内容。
   - 严禁进行非必要的改写或润色。
   - 严禁添加任何原文不存在的标题、章节或总结。
`;

const getStandardModeInstruction = (targetLength: number) => `
${BASE_INSTRUCTION}

4. **标准模式补充**：
   - 在合并长句时，尽量使段落长度保持均衡（建议${targetLength}字左右，允许浮动）。
   - 对于情绪饱满或主旨突出的短句，允许单独成行。
`;

const CONSERVATIVE_MODE_INSTRUCTION = `
${BASE_INSTRUCTION}

4. **保守重处理模式规则（最高优先级）**：
   - **字符保留率目标**：必须确保输出内容的字符数量极高（>=95%）。
   - **极简过滤**：仅当绝对确定“嗯、啊、呃”完全无意义时才删除，否则一律保留。
   - **排版优先**：主要工作是合并断行和修复标点，不要过度调整段落结构。
   - **宁滥勿缺**：任何不确定的内容一律保留原样。
`;

// --- Configuration ---
const CHUNK_SIZE_SENTENCES = 10;
const SEGMENT_RETENTION_THRESHOLD = 0.90; // 90%
const GLOBAL_RETENTION_THRESHOLD = 0.85;  // 85%

// --- Helper Functions ---

/**
 * Split text into chunks of approximately N sentences.
 */
const splitTextIntoChunks = (text: string, sentencesPerChunk: number = CHUNK_SIZE_SENTENCES): string[] => {
  const sentenceEndings = /([。.!！?？]+)/;
  const parts = text.split(sentenceEndings);
  
  const sentences: string[] = [];
  for (let i = 0; i < parts.length; i += 2) {
    const content = parts[i];
    const delimiter = parts[i + 1] || '';
    if (content.trim() || delimiter) {
      sentences.push(content + delimiter);
    }
  }

  // Fallback for low punctuation
  if (sentences.length < Math.max(3, text.length / 500)) {
     const lines = text.split('\n');
     const chunks: string[] = [];
     let currentChunk = '';
     let lineCount = 0;
     const LINES_PER_CHUNK = 15;

     for (const line of lines) {
       currentChunk += line + '\n';
       lineCount++;
       if (lineCount >= LINES_PER_CHUNK) {
         chunks.push(currentChunk);
         currentChunk = '';
         lineCount = 0;
       }
     }
     if (currentChunk) chunks.push(currentChunk);
     return chunks;
  }

  const chunks: string[] = [];
  let currentChunk = '';
  let count = 0;

  for (const sentence of sentences) {
    currentChunk += sentence;
    count++;
    if (count >= sentencesPerChunk || currentChunk.length > 800) {
      chunks.push(currentChunk);
      currentChunk = '';
      count = 0;
    }
  }
  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
};

const calculateRetentionRate = (input: string, output: string): number => {
  if (!input) return 1;
  const cleanInput = input.replace(/\s/g, '');
  const cleanOutput = output.replace(/\s/g, '');
  if (cleanInput.length === 0) return 1;
  return cleanOutput.length / cleanInput.length;
};

// --- Provider Callers ---

/**
 * Call standard Gemini API
 */
const callGeminiAPI = async (text: string, instruction: string, temp: number): Promise<string> => {
  const response = await defaultAi.models.generateContent({
    model: DEFAULT_GEMINI_MODEL,
    contents: text,
    config: {
      systemInstruction: instruction,
      temperature: temp,
    },
  });
  return response.text || '';
};

/**
 * Construct valid endpoint from Base URL
 */
const constructEndpoint = (baseUrl: string, suffix: string): string => {
  let url = baseUrl.replace(/\/$/, ''); // Remove trailing slash
  
  if (url.endsWith('/v1')) {
    // If user provided .../v1, we assume that's the root
    return `${url}${suffix}`;
  } else if (url.includes('/chat/completions') && suffix.includes('/chat/completions')) {
      // User provided full endpoint
      return url;
  }
  
  // Default: assume we need to append /v1 if not present, or just append suffix
  // Many providers use https://api.xxx.com/v1/...
  return `${url}/v1${suffix}`;
};


/**
 * Call OpenAI-Compatible API (Custom Provider)
 */
const callOpenAICompatible = async (text: string, instruction: string, temp: number, config: AIConfig): Promise<string> => {
  if (!config.apiKey || !config.baseUrl) {
    throw new Error("Missing API Key or Base URL for custom provider");
  }

  // Robust endpoint construction
  let endpoint = config.baseUrl.replace(/\/$/, '');
  if (endpoint.endsWith('/chat/completions')) {
      // User entered full URL
  } else if (endpoint.endsWith('/v1')) {
      endpoint = `${endpoint}/chat/completions`;
  } else {
      // Try standard
      endpoint = `${endpoint}/v1/chat/completions`;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: config.model || 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: instruction },
        { role: 'user', content: text }
      ],
      temperature: temp,
      stream: false
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Custom API Error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
};

/**
 * Test API Connection
 */
export const testConnection = async (config: AIConfig): Promise<{ success: boolean; models?: string[]; message?: string }> => {
  if (config.provider === 'gemini') {
    try {
      // Test default Gemini connection by generating a tiny token
      await defaultAi.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: 'ping',
      });
      
      // Return hardcoded list of known models since standard API key often lacks list_models scope
      return { 
        success: true, 
        message: "Gemini 服务连接正常",
        models: [
          "gemini-2.5-flash",
          "gemini-2.5-flash-lite",
          "gemini-2.5-pro",
          "gemini-2.0-flash-exp"
        ] 
      };
    } catch (e: any) {
      console.error("Gemini Test Error", e);
      return { success: false, message: "Gemini 连接失败: " + (e.message || "未知错误") };
    }
  } else {
    // Custom Provider (OpenAI Compatible)
    if (!config.apiKey || !config.baseUrl) {
      return { success: false, message: "请先填写 API Key 和 Base URL" };
    }

    try {
      let baseUrl = config.baseUrl.replace(/\/$/, '');
      let modelsUrl = '';
      
      // Try to determine the models endpoint intelligently
      if (baseUrl.endsWith('/v1')) {
        modelsUrl = `${baseUrl}/models`;
      } else if (baseUrl.endsWith('/chat/completions')) {
         modelsUrl = baseUrl.replace('/chat/completions', '/models');
      } else if (baseUrl.endsWith('/v1/chat/completions')) {
         modelsUrl = baseUrl.replace('/chat/completions', '/models');
      } else {
        modelsUrl = `${baseUrl}/v1/models`;
      }

      console.log("Testing connection to:", modelsUrl);

      const response = await fetch(modelsUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        // Fallback: If /v1/models failed, try just /models (some local inference servers use this)
        if (modelsUrl.includes('/v1/models')) {
            const fallbackUrl = modelsUrl.replace('/v1/models', '/models');
            console.log("Retrying with fallback:", fallbackUrl);
            const fallbackResponse = await fetch(fallbackUrl, {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${config.apiKey}`,
                  'Content-Type': 'application/json'
                }
            });
            if (fallbackResponse.ok) {
                const data = await fallbackResponse.json();
                if (Array.isArray(data.data)) {
                     const modelIds = data.data.map((m: any) => m.id);
                     return { success: true, message: `连接成功 (Fallback)! 发现 ${modelIds.length} 个模型`, models: modelIds };
                }
            }
        }

        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
      }

      const data = await response.json();
      
      // OpenAI format: { data: [{ id: "..." }, ...] }
      if (Array.isArray(data.data)) {
         const modelIds = data.data.map((m: any) => m.id);
         return {
            success: true,
            message: `连接成功! 发现 ${modelIds.length} 个模型`,
            models: modelIds
         };
      } else {
         return { success: false, message: "连接成功，但无法解析模型列表格式" };
      }

    } catch (e: any) {
      console.error("Custom API Test Error", e);
      return { success: false, message: "连接失败: " + (e.message || "网络错误") };
    }
  }
};

// --- Core Logic ---

/**
 * Process a single segment with retry logic (Layer 1 Quality Control)
 */
const processSegment = async (
  segment: string, 
  isConservativeGlobal: boolean, 
  config: AIConfig
): Promise<string> => {
  if (!segment.trim()) return '';

  const targetLength = config.targetParagraphLength || 400;

  const invokeAI = async (mode: 'standard' | 'conservative') => {
    // Generate instruction dynamically based on length preference
    const instruction = mode === 'standard' 
      ? getStandardModeInstruction(targetLength) 
      : CONSERVATIVE_MODE_INSTRUCTION;
      
    const temp = mode === 'standard' ? 0.3 : 0.1;

    if (config.provider === 'custom') {
      return callOpenAICompatible(segment, instruction, temp, config);
    } else {
      return callGeminiAPI(segment, instruction, temp);
    }
  };

  // 1. Initial Attempt
  const initialMode = isConservativeGlobal ? 'conservative' : 'standard';
  let result = await invokeAI(initialMode);

  // 2. Layer 1 Quality Check: Segment Retention
  const retention = calculateRetentionRate(segment, result);
  
  if (retention < SEGMENT_RETENTION_THRESHOLD && initialMode === 'standard') {
    console.warn(`Segment retention low (${(retention*100).toFixed(1)}%). Retrying in Conservative Mode.`);
    const retryResult = await invokeAI('conservative');
    return retryResult;
  }

  return result;
};

// Semaphore for concurrency control (prevent 429 errors on custom APIs)
class Semaphore {
  private tasks: (() => void)[] = [];
  constructor(public count: number) {}

  acquire(): Promise<void> {
    if (this.count > 0) {
      this.count--;
      return Promise.resolve();
    }
    return new Promise((resolve) => this.tasks.push(resolve));
  }

  release() {
    this.count++;
    if (this.tasks.length > 0) {
      this.count--;
      const next = this.tasks.shift();
      if (next) next();
    }
  }
}

/**
 * Main Processing Function (Orchestrator)
 */
export const processText = async (
  text: string, 
  config: AIConfig,
  onProgress?: (msg: string) => void
): Promise<string> => {
  try {
    // Step 1: Segmentation
    if (onProgress) onProgress("正在分析文档结构与分段...");
    const chunks = splitTextIntoChunks(text);
    console.log(`[${config.provider}] Split text into ${chunks.length} chunks.`);

    // Step 2: Process Chunks with Concurrency Control
    const semaphore = new Semaphore(5); // Max 5 concurrent requests
    const processedChunks: string[] = new Array(chunks.length);
    let completedCount = 0;

    const processTask = async (chunk: string, index: number, isRetry: boolean) => {
       await semaphore.acquire();
       try {
          const result = await processSegment(chunk, isRetry, config);
          processedChunks[index] = result;
          completedCount++;
          if (onProgress) {
             const percent = Math.round((completedCount / chunks.length) * 100);
             onProgress(isRetry 
               ? `保守模式重处理: ${percent}%` 
               : `AI 智能排版中: ${percent}%`);
          }
       } finally {
          semaphore.release();
       }
    };

    // Initial Pass
    await Promise.all(chunks.map((chunk, idx) => processTask(chunk, idx, false)));
    
    let finalOutput = processedChunks.join('\n\n');

    // Step 3: Layer 2 Quality Check: Global Retention
    const globalRetention = calculateRetentionRate(text, finalOutput);
    console.log(`Global Retention Rate: ${(globalRetention * 100).toFixed(2)}%`);

    // Step 4: Conservative Reprocessing Trigger
    if (globalRetention < GLOBAL_RETENTION_THRESHOLD) {
      console.warn("Global retention below threshold. Triggering Global Conservative Reprocessing.");
      if (onProgress) onProgress("检测到内容丢失，正在启动无损模式重处理...");
      
      // Reset counters for re-run
      completedCount = 0;
      await Promise.all(chunks.map((chunk, idx) => processTask(chunk, idx, true)));
      finalOutput = processedChunks.join('\n\n');
    }

    return finalOutput;

  } catch (error) {
    console.error("AI Processing Error:", error);
    throw error;
  }
};
