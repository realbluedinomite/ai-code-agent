/**
 * Base AI Provider Interface
 * 
 * This interface defines the standard contract that all AI providers must implement.
 * It provides a consistent API for text completion, chat completion, and code generation
 * regardless of the underlying provider (OpenAI, Anthropic, Groq, etc.).
 */

/**
 * Configuration options for AI provider requests
 */
export interface AIProviderConfig {
  /** API key for authentication */
  apiKey: string;
  /** Base URL for the API (optional, defaults to provider's default) */
  baseURL?: string;
  /** Maximum tokens to generate */
  maxTokens?: number;
  /** Temperature for sampling (0.0 to 2.0) */
  temperature?: number;
  /** Top-p for nucleus sampling */
  topP?: number;
  /** Frequency penalty */
  frequencyPenalty?: number;
  /** Presence penalty */
  presencePenalty?: number;
  /** Stop sequences */
  stop?: string[];
  /** Additional model-specific parameters */
  [key: string]: any;
}

/**
 * Configuration for text completion requests
 */
export interface TextCompletionConfig extends AIProviderConfig {
  /** Model to use for completion */
  model: string;
  /** Prompt for text completion */
  prompt: string;
  /** Suffix to append to the completion */
  suffix?: string;
}

/**
 * Configuration for chat completion requests
 */
export interface ChatCompletionConfig extends AIProviderConfig {
  /** Model to use for completion */
  model: string;
  /** Array of chat messages */
  messages: ChatMessage[];
  /** Whether to stream the response */
  stream?: boolean;
}

/**
 * Configuration for code generation requests
 */
export interface CodeGenerationConfig extends AIProviderConfig {
  /** Model to use for code generation */
  model: string;
  /** Programming language/framework */
  language?: string;
  /** Code prompt/description */
  prompt: string;
  /** Context/code snippet to build upon */
  context?: string;
  /** Code format preferences */
  format?: 'block' | 'inline' | 'comment';
}

/**
 * A chat message in a conversation
 */
export interface ChatMessage {
  /** Role of the message sender */
  role: 'system' | 'user' | 'assistant';
  /** Content of the message */
  content: string;
  /** Optional metadata */
  metadata?: Record<string, any>;
}

/**
 * Base response from an AI provider
 */
export interface BaseAIResponse {
  /** Generated text/content */
  content: string;
  /** Number of tokens used */
  usage?: {
    prompt: number;
    completion: number;
    total: number;
  };
  /** Model used for generation */
  model?: string;
  /** Time taken to generate response */
  responseTime?: number;
  /** Provider-specific metadata */
  metadata?: Record<string, any>;
}

/**
 * Response from a text completion request
 */
export interface TextCompletionResponse extends BaseAIResponse {
  /** The completed text */
  text: string;
  /** Log probabilities if available */
  logProbs?: number[];
}

/**
 * Response from a chat completion request
 */
export interface ChatCompletionResponse extends BaseAIResponse {
  /** The assistant's response */
  message: ChatMessage;
  /** Array of choice objects (for multiple completions) */
  choices?: ChatChoice[];
}

/**
 * A choice in a chat completion response
 */
export interface ChatChoice {
  /** Index of the choice */
  index: number;
  /** The generated message */
  message: ChatMessage;
  /** Reason for completion */
  finishReason?: string;
}

/**
 * Response from a code generation request
 */
export interface CodeGenerationResponse extends BaseAIResponse {
  /** Generated code */
  code: string;
  /** Programming language of generated code */
  language: string;
  /** Explanation of the code (if available) */
  explanation?: string;
  /** Code quality score (0-1) */
  qualityScore?: number;
}

/**
 * Error types specific to AI providers
 */
export class AIProviderError extends Error {
  /** HTTP status code if applicable */
  public statusCode?: number;
  /** Error code for programmatic handling */
  public code: string;
  /** Additional error context */
  public context?: Record<string, any>;

  constructor(message: string, code: string, statusCode?: number, context?: Record<string, any>) {
    super(message);
    this.name = 'AIProviderError';
    this.code = code;
    this.statusCode = statusCode;
    this.context = context;
  }

  /**
   * Create an error for invalid API key
   */
  static invalidApiKey(message: string = 'Invalid API key provided'): AIProviderError {
    return new AIProviderError(message, 'INVALID_API_KEY', 401);
  }

  /**
   * Create an error for rate limiting
   */
  static rateLimited(message: string = 'Rate limit exceeded'): AIProviderError {
    return new AIProviderError(message, 'RATE_LIMITED', 429);
  }

  /**
   * Create an error for quota exceeded
   */
  static quotaExceeded(message: string = 'API quota exceeded'): AIProviderError {
    return new AIProviderError(message, 'QUOTA_EXCEEDED', 402);
  }

