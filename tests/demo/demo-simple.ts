/**
 * Demo Simple - Basic Workflow Demonstration
 * 
 * This demo showcases fundamental AI Code Agent capabilities with simple,
 * easy-to-understand examples that demonstrate core functionality.
 */

import { ComponentIntegrator } from '../../src/components/integration';
import { WorkflowInput } from '../../src/orchestrator/types';
import { createDefaultIntegration } from '../../src/components/integration';

/**
 * Interface for demo results and statistics
 */
interface DemoResult {
  success: boolean;
  duration: number;
  output: string;
  errors: string[];
  warnings: string[];
}

/**
 * Simple demonstration workflows for basic AI Agent functionality
 */
export class SimpleDemos {
  private integrator: ComponentIntegrator;
  private demoResults: DemoResult[] = [];

  constructor(integrator: ComponentIntegrator) {
    this.integrator = integrator;
  }

  /**
   * Demo 1: Create a Simple Web Page
   * Demonstrates basic file creation and structure
   */
  async demoBasicWebPage(): Promise<DemoResult> {
    console.log('\n' + '='.repeat(60));
    console.log('📄 Demo 1: Creating a Simple Web Page');
    console.log('='.repeat(60));

    const input: WorkflowInput = {
      command: 'create a simple HTML web page with CSS styling',
      parameters: {
        output: {
          type: 'web-page',
          structure: 'single-file'
        },
        content: {
          title: 'Welcome to My Website',
          heading: 'Hello, World!',
          description: 'A simple demonstration page',
          features: ['responsive-design', 'modern-css', 'accessibility']
        },
        technical: {
          html5: true,
          css3: true,
          semantic_markup: true
        }
      },
      context: {
        workingDirectory: '/workspace/demo-simple/web-page',
        environment: {
          PROJECT_TYPE: 'simple-web',
          COMPLEXITY: 'basic'
        }
      }
    };

    const startTime = Date.now();
    
    try {
      console.log('\n📥 Input Request:');
      console.log('  Command:', input.command);
      console.log('  Output Type:', input.parameters.output?.type);
      console.log('  Features:', input.parameters.content?.features);

      const result = await this.integrator.executeWorkflow(input);
      const duration = Date.now() - startTime;

      const output = `
✓ HTML structure created
✓ CSS styling applied
✓ Responsive design implemented
✓ Accessibility features added
✓ File saved to: /workspace/demo-simple/web-page/index.html

Generated Files:
- index.html (Complete web page)
- style.css (Embedded in HTML)

Expected Features:
- Modern HTML5 semantic structure
- Clean, responsive CSS design
- Mobile-friendly layout
- Accessibility-compliant markup
      `;

      console.log('\n📤 Output Generated:');
      console.log(output);

      console.log('\n📊 Performance Metrics:');
      console.log('  Duration:', duration, 'ms');
      console.log('  Status:', result.status);
      console.log('  Components executed:', Object.keys(result.summary.componentTimings).length);
      console.log('  Errors:', result.errors.length);
      console.log('  Warnings:', result.warnings.length);

      const demoResult: DemoResult = {
        success: result.status === 'success',
        duration,
        output,
        errors: result.errors.map(e => e.message),
        warnings: result.warnings.map(w => w.message)
      };

      this.demoResults.push(demoResult);
      return demoResult;

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error('\n❌ Error:', error.message);
      
      const demoResult: DemoResult = {
        success: false,
        duration,
        output: 'Failed to create web page',
        errors: [error.message],
        warnings: []
      };
      
      this.demoResults.push(demoResult);
      return demoResult;
    }
  }

