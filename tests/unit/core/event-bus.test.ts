/**
 * Tests for Event Bus Component
 */

import { TypedEventBus, Events } from '../../src/core/event-bus';
import {
  createMock,
  createAsyncMock,
  testDataFactory,
  EventTestHelper,
  expectToThrow,
} from '../utils/test-utils';
import { mockEventData, mockEventListeners } from '../fixtures/mock-data';

describe('TypedEventBus', () => {
  let eventBus: TypedEventBus;
  let eventHelper: EventTestHelper;

  beforeEach(() => {
    eventBus = new TypedEventBus();
    eventHelper = new EventTestHelper();
    
    // Capture events for testing
    eventHelper.captureEvents(eventBus);
  });

  afterEach(() => {
    eventBus.removeAllListeners();
    eventHelper.clear();
    jest.clearAllTimers();
  });

  describe('Constructor and Options', () => {
    it('should create event bus with default options', () => {
      const bus = new TypedEventBus();
      expect(bus).toBeDefined();
    });

    it('should create event bus with custom options', () => {
      const bus = new TypedEventBus({
        maxListeners: 50,
        verbose: true,
        newListener: true,
      });
      expect(bus).toBeDefined();
    });

    it('should override default options with custom options', () => {
      const bus = new TypedEventBus({
        maxListeners: 200,
        wildcard: true,
      });
      expect(bus).toBeDefined();
    });
  });

  describe('Event Subscription', () => {
    it('should subscribe to an event and return listener ID', () => {
      const handler = jest.fn();
      const listenerId = eventBus.on('test:event', handler);
      
      expect(listenerId).toBeDefined();
      expect(typeof listenerId).toBe('string');
    });

    it('should subscribe to an event and call handler when emitted', async () => {
      const handler = jest.fn();
      const listenerId = eventBus.on('test:event', handler);
      
      const testData = { message: 'test' };
      await eventBus.emitAsync('test:event', testData);
      
      expect(handler).toHaveBeenCalledWith(testData);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should subscribe to an event once', async () => {
      const handler = jest.fn();
      const listenerId = eventBus.once('test:once', handler);
      
      await eventBus.emitAsync('test:once', { message: 'first' });
      await eventBus.emitAsync('test:once', { message: 'second' });
      
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({ message: 'first' });
    });

    it('should subscribe to multiple events at once', async () => {
      const handlers = {
        'event:one': jest.fn(),
        'event:two': jest.fn(),
        'event:three': jest.fn(),
      };
      
      const listenerIds = eventBus.onMany(handlers);
      
      expect(listenerIds).toHaveLength(3);
      expect(listenerIds.every(id => typeof id === 'string')).toBe(true);
    });

    it('should handle event listeners with priority', async () => {
      const executionOrder: number[] = [];
      
      const handler1 = jest.fn(() => executionOrder.push(1));
      const handler2 = jest.fn(() => executionOrder.push(2));
      const handler3 = jest.fn(() => executionOrder.push(3));
      
      eventBus.on('test:priority', handler1, { priority: 1 });
      eventBus.on('test:priority', handler2, { priority: 3 });
      eventBus.on('test:priority', handler3, { priority: 2 });
      
      await eventBus.emitAsync('test:priority', {});
      
      // Higher priority should execute first
      expect(executionOrder).toEqual([2, 3, 1]);
    });
  });

  describe('Event Emission', () => {
    it('should emit an event synchronously', () => {
      const handler = jest.fn();
      eventBus.on('test:sync', handler);
      
      const result = eventBus.emit('test:sync', { message: 'test' });
      
      expect(result).toBe(true);
      expect(handler).toHaveBeenCalledWith({ message: 'test' });
    });

    it('should emit an event asynchronously', async () => {
      const handler = jest.fn();
      eventBus.on('test:async', handler);
      
      await eventBus.emitAsync('test:async', { message: 'async test' });
      
      expect(handler).toHaveBeenCalledWith({ message: 'async test' });
    });

    it('should handle multiple handlers for same event', async () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      const handler3 = jest.fn();
      
      eventBus.on('test:multiple', handler1);
      eventBus.on('test:multiple', handler2);
      eventBus.on('test:multiple', handler3);
      
      await eventBus.emitAsync('test:multiple', { message: 'test' });
      
      expect(handler1).toHaveBeenCalledWith({ message: 'test' });
      expect(handler2).toHaveBeenCalledWith({ message: 'test' });
      expect(handler3).toHaveBeenCalledWith({ message: 'test' });
    });

    it('should handle errors in event handlers gracefully', async () => {
      const errorHandler = jest.fn(() => {
        throw new Error('Handler error');
      });
      
      const normalHandler = jest.fn();
      
      eventBus.on('test:error', errorHandler);
      eventBus.on('test:error', normalHandler);
      
      // Should not throw, but should handle errors
      await expect(eventBus.emitAsync('test:error', { message: 'test' })).resolves.not.toThrow();
    });

    it('should capture events in event helper', () => {
      const handler = jest.fn();
      eventBus.on('test:capture', handler);
      
      eventBus.emit('test:capture', { message: 'test' });
      
      const capturedEvents = eventHelper.getEvents();
      expect(capturedEvents).toHaveLength(1);
      expect(capturedEvents[0].event).toBe('test:capture');
      expect(capturedEvents[0].data).toEqual({ message: 'test' });
    });
  });

  describe('Event Listener Management', () => {
    it('should remove a specific listener by ID', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      
      const listenerId1 = eventBus.on('test:remove', handler1);
      const listenerId2 = eventBus.on('test:remove', handler2);
      
      const result = eventBus.removeListener(listenerId1);
      
      expect(result).toBe(true);
      
      eventBus.emit('test:remove', { message: 'test' });
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });

    it('should return false when removing non-existent listener', () => {
      const result = eventBus.removeListener('non-existent-id');
      expect(result).toBe(false);
    });

    it('should remove all listeners for specific event', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      
      eventBus.on('test:remove-all', handler1);
      eventBus.on('test:remove-all', handler2);
      eventBus.on('test:other', jest.fn());
      
      const count = eventBus.removeAllListeners('test:remove-all');
      
      expect(count).toBe(2);
      
      eventBus.emit('test:remove-all', { message: 'test' });
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });

    it('should remove all listeners when no event specified', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      
      eventBus.on('test:remove-all-2', handler1);
      eventBus.on('test:remove-all-3', handler2);
      
      const count = eventBus.removeAllListeners();
      
      expect(count).toBe(2);
      
      eventBus.emit('test:remove-all-2', { message: 'test' });
      eventBus.emit('test:remove-all-3', { message: 'test' });
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });

    it('should get correct listener count', () => {
      expect(eventBus.listenerCount('test:count')).toBe(0);
      
      eventBus.on('test:count', jest.fn());
      expect(eventBus.listenerCount('test:count')).toBe(1);
      
      eventBus.on('test:count', jest.fn());
      expect(eventBus.listenerCount('test:count')).toBe(2);
    });

    it('should get all event names that have listeners', () => {
      expect(eventBus.eventNames()).toEqual([]);
      
      eventBus.on('event:one', jest.fn());
      eventBus.on('event:two', jest.fn());
      eventBus.on('event:one', jest.fn()); // Same event, different handler
      
      const eventNames = eventBus.eventNames();
      expect(eventNames).toEqual(['event:one', 'event:two']);
    });
  });

  describe('Event Waiting', () => {
    it('should wait for a specific event', async () => {
      const waitPromise = eventBus.waitFor('test:wait', 1000);
      
      // Simulate event emission after a short delay
      setTimeout(() => {
        eventBus.emit('test:wait', { message: 'waited' });
      }, 100);
      
      const result = await waitPromise;
      
      expect(result).toEqual({ message: 'waited' });
    });

    it('should timeout waiting for event that never fires', async () => {
      const waitPromise = eventBus.waitFor('test:timeout', 100);
      
      await expect(waitPromise).rejects.toThrow('Timeout waiting for event: test:timeout');
    });
  });

  describe('Statistics', () => {
    beforeEach(() => {
      eventBus.on('test:stats', jest.fn());
      eventBus.emit('test:stats', { message: 'test' });
      eventBus.emit('test:stats', { message: 'test2' });
      eventBus.on('another:event', jest.fn());
    });

    it('should track total events emitted', () => {
      const stats = eventBus.getStats();
      expect(stats.totalEvents).toBe(2);
    });

    it('should track total listeners registered', () => {
      const stats = eventBus.getStats();
      expect(stats.totalListeners).toBe(2);
    });

    it('should track events fired count', () => {
      const stats = eventBus.getStats();
      expect(stats.eventsFired['test:stats']).toBe(2);
      expect(stats.eventsFired['another:event']).toBe(0);
    });

    it('should return registered events', () => {
      const stats = eventBus.getStats();
      expect(stats.registeredEvents).toEqual(['test:stats', 'another:event']);
    });

    it('should clear statistics', () => {
      eventBus.clearStats();
      const stats = eventBus.getStats();
      
      expect(stats.totalEvents).toBe(0);
      expect(stats.eventsFired).toEqual({});
    });
  });

  describe('Namespacing', () => {
    it('should create namespaced event bus', () => {
      const namespacedBus = eventBus.namespace('user');
      
      namespacedBus.on('created', jest.fn());
      
      // Should be able to emit with namespace
      namespacedBus.emit('created', { userId: '123' });
      
      const stats = namespacedBus.getStats();
      expect(stats.registeredEvents).toContain('user:created');
    });

    it('should handle namespaced event emission', async () => {
      const namespacedBus = eventBus.namespace('api');
      const handler = jest.fn();
      
      namespacedBus.on('request', handler);
      
      namespacedBus.emit('request', { method: 'GET', url: '/test' });
      
      const stats = namespacedBus.getStats();
      expect(stats.registeredEvents).toContain('api:request');
    });
  });

  describe('Common Event Types', () => {
    it('should handle system events', async () => {
      const handler = jest.fn();
      eventBus.on(Events.SYSTEM_START, handler);
      
      await eventBus.emitAsync(Events.SYSTEM_START, {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      });
      
      expect(handler).toHaveBeenCalled();
    });

    it('should handle database events', async () => {
      const connectHandler = jest.fn();
      const disconnectHandler = jest.fn();
      
      eventBus.on(Events.DB_CONNECT, connectHandler);
      eventBus.on(Events.DB_DISCONNECT, disconnectHandler);
      
      await eventBus.emitAsync(Events.DB_CONNECT, { host: 'localhost', port: 5432 });
      await eventBus.emitAsync(Events.DB_DISCONNECT, { reason: 'test' });
      
      expect(connectHandler).toHaveBeenCalled();
      expect(disconnectHandler).toHaveBeenCalled();
    });

    it('should handle agent events', async () => {
      const registeredHandler = jest.fn();
      const taskStartedHandler = jest.fn();
      
      eventBus.on(Events.AGENT_REGISTERED, registeredHandler);
      eventBus.on(Events.AGENT_TASK_STARTED, taskStartedHandler);
      
      await eventBus.emitAsync(Events.AGENT_REGISTERED, {
        agentId: 'agent-1',
        type: 'test-agent',
      });
      
      await eventBus.emitAsync(Events.AGENT_TASK_STARTED, {
        agentId: 'agent-1',
        taskId: 'task-1',
      });
      
      expect(registeredHandler).toHaveBeenCalled();
      expect(taskStartedHandler).toHaveBeenCalled();
    });
  });

  describe('Performance Tests', () => {
    it('should handle rapid event emission', async () => {
      const handler = jest.fn();
      eventBus.on('test:performance', handler);
      
      const eventCount = 100;
      const promises = [];
      
      for (let i = 0; i < eventCount; i++) {
        promises.push(eventBus.emitAsync('test:performance', { index: i }));
      }
      
      await Promise.all(promises);
      
      expect(handler).toHaveBeenCalledTimes(eventCount);
    });

    it('should handle many listeners efficiently', async () => {
      const handler = jest.fn();
      const listenerCount = 50;
      const listenerIds: string[] = [];
      
      for (let i = 0; i < listenerCount; i++) {
        const listenerId = eventBus.on('test:many-listeners', handler);
        listenerIds.push(listenerId);
      }
      
      await eventBus.emitAsync('test:many-listeners', { message: 'test' });
      
      expect(handler).toHaveBeenCalledTimes(listenerCount);
    });

    it('should handle concurrent event emissions', async () => {
      const events = ['event:1', 'event:2', 'event:3'];
      const handlers = events.reduce((acc, event) => {
        acc[event] = jest.fn();
        return acc;
      }, {} as Record<string, jest.Mock>);
      
      Object.entries(handlers).forEach(([event, handler]) => {
        eventBus.on(event, handler);
      });
      
      const promises = events.map(event => 
        eventBus.emitAsync(event, { message: event })
      );
      
      await Promise.all(promises);
      
      Object.values(handlers).forEach(handler => {
        expect(handler).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle null or undefined event data', async () => {
      const handler = jest.fn();
      eventBus.on('test:null-data', handler);
      
      await eventBus.emitAsync('test:null-data', null as any);
      await eventBus.emitAsync('test:null-data', undefined as any);
      
      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('should handle errors in async handlers', async () => {
      const errorHandler = jest.fn(() => {
        throw new Error('Async handler error');
      });
      
      const normalHandler = jest.fn();
      
      eventBus.on('test:async-error', errorHandler);
      eventBus.on('test:async-error', normalHandler);
      
      // Should not throw, but should continue processing
      await expect(
        eventBus.emitAsync('test:async-error', { message: 'test' })
      ).resolves.not.toThrow();
      
      expect(normalHandler).toHaveBeenCalled();
    });
  });
});