  /**
   * Create an error for model not found
   */
  static modelNotFound(model: string): AIProviderError {
    return new AIProviderError(`Model '${model}' not found`, 'MODEL_NOT_FOUND', 404);
  }

  /**
   * Create an error for invalid request parameters
   */
  static invalidRequest(message: string, context?: Record<string, any>): AIProviderError {
    return new AIProviderError(message, 'INVALID_REQUEST', 400, context);
  }

  /**
   * Create an error for service unavailable
   */
  static serviceUnavailable(message: string = 'Service temporarily unavailable'): AIProviderError {
    return new AIProviderError(message, 'SERVICE_UNAVAILABLE', 503);
  }
}

/**
 * Rate limiter interface for managing API calls
 */
export interface RateLimiter {
  /** Check if a request can be made */
  canMakeRequest(): boolean;
  /** Record a request being made */
  recordRequest(): void;
  /** Get the number of remaining requests */
  getRemainingRequests(): number;
  /** Get the time until the next reset (in ms) */
  getTimeUntilReset(): number;
}

/**
 * Base AI Provider interface that all providers must implement
 */
export interface IAIProvider {
  /** Provider name */
  readonly name: string;
  /** Provider version */
  readonly version: string;
  /** Default model for text completion */
  readonly defaultTextModel: string;
  /** Default model for chat completion */
  readonly defaultChatModel: string;
  /** Default model for code generation */
  readonly defaultCodeModel: string;

  /**
   * Initialize the provider with configuration
   */
  initialize(config: AIProviderConfig): Promise<void>;

  /**
   * Complete text using a prompt
   */
  completeText(config: TextCompletionConfig): Promise<TextCompletionResponse>;

  /**
   * Complete a chat conversation
   */
  completeChat(config: ChatCompletionConfig): Promise<ChatCompletionResponse>;

  /**
   * Generate code based on a prompt
   */
  generateCode(config: CodeGenerationConfig): Promise<CodeGenerationResponse>;

  /**
   * Stream chat completion response
   */
  streamChatCompletion(
    config: ChatCompletionConfig,
    onChunk: (chunk: ChatCompletionResponse) => void,
    onError?: (error: AIProviderError) => void
  ): Promise<void>;

  /**
   * Get available models
   */
  getAvailableModels(): Promise<ModelInfo[]>;

  /**
   * Validate the API key
   */
  validateApiKey(): Promise<boolean>;

  /**
   * Get current rate limiting status
   */
  getRateLimitStatus(): RateLimitStatus;

  /**
   * Close the provider and cleanup resources
   */
  close(): Promise<void>;
}

/**
 * Information about an available model
 */
export interface ModelInfo {
  /** Model identifier */
  id: string;
  /** Model display name */
  name: string;
  /** Model description */
  description?: string;
  /** Maximum context length */
  contextLength: number;
  /** Maximum output tokens */
  maxOutputTokens?: number;
  /** Supported features */
  supports: {
    textCompletion: boolean;
    chatCompletion: boolean;
    codeGeneration: boolean;
    streaming: boolean;
  };
  /** Pricing information (if available) */
  pricing?: {
    prompt: number;
    completion: number;
  };
}

/**
 * Rate limiting status information
 */
export interface RateLimitStatus {
  /** Current rate limit window */
  window: {
    limit: number;
    remaining: number;
    resetTime: Date;
  };
  /** Requests per minute (RPM) */
  rpm: {
    limit: number;
    remaining: number;
    resetTime: Date;
  };
  /** Requests per day (RPD) */
  rpd: {
    limit: number;
    remaining: number;
    resetTime: Date;
  };
}

/**
 * Streaming callback interface for real-time responses
 */
export interface StreamingCallback {
  /** Called for each chunk of the response */
  onChunk: (chunk: string) => void;
  /** Called when the stream completes */
  onComplete: (fullResponse: string) => void;
  /** Called if an error occurs */
  onError: (error: AIProviderError) => void;
}

/**
 * Usage statistics for monitoring provider performance
 */
export interface UsageStats {
  /** Total requests made */
  totalRequests: number;
  /** Total tokens used */
  totalTokens: number;
  /** Total cost (if available) */
  totalCost?: number;
  /** Average response time */
  averageResponseTime: number;
  /** Error rate percentage */
  errorRate: number;
  /** Success rate percentage */
  successRate: number;
}

/**
 * Abstract base class that implements common functionality for AI providers
 */
export abstract class BaseAIProvider implements IAIProvider {
  abstract readonly name: string;
  abstract readonly version: string;
  abstract readonly defaultTextModel: string;
  abstract readonly defaultChatModel: string;
  abstract readonly defaultCodeModel: string;

