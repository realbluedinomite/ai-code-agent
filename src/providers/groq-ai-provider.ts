/**
 * Groq AI Provider Implementation
 * 
 * This provider integrates with Groq's API to provide fast inference for LLM models.
 * It implements text completion, chat completion, and code generation capabilities
 * with proper error handling, rate limiting, and request optimization.
 */

import Groq from 'groq-sdk';
import {
  BaseAIProvider,
  AIProviderError,
  TextCompletionConfig,
  TextCompletionResponse,
  ChatCompletionConfig,
  ChatCompletionResponse,
  CodeGenerationConfig,
  CodeGenerationResponse,
  ChatMessage,
  ModelInfo,
  StreamingCallback,
} from './ai-provider';

/**
 * Groq AI Provider configuration
 */
export interface GroqProviderConfig {
  /** Groq API key */
  apiKey: string;
  /** Groq API base URL (optional) */
  baseURL?: string;
  /** Default model for text completion */
  defaultTextModel?: string;
  /** Default model for chat completion */
  defaultChatModel?: string;
  /** Default model for code generation */
  defaultCodeModel?: string;
  /** Maximum tokens to generate (default: 1024) */
  maxTokens?: number;
  /** Temperature for sampling (default: 0.7) */
  temperature?: number;
  /** Top-p for nucleus sampling (default: 1) */
  topP?: number;
  /** Whether to enable streaming (default: false) */
  enableStreaming?: boolean;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
}

/**
 * Groq-specific chat message format
 */
interface GroqChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Groq API response format
 */
interface GroqAPIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: GroqChatMessage;
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Rate limiter for managing Groq API calls
 */
class GroqRateLimiter {
  private requestCount: number = 0;
  private lastReset: number = Date.now();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number = 100, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  canMakeRequest(): boolean {
    const now = Date.now();
    if (now - this.lastReset >= this.windowMs) {
      this.requestCount = 0;
      this.lastReset = now;
    }
    return this.requestCount < this.maxRequests;
  }

  recordRequest(): void {
    this.requestCount++;
  }

  getRemainingRequests(): number {
    const now = Date.now();
    if (now - this.lastReset >= this.windowMs) {
      this.requestCount = 0;
      this.lastReset = now;
    }
    return Math.max(0, this.maxRequests - this.requestCount);
  }

  getTimeUntilReset(): number {
    const now = Date.now();
    return Math.max(0, this.windowMs - (now - this.lastReset));
  }
}

/**
 * Groq AI Provider implementation
 */
export class GroqAIProvider extends BaseAIProvider {
  readonly name = 'Groq';
  readonly version = '1.0.0';
  readonly defaultTextModel = 'mixtral-8x7b-32768';
  readonly defaultChatModel = 'llama2-70b-4096';
  readonly defaultCodeModel = 'codellama-34b-4096';

  private groqClient: Groq | null = null;
  private rateLimiter: GroqRateLimiter;
  private config: GroqProviderConfig | null = null;

  constructor(customConfig?: Partial<GroqProviderConfig>) {
    super();
    this.rateLimiter = new GroqRateLimiter();
    
    // Apply default configuration
    if (customConfig) {
      this.config = {
        defaultTextModel: this.defaultTextModel,
        defaultChatModel: this.defaultChatModel,
        defaultCodeModel: this.defaultCodeModel,
        maxTokens: 1024,
        temperature: 0.7,
        topP: 1,
        enableStreaming: false,
        timeout: 30000,
        ...customConfig,
      };
    }
  }

