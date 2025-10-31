import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

/**
 * Event types for type safety
 */
export interface EventData {
  [key: string]: unknown;
}

/**
 * Event listener with metadata
 */
export interface EventListener<T extends EventData = EventData> {
  id: string;
  event: string;
  handler: (data: T) => void | Promise<void>;
  once?: boolean;
  priority?: number;
}

/**
 * Event bus options
 */
export interface EventBusOptions {
  maxListeners?: number;
  wildcard?: boolean;
  newListener?: boolean;
  removeListener?: boolean;
  verbose?: boolean;
}

/**
 * Typed event bus implementation using EventEmitter with TypeScript support
 */
export class TypedEventBus {
  private emitter: EventEmitter;
  private listeners: Map<string, EventListener[]> = new Map();
  private options: EventBusOptions;
  private stats = {
    totalEvents: 0,
    totalListeners: 0,
    eventsFired: new Map<string, number>(),
  };

  constructor(options: EventBusOptions = {}) {
    this.options = {
      maxListeners: 100,
      wildcard: false,
      newListener: false,
      removeListener: false,
      verbose: false,
      ...options,
    };

    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(this.options.maxListeners!);

    // Enable detailed event tracking
    if (this.options.verbose) {
      this.setupVerboseMode();
    }
  }

  /**
   * Subscribe to an event
   */
  on<T extends EventData = EventData>(
    event: string,
    handler: (data: T) => void | Promise<void>,
    options: { once?: boolean; priority?: number } = {}
  ): string {
    const listener: EventListener<T> = {
      id: uuidv4(),
      event,
      handler,
      once: options.once,
      priority: options.priority ?? 0,
    };

    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }

    const eventListeners = this.listeners.get(event)!;
    eventListeners.push(listener);

    // Sort by priority (higher priority first)
    eventListeners.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

    // Add to EventEmitter
    this.emitter.on(event, handler);

    this.stats.totalListeners++;
    if (this.options.verbose) {
      console.log(`[EventBus] Listener added: ${event} (${listener.id})`);
    }

