/**
 * Component Adapter
 * 
 * Adapts existing components to the OrchestratorComponent interface.
 * Allows the orchestrator to work with components that don't implement the interface directly.
 */

import { OrchestratorComponent } from './types';

export class ComponentAdapter implements OrchestratorComponent {
  private readonly _name: string;
  private readonly _version: string;
  private readonly implementation: {
    initialize: (config?: any) => Promise<void>;
    execute: (input: any, context: any) => Promise<any>;
    cleanup: () => Promise<void>;
    healthCheck: () => Promise<any>;
  };

  constructor(
    name: string, 
    version: string,
    implementation: {
      initialize: (config?: any) => Promise<void>;
      execute: (input: any, context: any) => Promise<any>;
      cleanup: () => Promise<void>;
      healthCheck: () => Promise<any>;
    }
  ) {
    this._name = name;
    this._version = version;
    this.implementation = implementation;
  }

  get name(): string {
    return this._name;
  }

  get version(): string {
    return this._version;
  }

  async initialize(config?: any): Promise<void> {
    return this.implementation.initialize(config);
  }

  async execute(input: any, context: any): Promise<any> {
    return this.implementation.execute(input, context);
  }

  async cleanup(): Promise<void> {
    return this.implementation.cleanup();
  }

  async healthCheck(): Promise<any> {
    return this.implementation.healthCheck();
  }
}