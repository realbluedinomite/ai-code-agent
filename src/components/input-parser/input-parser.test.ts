/**
 * Input Parser Component Tests
 * 
 * Unit and integration tests for the Input Parser component
 */

import {
  InputParser,
  IntentExtractor,
  EntityExtractor,
  ProjectScanner,
  createInputParser,
  validateParserConfig,
  getSupportedIntents,
  getSupportedEntityTypes,
  IntentType,
  ExtractedEntities
} from './index';

// Mock database service for testing
class MockParsedRequestModel {
  async create(data: any) {
    return {
      id: 'mock-id',
      ...data,
      created_at: new Date(),
      updated_at: new Date()
    };
  }

  async query(config: any) {
    return { rows: [{ id: 'mock-result' }] };
  }
}

describe('Input Parser Component', () => {
  let parser: InputParser;
  let mockDb: MockParsedRequestModel;
  const mockApiKey = 'test-api-key';

  beforeEach(() => {
    mockDb = new MockParsedRequestModel();
    
    parser = createInputParser(
      {
        groqApiKey: mockApiKey,
        modelName: 'mixtral-8x7b-32768',
        timeout: 10000,
        maxRetries: 1
      },
      mockDb,
      './test-project'
    );
  });

  afterEach(async () => {
    if (parser) {
      await parser.cleanup();
    }
  });

  describe('InputParser', () => {
    test('should parse basic request successfully', async () => {
      const result = await parser.parseRequest(
        'Add user authentication component',
        {
          source: 'cli',
          userId: 'test-user'
        }
      );

      expect(result).toHaveProperty('requestId');
      expect(result).toHaveProperty('result');
      expect(result).toHaveProperty('processingTime');
      expect(result.result).toHaveProperty('intent');
      expect(result.result).toHaveProperty('confidence');
      expect(result.result).toHaveProperty('entities');
    });

    test('should handle batch request parsing', async () => {
      const inputs = [
        'Add user authentication',
        'Fix the login bug',
        'Refactor the user service'
      ];

      const results = await parser.parseRequestsBatch(inputs);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('processingTime');
      });
    });

    test('should validate input correctly', async () => {
      // Test empty input
      await expect(parser.parseRequest('')).rejects.toThrow();

      // Test very long input
      const longInput = 'a'.repeat(10000);
      await expect(parser.parseRequest(longInput)).rejects.toThrow();

      // Test valid input
      const validInput = 'Add a simple feature';
      await expect(parser.parseRequest(validInput)).resolves.toBeDefined();
    });

    test('should provide statistics', async () => {
      // Parse some requests first
      await parser.parseRequest('Add user authentication');
      await parser.parseRequest('Fix the login bug');

      const stats = parser.getStats();

      expect(stats).toHaveProperty('totalRequests');
      expect(stats).toHaveProperty('successfulParses');
      expect(stats).toHaveProperty('averageConfidence');
      expect(stats).toHaveProperty('intentDistribution');
      expect(stats.totalRequests).toBeGreaterThan(0);
    });

    test('should perform health check', async () => {
      const health = await parser.healthCheck();

      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('details');
      expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
    });
  });

  describe('IntentExtractor', () => {
    let intentExtractor: IntentExtractor;

    beforeEach(() => {
      intentExtractor = new IntentExtractor({
        groqApiKey: mockApiKey,
        modelName: 'mixtral-8x7b-32768'
      });
    });

    test('should extract intent correctly', async () => {
      const result = await intentExtractor.extractIntent(
        'Add user authentication with JWT tokens'
      );

      expect(result).toHaveProperty('intent');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('rawResponse');
      expect(Object.values(IntentType)).toContain(result.intent);
    });

    test('should handle different intent types', async () => {
      const testCases = [
        { input: 'Add a new feature', expectedIntent: IntentType.ADD_FEATURE },
        { input: 'Fix the memory leak bug', expectedIntent: IntentType.FIX_BUG },
        { input: 'Refactor the code structure', expectedIntent: IntentType.REFACTOR },
        { input: 'Explain how the authentication works', expectedIntent: IntentType.EXPLAIN_CODE }
      ];

      for (const testCase of testCases) {
        const result = await intentExtractor.extractIntent(testCase.input);
        expect(result.intent).toBe(testCase.expectedIntent);
      }
    });

    test('should validate intent results', async () => {
      const result = await intentExtractor.extractIntent('Add a feature');
      const validation = intentExtractor.validateIntent(result.intent, result.confidence);

      expect(validation).toHaveProperty('isValid');
      expect(validation).toHaveProperty('isConfident');
      expect(validation).toHaveProperty('suggestions');
    });
  });

  describe('EntityExtractor', () => {
    let entityExtractor: EntityExtractor;

    beforeEach(() => {
      entityExtractor = new EntityExtractor({
        groqApiKey: mockApiKey,
        modelName: 'mixtral-8x7b-32768'
      });
    });

    test('should extract entities correctly', async () => {
      const result = await entityExtractor.extractEntities(
        'Add user authentication to src/components/Auth.tsx using react and jwt'
      );

      expect(result).toHaveProperty('files');
      expect(result).toHaveProperty('features');
      expect(result).toHaveProperty('dependencies');
      expect(Array.isArray(result.files)).toBe(true);
      expect(Array.isArray(result.features)).toBe(true);
      expect(Array.isArray(result.dependencies)).toBe(true);
    });

    test('should extract specific entity types', async () => {
      const files = await entityExtractor.extractFiles('Add feature to src/components/Button.tsx');
      const dependencies = await entityExtractor.extractDependencies('Use react and axios');
      const features = await entityExtractor.extractFeatures('Add user login functionality');

      expect(Array.isArray(files)).toBe(true);
      expect(Array.isArray(dependencies)).toBe(true);
      expect(Array.isArray(features)).toBe(true);
    });

    test('should validate extracted entities', async () => {
      const entities = await entityExtractor.extractEntities('Add user auth');
      const validation = entityExtractor.validateEntities(entities);

      expect(validation).toHaveProperty('isValid');
      expect(validation).toHaveProperty('issues');
      expect(validation).toHaveProperty('suggestions');
    });
  });

  describe('ProjectScanner', () => {
    let projectScanner: ProjectScanner;

    beforeEach(() => {
      projectScanner = new ProjectScanner('./test-project');
    });

    test('should scan project structure', async () => {
      const result = await projectScanner.scanProject({
        includeContent: false,
        includeDependencies: true,
        includeConfiguration: true,
        maxDepth: 2
      });

      expect(result).toHaveProperty('projectName');
      expect(result).toHaveProperty('projectType');
      expect(result).toHaveProperty('structure');
      expect(result).toHaveProperty('metrics');
      expect(result).toHaveProperty('files');
      expect(result).toHaveProperty('health');
    });

    test('should detect project type correctly', async () => {
      const result = await projectScanner.scanProject();

      expect(typeof result.projectType).toBe('string');
      expect(result.projectType).toMatch(/^(nextjs|react|vue|angular|nestjs|nodejs|python|java|go|rust|generic)$/);
    });

    test('should calculate project metrics', async () => {
      const result = await projectScanner.scanProject();

      expect(result.metrics).toHaveProperty('totalFiles');
      expect(result.metrics).toHaveProperty('totalLines');
      expect(result.metrics).toHaveProperty('complexityScore');
      expect(typeof result.metrics.totalFiles).toBe('number');
      expect(typeof result.metrics.complexityScore).toBe('number');
    });
  });

  describe('Configuration Validation', () => {
    test('should validate correct configuration', () => {
      const validConfig = {
        groqApiKey: 'test-api-key',
        modelName: 'mixtral-8x7b-32768',
        maxTokens: 2000,
        temperature: 0.1,
        timeout: 30000
      };

      const result = validateParserConfig(validConfig);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should identify invalid configuration', () => {
      const invalidConfig = {
        groqApiKey: '', // Missing API key
        modelName: 'invalid-model', // Invalid model
        maxTokens: -1, // Invalid value
        temperature: 5.0 // Invalid value
      };

      const result = validateParserConfig(invalidConfig);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Utility Functions', () => {
    test('should return supported intents', () => {
      const intents = getSupportedIntents();
      
      expect(Array.isArray(intents)).toBe(true);
      expect(intents).toContain('ADD_FEATURE');
      expect(intents).toContain('FIX_BUG');
      expect(intents).toContain('REFACTOR');
      expect(intents).toContain('EXPLAIN_CODE');
    });

    test('should return supported entity types', () => {
      const entityTypes = getSupportedEntityTypes();
      
      expect(entityTypes).toHaveProperty('files');
      expect(entityTypes).toHaveProperty('features');
      expect(entityTypes).toHaveProperty('constraints');
      expect(entityTypes).toHaveProperty('dependencies');
      expect(entityTypes).toHaveProperty('codePatterns');
      
      expect(Array.isArray(entityTypes.files)).toBe(true);
      expect(entityTypes.files).toContain('file');
    });
  });

  describe('Error Handling', () => {
    test('should handle API key missing', () => {
      expect(() => {
        new IntentExtractor({
          // Missing groqApiKey
          modelName: 'mixtral-8x7b-32768'
        });
      }).toThrow('Groq API key is required');
    });

    test('should handle invalid input gracefully', async () => {
      const result = await parser.parseRequest('This is a very short input');
      
      expect(result).toBeDefined();
      expect(result.result).toHaveProperty('confidence');
      expect(result.result.confidence).toBeLessThanOrEqual(1);
    });

    test('should handle project scan errors gracefully', async () => {
      const brokenScanner = new ProjectScanner('./non-existent-path');
      
      await expect(brokenScanner.scanProject()).rejects.toThrow();
    });
  });

  describe('Integration Tests', () => {
    test('should work end-to-end', async () => {
      const input = 'Add user authentication component to login page with JWT tokens';
      
      const result = await parser.parseRequest(input, {
        source: 'web',
        userId: 'integration-test-user',
        sessionId: 'integration-session'
      });

      expect(result.requestId).toBeDefined();
      expect(result.result.intent).toBe(IntentType.ADD_FEATURE);
      expect(result.result.confidence).toBeGreaterThan(0);
      expect(result.result.entities.files?.length).toBeGreaterThan(0);
      expect(result.result.entities.dependencies?.length).toBeGreaterThan(0);
    });

    test('should handle multiple requests in sequence', async () => {
      const requests = [
        'Add user registration feature',
        'Fix the login bug',
        'Refactor the authentication service',
        'Explain how JWT tokens work'
      ];

      const results = [];
      for (const request of requests) {
        const result = await parser.parseRequest(request);
        results.push(result);
      }

      expect(results).toHaveLength(4);
      
      // Verify different intents were detected
      const intents = results.map(r => r.result.intent);
      expect(intents).toContain(IntentType.ADD_FEATURE);
      expect(intents).toContain(IntentType.FIX_BUG);
      expect(intents).toContain(IntentType.REFACTOR);
      expect(intents).toContain(IntentType.EXPLAIN_CODE);
    });
  });
});

// Performance tests
describe('Input Parser Performance', () => {
  let parser: InputParser;

  beforeAll(() => {
    const mockDb = new MockParsedRequestModel();
    parser = createInputParser(
      {
        groqApiKey: 'test-api-key',
        modelName: 'mixtral-8x7b-32768',
        timeout: 30000,
        maxRetries: 1
      },
      mockDb
    );
  });

  test('should parse requests within reasonable time', async () => {
    const startTime = Date.now();
    
    await parser.parseRequest('Add user authentication feature');
    
    const processingTime = Date.now() - startTime;
    expect(processingTime).toBeLessThan(30000); // Should complete within 30 seconds
  });

  test('should handle concurrent requests', async () => {
    const requests = Array.from({ length: 5 }, (_, i) => 
      parser.parseRequest(`Request ${i + 1}: Add feature number ${i + 1}`)
    );

    const startTime = Date.now();
    const results = await Promise.all(requests);
    const processingTime = Date.now() - startTime;

    expect(results).toHaveLength(5);
    expect(processingTime).toBeLessThan(60000); // Should handle 5 concurrent requests within 60 seconds
  });
});