  /**
   * Initialize the Groq provider
   */
  async initialize(config: GroqProviderConfig): Promise<void> {
    try {
      this.config = {
        defaultTextModel: this.defaultTextModel,
        defaultChatModel: this.defaultChatModel,
        defaultCodeModel: this.defaultCodeModel,
        maxTokens: 1024,
        temperature: 0.7,
        topP: 1,
        enableStreaming: false,
        timeout: 30000,
        ...config,
      };

      this.validateConfig(this.config);

      // Initialize Groq client
      this.groqClient = new Groq({
        apiKey: this.config.apiKey,
        baseURL: this.config.baseURL,
      });

      // Validate API key by making a test request
      await this.validateApiKey();
    } catch (error) {
      throw new AIProviderError(
        `Failed to initialize Groq provider: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'INITIALIZATION_FAILED'
      );
    }
  }

  /**
   * Validate the Groq API key
   */
  async validateApiKey(): Promise<boolean> {
    if (!this.groqClient || !this.config) {
      throw AIProviderError.invalidApiKey('Provider not initialized');
    }

    try {
      // Make a minimal request to validate the API key
      const response = await this.groqClient.chat.completions.create({
        messages: [{ role: 'user', content: 'Hi' }],
        model: this.config.defaultChatModel,
        max_tokens: 1,
        temperature: 0,
      });

      return true;
    } catch (error: any) {
      if (error.status === 401 || error.status === 403) {
        throw AIProviderError.invalidApiKey();
      }
      throw new AIProviderError(
        `API key validation failed: ${error.message || 'Unknown error'}`,
        'API_KEY_VALIDATION_FAILED'
      );
    }
  }

  /**
   * Complete text using Groq
   */
  async completeText(config: TextCompletionConfig): Promise<TextCompletionResponse> {
    this.ensureInitialized();

    const startTime = Date.now();
    
    try {
      this.validateRequest(config);
      this.checkRateLimit();

      const groqConfig = {
        model: config.model || this.config!.defaultTextModel!,
        prompt: config.prompt,
        suffix: config.suffix,
        max_tokens: config.maxTokens || this.config!.maxTokens!,
        temperature: config.temperature || this.config!.temperature!,
        top_p: config.topP || this.config!.topP!,
        stop: config.stop,
      };

      const response = await this.groqClient!.chat.completions.create({
        messages: [
          { role: 'user', content: groqConfig.prompt }
        ],
        model: groqConfig.model,
        max_tokens: groqConfig.max_tokens,
        temperature: groqConfig.temperature,
        top_p: groqConfig.top_p,
        stop: groqConfig.stop,
      });

      this.rateLimiter.recordRequest();
      
      const result = this.processChatResponse(response);
      const responseTime = Date.now() - startTime;
      
      this.updateStats(responseTime, result.usage?.total || 0);

      return {
        content: result.message.content,
        text: result.message.content,
        usage: result.usage,
        model: result.model,
        responseTime,
        metadata: {
          provider: this.name,
          providerVersion: this.version,
        },
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      this.updateStats(responseTime, 0, true);
      throw this.handleGroqError(error);
    }
  }

  /**
   * Complete a chat conversation using Groq
   */
  async completeChat(config: ChatCompletionConfig): Promise<ChatCompletionResponse> {
    this.ensureInitialized();

    const startTime = Date.now();
    
    try {
      this.validateChatRequest(config);
      this.checkRateLimit();

      const groqMessages = this.convertToGroqMessages(config.messages);
      
      const response = await this.groqClient!.chat.completions.create({
        messages: groqMessages,
        model: config.model || this.config!.defaultChatModel!,
        max_tokens: config.maxTokens || this.config!.maxTokens!,
        temperature: config.temperature || this.config!.temperature!,
        top_p: config.topP || this.config!.topP!,
        stop: config.stop,
        stream: config.stream || false,
      });

      this.rateLimiter.recordRequest();
      
      const result = this.processChatResponse(response);
      const responseTime = Date.now() - startTime;
      
      this.updateStats(responseTime, result.usage?.total || 0);

      return {
        content: result.message.content,
        message: result.message,
        choices: result.choices,
        usage: result.usage,
        model: result.model,
        responseTime,
        metadata: {
          provider: this.name,
          providerVersion: this.version,
        },
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      this.updateStats(responseTime, 0, true);
      throw this.handleGroqError(error);
    }
  }

  /**
   * Generate code using Groq
   */
  async generateCode(config: CodeGenerationConfig): Promise<CodeGenerationResponse> {
    this.ensureInitialized();

    const startTime = Date.now();
    
    try {
      this.validateCodeRequest(config);
      this.checkRateLimit();

      // Create a specialized prompt for code generation
      const codePrompt = this.buildCodePrompt(config);
      
      const groqConfig = {
        model: config.model || this.config!.defaultCodeModel!,
        prompt: codePrompt,
        max_tokens: config.maxTokens || this.config!.maxTokens!,
        temperature: config.temperature || this.config!.temperature!,
        top_p: config.topP || this.config!.topP!,
        stop: config.stop,
      };

      const response = await this.groqClient!.chat.completions.create({
        messages: [
          { role: 'user', content: groqConfig.prompt }
        ],
        model: groqConfig.model,
        max_tokens: groqConfig.max_tokens,
        temperature: groqConfig.temperature,
        top_p: groqConfig.top_p,
        stop: groqConfig.stop,
      });

      this.rateLimiter.recordRequest();
      
      const result = this.processChatResponse(response);
      const responseTime = Date.now() - startTime;
      
      this.updateStats(responseTime, result.usage?.total || 0);

      // Extract code from the response
      const { code, explanation } = this.extractCodeAndExplanation(result.message.content);
      
      return {
        content: code,
        code,
        language: config.language || 'typescript',
        explanation,
        usage: result.usage,
        model: result.model,
        responseTime,
        qualityScore: this.estimateCodeQuality(code),
        metadata: {
          provider: this.name,
          providerVersion: this.version,
        },
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      this.updateStats(responseTime, 0, true);
      throw this.handleGroqError(error);
    }
  }

  /**
   * Stream chat completion response
   */
  async streamChatCompletion(
    config: ChatCompletionConfig,
    onChunk: (chunk: ChatCompletionResponse) => void,
    onError?: (error: AIProviderError) => void
  ): Promise<void> {
    this.ensureInitialized();

    try {
      this.validateChatRequest(config);
      this.checkRateLimit();

      const groqMessages = this.convertToGroqMessages(config.messages);
      
      const stream = await this.groqClient!.chat.completions.create({
        messages: groqMessages,
        model: config.model || this.config!.defaultChatModel!,
        max_tokens: config.maxTokens || this.config!.maxTokens!,
        temperature: config.temperature || this.config!.temperature!,
        top_p: config.topP || this.config!.topP!,
        stop: config.stop,
        stream: true,
      });

      this.rateLimiter.recordRequest();

      for await (const chunk of stream) {
        if (chunk.choices?.[0]?.delta?.content) {
          const chunkResponse: ChatCompletionResponse = {
            content: chunk.choices[0].delta.content,
            message: {
              role: 'assistant',
              content: chunk.choices[0].delta.content,
            },
            model: chunk.model,
            metadata: {
              provider: this.name,
              providerVersion: this.version,
            },
          };
          
          onChunk(chunkResponse);
        }
      }
    } catch (error: any) {
      const groqError = this.handleGroqError(error);
      if (onError) {
        onError(groqError);
      } else {
        throw groqError;
      }
    }
  }

  /**
   * Get available Groq models
   */
  async getAvailableModels(): Promise<ModelInfo[]> {
    this.ensureInitialized();

    return [
      {
        id: 'mixtral-8x7b-32768',
        name: 'Mixtral-8x7B',
        description: 'Fast inference model for general tasks',
        contextLength: 32768,
        maxOutputTokens: 1024,
        supports: {
          textCompletion: true,
          chatCompletion: true,
          codeGeneration: true,
          streaming: true,
        },
      },
      {
        id: 'llama2-70b-4096',
        name: 'Llama 2 70B',
        description: 'Meta Llama 2 70B model for chat and text completion',
        contextLength: 4096,
        maxOutputTokens: 1024,
        supports: {
          textCompletion: true,
          chatCompletion: true,
          codeGeneration: true,
          streaming: true,
        },
      },
      {
        id: 'codellama-34b-4096',
        name: 'Code Llama 34B',
        description: 'Specialized model for code generation and completion',
        contextLength: 4096,
        maxOutputTokens: 1024,
        supports: {
          textCompletion: true,
          chatCompletion: true,
          codeGeneration: true,
          streaming: true,
        },
      },
      {
        id: 'gemma-7b-it',
        name: 'Gemma 7B',
        description: 'Google Gemma 7B model for instruction following',
        contextLength: 8192,
        maxOutputTokens: 1024,
        supports: {
          textCompletion: true,
          chatCompletion: true,
          codeGeneration: true,
          streaming: true,
        },
      },
    ];
  }

  /**
   * Get current rate limiting status
   */
  getRateLimitStatus(): ReturnType<BaseAIProvider['getRateLimitStatus']> {
    return {
      window: {
        limit: this.rateLimiter.maxRequests,
        remaining: this.rateLimiter.getRemainingRequests(),
        resetTime: new Date(Date.now() + this.rateLimiter.getTimeUntilReset()),
      },
      rpm: {
        limit: 60,
        remaining: Math.floor(this.rateLimiter.getRemainingRequests() * 0.6),
        resetTime: new Date(Date.now() + 60000),
      },
      rpd: {
        limit: 10000,
        remaining: Math.floor(this.rateLimiter.getRemainingRequests() * 100),
        resetTime: new Date(Date.now() + 86400000),
      },
    };
  }

  /**
   * Close the provider and cleanup resources
   */
  async close(): Promise<void> {
    await super.close();
    this.groqClient = null;
  }

  // Private helper methods

  private ensureInitialized(): void {
    if (!this.groqClient || !this.config) {
      throw AIProviderError.invalidRequest('Provider not initialized. Call initialize() first.');
    }
  }

  private validateRequest(config: TextCompletionConfig): void {
    if (!config.prompt || typeof config.prompt !== 'string') {
      throw AIProviderError.invalidRequest('Prompt is required and must be a string');
    }
    if (config.maxTokens && config.maxTokens > 4096) {
      throw AIProviderError.invalidRequest('Max tokens cannot exceed 4096');
    }
  }

  private validateChatRequest(config: ChatCompletionConfig): void {
    if (!config.messages || !Array.isArray(config.messages) || config.messages.length === 0) {
      throw AIProviderError.invalidRequest('Messages array is required and must not be empty');
    }
    for (const message of config.messages) {
      if (!message.role || !message.content) {
        throw AIProviderError.invalidRequest('Each message must have role and content');
      }
    }
  }

  private validateCodeRequest(config: CodeGenerationConfig): void {
    if (!config.prompt || typeof config.prompt !== 'string') {
      throw AIProviderError.invalidRequest('Prompt is required and must be a string for code generation');
    }
  }

  private checkRateLimit(): void {
    if (!this.rateLimiter.canMakeRequest()) {
      const timeUntilReset = this.rateLimiter.getTimeUntilReset();
      throw AIProviderError.rateLimited(
        `Rate limit exceeded. Try again in ${Math.ceil(timeUntilReset / 1000)} seconds.`
      );
    }
  }

  private convertToGroqMessages(messages: ChatMessage[]): GroqChatMessage[] {
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));
  }

  private processChatResponse(response: any): {
    message: ChatMessage;
    choices?: any[];
    usage?: {
      prompt: number;
      completion: number;
      total: number;
    };
    model: string;
  } {
    const choice = response.choices[0];
    
    return {
      message: {
        role: choice.message.role,
        content: choice.message.content,
      },
      choices: response.choices.map((c: any, index: number) => ({
        index,
        message: {
          role: c.message.role,
          content: c.message.content,
        },
        finishReason: c.finish_reason,
      })),
      usage: response.usage ? {
        prompt: response.usage.prompt_tokens,
        completion: response.usage.completion_tokens,
        total: response.usage.total_tokens,
      } : undefined,
      model: response.model,
    };
  }

  private buildCodePrompt(config: CodeGenerationConfig): string {
    let prompt = `Generate ${config.language || 'TypeScript'} code for: ${config.prompt}`;
    
    if (config.context) {
      prompt += `\n\nContext:\n${config.context}`;
    }
    
    prompt += '\n\nPlease provide clean, well-commented code.';
    return prompt;
  }

  private extractCodeAndExplanation(content: string): { code: string; explanation?: string } {
    // Try to extract code blocks
    const codeBlocks = content.match(/```[\w]*\n([\s\S]*?)```/g);
    
    if (codeBlocks && codeBlocks.length > 0) {
      // Get the first code block
      const code = codeBlocks[0].replace(/```[\w]*\n/, '').replace(/```$/, '').trim();
      
      // Try to find explanation (text before or after code blocks)
      const explanation = content
        .replace(codeBlocks[0], '')
        .replace(/```[\w]*\n[\s\S]*?```/g, '') // Remove other code blocks
        .trim();
      
      return {
        code: code || content.trim(),
        explanation: explanation || undefined,
      };
    }
    
    // If no code blocks found, treat the entire content as code
    return {
      code: content.trim(),
      explanation: undefined,
    };
  }

  private estimateCodeQuality(code: string): number {
    // Simple heuristics for code quality estimation
    let score = 0.5; // Base score
    
    // Check for comments
    if (code.includes('//') || code.includes('/*') || code.includes('#')) {
      score += 0.1;
    }
    
    // Check for proper formatting (indentation)
    if (code.includes('  ') || code.includes('\t')) {
      score += 0.1;
    }
    
    // Check for function/variable declarations (basic check)
    if (/function\s+\w+|const\s+\w+|let\s+\w+|var\s+\w+/.test(code)) {
      score += 0.1;
    }
    
    // Check for error handling patterns
    if (/try\s*{|catch\s*{|error|exception/i.test(code)) {
      score += 0.1;
    }
    
    // Check for reasonable length (not too short, not too long)
    if (code.length > 50 && code.length < 2000) {
      score += 0.1;
    }
    
    return Math.min(1, Math.max(0, score));
  }

  private handleGroqError(error: any): AIProviderError {
    const statusCode = error.status || error.response?.status;
    const message = error.message || error.response?.data?.error?.message || 'Unknown error';

    switch (statusCode) {
      case 401:
      case 403:
        return AIProviderError.invalidApiKey(message);
      case 429:
        return AIProviderError.rateLimited(message);
      case 402:
        return AIProviderError.quotaExceeded(message);
      case 404:
        return AIProviderError.modelNotFound(error.response?.data?.error?.param || 'unknown');
      case 400:
        return AIProviderError.invalidRequest(message);
      case 503:
        return AIProviderError.serviceUnavailable(message);
      default:
        return new AIProviderError(
          `Groq API error: ${message}`,
          'GROQ_API_ERROR',
          statusCode,
          { originalError: error }
        );
    }
  }
}

/**
 * Factory function to create a new Groq AI provider instance
 */
export function createGroqProvider(config: GroqProviderConfig): GroqAIProvider {
  return new GroqAIProvider(config);
}

/**
 * Default Groq provider configuration
 */
export const defaultGroqConfig: Partial<GroqProviderConfig> = {
  defaultTextModel: 'mixtral-8x7b-32768',
  defaultChatModel: 'llama2-70b-4096',
  defaultCodeModel: 'codellama-34b-4096',
  maxTokens: 1024,
  temperature: 0.7,
  topP: 1,
  enableStreaming: false,
  timeout: 30000,
};

/**
 * Example usage and best practices
 */
export const GroqProviderExamples = {
  /**
   * Basic text completion example
   */
  basicTextCompletion: async () => {
    const provider = new GroqAIProvider();
    
    await provider.initialize({
      apiKey: process.env.GROQ_API_KEY!,
    });

    const response = await provider.completeText({
      model: provider.defaultTextModel,
      prompt: 'Write a brief summary of artificial intelligence:',
      maxTokens: 150,
      temperature: 0.7,
    });

    console.log('Generated text:', response.text);
    console.log('Usage:', response.usage);
  },

  /**
   * Chat completion example
   */
  basicChatCompletion: async () => {
    const provider = new GroqAIProvider();
    
    await provider.initialize({
      apiKey: process.env.GROQ_API_KEY!,
    });

    const response = await provider.completeChat({
      model: provider.defaultChatModel,
      messages: [
        { role: 'system', content: 'You are a helpful programming assistant.' },
        { role: 'user', content: 'How do I implement a binary search algorithm?' }
      ],
      maxTokens: 500,
      temperature: 0.3,
    });

    console.log('Chat response:', response.message.content);
  },

  /**
   * Code generation example
   */
  codeGenerationExample: async () => {
    const provider = new GroqAIProvider();
    
    await provider.initialize({
      apiKey: process.env.GROQ_API_KEY!,
    });

    const response = await provider.generateCode({
      model: provider.defaultCodeModel,
      language: 'typescript',
      prompt: 'Create a function that sorts an array of numbers',
      context: 'The function should be efficient and handle edge cases',
    });

    console.log('Generated code:', response.code);
    console.log('Quality score:', response.qualityScore);
  },

  /**
   * Streaming chat example
   */
  streamingChatExample: async () => {
    const provider = new GroqAIProvider();
    
    await provider.initialize({
      apiKey: process.env.GROQ_API_KEY!,
    });

    let fullResponse = '';

    await provider.streamChatCompletion(
      {
        model: provider.defaultChatModel,
        messages: [
          { role: 'user', content: 'Tell me a story about a robot learning to paint.' }
        ],
      },
      (chunk) => {
        fullResponse += chunk.content;
        process.stdout.write(chunk.content);
      },
      (error) => {
        console.error('Stream error:', error.message);
      }
    );

    console.log('\nFull response:', fullResponse);
  },
};

/**
 * Export all types and the main provider class
 */
export * from './ai-provider';
export { GroqAIProvider };