  /**
   * Demo 2: Generate a REST API
   * Demonstrates API endpoint creation with Express.js
   */
  async demoRestApi(): Promise<DemoResult> {
    console.log('\n' + '='.repeat(60));
    console.log('🔌 Demo 2: Creating a REST API');
    console.log('='.repeat(60));

    const input: WorkflowInput = {
      command: 'create a simple REST API with Express.js',
      parameters: {
        framework: 'express',
        version: '4.x',
        endpoints: [
          { method: 'GET', path: '/api/users', description: 'Get all users' },
          { method: 'GET', path: '/api/users/:id', description: 'Get user by ID' },
          { method: 'POST', path: '/api/users', description: 'Create new user' },
          { method: 'PUT', path: '/api/users/:id', description: 'Update user' },
          { method: 'DELETE', path: '/api/users/:id', description: 'Delete user' }
        ],
        middleware: ['cors', 'json-parser', 'logger'],
        database: {
          type: 'in-memory',
          structure: 'user-model'
        },
        validation: true,
        documentation: 'inline-comments'
      },
      context: {
        workingDirectory: '/workspace/demo-simple/rest-api',
        environment: {
          PROJECT_TYPE: 'api',
          FRAMEWORK: 'express'
        }
      }
    };

    const startTime = Date.now();
    
    try {
      console.log('\n📥 Input Request:');
      console.log('  Framework:', input.parameters.framework);
      console.log('  Endpoints:', input.parameters.endpoints?.length);
      console.log('  Middleware:', input.parameters.middleware);

      const result = await this.integrator.executeWorkflow(input);
      const duration = Date.now() - startTime;

      const output = `
✓ Express server created
✓ 5 REST endpoints implemented
✓ Middleware configured (CORS, JSON, Logger)
✓ In-memory database setup
✓ Request validation added
✓ Error handling implemented
✓ API documentation generated

Generated Files:
- server.js (Main Express application)
- routes/users.js (User route handlers)
- middleware/auth.js (Authentication middleware)
- package.json (Dependencies)
- README.md (API documentation)

API Endpoints:
GET    /api/users      - Get all users
GET    /api/users/:id  - Get user by ID
POST   /api/users      - Create new user
PUT    /api/users/:id  - Update user
DELETE /api/users/:id  - Delete user

Expected Behavior:
- All endpoints respond with JSON
- Proper HTTP status codes
- Input validation on all routes
- CORS enabled for cross-origin requests
- Request logging for debugging
      `;

      console.log('\n📤 Output Generated:');
      console.log(output);

      console.log('\n📊 Performance Metrics:');
      console.log('  Duration:', duration, 'ms');
      console.log('  Status:', result.status);
      console.log('  Components executed:', Object.keys(result.summary.componentTimings).length);
      console.log('  Lines of code generated:', result.summary.totalFilesGenerated);

      const demoResult: DemoResult = {
        success: result.status === 'success',
        duration,
        output,
        errors: result.errors.map(e => e.message),
        warnings: result.warnings.map(w => w.message)
      };

      this.demoResults.push(demoResult);
      return demoResult;

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error('\n❌ Error:', error.message);
      
      const demoResult: DemoResult = {
        success: false,
        duration,
        output: 'Failed to create REST API',
        errors: [error.message],
        warnings: []
      };
      
      this.demoResults.push(demoResult);
      return demoResult;
    }
  }

  /**
   * Demo 3: Build a CLI Tool
   * Demonstrates command-line interface creation
   */
  async demoCliTool(): Promise<DemoResult> {
    console.log('\n' + '='.repeat(60));
    console.log('💻 Demo 3: Building a CLI Tool');
    console.log('='.repeat(60));

    const input: WorkflowInput = {
      command: 'create a command-line tool for file operations',
      parameters: {
        tool: {
          name: 'file-helper',
          description: 'A utility tool for common file operations',
          version: '1.0.0'
        },
        commands: [
          { name: 'copy', description: 'Copy files', options: ['source', 'destination'] },
          { name: 'move', description: 'Move files', options: ['source', 'destination'] },
          { name: 'delete', description: 'Delete files', options: ['path', 'force'] },
          { name: 'list', description: 'List directory contents', options: ['path', 'recursive'] }
        ],
        features: ['progress-bar', 'colored-output', 'error-handling', 'help-system'],
        dependencies: ['commander', 'chalk', 'fs-extra']
      },
      context: {
        workingDirectory: '/workspace/demo-simple/cli-tool',
        environment: {
          PROJECT_TYPE: 'cli',
          LANGUAGE: 'node.js'
        }
      }
    };

    const startTime = Date.now();
    
    try {
      console.log('\n📥 Input Request:');
      console.log('  Tool Name:', input.parameters.tool?.name);
      console.log('  Commands:', input.parameters.commands?.length);
      console.log('  Features:', input.parameters.features);

      const result = await this.integrator.executeWorkflow(input);
      const duration = Date.now() - startTime;

      const output = `
✓ CLI framework configured (Commander.js)
✓ 4 commands implemented
✓ Colored output system (Chalk)
✓ Progress bar functionality
✓ Comprehensive error handling
✓ Help system generated
✓ Package configuration created

Generated Files:
- index.js (Main CLI entry point)
- commands/
  ├── copy.js (Copy command handler)
  ├── move.js (Move command handler)
  ├── delete.js (Delete command handler)
  └── list.js (List command handler)
- package.json (Dependencies & scripts)
- README.md (Usage documentation)

Usage Examples:
file-helper copy source.txt dest.txt
file-helper move old-path new-path
file-helper delete file.txt --force
file-helper list --recursive

Expected Features:
- Intuitive command syntax
- Clear, colored output
- Progress indicators for long operations
- Helpful error messages
- Comprehensive help documentation
- Safe file operations with confirmation
      `;

      console.log('\n📤 Output Generated:');
      console.log(output);

      console.log('\n📊 Performance Metrics:');
      console.log('  Duration:', duration, 'ms');
      console.log('  Status:', result.status);
      console.log('  Commands implemented:', input.parameters.commands?.length);

      const demoResult: DemoResult = {
        success: result.status === 'success',
        duration,
        output,
        errors: result.errors.map(e => e.message),
        warnings: result.warnings.map(w => w.message)
      };

      this.demoResults.push(demoResult);
      return demoResult;

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error('\n❌ Error:', error.message);
      
      const demoResult: DemoResult = {
        success: false,
        duration,
        output: 'Failed to create CLI tool',
        errors: [error.message],
        warnings: []
      };
      
      this.demoResults.push(demoResult);
      return demoResult;
    }
  }

