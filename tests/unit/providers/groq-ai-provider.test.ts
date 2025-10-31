/**
 * Groq AI Provider Unit Tests
 * 
 * Comprehensive test suite for the Groq AI Provider implementation.
 * Tests cover initialization, text completion, chat completion, code generation,
 * error handling, rate limiting, and streaming functionality.
 */

import { GroqAIProvider, createGroqProvider } from '../../../src/providers/groq-ai-provider';
import {
  AIProviderError,
  TextCompletionConfig,
  ChatCompletionConfig,
  CodeGenerationConfig,
  ChatMessage,
  ModelInfo,
} from '../../../src/providers/ai-provider';

// Mock the Groq SDK
jest.mock('groq-sdk', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
  }));
});

describe('GroqAIProvider', () => {
  let provider: GroqAIProvider;
  let mockGroqClient: any;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    provider = new GroqAIProvider();
    
    // Get the mocked Groq client
    const GroqSDK = require('groq-sdk');
    mockGroqClient = new GroqSDK.mock.instances[0];
  });

  describe('Initialization', () => {
    it('should initialize with valid configuration', async () => {
      const config = {
        apiKey: 'test-api-key',
        defaultTextModel: 'mixtral-8x7b-32768',
        defaultChatModel: 'llama2-70b-4096',
        maxTokens: 1024,
        temperature: 0.7,
      };

      // Mock successful API key validation
      mockGroqClient.chat.completions.create.mockResolvedValueOnce({
        choices: [{ message: { role: 'assistant', content: 'Hi' } }],
      });

      await provider.initialize(config);

      expect(provider).toBeDefined();
      expect(provider.name).toBe('Groq');
    });

    it('should throw error for missing API key', async () => {
      const config = {
        apiKey: '',
      };

      await expect(provider.initialize(config)).rejects.toThrow(AIProviderError);
    });

    it('should use default configuration values', async () => {
      const config = {
        apiKey: 'test-api-key',
      };

      mockGroqClient.chat.completions.create.mockResolvedValueOnce({
        choices: [{ message: { role: 'assistant', content: 'Hi' } }],
      });

      await provider.initialize(config);

      // The provider should have default values set
      expect(provider.defaultTextModel).toBe('mixtral-8x7b-32768');
      expect(provider.defaultChatModel).toBe('llama2-70b-4096');
      expect(provider.defaultCodeModel).toBe('codellama-34b-4096');
    });

    it('should accept custom configuration', async () => {
      const customConfig = {
        apiKey: 'test-api-key',
        defaultTextModel: 'llama2-70b-4096',
        temperature: 0.5,
      };

      mockGroqClient.chat.completions.create.mockResolvedValueOnce({
        choices: [{ message: { role: 'assistant', content: 'Hi' } }],
      });

      const customProvider = new GroqAIProvider(customConfig);
      await customProvider.initialize(customConfig);

      expect(customProvider.defaultTextModel).toBe('llama2-70b-4096');
    });
  });

  describe('API Key Validation', () => {
    it('should validate API key successfully', async () => {
      const config = { apiKey: 'valid-api-key' };

      mockGroqClient.chat.completions.create.mockResolvedValueOnce({
        choices: [{ message: { role: 'assistant', content: 'Hi' } }],
      });

      await provider.initialize(config);
      const isValid = await provider.validateApiKey();

      expect(isValid).toBe(true);
    });

    it('should throw error for invalid API key', async () => {
      const config = { apiKey: 'invalid-api-key' };

      const error = new Error('Unauthorized');
      error.status = 401;
      mockGroqClient.chat.completions.create.mockRejectedValueOnce(error);

      await provider.initialize(config);

      await expect(provider.validateApiKey()).rejects.toThrow(AIProviderError);
    });
  });

  describe('Text Completion', () => {
    beforeEach(async () => {
      const config = { apiKey: 'test-api-key' };
      mockGroqClient.chat.completions.create.mockResolvedValueOnce({
        choices: [{ message: { role: 'assistant', content: 'Hi' } }],
      });
      await provider.initialize(config);
    });

    it('should complete text successfully', async () => {
      const config: TextCompletionConfig = {
        model: 'mixtral-8x7b-32768',
        prompt: 'Explain quantum computing:',
        maxTokens: 100,
        temperature: 0.7,
      };

      const mockResponse = {
        id: 'test-id',
        object: 'chat.completion',
        created: Date.now(),
        model: 'mixtral-8x7b-32768',
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: 'Quantum computing is...' },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 50,
          total_tokens: 60,
        },
      };

      mockGroqClient.chat.completions.create.mockResolvedValueOnce(mockResponse);

      const response = await provider.completeText(config);

      expect(response.text).toBe('Quantum computing is...');
      expect(response.usage?.total).toBe(60);
      expect(response.model).toBe('mixtral-8x7b-32768');
      expect(response.responseTime).toBeDefined();
    });

    it('should use default model when not specified', async () => {
      const config: TextCompletionConfig = {
        model: '', // Empty model should use default
        prompt: 'Test prompt',
      };

      const mockResponse = {
        choices: [{ message: { role: 'assistant', content: 'Response' } }],
        usage: { prompt_tokens: 5, completion_tokens: 10, total_tokens: 15 },
      };

      mockGroqClient.chat.completions.create.mockResolvedValueOnce(mockResponse);

      const response = await provider.completeText(config);

      // Should have been called with the default model
      expect(mockGroqClient.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: provider.defaultTextModel,
        })
      );
    });

    it('should throw error for missing prompt', async () => {
      const config: TextCompletionConfig = {
        model: 'mixtral-8x7b-32768',
        prompt: '', // Empty prompt
      };

      await expect(provider.completeText(config)).rejects.toThrow(AIProviderError);
    });

    it('should handle API errors', async () => {
      const config: TextCompletionConfig = {
        model: 'mixtral-8x7b-32768',
        prompt: 'Test prompt',
      };

      const error = new Error('Service unavailable');
      error.status = 503;
      mockGroqClient.chat.completions.create.mockRejectedValueOnce(error);

      await expect(provider.completeText(config)).rejects.toThrow(AIProviderError);
    });
  });

  describe('Chat Completion', () => {
    beforeEach(async () => {
      const config = { apiKey: 'test-api-key' };
      mockGroqClient.chat.completions.create.mockResolvedValueOnce({
        choices: [{ message: { role: 'assistant', content: 'Hi' } }],
      });
      await provider.initialize(config);
    });

    it('should complete chat successfully', async () => {
      const config: ChatCompletionConfig = {
        model: 'llama2-70b-4096',
        messages: [
          { role: 'system', content: 'You are helpful.' },
          { role: 'user', content: 'How do I code in Python?' },
        ],
        maxTokens: 200,
        temperature: 0.5,
      };

      const mockResponse = {
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: 'To code in Python...' },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 20, completion_tokens: 80, total_tokens: 100 },
        model: 'llama2-70b-4096',
      };

      mockGroqClient.chat.completions.create.mockResolvedValueOnce(mockResponse);

      const response = await provider.completeChat(config);

      expect(response.message.content).toBe('To code in Python...');
      expect(response.choices).toHaveLength(1);
      expect(response.choices![0].index).toBe(0);
      expect(response.usage?.total).toBe(100);
    });

    it('should convert messages to Groq format', async () => {
      const messages: ChatMessage[] = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello' },
      ];

      const config: ChatCompletionConfig = {
        model: 'llama2-70b-4096',
        messages,
      };

      const mockResponse = {
        choices: [{ message: { role: 'assistant', content: 'Hi there!' } }],
        usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
      };

      mockGroqClient.chat.completions.create.mockResolvedValueOnce(mockResponse);

      await provider.completeChat(config);

      expect(mockGroqClient.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: 'Hello' },
          ],
        })
      );
    });

    it('should throw error for empty messages array', async () => {
      const config: ChatCompletionConfig = {
        model: 'llama2-70b-4096',
        messages: [], // Empty messages
      };

      await expect(provider.completeChat(config)).rejects.toThrow(AIProviderError);
    });

    it('should validate message format', async () => {
      const config: ChatCompletionConfig = {
        model: 'llama2-70b-4096',
        messages: [
          { role: 'user', content: '' }, // Missing content
        ],
      };

      await expect(provider.completeChat(config)).rejects.toThrow(AIProviderError);
    });
  });

  describe('Code Generation', () => {
    beforeEach(async () => {
      const config = { apiKey: 'test-api-key' };
      mockGroqClient.chat.completions.create.mockResolvedValueOnce({
        choices: [{ message: { role: 'assistant', content: 'Hi' } }],
      });
      await provider.initialize(config);
    });

    it('should generate code successfully', async () => {
      const config: CodeGenerationConfig = {
        model: 'codellama-34b-4096',
        language: 'typescript',
        prompt: 'Create a function to sort an array',
        context: 'Should be efficient and handle edge cases',
        temperature: 0.3,
      };

      const mockResponse = {
        choices: [
          {
            message: {
              role: 'assistant',
              content: '```typescript\nfunction sortArray(arr: number[]): number[] {\n  return arr.sort((a, b) => a - b);\n}\n```\n\nThis function uses the built-in sort method.',
            },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 30, completion_tokens: 70, total_tokens: 100 },
        model: 'codellama-34b-4096',
      };

      mockGroqClient.chat.completions.create.mockResolvedValueOnce(mockResponse);

      const response = await provider.generateCode(config);

      expect(response.code).toContain('function sortArray');
      expect(response.language).toBe('typescript');
      expect(response.qualityScore).toBeDefined();
      expect(response.qualityScore).toBeGreaterThan(0);
      expect(response.qualityScore).toBeLessThanOrEqual(1);
    });

    it('should extract code and explanation', async () => {
      const config: CodeGenerationConfig = {
        model: 'codellama-34b-4096',
        prompt: 'Create a simple function',
        language: 'javascript',
      };

      const mockResponse = {
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'This function does something useful.\n\n```javascript\nfunction hello() {\n  console.log("Hello, world!");\n}\n```\n\nIt logs a greeting message.',
            },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 30, total_tokens: 40 },
        model: 'codellama-34b-4096',
      };

      mockGroqClient.chat.completions.create.mockResolvedValueOnce(mockResponse);

      const response = await provider.generateCode(config);

      expect(response.code).toContain('function hello');
      expect(response.explanation).toContain('It logs a greeting message');
    });

    it('should handle code without explanation', async () => {
      const config: CodeGenerationConfig = {
        model: 'codellama-34b-4096',
        prompt: 'Create code',
      };

      const mockResponse = {
        choices: [
          {
            message: {
              role: 'assistant',
              content: '```python\nprint("hello")\n```',
            },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 5, completion_tokens: 10, total_tokens: 15 },
        model: 'codellama-34b-4096',
      };

      mockGroqClient.chat.completions.create.mockResolvedValueOnce(mockResponse);

      const response = await provider.generateCode(config);

      expect(response.code).toBe('print("hello")');
      expect(response.explanation).toBeUndefined();
    });

    it('should estimate code quality', async () => {
      const config: CodeGenerationConfig = {
        model: 'codellama-34b-4096',
        prompt: 'Generate code with comments',
      };

      const mockResponse = {
        choices: [
          {
            message: {
              role: 'assistant',
              content: '// This is a function\nfunction test() {\n  const variable = 1;\n  try {\n    return variable;\n  } catch (error) {\n    console.error(error);\n  }\n}',
            },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 5, completion_tokens: 40, total_tokens: 45 },
        model: 'codellama-34b-4096',
      };

      mockGroqClient.chat.completions.create.mockResolvedValueOnce(mockResponse);

      const response = await provider.generateCode(config);

      // Should have good quality score due to comments, error handling, etc.
      expect(response.qualityScore).toBeGreaterThan(0.7);
    });
  });

  describe('Streaming', () => {
    beforeEach(async () => {
      const config = { apiKey: 'test-api-key' };
      mockGroqClient.chat.completions.create.mockResolvedValueOnce({
        choices: [{ message: { role: 'assistant', content: 'Hi' } }],
      });
      await provider.initialize(config);
    });

    it('should stream chat completion', async () => {
      const config: ChatCompletionConfig = {
        model: 'llama2-70b-4096',
        messages: [{ role: 'user', content: 'Tell me a story' }],
        stream: true,
      };

      const mockStream = [
        { choices: [{ delta: { content: 'Once ' } }] },
        { choices: [{ delta: { content: 'upon ' } }] },
        { choices: [{ delta: { content: 'a time ' } }] },
        { choices: [{ delta: { content: 'there was ' } }] },
        { choices: [{ delta: { content: 'a dragon.' } }] },
      ];

      const streamIterator = {
        [Symbol.asyncIterator]: () => ({
          next: () => Promise.resolve(mockStream.shift() || { done: true }),
        }),
      };

      mockGroqClient.chat.completions.create.mockResolvedValueOnce(streamIterator);

      const chunks: string[] = [];
      const onChunk = (chunk: any) => {
        chunks.push(chunk.content);
      };

      await provider.streamChatCompletion(config, onChunk);

      expect(chunks).toEqual(['Once ', 'upon ', 'a time ', 'there was ', 'a dragon.']);
    });

    it('should handle streaming errors', async () => {
      const config: ChatCompletionConfig = {
        model: 'llama2-70b-4096',
        messages: [{ role: 'user', content: 'Test' }],
      };

      const error = new Error('Stream error');
      mockGroqClient.chat.completions.create.mockRejectedValueOnce(error);

      const onError = jest.fn();

      await provider.streamChatCompletion(config, jest.fn(), onError);

      expect(onError).toHaveBeenCalledWith(expect.any(AIProviderError));
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      const config = { apiKey: 'test-api-key' };
      await provider.initialize(config);
    });

    it('should handle rate limiting errors', async () => {
      const error = new Error('Rate limit exceeded');
      error.status = 429;
      mockGroqClient.chat.completions.create.mockRejectedValueOnce(error);

      await expect(provider.completeText({
        model: 'mixtral-8x7b-32768',
        prompt: 'Test',
      })).rejects.toThrow(AIProviderError);

      const error_thrown = new AIProviderError('Rate limit exceeded', 'RATE_LIMITED', 429);
      expect(error_thrown.code).toBe('RATE_LIMITED');
    });

    it('should handle invalid API key errors', async () => {
      const error = new Error('Unauthorized');
      error.status = 401;
      mockGroqClient.chat.completions.create.mockRejectedValueOnce(error);

      await expect(provider.completeText({
        model: 'mixtral-8x7b-32768',
        prompt: 'Test',
      })).rejects.toThrow(AIProviderError);
    });

    it('should handle model not found errors', async () => {
      const error = new Error('Model not found');
      error.status = 404;
      error.response = { data: { error: { param: 'invalid-model' } } };
      mockGroqClient.chat.completions.create.mockRejectedValueOnce(error);

      await expect(provider.completeText({
        model: 'invalid-model',
        prompt: 'Test',
      })).rejects.toThrow(AIProviderError);
    });

    it('should handle quota exceeded errors', async () => {
      const error = new Error('Quota exceeded');
      error.status = 402;
      mockGroqClient.chat.completions.create.mockRejectedValueOnce(error);

      await expect(provider.completeText({
        model: 'mixtral-8x7b-32768',
        prompt: 'Test',
      })).rejects.toThrow(AIProviderError);
    });
  });

  describe('Rate Limiting', () => {
    beforeEach(async () => {
      const config = { apiKey: 'test-api-key' };
      mockGroqClient.chat.completions.create.mockResolvedValueOnce({
        choices: [{ message: { role: 'assistant', content: 'Hi' } }],
      });
      await provider.initialize(config);
    });

    it('should track rate limit status', () => {
      const status = provider.getRateLimitStatus();

      expect(status).toHaveProperty('window');
      expect(status).toHaveProperty('rpm');
      expect(status).toHaveProperty('rpd');
      expect(status.window.remaining).toBeGreaterThanOrEqual(0);
      expect(status.window.limit).toBeGreaterThan(0);
    });

    it('should prevent requests when rate limited', async () => {
      // Make enough requests to hit the rate limit
      for (let i = 0; i < 101; i++) {
        try {
          await provider.completeText({
            model: 'mixtral-8x7b-32768',
            prompt: 'Test',
          });
        } catch (error) {
          if (error.code === 'RATE_LIMITED') {
            expect(error.code).toBe('RATE_LIMITED');
            return;
          }
        }
      }

      // If we get here, rate limiting isn't working
      fail('Rate limiting should have prevented the request');
    });
  });

  describe('Model Management', () => {
    beforeEach(async () => {
      const config = { apiKey: 'test-api-key' };
      mockGroqClient.chat.completions.create.mockResolvedValueOnce({
        choices: [{ message: { role: 'assistant', content: 'Hi' } }],
      });
      await provider.initialize(config);
    });

    it('should return available models', async () => {
      const models = await provider.getAvailableModels();

      expect(models).toHaveLength(4);
      expect(models[0]).toHaveProperty('id');
      expect(models[0]).toHaveProperty('name');
      expect(models[0]).toHaveProperty('contextLength');
      expect(models[0]).toHaveProperty('supports');
      expect(models[0].supports).toHaveProperty('textCompletion');
      expect(models[0].supports).toHaveProperty('chatCompletion');
      expect(models[0].supports).toHaveProperty('codeGeneration');
    });

    it('should include correct model information', async () => {
      const models = await provider.getAvailableModels();

      const mixtralModel = models.find(m => m.id === 'mixtral-8x7b-32768');
      expect(mixtralModel).toBeDefined();
      expect(mixtralModel?.name).toBe('Mixtral-8x7B');
      expect(mixtralModel?.contextLength).toBe(32768);
    });
  });

  describe('Usage Statistics', () => {
    beforeEach(async () => {
      const config = { apiKey: 'test-api-key' };
      mockGroqClient.chat.completions.create.mockResolvedValueOnce({
        choices: [{ message: { role: 'assistant', content: 'Hi' } }],
      });
      await provider.initialize(config);
    });

    it('should track usage statistics', async () => {
      const mockResponse = {
        choices: [{ message: { role: 'assistant', content: 'Test response' } }],
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
      };

      mockGroqClient.chat.completions.create.mockResolvedValueOnce(mockResponse);

      await provider.completeText({
        model: 'mixtral-8x7b-32768',
        prompt: 'Test',
      });

      const stats = provider.getUsageStats();
      expect(stats.totalRequests).toBe(1);
      expect(stats.totalTokens).toBe(30);
      expect(stats.successRate).toBeLessThanOrEqual(100);
    });

    it('should calculate average response time', async () => {
      const mockResponse = {
        choices: [{ message: { role: 'assistant', content: 'Test' } }],
        usage: { prompt_tokens: 5, completion_tokens: 10, total_tokens: 15 },
      };

      mockGroqClient.chat.completions.create.mockResolvedValueOnce(mockResponse);

      await provider.completeText({
        model: 'mixtral-8x7b-32768',
        prompt: 'Test',
      });

      const stats = provider.getUsageStats();
      expect(stats.averageResponseTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Resource Management', () => {
    beforeEach(async () => {
      const config = { apiKey: 'test-api-key' };
      mockGroqClient.chat.completions.create.mockResolvedValueOnce({
        choices: [{ message: { role: 'assistant', content: 'Hi' } }],
      });
      await provider.initialize(config);
    });

    it('should clean up resources when closed', async () => {
      await provider.close();

      // Should be able to reinitialize after closing
      const newConfig = { apiKey: 'test-api-key-2' };
      mockGroqClient.chat.completions.create.mockResolvedValueOnce({
        choices: [{ message: { role: 'assistant', content: 'Hi' } }],
      });

      await provider.initialize(newConfig);
      expect(provider).toBeDefined();
    });

    it('should throw error when not initialized', async () => {
      const uninitializedProvider = new GroqAIProvider();

      await expect(uninitializedProvider.completeText({
        model: 'mixtral-8x7b-32768',
        prompt: 'Test',
      })).rejects.toThrow(AIProviderError);
    });
  });

  describe('Factory Function', () => {
    it('should create provider using factory function', () => {
      const config = {
        apiKey: 'test-api-key',
        temperature: 0.5,
      };

      const provider = createGroqProvider(config);

      expect(provider).toBeInstanceOf(GroqAIProvider);
    });

    it('should apply custom configuration', () => {
      const config = {
        apiKey: 'test-api-key',
        defaultTextModel: 'llama2-70b-4096',
        maxTokens: 500,
      };

      const provider = createGroqProvider(config);

      expect(provider.defaultTextModel).toBe('llama2-70b-4096');
    });
  });
});

// Integration test utilities
export const testUtils = {
  /**
   * Create a test provider with mock configuration
   */
  createTestProvider: () => {
    const provider = new GroqAIProvider();
    
    // Mock the Groq client
    const mockClient = {
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    };

    // Replace the internal client
    (provider as any).groqClient = mockClient;

    return { provider, mockClient };
  },

  /**
   * Mock a successful API response
   */
  mockSuccessfulResponse: (mockClient: any, response?: any) => {
    const defaultResponse = {
      choices: [
        {
          message: { role: 'assistant', content: 'Test response' },
          finish_reason: 'stop',
        },
      ],
      usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
      model: 'mixtral-8x7b-32768',
    };

    mockClient.chat.completions.create.mockResolvedValue(response || defaultResponse);
  },

  /**
   * Mock an API error
   */
  mockApiError: (mockClient: any, error: Error) => {
    mockClient.chat.completions.create.mockRejectedValue(error);
  },
};
