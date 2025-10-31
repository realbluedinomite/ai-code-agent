/**
 * Component Coordinator
 * 
 * Coordinates communication between orchestrator components.
 * Handles component messaging, event routing, and component lifecycle coordination.
 */

import { EventEmitter } from 'events';
import { Logger } from '../core/logger';
import { OrchestratorComponent } from './types';

export interface ComponentMessage {
  id: string;
  from: string;
  to: string;
  type: 'request' | 'response' | 'event' | 'error';
  payload: any;
  timestamp: Date;
  correlationId?: string;
}

export interface ComponentEvent {
  source: string;
  type: string;
  data: any;
  timestamp: Date;
}

export class ComponentCoordinator extends EventEmitter {
  private readonly logger = new Logger('ComponentCoordinator');
  private readonly components = new Map<string, OrchestratorComponent>();
  private readonly messageQueue = new Map<string, ComponentMessage[]>();
  private readonly messageHistory: ComponentMessage[] = [];
  private readonly eventHandlers = new Map<string, Set<string>>();
  private readonly healthCheckInterval: NodeJS.Timeout;
  
  constructor() {
    super();
    this.setupHealthChecking();
  }

  /**
   * Register a component with the coordinator
   */
  registerComponent(component: OrchestratorComponent): void {
    if (this.components.has(component.name)) {
      throw new Error(`Component ${component.name} is already registered`);
    }

    this.logger.debug(`Registering component: ${component.name}`);
    this.components.set(component.name, component);
    this.messageQueue.set(component.name, []);
    
    // Set up component event listeners
    this.setupComponentEventHandlers(component);
    
    this.logger.info(`Component ${component.name} registered successfully`);
    this.emit('component:registered', { component: component.name });
  }

  /**
   * Unregister a component
   */
  unregisterComponent(name: string): void {
    if (!this.components.has(name)) {
      throw new Error(`Component ${name} is not registered`);
    }

    this.logger.debug(`Unregistering component: ${name}`);
    
    // Clean up event handlers
    this.eventHandlers.forEach((handlers, eventType) => {
      handlers.delete(name);
    });
    
    // Clean up queues and maps
    this.components.delete(name);
    this.messageQueue.delete(name);
    
    this.logger.info(`Component ${name} unregistered`);
    this.emit('component:unregistered', { component: name });
  }

  /**
   * Send a message to a component
   */
  async sendMessage(
    from: string, 
    to: string, 
    type: ComponentMessage['type'], 
    payload: any,
    correlationId?: string
  ): Promise<ComponentMessage> {
    const message: ComponentMessage = {
      id: this.generateMessageId(),
      from,
      to,
      type,
      payload,
      timestamp: new Date(),
      correlationId
    };

    this.logger.debug(`Sending message from ${from} to ${to}: ${type}`);

    // Add to history
    this.messageHistory.push(message);
    this.trimMessageHistory();

    // Check if target component exists
    const targetComponent = this.components.get(to);
    if (!targetComponent) {
      throw new Error(`Target component ${to} not found`);
    }

    // Add to message queue
    const queue = this.messageQueue.get(to);
    if (queue) {
      queue.push(message);
    }

    // Emit message event
    this.emit('message:sent', message);
    this.emit(`message:${type}`, message);

    // Handle immediate responses for synchronous messages
    if (type === 'request') {
      try {
        const response = await this.processMessage(message);
        return response;
      } catch (error) {
        // Send error response
        const errorMessage: ComponentMessage = {
          id: this.generateMessageId(),
          from: to,
          to: from,
          type: 'error',
          payload: { error: error.message, stack: error.stack },
          timestamp: new Date(),
          correlationId: message.id
        };
        
        this.messageHistory.push(errorMessage);
        this.emit('message:error', errorMessage);
        return errorMessage;
      }
    }

    return message;
  }

  /**
   * Broadcast an event to all components
   */
  async broadcastEvent(source: string, eventType: string, data: any): Promise<void> {
    const event: ComponentEvent = {
      source,
      type: eventType,
      data,
      timestamp: new Date()
    };

    this.logger.debug(`Broadcasting event from ${source}: ${eventType}`);

    for (const [componentName, component] of this.components.entries()) {
      if (componentName !== source) {
        // Add to component's message queue
        const queue = this.messageQueue.get(componentName);
        if (queue) {
          queue.push({
            id: this.generateMessageId(),
            from: source,
            to: componentName,
            type: 'event',
            payload: event,
            timestamp: new Date()
          });
        }
      }
    }

    this.emit('event:broadcast', event);
    this.emit(`event:${eventType}`, event);
  }

  /**
   * Subscribe to events from a specific component
   */
  subscribeToComponent(componentName: string, eventTypes: string[]): void {
    for (const eventType of eventTypes) {
      const handlers = this.eventHandlers.get(eventType) || new Set<string>();
      handlers.add(componentName);
      this.eventHandlers.set(eventType, handlers);
    }
  }

  /**
   * Unsubscribe from events
   */
  unsubscribeFromComponent(componentName: string, eventTypes?: string[]): void {
    if (eventTypes) {
      for (const eventType of eventTypes) {
        const handlers = this.eventHandlers.get(eventType);
        if (handlers) {
          handlers.delete(componentName);
        }
      }
    } else {
      // Remove from all event handlers
      this.eventHandlers.forEach((handlers) => {
        handlers.delete(componentName);
      });
    }
  }

