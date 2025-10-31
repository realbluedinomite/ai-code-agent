/**
 * Component Registry
 * 
 * Manages the registration and retrieval of components in the orchestrator.
 * Provides component lifecycle management and dependency injection.
 */

import { Logger } from '../core/logger';
import { OrchestratorComponent } from './types';

export class ComponentRegistry {
  private readonly logger = new Logger('ComponentRegistry');
  private readonly components = new Map<string, OrchestratorComponent>();
  private readonly componentConfigs = new Map<string, any>();
  private readonly dependencies = new Map<string, string[]>();

  /**
   * Register a component
   */
  register(name: string, component: OrchestratorComponent, config?: any, dependencies: string[] = []): void {
    if (this.components.has(name)) {
      throw new Error(`Component ${name} is already registered`);
    }

    this.logger.debug(`Registering component: ${name}`);
    
    this.components.set(name, component);
    this.componentConfigs.set(name, config);
    this.dependencies.set(name, dependencies);

    this.logger.info(`Component ${name} registered successfully`);
  }

  /**
   * Unregister a component
   */
  unregister(name: string): void {
    if (!this.components.has(name)) {
      throw new Error(`Component ${name} is not registered`);
    }

    this.logger.debug(`Unregistering component: ${name}`);
    
    this.components.delete(name);
    this.componentConfigs.delete(name);
    this.dependencies.delete(name);
  }

  /**
   * Get a component by name
   */
  get(name: string): OrchestratorComponent | undefined {
    return this.components.get(name);
  }

  /**
   * Get all registered component names
   */
  getComponentNames(): string[] {
    return Array.from(this.components.keys());
  }

  /**
   * Get all registered components
   */
  getAllComponents(): Map<string, OrchestratorComponent> {
    return new Map(this.components);
  }

  /**
   * Check if a component is registered
   */
  has(name: string): boolean {
    return this.components.has(name);
  }

  /**
   * Get component configuration
   */
  getConfig(name: string): any {
    return this.componentConfigs.get(name);
  }

  /**
   * Get component dependencies
   */
  getDependencies(name: string): string[] {
    return this.dependencies.get(name) || [];
  }

  /**
   * Check if component has dependency
   */
  hasDependency(name: string, dependency: string): boolean {
    const deps = this.getDependencies(name);
    return deps.includes(dependency);
  }

  /**
   * Initialize all registered components
   */
  async initializeAll(): Promise<void> {
    this.logger.info('Initializing all registered components');
    
    // Resolve initialization order based on dependencies
    const initializationOrder = this.resolveInitializationOrder();
    
    for (const componentName of initializationOrder) {
      const component = this.components.get(componentName);
      const config = this.componentConfigs.get(componentName);
      
      if (component) {
        try {
          this.logger.debug(`Initializing component: ${componentName}`);
          await component.initialize(config);
          this.logger.info(`Component ${componentName} initialized successfully`);
        } catch (error) {
          this.logger.error(`Failed to initialize component ${componentName}`, error);
          throw error;
        }
      }
    }
  }

  /**
   * Cleanup all components
   */
  async cleanupAll(): Promise<void> {
    this.logger.info('Cleaning up all components');
    
    // Cleanup in reverse initialization order
    const initializationOrder = this.resolveInitializationOrder().reverse();
    
    for (const componentName of initializationOrder) {
      const component = this.components.get(componentName);
      
      if (component) {
        try {
          this.logger.debug(`Cleaning up component: ${componentName}`);
          await component.cleanup();
          this.logger.info(`Component ${componentName} cleaned up successfully`);
        } catch (error) {
          this.logger.warn(`Failed to cleanup component ${componentName}`, error);
        }
      }
    }
  }

  /**
   * Get health status of all components
   */
  async getAllHealthStatus(): Promise<Record<string, any>> {
    const healthStatus: Record<string, any> = {};
    
    for (const [name, component] of this.components.entries()) {
      try {
        const health = await component.healthCheck();
        healthStatus[name] = health;
      } catch (error) {
        healthStatus[name] = {
          healthy: false,
          status: 'unhealthy',
          error: error.message,
          lastCheck: new Date()
        };
      }
    }
    
    return healthStatus;
  }

  /**
   * Resolve component initialization order based on dependencies
   */
  private resolveInitializationOrder(): string[] {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const orderedComponents: string[] = [];

    for (const componentName of this.components.keys()) {
      if (!visited.has(componentName)) {
        this.resolveDependencies(componentName, visited, visiting, orderedComponents);
      }
    }

    return orderedComponents;
  }

  /**
   * Recursively resolve component dependencies
   */
  private resolveDependencies(
    componentName: string,
    visited: Set<string>,
    visiting: Set<string>,
    orderedComponents: string[]
  ): void {
    if (visiting.has(componentName)) {
      throw new Error(`Circular dependency detected involving component: ${componentName}`);
    }

    if (visited.has(componentName)) {
      return;
    }

    visiting.add(componentName);

    // Process dependencies first
    const dependencies = this.getDependencies(componentName);
    for (const dep of dependencies) {
      if (this.components.has(dep)) {
        this.resolveDependencies(dep, visited, visiting, orderedComponents);
      }
    }

    visiting.delete(componentName);
    visited.add(componentName);
    orderedComponents.push(componentName);
  }

  /**
   * Get dependency graph for debugging
   */
  getDependencyGraph(): Record<string, string[]> {
    const graph: Record<string, string[]> = {};
    
    for (const [name, deps] of this.dependencies.entries()) {
      graph[name] = deps.filter(dep => this.components.has(dep));
    }
    
    return graph;
  }

  /**
   * Find components by type or interface
   */
  findComponents(filter: (component: OrchestratorComponent) => boolean): OrchestratorComponent[] {
    const matching: OrchestratorComponent[] = [];
    
    for (const component of this.components.values()) {
      if (filter(component)) {
        matching.push(component);
      }
    }
    
    return matching;
  }
}