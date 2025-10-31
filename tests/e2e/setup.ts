/**
 * E2E Test Setup
 * 
 * Global setup for end-to-end tests including:
 * - Test environment initialization
 * - Database setup
 * - Temporary directory creation
 * - Global test utilities
 */

import { beforeAll, beforeEach, afterAll, afterEach } from '@jest/globals';
import path from 'path';
import fs from 'fs/promises';
import { EventBus } from '../../src/core/event-bus';
import { Logger } from '../../src/core/logger';

describe('E2E Test Setup', () => {
  it('should have proper test environment', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

// Global test state
declare global {
  // eslint-disable-next-line no-var
  var __E2E_TEST_DIR__: string;
  // eslint-disable-next-line no-var
  var __E2E_EVENT_BUS__: EventBus;
  // eslint-disable-next-line no-var
  var __E2E_LOGGER__: Logger;
}

beforeAll(async () => {
  console.log('🚀 Starting E2E Test Suite...');

  // Create global test directory
  const testDir = path.join(process.cwd(), 'temp', 'e2e-tests');
  await fs.mkdir(testDir, { recursive: true });
  global.__E2E_TEST_DIR__ = testDir;

  // Initialize global event bus for test communication
  global.__E2E_EVENT_BUS__ = new EventBus();
  global.__E2E_EVENT_BUS__.setMaxListeners(0); // Allow unlimited listeners

  // Initialize global logger
  global.__E2E_LOGGER__ = new Logger('E2E-Global');

  // Log environment information
  global.__E2E_LOGGER__.info('E2E Test Environment Initialized', {
    testDir: global.__E2E_TEST_DIR__,
    nodeVersion: process.version,
    platform: process.platform,
    env: process.env.NODE_ENV,
  });

  console.log('✅ E2E Test Environment Ready');
}, 30000);

beforeEach(async () => {
  // Create unique test directory for each test
  const testId = Date.now().toString(36) + Math.random().toString(36).substr(2);
  const testDir = path.join(global.__E2E_TEST_DIR__, testId);
  await fs.mkdir(testDir, { recursive: true });

  // Log test start
  global.__E2E_LOGGER__.info('Starting test', {
    testName: expect.getState().currentTestName,
    testDir,
  });
});

afterEach(async () => {
  // Clean up test directory after each test
  const testDir = path.join(global.__E2E_TEST_DIR__, expect.getState().testPath?.split('/').pop() || '');
  
  try {
    await fs.rm(testDir, { recursive: true, force: true });
  } catch (error) {
    // Ignore cleanup errors
    global.__E2E_LOGGER__.warn('Test directory cleanup failed', {
      error: (error as Error).message,
      testDir,
    });
  }
});

afterAll(async () => {
  console.log('🧹 Cleaning up E2E Test Suite...');

  // Clean up global test directory
  try {
    await fs.rm(global.__E2E_TEST_DIR__, { recursive: true, force: true });
    global.__E2E_LOGGER__.info('Global test directory cleaned up');
  } catch (error) {
    global.__E2E_LOGGER__.error('Failed to clean up global test directory', {
      error: (error as Error).message,
    });
  }

  // Cleanup global event bus
  if (global.__E2E_EVENT_BUS__) {
    global.__E2E_EVENT_BUS__.removeAllListeners();
  }

  console.log('✅ E2E Test Suite Cleanup Complete');
}, 30000);

// Export utilities for use in tests
export const e2eTestUtils = {
  getTestDir: () => global.__E2E_TEST_DIR__,
  getEventBus: () => global.__E2E_EVENT_BUS__,
  getLogger: () => global.__E2E_LOGGER__,

  createTestProject: async (name: string, type: string = 'basic') => {
    const testDir = path.join(global.__E2E_TEST_DIR__, name);
    await fs.mkdir(testDir, { recursive: true });

    const files = getTestProjectFiles(type);
    for (const [filePath, content] of Object.entries(files)) {
      const fullPath = path.join(testDir, filePath);
      const dir = path.dirname(fullPath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(fullPath, content);
    }

    return testDir;
  },

  cleanupTestProject: async (testDir: string) => {
    await fs.rm(testDir, { recursive: true, force: true });
  },
};

function getTestProjectFiles(type: string): Record<string, string> {
  const baseFiles = {
    'README.md': `# ${type} Test Project\n\nGenerated for E2E testing`,
    'package.json': JSON.stringify({
      name: `${type}-test-project`,
      version: '1.0.0',
      scripts: {
        start: 'node index.js',
        test: 'jest',
      },
      dependencies: {
        express: '^4.18.2',
        typescript: '^5.2.2',
      },
    }, null, 2),
  };

  switch (type) {
    case 'express':
      return {
        ...baseFiles,
        'index.js': `
const express = require('express');
const app = express();

app.get('/health', (req, res) => {
  res.json({ status: 'ok', type: 'express' });
});

app.get('/users', (req, res) => {
  res.json([{ id: 1, name: 'Test User' }]);
});

module.exports = app;
        `,
        'src/routes/users.js': `
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json([]);
});

module.exports = router;
        `,
      };

    case 'react':
      return {
        ...baseFiles,
        'src/App.js': `
import React from 'react';

function App() {
  return (
    <div>
      <h1>React Test App</h1>
      <p>Generated for E2E testing</p>
    </div>
  );
}

export default App;
        `,
        'public/index.html': `
<!DOCTYPE html>
<html>
<head>
  <title>React Test App</title>
</head>
<body>
  <div id="root"></div>
</body>
</html>
        `,
      };

    case 'nodejs':
      return {
        ...baseFiles,
        'app.js': `
const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Node.js Test App');
});

server.listen(3000, () => {
  console.log('Server running on port 3000');
});
        `,
      };

    case 'api':
      return {
        ...baseFiles,
        'server.js': `
const express = require('express');
const app = express();

app.use(express.json());

app.get('/api/v1/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    version: '1.0.0',
    type: 'api' 
  });
});

app.get('/api/v1/users', (req, res) => {
  res.json([{ id: 1, name: 'User 1' }]);
});

module.exports = app;
        `,
      };

    default:
      return {
        ...baseFiles,
        'index.ts': `
export const main = () => {
  console.log('Hello from test project');
  return 'success';
};
        `,
        'src/main.ts': `
export const version = '1.0.0';
export const config = {
  name: 'test-project',
  type: '${type}',
};
        `,
      };
  }
}
