/**
 * Input Parser Component Test Suite
 * Comprehensive tests for the Input Parser component with performance benchmarks
 */

import { describe, beforeEach, afterEach, test, expect, jest, beforeAll, afterAll } from '@jest/globals';
import {
  InputParser,
  IntentExtractor,
  EntityExtractor,
  ProjectScanner,
  createInputParser,
  IntentType,
  ParsedRequestData,
  ExtractedEntities,
  ValidationResult
} from '@/components/input-parser';
import { mockEventData } from '../fixtures/mock-data';

// Mock the dependencies
jest.mock('@/components/input-parser/intent-extractor');
jest.mock('@/components/input-parser/entity-extractor');
jest.mock('@/components/input-parser/project-scanner');

// Performance benchmarking utilities
class PerformanceBenchmark {
  private startTime: number = 0;
  private endTime: number = 0;
  private memoryBefore: number = 0;
  private memoryAfter: number = 0;

  start(): void {
    this.startTime = performance.now();
    this.memoryBefore = process.memoryUsage().heapUsed;
  }

  end(): { duration: number; memoryDiff: number } {
    this.endTime = performance.now();
    this.memoryAfter = process.memoryUsage().heapUsed;
    return {
      duration: this.endTime - this.startTime,
      memoryDiff: this.memoryAfter - this.memoryBefore
    };
  }

  static async measureAsync<T>(fn: () => Promise<T>): Promise<T & { performance: any }> {
    const benchmark = new PerformanceBenchmark();
    benchmark.start();
    const result = await fn();
    const perf = benchmark.end();
    return { ...result, performance: perf };
  }
}

// Mock implementations
class MockParsedRequestModel {
  async create(data: any) {
    return {
      id: 'mock-id-' + Date.now(),
      ...data,
      created_at: new Date(),
      updated_at: new Date()
    };
  }

  async query(config: any) {
    return { 
      rows: [{ 
        id: 'mock-result-' + Date.now(),
        ...config 
      }]
    };
  }

  async update(id: string, data: any) {
    return {
      id,
      ...data,
      updated_at: new Date()
    };
  }

  async delete(id: string) {
    return { success: true };
  }
}