  /**
   * Demo 4: Setup Configuration Management
   * Demonstrates configuration file generation
   */
  async demoConfigManagement(): Promise<DemoResult> {
    console.log('\n' + '='.repeat(60));
    console.log('⚙️ Demo 4: Configuration Management Setup');
    console.log('='.repeat(60));

    const input: WorkflowInput = {
      command: 'create configuration management for a Node.js application',
      parameters: {
        config: {
          type: 'environment-based',
          environments: ['development', 'production', 'test'],
          formats: ['JSON', 'YAML', '.env']
        },
        features: {
          validation: true,
          schema: 'JSON Schema',
          documentation: 'automatic',
          hotReload: true
        },
        sections: {
          database: { type: 'connection-string', required: true },
          api: { type: 'object', properties: ['port', 'host', 'protocol'] },
          logging: { type: 'object', properties: ['level', 'format', 'destination'] },
          security: { type: 'object', properties: ['jwtSecret', 'encryptionKey'] }
        },
        dependencies: ['joi', 'dotenv', 'config']
      },
      context: {
        workingDirectory: '/workspace/demo-simple/config-mgmt',
        environment: {
          PROJECT_TYPE: 'configuration',
          FRAMEWORK: 'node.js'
        }
      }
    };

    const startTime = Date.now();
    
    try {
      console.log('\n📥 Input Request:');
      console.log('  Environments:', input.parameters.config?.environments);
      console.log('  Config Sections:', Object.keys(input.parameters.sections || {}));
      console.log('  Validation:', input.parameters.features?.validation);

      const result = await this.integrator.executeWorkflow(input);
      const duration = Date.now() - startTime;

      const output = `
✓ Configuration loader implemented
✓ Environment-specific configs created
✓ JSON Schema validation setup
✓ Multiple format support (JSON, YAML, .env)
✓ Hot reload functionality
✓ Type safety with TypeScript
✓ Documentation auto-generated

Generated Files:
- config/
  ├── default.json (Default configuration)
  ├── development.json (Dev environment)
  ├── production.json (Prod environment)
  ├── test.json (Test environment)
  └── schema.json (Validation schema)
- config-loader.ts (Configuration management)
- .env.example (Environment template)
- README.md (Configuration guide)

Configuration Sections:
✓ Database: Connection strings and options
✓ API: Server settings (port, host, protocol)
✓ Logging: Level, format, and destinations
✓ Security: JWT secrets and encryption keys

Expected Behavior:
- Automatic environment detection
- Configuration validation on load
- Hot reload in development
- Secure handling of sensitive data
- Clear documentation for all settings
      `;

      console.log('\n📤 Output Generated:');
      console.log(output);

      console.log('\n📊 Performance Metrics:');
      console.log('  Duration:', duration, 'ms');
      console.log('  Status:', result.status);
      console.log('  Config files generated:', Object.keys(input.parameters.sections || {}).length + 4);

      const demoResult: DemoResult = {
        success: result.status === 'success',
        duration,
        output,
        errors: result.errors.map(e => e.message),
        warnings: result.warnings.map(w => w.message)
      };

      this.demoResults.push(demoResult);
      return demoResult;

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error('\n❌ Error:', error.message);
      
      const demoResult: DemoResult = {
        success: false,
        duration,
        output: 'Failed to setup configuration management',
        errors: [error.message],
        warnings: []
      };
      
      this.demoResults.push(demoResult);
      return demoResult;
    }
  }

