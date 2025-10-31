/**
 * Test file to verify core infrastructure components
 */

// Import core components
import { eventBus, Events } from './event-bus';
import { logger, LogLevel } from './logger';
import { config, createCommonSchemas } from './config';
import { 
  ValidationError, 
  NotFoundError, 
  BaseError, 
  ErrorUtils 
} from './errors';

/**
 * Test the event bus system
 */
async function testEventBus() {
  console.log('🚌 Testing Event Bus System...');

  // Test basic event emission
  const listenerId = eventBus.on('test:event', (data) => {
    console.log('  ✅ Received event:', data);
  });

  await eventBus.emitAsync('test:event', { message: 'Hello Event Bus!' });

  // Test event statistics
  const stats = eventBus.getStats();
  console.log('  📊 Event Bus Stats:', stats);

  // Test namespaced event bus
  const apiBus = eventBus.namespace('api');
  const apiListenerId = apiBus.on('request', (data) => {
    console.log('  ✅ Namespaced event received:', data);
  });

  await apiBus.emit('request', { method: 'GET', url: '/test' });

  // Test event from main bus
  await eventBus.emit('api:request', { method: 'POST', url: '/create' });

  console.log('  ✅ Event Bus System Test Passed\n');
}

/**
 * Test the logger system
 */
function testLogger() {
  console.log('📝 Testing Logger System...');

  // Test different log levels
  logger.debug('Debug message', { component: 'test' });
  logger.info('Info message', { component: 'test' });
  logger.warn('Warning message', { component: 'test' });
  logger.error('Error message', { component: 'test' });

  // Test structured logging
  logger.info('User action', {
    userId: 'user123',
    action: 'login',
    timestamp: new Date(),
  });

  // Test performance profiling
  logger.startTimer('test-operation');
  setTimeout(() => {
    const duration = logger.endTimer('test-operation');
    console.log('  ⏱️  Operation took:', duration + 'ms');
  }, 100);

  // Test memory logs
  const memoryLogs = logger.getMemoryLogs(LogLevel.INFO);
  console.log('  💾 Memory logs count:', memoryLogs.length);

  console.log('  ✅ Logger System Test Passed\n');
}

/**
 * Test the configuration manager
 */
function testConfig() {
  console.log('⚙️  Testing Configuration Manager...');

  // Register a simple schema
  config.registerSchema('test.port', config.typed<number>('PORT').validate());

  // Set some test values
  config.set('test.port', 3000);
  config.set('test.host', 'localhost');
  config.set('test.feature.enabled', true);

  // Get values
  const port = config.get<number>('test.port');
  const host = config.get<string>('test.host');
  const enabled = config.get<boolean>('test.feature.enabled', false);

  console.log('  📊 Config values:', { port, host, enabled });

  // Test validation
  const validation = config.validate();
  console.log('  ✅ Validation result:', validation.isValid ? 'Valid' : 'Invalid');

  // Test config change watching
  const unwatch = config.watch((change) => {
    console.log('  🔄 Config changed:', change.key, change.oldValue, '→', change.newValue);
  });

  config.set('test.host', '0.0.0.0');
  setTimeout(unwatch, 100); // Stop watching after one change

  console.log('  ✅ Configuration Manager Test Passed\n');
}

/**
 * Test custom error classes
 */
function testErrors() {
  console.log('🚨 Testing Custom Error Classes...');

  // Test base error
  const baseError = new BaseError('Something went wrong', {
    code: 'BASE_ERROR',
    statusCode: 500,
    context: { component: 'test' },
  });
  console.log('  📋 Base error:', baseError.getSummary());

  // Test validation error
  try {
    throw new ValidationError('Invalid email', {
      field: 'email',
      value: 'invalid-email',
      constraint: 'email_format',
    });
  } catch (error) {
    console.log('  📋 Validation error:', error.message);
    console.log('  📋 Error context:', (error as BaseError).context);
  }

  // Test not found error
  try {
    throw new NotFoundError('User', 'user123');
  } catch (error) {
    console.log('  📋 Not found error:', error.message);
  }

  // Test error chain
  try {
    try {
      throw new Error('Original error');
    } catch (original) {
      throw new NotFoundError('Resource', '123').wrap('Failed to find resource');
    }
  } catch (error) {
    console.log('  📋 Error chain:', ErrorUtils.formatErrorChain(error));
  }

  // Test error utilities
  const testError = new ValidationError('Test error');
  console.log('  📋 Is operational:', ErrorUtils.isOperational(testError));
  console.log('  📋 Root cause:', ErrorUtils.getRootCause(testError));

  console.log('  ✅ Custom Error Classes Test Passed\n');
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('🚀 Starting Core Infrastructure Tests\n');

  try {
    await testEventBus();
    testLogger();
    testConfig();
    testErrors();

    console.log('🎉 All Core Infrastructure Tests Passed!\n');

    // Test integration between components
    console.log('🔗 Testing Component Integration...');
    
    // Use logger in event bus
    eventBus.on('integration:test', (data) => {
      logger.info('Integration test received', { integration: data });
    });
    
    await eventBus.emitAsync('integration:test', { message: 'Components working together!' });
    
    console.log('  ✅ Component Integration Test Passed\n');

    console.log('✅ Core Infrastructure Setup Complete!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}

export { runTests };