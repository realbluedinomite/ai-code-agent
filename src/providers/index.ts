/**
 * Groq AI Provider - Main Export
 * 
 * This file exports all the main components of the Groq AI Provider implementation,
 * making it easy to import and use in your applications.
 */

// Core provider classes and interfaces
export { 
  GroqAIProvider, 
  createGroqProvider,
  defaultGroqConfig,
  GroqProviderExamples,
} from './groq-ai-provider';

// Base AI provider interface and types
export * from './ai-provider';

// Examples and usage
export * from './groq-ai-examples';

// Re-export commonly used types for convenience
export type {
  GroqProviderConfig,
} from './groq-ai-provider';

export type {
  AIProviderConfig,
  TextCompletionConfig,
  ChatCompletionConfig,
  CodeGenerationConfig,
  ChatMessage,
  TextCompletionResponse,
  ChatCompletionResponse,
  CodeGenerationResponse,
  ModelInfo,
  RateLimitStatus,
  UsageStats,
  AIProviderError,
} from './ai-provider';

/**
 * Quick import example:
 * 
 * ```typescript
 * import { GroqAIProvider, AIProviderError } from './providers/groq-ai-provider';
 * 
 * const provider = new GroqAIProvider();
 * await provider.initialize({ apiKey: 'your-key' });
 * ```
 */
