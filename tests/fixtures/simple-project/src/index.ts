import { TodoApp } from './components/TodoApp';

class Application {
  private app: TodoApp | null = null;

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      // Wait for DOM to be ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.initApp());
      } else {
        this.initApp();
      }
    } catch (error) {
      console.error('Failed to initialize application:', error);
      this.showError('Failed to load application');
    }
  }

  private initApp(): void {
    const container = document.getElementById('app');
    if (!container) {
      console.error('App container not found');
      return;
    }

    this.app = new TodoApp({ container });
    console.log('Todo App initialized successfully');
  }

  private showError(message: string): void {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    errorDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ff4444;
      color: white;
      padding: 16px;
      border-radius: 4px;
      z-index: 1000;
    `;
    
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
      errorDiv.remove();
    }, 5000);
  }

  public getApp(): TodoApp | null {
    return this.app;
  }
}

// Initialize application
const app = new Application();

// Export for testing
export { Application, app };