  /**
   * Get pending messages for a component
   */
  getPendingMessages(componentName: string): ComponentMessage[] {
    return this.messageQueue.get(componentName) || [];
  }

  /**
   * Process messages for a component
   */
  async processMessages(componentName: string): Promise<ComponentMessage[]> {
    const queue = this.messageQueue.get(componentName);
    if (!queue || queue.length === 0) {
      return [];
    }

    const messages = [...queue];
    queue.length = 0; // Clear the queue

    const processed: ComponentMessage[] = [];

    for (const message of messages) {
      try {
        const response = await this.processMessage(message);
        if (response) {
          processed.push(response);
        }
      } catch (error) {
        this.logger.error(`Failed to process message ${message.id}`, error);
      }
    }

    return processed;
  }

  /**
   * Get component communication statistics
   */
  getCommunicationStats(): {
    totalMessages: number;
    messagesByType: Record<string, number>;
    messagesByComponent: Record<string, number>;
    averageResponseTime: number;
  } {
    const messagesByType: Record<string, number> = {};
    const messagesByComponent: Record<string, number> = {};
    let totalResponseTime = 0;
    let responseCount = 0;

    for (const message of this.messageHistory) {
      messagesByType[message.type] = (messagesByType[message.type] || 0) + 1;
      messagesByComponent[message.from] = (messagesByComponent[message.from] || 0) + 1;
      messagesByComponent[message.to] = (messagesByComponent[message.to] || 0) + 1;

      if (message.correlationId && message.timestamp) {
        const responseMessage = this.messageHistory.find(m => m.correlationId === message.correlationId);
        if (responseMessage) {
          const responseTime = responseMessage.timestamp.getTime() - message.timestamp.getTime();
          totalResponseTime += responseTime;
          responseCount++;
        }
      }
    }

    return {
      totalMessages: this.messageHistory.length,
      messagesByType,
      messagesByComponent,
      averageResponseTime: responseCount > 0 ? totalResponseTime / responseCount : 0
    };
  }

  /**
   * Get all registered component names
   */
  getRegisteredComponents(): string[] {
    return Array.from(this.components.keys());
  }

  /**
   * Check if a component is registered
   */
  hasComponent(name: string): boolean {
    return this.components.has(name);
  }

  /**
   * Get component health status
   */
  async getComponentHealth(componentName: string): Promise<any> {
    const component = this.components.get(componentName);
    if (!component) {
      throw new Error(`Component ${componentName} not found`);
    }

    try {
      return await component.healthCheck();
    } catch (error) {
      return {
        healthy: false,
        status: 'unhealthy',
        error: error.message,
        lastCheck: new Date()
      };
    }
  }

  /**
   * Process a single message
   */
  private async processMessage(message: ComponentMessage): Promise<ComponentMessage | null> {
    const component = this.components.get(message.to);
    if (!component) {
      throw new Error(`Component ${message.to} not found`);
    }

    this.logger.debug(`Processing message ${message.id} for component ${message.to}`);

    switch (message.type) {
      case 'request':
        try {
          // Execute component functionality
          const result = await component.execute(message.payload, null);
          
          // Send response
          const response: ComponentMessage = {
            id: this.generateMessageId(),
            from: message.to,
            to: message.from,
            type: 'response',
            payload: result,
            timestamp: new Date(),
            correlationId: message.id
          };

          this.messageHistory.push(response);
          this.emit('message:response', response);
          return response;
        } catch (error) {
          throw error;
        }

      case 'event':
        // Emit event to listeners
        const eventType = message.payload.type;
        if (eventType) {
          this.emit(`event:${eventType}`, message.payload);
        }
        this.emit('message:processed', message);
        return null;

      case 'error':
        this.logger.error(`Received error message from ${message.from}`, message.payload);
        this.emit('message:error', message);
        return null;

      default:
        this.emit('message:processed', message);
        return null;
    }
  }

  /**
   * Set up component event handlers
   */
  private setupComponentEventHandlers(component: OrchestratorComponent): void {
    // Component lifecycle events
    component.on('initialized', () => {
      this.logger.debug(`Component ${component.name} initialized`);
      this.emit('component:initialized', { component: component.name });
    });

    component.on('cleanup', () => {
      this.logger.debug(`Component ${component.name} cleaned up`);
      this.emit('component:cleaned', { component: component.name });
    });
  }

  /**
   * Set up periodic health checking
   */
  private setupHealthChecking(): void {
    this.healthCheckInterval = setInterval(async () => {
      for (const [name, component] of this.components.entries()) {
        try {
          const health = await component.healthCheck();
          if (!health.healthy) {
            this.logger.warn(`Component ${name} health check failed`, health);
            this.emit('component:health_degraded', { component: name, health });
          }
        } catch (error) {
          this.logger.error(`Health check failed for component ${name}`, error);
          this.emit('component:health_error', { component: name, error });
        }
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Trim message history to prevent memory leaks
   */
  private trimMessageHistory(): void {
    const maxHistorySize = 1000;
    if (this.messageHistory.length > maxHistorySize) {
      this.messageHistory.splice(0, this.messageHistory.length - maxHistorySize);
    }
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.logger.info('Cleaning up ComponentCoordinator');
    
    // Clear health check interval
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Clear all queues and maps
    this.messageQueue.clear();
    this.eventHandlers.clear();
    this.messageHistory.splice(0, this.messageHistory.length);

    this.logger.info('ComponentCoordinator cleanup complete');
  }
}