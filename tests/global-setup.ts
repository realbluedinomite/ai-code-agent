/**
 * Global Test Setup
 * 
 * This file runs once before all tests are executed.
 * Used for setting up test databases, services, etc.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export default async (): Promise<void> => {
  console.log('🔧 Setting up test environment...');

  // Ensure test directories exist
  const testDirs = [
    'tests/fixtures',
    'tests/mocks',
    'tests/temp',
    'coverage',
    '.jest-cache',
  ];

  testDirs.forEach(dir => {
    const fullPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      console.log(`  ✓ Created directory: ${dir}`);
    }
  });

  // Create test database connection string
  const testDbConfig = {
    host: process.env.TEST_DB_HOST || 'localhost',
    port: parseInt(process.env.TEST_DB_PORT || '5432'),
    database: process.env.TEST_DB_NAME || 'ai_code_agent_test',
    user: process.env.TEST_DB_USER || 'postgres',
    password: process.env.TEST_DB_PASSWORD || 'postgres',
  };

  // Set environment variables for tests
  process.env.TEST_DATABASE_URL = `postgresql://${testDbConfig.user}:${testDbConfig.password}@${testDbConfig.host}:${testDbConfig.port}/${testDbConfig.database}`;
  process.env.JEST_WORKER_ID = process.env.JEST_WORKER_ID || '1';

  // Setup test fixtures
  await setupTestFixtures();

  console.log('✅ Test environment setup complete');
};

/**
 * Setup test fixtures and mock data
 */
async function setupTestFixtures(): Promise<void> {
  const fixturesDir = path.join(process.cwd(), 'tests/fixtures');
  
  // Create sample config files for testing
  const sampleConfig = {
    service: 'test-service',
    version: '1.0.0',
    environment: 'test',
    database: {
      host: 'localhost',
      port: 5432,
      name: 'test_db',
    },
  };

  fs.writeFileSync(
    path.join(fixturesDir, 'sample-config.json'),
    JSON.stringify(sampleConfig, null, 2)
  );

  // Create sample environment file
  const sampleEnv = `
NODE_ENV=test
SERVICE_NAME=test-service
SERVICE_VERSION=1.0.0
LOG_LEVEL=error
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ai_code_agent_test
DB_USER=postgres
DB_PASSWORD=postgres
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=test-secret-key-for-testing-only
  `.trim();

  fs.writeFileSync(
    path.join(fixturesDir, '.env.test'),
    sampleEnv
  );

  console.log('  ✓ Test fixtures created');
}
