import type { Config } from 'jest';

/**
 * Jest Configuration for End-to-End Tests
 * 
 * This configuration extends the main jest.config.ts with settings
 * optimized for end-to-end testing scenarios.
 */

const config: Config = {
  // Test environment
  testEnvironment: 'node',
  testEnvironmentOptions: {
    url: 'http://localhost',
  },

  // Test file patterns - only E2E tests
  testMatch: ['<rootDir>/tests/e2e/**/*.test.ts'],

  // Longer timeout for E2E tests
  testTimeout: 60000, // 60 seconds

  // Run tests sequentially for E2E to avoid resource conflicts
  maxWorkers: 1,

  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup.ts',
    '<rootDir>/tests/e2e/setup.ts',
  ],

  // Global setup for E2E tests
  globalSetup: '<rootDir>/tests/global-setup.ts',
  globalTeardown: '<rootDir>/tests/global-teardown.ts',

  // Module resolution
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/tests/(.*)$': '<rootDir>/tests/$1',
  },

  // Transform configuration
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: {
          target: 'ES2020',
          lib: ['ES2020', 'DOM'],
          module: 'commonjs',
          moduleResolution: 'node',
          allowSyntheticDefaultImports: true,
          esModuleInterop: true,
          experimentalDecorators: true,
          emitDecoratorMetadata: true,
          strict: true,
          noImplicitAny: true,
          strictNullChecks: true,
          skipLibCheck: true,
        },
        useESM: true,
      },
    ],
  },

  // Test result reporting
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: 'coverage/e2e',
        outputName: 'junit-e2e.xml',
        suiteName: 'AI Code Agent E2E Tests',
        uniqueOutputName: 'false',
      },
    ],
  ],

  // Coverage configuration for E2E
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.type.ts',
    '!src/index.ts',
  ],
  coverageDirectory: 'coverage/e2e',
  coverageReporters: [
    'text',
    'text-summary',
    'lcov',
    'html',
    'json',
  ],
  coverageThreshold: {
    global: {
      branches: 70, // Lower threshold for E2E tests
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },

  // Verbose output for E2E tests
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,

  // Detect open handles
  detectOpenHandles: true,

  // Force exit after tests
  forceExit: true,

  // Cache configuration
  cacheDirectory: '<rootDir>/.jest-cache-e2e',
};

export default config;