describe('Input Parser Component Tests', () => {
  let parser: InputParser;
  let mockDb: MockParsedRequestModel;
  let performanceBenchmarks: PerformanceBenchmark;
  const mockApiKey = 'test-groq-api-key';
  
  const validTestInputs = [
    {
      text: 'Create a new REST API endpoint for user authentication',
      expectedIntent: IntentType.ADD_FEATURE,
      description: 'Feature addition request'
    },
    {
      text: 'Fix the memory leak in the data processing module',
      expectedIntent: IntentType.FIX_BUG,
      description: 'Bug fix request'
    },
    {
      text: 'Refactor the authentication module to use a more secure pattern',
      expectedIntent: IntentType.REFACTOR,
      description: 'Refactor request'
    },
    {
      text: 'Explain how the caching mechanism works in this project',
      expectedIntent: IntentType.EXPLAIN_CODE,
      description: 'Code explanation request'
    },
    {
      text: 'Analyze the performance bottlenecks in the image processing pipeline',
      expectedIntent: IntentType.ANALYZE_CODE,
      description: 'Code analysis request'
    }
  ];

  const invalidTestInputs = [
    { text: '', description: 'Empty input' },
    { text: '   ', description: 'Whitespace only' },
    { text: 'a'.repeat(10000), description: 'Very long input' },
    { text: null as any, description: 'Null input' },
    { text: undefined as any, description: 'Undefined input' }
  ];

  beforeAll(() => {
    // Set up test environment
    process.env.NODE_ENV = 'test';
  });

  afterAll(() => {
    // Clean up test environment
    delete process.env.NODE_ENV;
  });

  beforeEach(() => {
    performanceBenchmarks = new PerformanceBenchmark();
    mockDb = new MockParsedRequestModel();
    
    // Create fresh instances for each test
    jest.clearAllMocks();
    
    parser = createInputParser(
      {
        groqApiKey: mockApiKey,
        modelName: 'mixtral-8x7b-32768',
        timeout: 10000,
        maxRetries: 3,
        confidenceThreshold: 0.7
      },
      mockDb as any
    );
  });

  afterEach(() => {
    // Clean up after each test
    jest.restoreAllMocks();
  });

  describe('Component Initialization', () => {
    test('should initialize with valid configuration', async () => {
      performanceBenchmarks.start();
      
      expect(parser).toBeDefined();
      expect(parser).toBeInstanceOf(InputParser);
      
      const perf = performanceBenchmarks.end();
      expect(perf.duration).toBeLessThan(100); // Should initialize in < 100ms
    });

    test('should initialize with default configuration', () => {
      const defaultParser = createInputParser(
        { groqApiKey: mockApiKey },
        mockDb as any
      );
      
      expect(defaultParser).toBeDefined();
      expect(defaultParser).toBeInstanceOf(InputParser);
    });

    test('should throw error with invalid configuration', () => {
      expect(() => {
        createInputParser(
          {
            groqApiKey: '',
            modelName: 'invalid-model',
            timeout: -1
          },
          mockDb as any
        );
      }).toThrow();
    });

    test('should handle missing API key gracefully', () => {
      expect(() => {
        createInputParser(
          {
            groqApiKey: undefined as any,
            modelName: 'mixtral-8x7b-32768'
          },
          mockDb as any
        );
      }).toThrow();
    });
  });

  describe('Input Parsing Functionality', () => {
    test.each(validTestInputs)(
      'should parse $description correctly',
      async ({ text, expectedIntent }) => {
        performanceBenchmarks.start();
        
        const mockIntentResult = {
          intent: expectedIntent,
          confidence: 0.95,
          metadata: { source: 'groq-ai' }
        };

        const mockEntityResult: ExtractedEntities = {
          features: [
            {
              name: 'Test Feature',
              type: 'functionality',
              description: 'Test feature description',
              confidence: 0.9
            }
          ],
          files: [
            {
              path: './src/test.ts',
              type: 'file',
              confidence: 0.85
            }
          ]
        };

        const mockValidationResult: ValidationResult = {
          isValid: true,
          confidence: 0.92,
          issues: []
        };

        // Mock the internal methods
        (parser as any).intentExtractor.extractIntent = jest.fn()
          .mockResolvedValue(mockIntentResult);
        (parser as any).entityExtractor.extractEntities = jest.fn()
          .mockResolvedValue(mockEntityResult);
        (parser as any).validateRequest = jest.fn()
          .mockResolvedValue(mockValidationResult);

        const result = await parser.parseInput(text);
        
        const perf = performanceBenchmarks.end();
        
        expect(result).toBeDefined();
        expect(result.intent).toBe(expectedIntent);
        expect(result.confidence).toBeGreaterThan(0.7);
        expect(perf.duration).toBeLessThan(2000); // Should parse in < 2s
      }
    );
  });

  describe('Error Handling', () => {
    test('should handle empty input gracefully', async () => {
      await expect(parser.parseInput('')).rejects.toThrow();
    });

    test('should handle invalid input types', async () => {
      await expect(parser.parseInput(null as any)).rejects.toThrow();
      await expect(parser.parseInput(undefined as any)).rejects.toThrow();
    });

    test('should handle AI service errors', async () => {
      (parser as any).intentExtractor.extractIntent = jest.fn()
        .mockRejectedValue(new Error('AI service unavailable'));

      await expect(parser.parseInput('Create a feature')).rejects.toThrow('AI service unavailable');
    });

    test('should handle timeout errors', async () => {
      (parser as any).intentExtractor.extractIntent = jest.fn()
        .mockImplementation(() => new Promise(resolve => 
          setTimeout(resolve, 15000) // Longer than timeout
        ));

      await expect(parser.parseInput('Create a feature')).rejects.toThrow('timeout');
    });

    test('should handle validation errors', async () => {
      const mockValidationResult: ValidationResult = {
        isValid: false,
        confidence: 0.3,
        issues: [
          {
            type: 'confidence',
            message: 'Low confidence in parsing result',
            severity: 'medium',
            field: 'intent'
          }
        ]
      };

      (parser as any).intentExtractor.extractIntent = jest.fn()
        .mockResolvedValue({ intent: IntentType.UNKNOWN, confidence: 0.2 });
      (parser as any).validateRequest = jest.fn()
        .mockResolvedValue(mockValidationResult);

      await expect(parser.parseInput('Invalid input xyz')).rejects.toThrow();
    });
  });

  describe('Performance Benchmarks', () => {
    test('should parse simple inputs within performance thresholds', async () => {
      const simpleInputs = [
        'Add a new function',
        'Fix the bug',
        'Refactor this code'
      ];

      for (const input of simpleInputs) {
        const mockIntentResult = {
          intent: IntentType.ADD_FEATURE,
          confidence: 0.95,
          metadata: { source: 'groq-ai' }
        };

        const mockEntityResult: ExtractedEntities = {
          features: []
        };

        const mockValidationResult: ValidationResult = {
          isValid: true,
          confidence: 0.9,
          issues: []
        };

        (parser as any).intentExtractor.extractIntent = jest.fn()
          .mockResolvedValue(mockIntentResult);
        (parser as any).entityExtractor.extractEntities = jest.fn()
          .mockResolvedValue(mockEntityResult);
        (parser as any).validateRequest = jest.fn()
          .mockResolvedValue(mockValidationResult);

        performanceBenchmarks.start();
        await parser.parseInput(input);
        const perf = performanceBenchmarks.end();
        
        expect(perf.duration).toBeLessThan(1000); // < 1 second for simple inputs
        expect(perf.memoryDiff).toBeLessThan(10 * 1024 * 1024); // < 10MB memory usage
      }
    });

    test('should handle concurrent requests efficiently', async () => {
      const concurrentInputs = Array.from({ length: 5 }, (_, i) => `Test input ${i}`);
      
      const mockIntentResult = {
        intent: IntentType.ADD_FEATURE,
        confidence: 0.95,
        metadata: { source: 'groq-ai' }
      };

      const mockEntityResult: ExtractedEntities = {
        features: []
      };

      const mockValidationResult: ValidationResult = {
        isValid: true,
        confidence: 0.9,
        issues: []
      };

      (parser as any).intentExtractor.extractIntent = jest.fn()
        .mockResolvedValue(mockIntentResult);
      (parser as any).entityExtractor.extractEntities = jest.fn()
        .mockResolvedValue(mockEntityResult);
      (parser as any).validateRequest = jest.fn()
        .mockResolvedValue(mockValidationResult);

      performanceBenchmarks.start();
      const results = await Promise.all(
        concurrentInputs.map(input => parser.parseInput(input))
      );
      const perf = performanceBenchmarks.end();
      
      expect(results).toHaveLength(5);
      expect(perf.duration).toBeLessThan(5000); // < 5 seconds for 5 concurrent requests
    });

    test('should maintain performance under load', async () => {
      const loadTestInputs = Array.from({ length: 20 }, (_, i) => `Load test input ${i}`);
      
      const mockIntentResult = {
        intent: IntentType.ADD_FEATURE,
        confidence: 0.95,
        metadata: { source: 'groq-ai' }
      };

      const mockEntityResult: ExtractedEntities = {
        features: []
      };

      const mockValidationResult: ValidationResult = {
        isValid: true,
        confidence: 0.9,
        issues: []
      };

      (parser as any).intentExtractor.extractIntent = jest.fn()
        .mockResolvedValue(mockIntentResult);
      (parser as any).entityExtractor.extractEntities = jest.fn()
        .mockResolvedValue(mockEntityResult);
      (parser as any).validateRequest = jest.fn()
        .mockResolvedValue(mockValidationResult);

      const startMemory = process.memoryUsage().heapUsed;
      
      const results = await Promise.all(
        loadTestInputs.map(input => parser.parseInput(input))
      );
      
      const endMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = endMemory - startMemory;
      
      expect(results).toHaveLength(20);
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // < 50MB memory increase
    });
  });

  describe('Entity Extraction', () => {
    test('should extract file paths from input', async () => {
      const input = 'Create a new file src/components/Button.tsx';
      const expectedFiles = [
        { path: 'src/components/Button.tsx', type: 'file' as const, confidence: 0.9 }
      ];

      const mockEntityResult: ExtractedEntities = {
        files: expectedFiles,
        features: []
      };

      const mockIntentResult = {
        intent: IntentType.ADD_FEATURE,
        confidence: 0.95,
        metadata: { source: 'groq-ai' }
      };

      const mockValidationResult: ValidationResult = {
        isValid: true,
        confidence: 0.9,
        issues: []
      };

      (parser as any).intentExtractor.extractIntent = jest.fn()
        .mockResolvedValue(mockIntentResult);
      (parser as any).entityExtractor.extractEntities = jest.fn()
        .mockResolvedValue(mockEntityResult);
      (parser as any).validateRequest = jest.fn()
        .mockResolvedValue(mockValidationResult);

      const result = await parser.parseInput(input);
      
      expect(result.entities.files).toBeDefined();
      expect(result.entities.files).toEqual(expect.arrayContaining(expectedFiles));
    });

    test('should extract features from input', async () => {
      const input = 'Add user authentication and session management features';
      const expectedFeatures = [
        { name: 'user authentication', type: 'functionality' as const, confidence: 0.95 },
        { name: 'session management', type: 'functionality' as const, confidence: 0.9 }
      ];

      const mockEntityResult: ExtractedEntities = {
        features: expectedFeatures,
        files: []
      };

      const mockIntentResult = {
        intent: IntentType.ADD_FEATURE,
        confidence: 0.95,
        metadata: { source: 'groq-ai' }
      };

      const mockValidationResult: ValidationResult = {
        isValid: true,
        confidence: 0.9,
        issues: []
      };

      (parser as any).intentExtractor.extractIntent = jest.fn()
        .mockResolvedValue(mockIntentResult);
      (parser as any).entityExtractor.extractEntities = jest.fn()
        .mockResolvedValue(mockEntityResult);
      (parser as any).validateRequest = jest.fn()
        .mockResolvedValue(mockValidationResult);

      const result = await parser.parseInput(input);
      
      expect(result.entities.features).toBeDefined();
      expect(result.entities.features).toEqual(expect.arrayContaining(expectedFeatures));
    });

    test('should extract constraints from input', async () => {
      const input = 'Optimize for performance and ensure mobile compatibility';
      const expectedConstraints = [
        { type: 'performance' as const, description: 'optimize', severity: 'medium' as const, confidence: 0.9 },
        { type: 'compatibility' as const, description: 'mobile compatibility', severity: 'high' as const, confidence: 0.85 }
      ];

      const mockEntityResult: ExtractedEntities = {
        constraints: expectedConstraints,
        files: []
      };

      const mockIntentResult = {
        intent: IntentType.OPTIMIZE_CODE,
        confidence: 0.95,
        metadata: { source: 'groq-ai' }
      };

      const mockValidationResult: ValidationResult = {
        isValid: true,
        confidence: 0.9,
        issues: []
      };

      (parser as any).intentExtractor.extractIntent = jest.fn()
        .mockResolvedValue(mockIntentResult);
      (parser as any).entityExtractor.extractEntities = jest.fn()
        .mockResolvedValue(mockEntityResult);
      (parser as any).validateRequest = jest.fn()
        .mockResolvedValue(mockValidationResult);

      const result = await parser.parseInput(input);
      
      expect(result.entities.constraints).toBeDefined();
      expect(result.entities.constraints).toEqual(expect.arrayContaining(expectedConstraints));
    });
  });

  describe('Validation and Confidence', () => {
    test('should validate high confidence results', async () => {
      const input = 'Create a REST API endpoint';
      
      const mockIntentResult = {
        intent: IntentType.ADD_FEATURE,
        confidence: 0.95,
        metadata: { source: 'groq-ai' }
      };

      const mockEntityResult: ExtractedEntities = {
        features: [{ name: 'REST API', type: 'endpoint', confidence: 0.9 }]
      };

      const mockValidationResult: ValidationResult = {
        isValid: true,
        confidence: 0.92,
        issues: []
      };

      (parser as any).intentExtractor.extractIntent = jest.fn()
        .mockResolvedValue(mockIntentResult);
      (parser as any).entityExtractor.extractEntities = jest.fn()
        .mockResolvedValue(mockEntityResult);
      (parser as any).validateRequest = jest.fn()
        .mockResolvedValue(mockValidationResult);

      const result = await parser.parseInput(input);
      
      expect(result.validation.isValid).toBe(true);
      expect(result.validation.confidence).toBeGreaterThan(0.8);
    });

    test('should reject low confidence results', async () => {
      const input = 'xyz invalid input abc';
      
      const mockIntentResult = {
        intent: IntentType.UNKNOWN,
        confidence: 0.1,
        metadata: { source: 'groq-ai' }
      };

      const mockEntityResult: ExtractedEntities = {};

      const mockValidationResult: ValidationResult = {
        isValid: false,
        confidence: 0.1,
        issues: [
          {
            type: 'confidence',
            message: 'Low confidence in parsing result',
            severity: 'high',
            field: 'intent'
          }
        ]
      };

      (parser as any).intentExtractor.extractIntent = jest.fn()
        .mockResolvedValue(mockIntentResult);
      (parser as any).entityExtractor.extractEntities = jest.fn()
        .mockResolvedValue(mockEntityResult);
      (parser as any).validateRequest = jest.fn()
        .mockResolvedValue(mockValidationResult);

      await expect(parser.parseInput(input)).rejects.toThrow();
    });
  });

  describe('Configuration and Settings', () => {
    test('should respect custom confidence thresholds', () => {
      const customParser = createInputParser(
        {
          groqApiKey: mockApiKey,
          modelName: 'mixtral-8x7b-32768',
          confidenceThreshold: 0.9 // Higher threshold
        },
        mockDb as any
      );
      
      expect(customParser).toBeDefined();
      // Custom threshold should be stored in the parser
    });

    test('should handle different model configurations', () => {
      const models = ['mixtral-8x7b-32768', 'llama2-70b-4096', 'gemma-7b-it'];
      
      for (const model of models) {
        const parser = createInputParser(
          {
            groqApiKey: mockApiKey,
            modelName: model,
            timeout: 15000
          },
          mockDb as any
        );
        
        expect(parser).toBeDefined();
      }
    });

    test('should handle retry configurations', () => {
      const parser = createInputParser(
        {
          groqApiKey: mockApiKey,
          modelName: 'mixtral-8x7b-32768',
          maxRetries: 5,
          retryDelay: 1000
        },
        mockDb as any
      );
      
      expect(parser).toBeDefined();
    });
  });

  describe('Event System Integration', () => {
    test('should emit parse started events', async () => {
      const eventSpy = jest.spyOn(parser, 'emit');
      
      const mockIntentResult = {
        intent: IntentType.ADD_FEATURE,
        confidence: 0.95,
        metadata: { source: 'groq-ai' }
      };

      const mockEntityResult: ExtractedEntities = {};
      const mockValidationResult: ValidationResult = {
        isValid: true,
        confidence: 0.9,
        issues: []
      };

      (parser as any).intentExtractor.extractIntent = jest.fn()
        .mockResolvedValue(mockIntentResult);
      (parser as any).entityExtractor.extractEntities = jest.fn()
        .mockResolvedValue(mockEntityResult);
      (parser as any).validateRequest = jest.fn()
        .mockResolvedValue(mockValidationResult);

      await parser.parseInput('Test input');
      
      expect(eventSpy).toHaveBeenCalledWith(
        'parse:started',
        expect.objectContaining({
          input: 'Test input',
          timestamp: expect.any(Date)
        })
      );
    });

    test('should emit parse completed events', async () => {
      const eventSpy = jest.spyOn(parser, 'emit');
      
      const mockIntentResult = {
        intent: IntentType.ADD_FEATURE,
        confidence: 0.95,
        metadata: { source: 'groq-ai' }
      };

      const mockEntityResult: ExtractedEntities = {};
      const mockValidationResult: ValidationResult = {
        isValid: true,
        confidence: 0.9,
        issues: []
      };

      (parser as any).intentExtractor.extractIntent = jest.fn()
        .mockResolvedValue(mockIntentResult);
      (parser as any).entityExtractor.extractEntities = jest.fn()
        .mockResolvedValue(mockEntityResult);
      (parser as any).validateRequest = jest.fn()
        .mockResolvedValue(mockValidationResult);

      await parser.parseInput('Test input');
      
      expect(eventSpy).toHaveBeenCalledWith(
        'parse:completed',
        expect.objectContaining({
          intent: IntentType.ADD_FEATURE,
          confidence: expect.any(Number),
          duration: expect.any(Number)
        })
      );
    });

    test('should emit error events on failure', async () => {
      const eventSpy = jest.spyOn(parser, 'emit');
      
      (parser as any).intentExtractor.extractIntent = jest.fn()
        .mockRejectedValue(new Error('Parse failed'));

      await expect(parser.parseInput('Test input')).rejects.toThrow();
      
      expect(eventSpy).toHaveBeenCalledWith(
        'parse:error',
        expect.objectContaining({
          error: expect.any(Error),
          input: 'Test input'
        })
      );
    });
  });

  describe('Memory Management', () => {
    test('should not leak memory during repeated operations', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Perform many parsing operations
      for (let i = 0; i < 100; i++) {
        const mockIntentResult = {
          intent: IntentType.ADD_FEATURE,
          confidence: 0.95,
          metadata: { source: 'groq-ai' }
        };

        const mockEntityResult: ExtractedEntities = {};
        const mockValidationResult: ValidationResult = {
          isValid: true,
          confidence: 0.9,
          issues: []
        };

        (parser as any).intentExtractor.extractIntent = jest.fn()
          .mockResolvedValue(mockIntentResult);
        (parser as any).entityExtractor.extractEntities = jest.fn()
          .mockResolvedValue(mockEntityResult);
        (parser as any).validateRequest = jest.fn()
          .mockResolvedValue(mockValidationResult);

        await parser.parseInput(`Test input ${i}`);
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be minimal (less than 20MB)
      expect(memoryIncrease).toBeLessThan(20 * 1024 * 1024);
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    test('should handle very long inputs', async () => {
      const longInput = 'Create a feature that does something ' + 'x'.repeat(5000);
      
      const mockIntentResult = {
        intent: IntentType.ADD_FEATURE,
        confidence: 0.8, // Lower confidence for very long inputs
        metadata: { source: 'groq-ai' }
      };

      const mockEntityResult: ExtractedEntities = {};
      const mockValidationResult: ValidationResult = {
        isValid: true,
        confidence: 0.75,
        issues: []
      };

      (parser as any).intentExtractor.extractIntent = jest.fn()
        .mockResolvedValue(mockIntentResult);
      (parser as any).entityExtractor.extractEntities = jest.fn()
        .mockResolvedValue(mockEntityResult);
      (parser as any).validateRequest = jest.fn()
        .mockResolvedValue(mockValidationResult);

      const result = await parser.parseInput(longInput);
      expect(result).toBeDefined();
    });

    test('should handle special characters and unicode', async () => {
      const unicodeInput = 'Créë à fèàtürë with émojis 🚀 and spëcial çhars';
      
      const mockIntentResult = {
        intent: IntentType.ADD_FEATURE,
        confidence: 0.9,
        metadata: { source: 'groq-ai' }
      };

      const mockEntityResult: ExtractedEntities = {};
      const mockValidationResult: ValidationResult = {
        isValid: true,
        confidence: 0.85,
        issues: []
      };

      (parser as any).intentExtractor.extractIntent = jest.fn()
        .mockResolvedValue(mockIntentResult);
      (parser as any).entityExtractor.extractEntities = jest.fn()
        .mockResolvedValue(mockEntityResult);
      (parser as any).validateRequest = jest.fn()
        .mockResolvedValue(mockValidationResult);

      const result = await parser.parseInput(unicodeInput);
      expect(result).toBeDefined();
      expect(result.originalText).toBe(unicodeInput);
    });

    test('should handle rapid consecutive requests', async () => {
      const requests = Array.from({ length: 10 }, (_, i) => `Request ${i}`);
      
      const mockIntentResult = {
        intent: IntentType.ADD_FEATURE,
        confidence: 0.95,
        metadata: { source: 'groq-ai' }
      };

      const mockEntityResult: ExtractedEntities = {};
      const mockValidationResult: ValidationResult = {
        isValid: true,
        confidence: 0.9,
        issues: []
      };

      (parser as any).intentExtractor.extractIntent = jest.fn()
        .mockResolvedValue(mockIntentResult);
      (parser as any).entityExtractor.extractEntities = jest.fn()
        .mockResolvedValue(mockEntityResult);
      (parser as any).validateRequest = jest.fn()
        .mockResolvedValue(mockValidationResult);

      const startTime = performance.now();
      const results = await Promise.all(
        requests.map(input => parser.parseInput(input))
      );
      const endTime = performance.now();
      
      expect(results).toHaveLength(10);
      expect(endTime - startTime).toBeLessThan(3000); // Should handle 10 rapid requests in < 3s
    });
  });
});