  protected config: AIProviderConfig | null = null;
  protected rateLimiter: RateLimiter | null = null;
  protected usageStats: UsageStats = {
    totalRequests: 0,
    totalTokens: 0,
    totalCost: 0,
    averageResponseTime: 0,
    errorRate: 0,
    successRate: 100,
  };

  /**
   * Initialize the provider with configuration
   */
  async initialize(config: AIProviderConfig): Promise<void> {
    this.config = config;
    await this.validateApiKey();
  }

  /**
   * Complete text using a prompt
   */
  abstract completeText(config: TextCompletionConfig): Promise<TextCompletionResponse>;

  /**
   * Complete a chat conversation
   */
  abstract completeChat(config: ChatCompletionConfig): Promise<ChatCompletionResponse>;

  /**
   * Generate code based on a prompt
   */
  abstract generateCode(config: CodeGenerationConfig): Promise<CodeGenerationResponse>;

  /**
   * Stream chat completion response
   */
  abstract streamChatCompletion(
    config: ChatCompletionConfig,
    onChunk: (chunk: ChatCompletionResponse) => void,
    onError?: (error: AIProviderError) => void
  ): Promise<void>;

  /**
   * Get available models
   */
  abstract getAvailableModels(): Promise<ModelInfo[]>;

  /**
   * Validate the API key
   */
  abstract validateApiKey(): Promise<boolean>;

  /**
   * Get current rate limiting status
   */
  getRateLimitStatus(): RateLimitStatus {
    if (!this.rateLimiter) {
      throw new Error('Rate limiter not initialized');
    }
    return {
      window: {
        limit: 100, // Default values, should be overridden
        remaining: this.rateLimiter.getRemainingRequests(),
        resetTime: new Date(Date.now() + this.rateLimiter.getTimeUntilReset()),
      },
      rpm: {
        limit: 60,
        remaining: this.rateLimiter.getRemainingRequests(),
        resetTime: new Date(Date.now() + 60000),
      },
      rpd: {
        limit: 10000,
        remaining: this.rateLimiter.getRemainingRequests(),
        resetTime: new Date(Date.now() + 86400000),
      },
    };
  }

  /**
   * Close the provider and cleanup resources
   */
  async close(): Promise<void> {
    this.config = null;
    this.rateLimiter = null;
  }

  /**
   * Get usage statistics
   */
  getUsageStats(): UsageStats {
    return { ...this.usageStats };
  }

  /**
   * Update usage statistics
   */
  protected updateStats(responseTime: number, tokens: number, error: boolean = false): void {
    this.usageStats.totalRequests++;
    this.usageStats.totalTokens += tokens;

    if (error) {
      this.usageStats.errorRate = (this.usageStats.errorRate * 0.9) + 10;
      this.usageStats.successRate = 100 - this.usageStats.errorRate;
    } else {
      this.usageStats.errorRate = this.usageStats.errorRate * 0.9;
      this.usageStats.successRate = 100 - this.usageStats.errorRate;
    }

    // Update average response time
    this.usageStats.averageResponseTime = 
      (this.usageStats.averageResponseTime * 0.9) + (responseTime * 0.1);
  }

  /**
   * Validate configuration parameters
   */
  protected validateConfig(config: AIProviderConfig): void {
    if (!config.apiKey) {
      throw AIProviderError.invalidApiKey();
    }
    if (config.temperature !== undefined && (config.temperature < 0 || config.temperature > 2)) {
      throw AIProviderError.invalidRequest('Temperature must be between 0 and 2');
    }
    if (config.topP !== undefined && (config.topP < 0 || config.topP > 1)) {
      throw AIProviderError.invalidRequest('Top-p must be between 0 and 1');
    }
  }
}

/**
 * Utility functions for AI providers
 */
export const AIProviderUtils = {
  /**
   * Extract code blocks from text
   */
  extractCodeBlocks(text: string): string[] {
    const codeBlockRegex = /```[\w]*\n([\s\S]*?)```/g;
    const matches = text.match(codeBlockRegex);
    return matches ? matches.map(match => 
      match.replace(/```[\w]*\n/, '').replace(/```$/, '')
    ) : [];
  },

  /**
   * Format code with proper indentation
   */
  formatCode(code: string, language: string): string {
    return `\`\`\`${language}\n${code}\n\`\`\``;
  },

  /**
   * Estimate token count for a string (approximate)
   */
  estimateTokens(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters for English text
    return Math.ceil(text.length / 4);
  },

  /**
   * Check if a response indicates an error
   */
  isErrorResponse(response: any): boolean {
    return response && (response.error || response.statusCode >= 400);
  },

  /**
   * Extract error message from response
   */
  extractErrorMessage(response: any): string {
    if (response?.error) {
      return typeof response.error === 'string' ? response.error : response.error.message || 'Unknown error';
    }
    return response?.message || response?.statusText || 'Unknown error';
  },
};