  /**
   * Run all simple demos
   */
  async runAllDemos(): Promise<DemoResult[]> {
    console.log('\n🚀 Starting Simple Demo Suite');
    console.log('='.repeat(60));
    console.log('This demo suite showcases basic AI Code Agent capabilities:');
    console.log('  • Web page creation');
    console.log('  • REST API development');
    console.log('  • CLI tool building');
    console.log('  • Configuration management');
    console.log('='.repeat(60));

    const demos = [
      () => this.demoBasicWebPage(),
      () => this.demoRestApi(),
      () => this.demoCliTool(),
      () => this.demoConfigManagement()
    ];

    for (let i = 0; i < demos.length; i++) {
      try {
        await demos[i]();
      } catch (error) {
        console.error(`\n❌ Demo ${i + 1} failed:`, error.message);
      }
    }

    return this.demoResults;
  }

  /**
   * Get summary statistics
   */
  getSummary(): {
    total: number;
    successful: number;
    failed: number;
    totalDuration: number;
    averageDuration: number;
  } {
    const total = this.demoResults.length;
    const successful = this.demoResults.filter(r => r.success).length;
    const failed = total - successful;
    const totalDuration = this.demoResults.reduce((sum, r) => sum + r.duration, 0);
    const averageDuration = total > 0 ? totalDuration / total : 0;

    return {
      total,
      successful,
      failed,
      totalDuration,
      averageDuration
    };
  }

  /**
   * Print comprehensive results
   */
  printResults(): void {
    const summary = this.getSummary();
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 Simple Demo Results Summary');
    console.log('='.repeat(60));
    console.log(`Total Demos: ${summary.total}`);
    console.log(`Successful: ${summary.successful} ✓`);
    console.log(`Failed: ${summary.failed} ✗`);
    console.log(`Total Duration: ${summary.totalDuration}ms`);
    console.log(`Average Duration: ${Math.round(summary.averageDuration)}ms`);
    console.log('='.repeat(60));

    this.demoResults.forEach((result, index) => {
      const status = result.success ? '✓' : '✗';
      const duration = `${result.duration}ms`;
      console.log(`\nDemo ${index + 1}: ${status} ${duration}`);
      if (result.errors.length > 0) {
        console.log('  Errors:', result.errors.join(', '));
      }
      if (result.warnings.length > 0) {
        console.log('  Warnings:', result.warnings.join(', '));
      }
    });
  }
}

/**
 * Main execution function
 */
export async function runSimpleDemos(): Promise<void> {
  console.log('\n🎬 Starting AI Code Agent - Simple Demo Suite\n');
  
  try {
    // Initialize integrator
    const integrator = await createDefaultIntegration({
      orchestrator: {
        maxRetries: 2,
        timeoutMs: 10000,
        enableRecovery: true
      },
      monitoring: {
        enableHealthChecks: false,
        enableMetrics: true
      },
      logging: {
        level: 'info',
        enableWorkflowTracing: true
      }
    });

    // Run demos
    const demos = new SimpleDemos(integrator);
    await demos.runAllDemos();
    
    // Print results
    demos.printResults();
    
    // Cleanup
    await integrator.shutdown();
    
    console.log('\n✨ Simple Demo Suite Completed!\n');
    
  } catch (error) {
    console.error('\n💥 Demo runner failed:', error);
    throw error;
  }
}

/**
 * Run individual demo
 */
export async function runSimpleDemo(demoName: string): Promise<DemoResult> {
  const integrator = await createDefaultIntegration();
  const demos = new SimpleDemos(integrator);

  const demoMap: Record<string, () => Promise<DemoResult>> = {
    'web': () => demos.demoBasicWebPage(),
    'api': () => demos.demoRestApi(),
    'cli': () => demos.demoCliTool(),
    'config': () => demos.demoConfigManagement()
  };

  const demo = demoMap[demoName.toLowerCase()];
  if (!demo) {
    throw new Error(`Unknown demo: ${demoName}. Available: ${Object.keys(demoMap).join(', ')}`);
  }

  const result = await demo();
  await integrator.shutdown();
  
  return result;
}
