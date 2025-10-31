/**
 * Global Test Teardown
 * 
 * This file runs once after all tests are executed.
 * Used for cleaning up test databases, temporary files, etc.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

export default async (): Promise<void> => {
  console.log('🧹 Cleaning up test environment...');

  try {
    // Clean up temporary test files
    await cleanupTempFiles();

    // Clean up test databases (optional - comment out if you want to keep test data)
    await cleanupTestDatabases();

    // Generate coverage report
    await generateCoverageReport();

    console.log('✅ Test environment cleanup complete');
  } catch (error) {
    console.error('❌ Error during test cleanup:', error);
  }
};

/**
 * Clean up temporary test files
 */
async function cleanupTempFiles(): Promise<void> {
  const tempDirs = [
    path.join(process.cwd(), 'tests/temp'),
    path.join(process.cwd(), '.jest-cache'),
  ];

  tempDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
      console.log(`  ✓ Cleaned up: ${dir}`);
    }
  });

  // Clean up any test log files
  const logsDir = path.join(process.cwd(), 'logs');
  if (fs.existsSync(logsDir)) {
    const testLogFiles = fs.readdirSync(logsDir).filter(file => 
      file.includes('test') || file.includes('.test.')
    );
    
    testLogFiles.forEach(file => {
      const filePath = path.join(logsDir, file);
      fs.unlinkSync(filePath);
      console.log(`  ✓ Deleted test log: ${file}`);
    });
  }
}

/**
 * Clean up test databases
 */
async function cleanupTestDatabases(): Promise<void> {
  const shouldCleanup = process.env.CLEANUP_TEST_DATABASES !== 'false';
  
  if (!shouldCleanup) {
    console.log('  ⏭️  Skipping database cleanup (CLEANUP_TEST_DATABASES=false)');
    return;
  }

  try {
    // Drop test database
    const testDbName = process.env.TEST_DB_NAME || 'ai_code_agent_test';
    const dbHost = process.env.TEST_DB_HOST || 'localhost';
    const dbPort = process.env.TEST_DB_PORT || '5432';
    const dbUser = process.env.TEST_DB_USER || 'postgres';
    const dbPassword = process.env.TEST_DB_PASSWORD || 'postgres';

    // Use psql to drop the test database
    const dropCommand = `PGPASSWORD=${dbPassword} dropdb -h ${dbHost} -p ${dbPort} -U ${dbUser} ${testDbName} 2>/dev/null || true`;
    execSync(dropCommand, { stdio: 'inherit' });
    
    console.log(`  ✓ Dropped test database: ${testDbName}`);
  } catch (error) {
    console.warn('  ⚠️  Could not drop test database (may not exist):', error);
  }
}

/**
 * Generate coverage report summary
 */
async function generateCoverageReport(): Promise<void> {
  const coverageDir = path.join(process.cwd(), 'coverage');
  
  if (fs.existsSync(coverageDir)) {
    try {
      // Create a simple coverage summary
      const summary = {
        timestamp: new Date().toISOString(),
        coverageDirectory: coverageDir,
        reports: {
          html: path.join(coverageDir, 'index.html'),
          lcov: path.join(coverageDir, 'lcov.info'),
          json: path.join(coverageDir, 'coverage-final.json'),
        },
      };

      fs.writeFileSync(
        path.join(coverageDir, 'coverage-summary.json'),
        JSON.stringify(summary, null, 2)
      );

      console.log('  ✓ Coverage reports generated');
    } catch (error) {
      console.warn('  ⚠️  Could not generate coverage summary:', error);
    }
  }
}
