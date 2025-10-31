# Groq AI Provider Implementation

This document provides comprehensive documentation for the Groq AI Provider implementation, which provides a unified interface for interacting with Groq's fast inference API for large language models.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
- [Examples](#examples)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

The Groq AI Provider is a TypeScript implementation that provides a consistent interface for using Groq's lightning-fast inference API. It supports text completion, chat completion, and specialized code generation across multiple Groq models.

### Key Benefits

- **Fast Inference**: Leverages Groq's optimized inference infrastructure
- **Unified Interface**: Consistent API across different Groq models
- **Type Safety**: Full TypeScript support with comprehensive type definitions
- **Error Handling**: Robust error handling with detailed error codes
- **Rate Limiting**: Built-in rate limiting management
- **Streaming Support**: Real-time streaming responses for better UX
- **Code Generation**: Specialized prompts and extraction for code tasks

## Features

### Supported Models

| Model | Use Case | Context Length | Specialization |
|-------|----------|----------------|----------------|
| `mixtral-8x7b-32768` | General tasks | 32,768 tokens | Fast inference |
| `llama2-70b-4096` | Chat & text | 4,096 tokens | Conversation |
| `codellama-34b-4096` | Code generation | 4,096 tokens | Programming |
| `gemma-7b-it` | Instruction following | 8,192 tokens | Task completion |

### Core Capabilities

1. **Text Completion**: Generate text based on prompts
2. **Chat Completion**: Multi-turn conversations with context
3. **Code Generation**: Specialized code creation with quality assessment
4. **Streaming Responses**: Real-time token-by-token streaming
5. **Rate Limit Management**: Automatic rate limiting and retry logic
6. **Usage Monitoring**: Track tokens, costs, and performance metrics

## Installation

### Prerequisites

- Node.js >= 18.0.0
- TypeScript >= 5.0.0
- Valid Groq API key

### Setup

1. Install dependencies (already included in your project):
```bash
npm install groq-sdk
```

2. Set up environment variables:
```bash
# .env
GROQ_API_KEY=your-groq-api-key-here
GROQ_BASE_URL=https://api.groq.com  # Optional, for custom endpoints
```

3. The provider is already configured in your project. No additional setup required!

## Quick Start

### Basic Text Completion

```typescript
import { GroqAIProvider } from './providers/groq-ai-provider';

async function example() {
  const provider = new GroqAIProvider();
  
  await provider.initialize({
    apiKey: process.env.GROQ_API_KEY!,
  });

  const response = await provider.completeText({
    model: 'mixtral-8x7b-32768',
    prompt: 'Explain quantum computing:',
    maxTokens: 200,
    temperature: 0.7,
  });

  console.log(response.text);
  await provider.close();
}
```

### Chat Completion

```typescript
import { GroqAIProvider } from './providers/groq-ai-provider';

async function chatExample() {
  const provider = new GroqAIProvider();
  
  await provider.initialize({
    apiKey: process.env.GROQ_API_KEY!,
  });

  const response = await provider.completeChat({
    model: 'llama2-70b-4096',
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'How do I implement binary search?' }
    ],
  });

  console.log(response.message.content);
  await provider.close();
}
```

### Code Generation

```typescript
import { GroqAIProvider } from './providers/groq-ai-provider';

async function codeExample() {
  const provider = new GroqAIProvider();
  
  await provider.initialize({
    apiKey: process.env.GROQ_API_KEY!,
  });

  const response = await provider.generateCode({
    model: 'codellama-34b-4096',
    language: 'typescript',
    prompt: 'Create a function to sort an array',
    context: 'Should handle edge cases and be efficient',
  });

  console.log('Generated code:');
  console.log(response.code);
  console.log(`Quality score: ${(response.qualityScore! * 100).toFixed(1)}%`);
  await provider.close();
}
```

### Streaming Chat

```typescript
import { GroqAIProvider } from './providers/groq-ai-provider';

async function streamingExample() {
  const provider = new GroqAIProvider();
  
  await provider.initialize({
    apiKey: process.env.GROQ_API_KEY!,
  });

  let fullResponse = '';

  await provider.streamChatCompletion(
    {
      model: 'llama2-70b-4096',
      messages: [
        { role: 'user', content: 'Tell me a story about AI' }
      ],
    },
    (chunk) => {
      fullResponse += chunk.content;
      process.stdout.write(chunk.content); // Stream to console
    },
    (error) => {
      console.error('Streaming error:', error.message);
    }
  );

  console.log('\nFull story:', fullResponse);
  await provider.close();
}
```

## API Reference

### Classes

#### GroqAIProvider

The main provider class for interacting with Groq's API.

```typescript
class GroqAIProvider extends BaseAIProvider {
  readonly name = 'Groq';
  readonly version = '1.0.0';
  readonly defaultTextModel = 'mixtral-8x7b-32768';
  readonly defaultChatModel = 'llama2-70b-4096';
  readonly defaultCodeModel = 'codellama-34b-4096';

  constructor(customConfig?: Partial<GroqProviderConfig>)

  async initialize(config: GroqProviderConfig): Promise<void>
  async completeText(config: TextCompletionConfig): Promise<TextCompletionResponse>
  async completeChat(config: ChatCompletionConfig): Promise<ChatCompletionResponse>
  async generateCode(config: CodeGenerationConfig): Promise<CodeGenerationResponse>
  async streamChatCompletion(config: ChatCompletionConfig, onChunk: (chunk: ChatCompletionResponse) => void, onError?: (error: AIProviderError) => void): Promise<void>
  async getAvailableModels(): Promise<ModelInfo[]>
  async validateApiKey(): Promise<boolean>
  getRateLimitStatus(): RateLimitStatus
  async close(): Promise<void>
}
```

#### Configuration Interfaces

##### GroqProviderConfig

```typescript
interface GroqProviderConfig {
  apiKey: string;
  baseURL?: string;
  defaultTextModel?: string;
  defaultChatModel?: string;
  defaultCodeModel?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  enableStreaming?: boolean;
  timeout?: number;
}
```

##### TextCompletionConfig

```typescript
interface TextCompletionConfig extends AIProviderConfig {
  model: string;
  prompt: string;
  suffix?: string;
}
```

##### ChatCompletionConfig

```typescript
interface ChatCompletionConfig extends AIProviderConfig {
  model: string;
  messages: ChatMessage[];
  stream?: boolean;
}
```

##### CodeGenerationConfig

```typescript
interface CodeGenerationConfig extends AIProviderConfig {
  model: string;
  language?: string;
  prompt: string;
  context?: string;
  format?: 'block' | 'inline' | 'comment';
}
```

#### Response Types

##### TextCompletionResponse

```typescript
interface TextCompletionResponse extends BaseAIResponse {
  text: string;
  logProbs?: number[];
}
```

##### ChatCompletionResponse

```typescript
interface ChatCompletionResponse extends BaseAIResponse {
  message: ChatMessage;
  choices?: ChatChoice[];
}
```

##### CodeGenerationResponse

```typescript
interface CodeGenerationResponse extends BaseAIResponse {
  code: string;
  language: string;
  explanation?: string;
  qualityScore?: number;
}
```

### Methods

#### `initialize(config: GroqProviderConfig): Promise<void>`

Initializes the provider with the given configuration.

**Parameters:**
- `config`: Configuration object containing API key and optional settings

**Throws:**
- `AIProviderError` if initialization fails

**Example:**
```typescript
await provider.initialize({
  apiKey: 'your-api-key',
  defaultTextModel: 'mixtral-8x7b-32768',
  temperature: 0.7,
});
```

#### `completeText(config: TextCompletionConfig): Promise<TextCompletionResponse>`

Generates text based on a prompt.

**Parameters:**
- `config`: Text completion configuration

**Returns:**
- Promise resolving to text completion response

**Example:**
```typescript
const response = await provider.completeText({
  model: 'mixtral-8x7b-32768',
  prompt: 'Write a haiku about programming:',
  maxTokens: 100,
});
```

#### `completeChat(config: ChatCompletionConfig): Promise<ChatCompletionResponse>`

Completes a chat conversation.

**Parameters:**
- `config`: Chat completion configuration

**Returns:**
- Promise resolving to chat completion response

**Example:**
```typescript
const response = await provider.completeChat({
  model: 'llama2-70b-4096',
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'What is machine learning?' }
  ],
});
```

#### `generateCode(config: CodeGenerationConfig): Promise<CodeGenerationResponse>`

Generates code based on requirements.

**Parameters:**
- `config`: Code generation configuration

**Returns:**
- Promise resolving to code generation response with quality assessment

**Example:**
```typescript
const response = await provider.generateCode({
  model: 'codellama-34b-4096',
  language: 'python',
  prompt: 'Create a function to calculate fibonacci numbers',
  context: 'Should use recursion and handle large numbers',
});
```

#### `streamChatCompletion(config, onChunk, onError): Promise<void>`

Streams chat completion responses in real-time.

**Parameters:**
- `config`: Chat completion configuration
- `onChunk`: Callback for each response chunk
- `onError`: Optional error callback

**Example:**
```typescript
await provider.streamChatCompletion(
  {
    model: 'llama2-70b-4096',
    messages: [{ role: 'user', content: 'Tell me a story' }],
  },
  (chunk) => process.stdout.write(chunk.content),
  (error) => console.error(error.message)
);
```

## Examples

### Complete Examples

See `groq-ai-examples.ts` for comprehensive examples including:

1. **Text Completion**: Basic text generation
2. **Chat Completion**: Multi-turn conversations
3. **Code Generation**: Specialized code creation
4. **Streaming Chat**: Real-time responses
5. **Error Handling**: Robust error recovery
6. **Model Comparison**: Testing multiple models
7. **Rate Limit Monitoring**: Managing API limits
8. **Batch Processing**: Multiple requests

### Running Examples

```bash
# Set your API key
export GROQ_API_KEY="your-api-key-here"

# Run all examples
node -e "import('./src/providers/groq-ai-examples.js').then(m => m.runAllExamples())"

# Run specific example
node -e "import('./src/providers/groq-ai-examples.js').then(m => m.example1TextCompletion())"
```

## Error Handling

### Error Types

The provider throws specific error types for different scenarios:

```typescript
// Invalid API key
throw AIProviderError.invalidApiKey();

// Rate limit exceeded
throw AIProviderError.rateLimited();

// Model not found
throw AIProviderError.modelNotFound('model-name');

// Invalid request parameters
throw AIProviderError.invalidRequest('Invalid parameters');

// Service unavailable
throw AIProviderError.serviceUnavailable();
```

### Retry Logic

```typescript
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries || error.code !== 'RATE_LIMITED') {
        throw error;
      }

      const delay = baseDelay * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
}

// Usage
const response = await withRetry(() => 
  provider.completeChat({ model: 'mixtral-8x7b-32768', messages })
);
```

### Error Handling Best Practices

1. **Always use try-catch blocks** for API calls
2. **Check error codes** to determine recovery strategies
3. **Implement exponential backoff** for rate limiting
4. **Log errors** for debugging and monitoring
5. **Validate inputs** before making API calls

## Rate Limiting

### Built-in Rate Limiting

The provider includes built-in rate limiting:

```typescript
const status = provider.getRateLimitStatus();
console.log(status.window.remaining, 'requests remaining');
console.log('Reset in', status.window.resetTime);
```

### Rate Limit Configuration

```typescript
const provider = new GroqAIProvider({
  // Custom rate limit settings
  maxRequestsPerMinute: 60,
  maxRequestsPerHour: 3600,
});
```

### Rate Limit Best Practices

1. **Monitor usage** using `getRateLimitStatus()`
2. **Implement backoff** when limits are hit
3. **Queue requests** during high traffic
4. **Cache responses** when appropriate
5. **Use streaming** for better perceived performance

## Best Practices

### 1. Configuration Management

```typescript
// Use environment variables
const config: GroqProviderConfig = {
  apiKey: process.env.GROQ_API_KEY!,
  temperature: parseFloat(process.env.GROQ_TEMPERATURE || '0.7'),
  maxTokens: parseInt(process.env.GROQ_MAX_TOKENS || '1024'),
};

// Validate required configuration
if (!config.apiKey) {
  throw new Error('GROQ_API_KEY environment variable is required');
}
```

### 2. Model Selection

```typescript
// Choose the right model for the task
const model = taskType === 'code' 
  ? 'codellama-34b-4096'
  : taskType === 'chat'
  ? 'llama2-70b-4096'
  : 'mixtral-8x7b-32768';
```

### 3. Parameter Tuning

```typescript
// Different parameters for different use cases
const configs = {
  creative: { temperature: 0.9, topP: 0.95 },
  precise: { temperature: 0.3, topP: 0.8 },
  balanced: { temperature: 0.7, topP: 1.0 },
};
```

### 4. Resource Management

```typescript
// Always clean up resources
async function example() {
  const provider = new GroqAIProvider();
  
  try {
    await provider.initialize({ apiKey: 'key' });
    // ... use provider
  } finally {
    await provider.close(); // Always close
  }
}
```

### 5. Monitoring and Logging

```typescript
// Track usage and performance
const startTime = Date.now();
try {
  const response = await provider.completeText(config);
  const duration = Date.now() - startTime;
  
  console.log(`Request completed in ${duration}ms`);
  console.log(`Tokens used: ${response.usage?.total}`);
  
  return response;
} catch (error) {
  console.error(`Request failed: ${error.message}`);
  throw error;
}
```

## Troubleshooting

### Common Issues

#### 1. Invalid API Key

**Error:** `INVALID_API_KEY`

**Solution:** 
- Check that `GROQ_API_KEY` environment variable is set correctly
- Verify the API key is valid in your Groq dashboard
- Ensure the key has the necessary permissions

#### 2. Rate Limiting

**Error:** `RATE_LIMITED`

**Solution:**
- Implement exponential backoff
- Monitor rate limits with `getRateLimitStatus()`
- Consider upgrading your Groq plan for higher limits

#### 3. Model Not Found

**Error:** `MODEL_NOT_FOUND`

**Solution:**
- Verify the model name is correct
- Check Groq's documentation for available models
- Use `getAvailableModels()` to list available models

#### 4. Timeout Issues

**Error:** Request timeout

**Solution:**
- Increase timeout configuration
- Reduce `maxTokens` for faster responses
- Use streaming for better perceived performance

#### 5. Memory Issues

**Problem:** High memory usage with streaming

**Solution:**
- Process chunks immediately instead of buffering
- Set appropriate stream timeouts
- Monitor memory usage in production

### Debug Mode

Enable debug logging:

```typescript
process.env.NODE_ENV = 'development';

const provider = new GroqAIProvider({
  // ... config
});

// Check provider status
console.log('Provider initialized:', provider.name);
console.log('Available models:', await provider.getAvailableModels());
console.log('Rate limit status:', provider.getRateLimitStatus());
```

### Performance Optimization

1. **Use appropriate models**: Mixtral for speed, Llama 2 for quality
2. **Optimize prompts**: Be concise and specific
3. **Cache responses**: For repeated queries
4. **Batch requests**: When possible
5. **Monitor metrics**: Track token usage and costs

### Getting Help

If you encounter issues:

1. Check the error messages carefully
2. Review the Groq API documentation
3. Examine the example code in `groq-ai-examples.ts`
4. Check the provider's rate limit status
5. Verify your API key and permissions

### Integration Testing

Create a simple test script:

```typescript
// test-provider.js
import { GroqAIProvider } from './src/providers/groq-ai-provider.js';

async function test() {
  const provider = new GroqAIProvider();
  
  try {
    await provider.initialize({
      apiKey: process.env.GROQ_API_KEY!,
    });
    
    const response = await provider.completeText({
      model: 'mixtral-8x7b-32768',
      prompt: 'Say hello!',
      maxTokens: 10,
    });
    
    console.log('✅ Test passed:', response.text);
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  } finally {
    await provider.close();
  }
}

test();
```

Run the test:

```bash
GROQ_API_KEY="your-key" node test-provider.js
```

---

## Summary

The Groq AI Provider provides a robust, type-safe interface for interacting with Groq's fast inference API. With comprehensive error handling, rate limiting, and support for multiple models and use cases, it's designed to be production-ready and developer-friendly.

Key takeaways:

- ✅ Fast inference with Groq's optimized infrastructure
- ✅ Consistent, type-safe API across all models
- ✅ Built-in error handling and rate limiting
- ✅ Support for streaming and real-time responses
- ✅ Specialized code generation with quality assessment
- ✅ Comprehensive documentation and examples

For more examples and advanced usage, see the `groq-ai-examples.ts` file.