    return listener.id;
  }

  /**
   * Subscribe to an event once
   */
  once<T extends EventData = EventData>(
    event: string,
    handler: (data: T) => void | Promise<void>,
    options: { priority?: number } = {}
  ): string {
    return this.on(event, handler, { ...options, once: true });
  }

  /**
   * Subscribe to multiple events
   */
  onMany(
    events: Record<string, (data: EventData) => void | Promise<void>>,
    options: { once?: boolean; priority?: number } = {}
  ): string[] {
    return Object.entries(events).map(([event, handler]) =>
      this.on(event, handler, options)
    );
  }

  /**
   * Remove a listener by ID
   */
  removeListener(listenerId: string): boolean {
    for (const [event, listeners] of this.listeners.entries()) {
      const index = listeners.findIndex(l => l.id === listenerId);
      if (index !== -1) {
        const listener = listeners[index];
        this.emitter.removeListener(event, listener.handler);
        listeners.splice(index, 1);
        this.stats.totalListeners--;

        if (listeners.length === 0) {
          this.listeners.delete(event);
        }

        if (this.options.verbose) {
          console.log(`[EventBus] Listener removed: ${event} (${listenerId})`);
        }

        return true;
      }
    }
    return false;
  }

  /**
   * Remove all listeners for an event
   */
  removeAllListeners(event?: string): number {
    if (event) {
      const listeners = this.listeners.get(event) || [];
      listeners.forEach(listener => {
        this.emitter.removeListener(event, listener.handler);
      });
      const count = listeners.length;
      this.listeners.delete(event);
      this.stats.totalListeners -= count;
      return count;
    } else {
      // Remove all listeners
      let totalRemoved = 0;
      for (const [event, listeners] of this.listeners.entries()) {
        listeners.forEach(listener => {
          this.emitter.removeListener(event, listener.handler);
        });
        totalRemoved += listeners.length;
      }
      this.listeners.clear();
      this.stats.totalListeners = 0;
      return totalRemoved;
    }
  }

  /**
   * Emit an event synchronously
   */
  emit<T extends EventData = EventData>(event: string, data: T): boolean {
    this.stats.totalEvents++;
    this.stats.eventsFired.set(event, (this.stats.eventsFired.get(event) || 0) + 1);

    if (this.options.verbose) {
      console.log(`[EventBus] Event emitted: ${event}`, data);
    }

    // Handle once listeners
    const listeners = this.listeners.get(event);
    if (listeners) {
      const onceListeners = listeners.filter(l => l.once);
      onceListeners.forEach(listener => {
        this.removeListener(listener.id);
      });
    }

    return this.emitter.emit(event, data);
  }

  /**
   * Emit an event asynchronously
   */
  async emitAsync<T extends EventData = EventData>(event: string, data: T): Promise<void> {
    this.stats.totalEvents++;
    this.stats.eventsFired.set(event, (this.stats.eventsFired.get(event) || 0) + 1);

    const listeners = this.listeners.get(event);
    if (!listeners) return;

    if (this.options.verbose) {
      console.log(`[EventBus] Async event emitted: ${event}`, data);
    }

    // Create a copy of listeners to avoid issues if listeners are removed during iteration
    const listenersCopy = [...listeners];

    // Execute all handlers concurrently but wait for completion
    const promises = listenersCopy.map(async (listener) => {
      try {
        await Promise.resolve(listener.handler(data));
      } catch (error) {
        console.error(`[EventBus] Error in event handler for ${event}:`, error);
        this.emit('error', { error, event, data });
      }

      if (listener.once) {
        this.removeListener(listener.id);
      }
    });

    await Promise.all(promises);
  }

  /**
   * Wait for a specific event to be emitted
   */
  waitFor<T extends EventData = EventData>(
    event: string,
    timeout?: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeoutId = timeout ? setTimeout(() => {
        this.removeListener(listenerId);
        reject(new Error(`Timeout waiting for event: ${event}`));
      }, timeout) : null;

      const listenerId = this.once(event, (data: T) => {
        if (timeoutId) clearTimeout(timeoutId);
        resolve(data);
      });
    });
  }

  /**
   * Get listener count for an event
   */
  listenerCount(event: string): number {
    const listeners = this.listeners.get(event);
    return listeners ? listeners.length : 0;
  }

  /**
   * Get all events that have listeners
   */
  eventNames(): string[] {
    return Array.from(this.listeners.keys());
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalEvents: number;
    totalListeners: number;
    eventsFired: Record<string, number>;
    registeredEvents: string[];
  } {
    return {
      totalEvents: this.stats.totalEvents,
      totalListeners: this.stats.totalListeners,
      eventsFired: Object.fromEntries(this.stats.eventsFired),
      registeredEvents: this.eventNames(),
    };
  }

  /**
   * Clear all statistics
   */
  clearStats(): void {
    this.stats = {
      totalEvents: 0,
      totalListeners: 0,
      eventsFired: new Map(),
    };
  }

  /**
   * Setup verbose mode for debugging
   */
  private setupVerboseMode(): void {
    if (this.options.newListener) {
      this.emitter.on('newListener', (event: string, listener: Function) => {
        console.log(`[EventBus] New listener added: ${event}`);
      });
    }

    if (this.options.removeListener) {
      this.emitter.on('removeListener', (event: string, listener: Function) => {
        console.log(`[EventBus] Listener removed: ${event}`);
      });
    }

    this.emitter.on('error', (error: Error) => {
      console.error('[EventBus] Error:', error);
    });
  }

  /**
   * Create a namespaced event bus
   */
  namespace(namespace: string): TypedEventBus {
    const namespacedBus = new TypedEventBus(this.options);
    
    const originalEmit = namespacedBus.emit.bind(namespacedBus);
    const originalEmitAsync = namespacedBus.emitAsync.bind(namespacedBus);
    const originalOn = namespacedBus.on.bind(namespacedBus);
    const originalOnce = namespacedBus.once.bind(namespacedBus);

    namespacedBus.emit = ((event: string, data: EventData) => {
      return originalEmit(`${namespace}:${event}`, data);
    }) as typeof originalEmit;

    namespacedBus.emitAsync = ((event: string, data: EventData) => {
      return originalEmitAsync(`${namespace}:${event}`, data);
    }) as typeof originalEmitAsync;

    namespacedBus.on = ((event: string, handler: (data: EventData) => void | Promise<void>, options?: { once?: boolean; priority?: number }) => {
      return originalOn(`${namespace}:${event}`, handler, options);
    }) as typeof originalOn;

    namespacedBus.once = ((event: string, handler: (data: EventData) => void | Promise<void>, options?: { priority?: number }) => {
      return originalOnce(`${namespace}:${event}`, handler, options);
    }) as typeof originalOnce;

    return namespacedBus;
  }
}

// Create a singleton instance
export const eventBus = new TypedEventBus();

// Common event types for the application
export const Events = {
  // System events
  SYSTEM_START: 'system:start',
  SYSTEM_STOP: 'system:stop',
  SYSTEM_ERROR: 'system:error',
  
  // Database events
  DB_CONNECT: 'db:connect',
  DB_DISCONNECT: 'db:disconnect',
  DB_ERROR: 'db:error',
  
  // Agent events
  AGENT_REGISTERED: 'agent:registered',
  AGENT_UNREGISTERED: 'agent:unregistered',
  AGENT_TASK_STARTED: 'agent:task:started',
  AGENT_TASK_COMPLETED: 'agent:task:completed',
  AGENT_TASK_FAILED: 'agent:task:failed',
  
  // Workflow events
  WORKFLOW_STARTED: 'workflow:started',
  WORKFLOW_COMPLETED: 'workflow:completed',
  WORKFLOW_FAILED: 'workflow:failed',
  WORKFLOW_PAUSED: 'workflow:paused',
  WORKFLOW_RESUMED: 'workflow:resumed',
  
  // Task events
  TASK_CREATED: 'task:created',
  TASK_ASSIGNED: 'task:assigned',
  TASK_STARTED: 'task:started',
  TASK_COMPLETED: 'task:completed',
  TASK_FAILED: 'task:failed',
  TASK_CANCELLED: 'task:cancelled',
  
  // Plugin events
  PLUGIN_LOADED: 'plugin:loaded',
  PLUGIN_UNLOADED: 'plugin:unloaded',
  PLUGIN_ERROR: 'plugin:error',
  
  // Security events
  SECURITY_THREAT_DETECTED: 'security:threat:detected',
  SECURITY_AUTH_SUCCESS: 'security:auth:success',
  SECURITY_AUTH_FAILURE: 'security:auth:failure',
} as const;

export type EventNames = typeof Events[keyof typeof Events];