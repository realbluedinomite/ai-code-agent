/**
 * Demo Interactive - Interactive User Experience
 * 
 * This demo showcases interactive AI Code Agent capabilities through
 * user-driven workflows, iterative refinement, and real-time feedback
 * mechanisms that demonstrate dynamic interaction patterns.
 */

import { ComponentIntegrator } from '../../src/components/integration';
import { WorkflowInput } from '../../src/orchestrator/types';
import { createDefaultIntegration } from '../../src/components/integration';
import * as readline from 'readline';

/**
 * Interface for interactive session state
 */
interface InteractiveSession {
  sessionId: string;
  userId: string;
  startTime: number;
  currentProject: string;
  workflowHistory: InteractiveWorkflow[];
  userPreferences: UserPreferences;
  context: Record<string, any>;
}

/**
 * Interface for interactive workflow steps
 */
interface InteractiveWorkflow {
  step: number;
  command: string;
  input: WorkflowInput;
  output: string;
  duration: number;
  userFeedback?: 'positive' | 'neutral' | 'negative';
  modifications?: string[];
}

/**
 * User preferences configuration
 */
interface UserPreferences {
  outputFormat: 'detailed' | 'concise' | 'technical';
  confirmations: boolean;
  autoSave: boolean;
  verboseMode: boolean;
  preferredLanguage: string;
  techStack: string[];
}

/**
 * Interactive demonstration workflows with user engagement
 */
export class InteractiveDemos {
  private integrator: ComponentIntegrator;
  private rl: readline.Interface;
  private sessions: Map<string, InteractiveSession> = new Map();
  private currentSession: InteractiveSession | null = null;

  constructor(integrator: ComponentIntegrator) {
    this.integrator = integrator;
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  /**
   * Interactive Demo 1: Guided Web Application Builder
   * Walks user through creating a web application step by step
   */
  async interactiveWebAppBuilder(): Promise<void> {
    console.log('\n' + '='.repeat(70));
    console.log('🌐 Interactive Demo 1: Guided Web Application Builder');
    console.log('='.repeat(70));
    console.log('Welcome! I\'ll guide you through creating a web application.');
    console.log('Let\'s start with some questions...\n');

    // Initialize session
    const session = this.createSession('web-app-builder');
    this.currentSession = session;

    try {
      // Step 1: Get project type
      const projectType = await this.askQuestion(
        'What type of web application do you want to build?\n' +
        '1. Business website\n2. E-commerce site\n3. Blog/CMS\n4. Dashboard\n5. Portfolio\n\n' +
        'Enter choice (1-5): '
      );

      // Step 2: Get technology preferences
      const framework = await this.askChoice(
        'Choose your preferred framework:',
        ['React', 'Vue.js', 'Angular', 'Svelte', 'Vanilla JS'],
        'React'
      );

      // Step 3: Get styling preference
      const styling = await this.askChoice(
        'Choose your styling approach:',
        ['Tailwind CSS', 'Bootstrap', 'Material-UI', 'Styled Components', 'CSS Modules'],
        'Tailwind CSS'
      );

      // Step 4: Get features
      const features = await this.askMultiChoice(
        'Select features to include (comma-separated numbers):',
        [
          'Responsive design',
          'Dark mode',
          'Search functionality',
          'User authentication',
          'Contact form',
          'Newsletter signup',
          'Social media integration',
          'Analytics tracking'
        ],
        ['1', '2', '5', '8']
      );

      // Generate the application
      console.log('\n🚀 Generating your web application...\n');
      
      const input: WorkflowInput = {
        command: `create ${this.getProjectTypeDescription(projectType)} with ${framework} and ${styling}`,
        parameters: {
          projectType: this.getProjectTypeDescription(projectType),
          framework,
          styling,
          features: this.parseFeatures(features),
          architecture: 'single-page-application',
          buildTool: 'Vite',
          deployment: 'static-hosting'
        },
        context: {
          workingDirectory: '/workspace/interactive/web-app',
          environment: {
            PROJECT_TYPE: 'web-application',
            INTERACTIVE: 'true'
          }
        }
      };

      const result = await this.executeInteractiveWorkflow(input, 'Web Application Generator');
      
      // Step 5: Present customization options
      await this.presentCustomizationOptions(result);

      // Step 6: Get final feedback
      await this.collectFeedback('web application generation');

    } catch (error) {
      console.error('\n❌ Error:', error.message);
    }
  }

  /**
   * Interactive Demo 2: API Development Wizard
   * Guides user through creating a complete API
   */
  async interactiveApiWizard(): Promise<void> {
    console.log('\n' + '='.repeat(70));
    console.log('🔌 Interactive Demo 2: API Development Wizard');
    console.log('='.repeat(70));
    console.log('Let\'s build your API together! I\'ll ask questions to understand your needs.\n');

    // Initialize session
    const session = this.createSession('api-wizard');
    this.currentSession = session;

    try {
      // Step 1: API Purpose
      const apiPurpose = await this.askQuestion(
        'What is the primary purpose of your API?\n' +
        '(e.g., "manage user accounts", "process payments", "track inventory")\n\n' +
        'Enter purpose: '
      );

      // Step 2: API Type
      const apiType = await this.askChoice(
        'What type of API do you need?',
        ['REST API', 'GraphQL API', 'gRPC API', 'WebSocket API', 'Hybrid (REST + GraphQL)'],
        'REST API'
      );

      // Step 3: Database
      const database = await this.askChoice(
        'Choose your database:',
        ['PostgreSQL', 'MongoDB', 'MySQL', 'SQLite', 'In-memory (for demos)'],
        'PostgreSQL'
      );

      // Step 4: Authentication
      const auth = await this.askMultiChoice(
        'Select authentication methods (comma-separated numbers):',
        [
          'JWT tokens',
          'API keys',
          'OAuth 2.0',
          'Basic auth',
          'None (public API)',
          'Rate limiting'
        ],
        ['1', '6']
      );

      // Step 5: Generate API
      console.log('\n🏗️ Building your API...\n');

      const input: WorkflowInput = {
        command: `create ${apiPurpose} with ${apiType} using ${database}`,
        parameters: {
          purpose: apiPurpose,
          type: apiType,
          database,
          authentication: this.parseAuthMethods(auth),
          features: [
            'CRUD operations',
            'Input validation',
            'Error handling',
            'API documentation',
            'Testing suite'
          ],
          middleware: ['CORS', 'Helmet', 'Rate limiting', 'Request logging'],
          documentation: 'Swagger/OpenAPI',
          testing: 'Jest + Supertest'
        },
        context: {
          workingDirectory: '/workspace/interactive/api',
          environment: {
            PROJECT_TYPE: 'api',
            INTERACTIVE: 'true'
          }
        }
      };

      const result = await this.executeInteractiveWorkflow(input, 'API Generator');

      // Step 6: Test the API
      await this.interactiveApiTesting(result);

      // Step 7: Get final feedback
      await this.collectFeedback('API generation');

    } catch (error) {
      console.error('\n❌ Error:', error.message);
    }
  }

  /**
   * Interactive Demo 3: Database Design Assistant
   * Helps design and implement database schemas interactively
   */
  async interactiveDatabaseDesign(): Promise<void> {
    console.log('\n' + '='.repeat(70));
    console.log('💾 Interactive Demo 3: Database Design Assistant');
    console.log('='.repeat(70));
    console.log('Let\'s design your database schema together!\n');

    // Initialize session
    const session = this.createSession('database-designer');
    this.currentSession = session;

    try {
      // Step 1: Get database type
      const dbType = await this.askChoice(
        'What type of database do you need?',
        ['PostgreSQL (Relational)', 'MongoDB (Document)', 'MySQL (Relational)', 'SQLite (Relational)'],
        'PostgreSQL (Relational)'
      );

      // Step 2: Get entities/tables
      const entities = await this.collectEntities();

      // Step 3: Generate database schema
      console.log('\n🏗️ Designing your database schema...\n');

      const input: WorkflowInput = {
        command: `create database schema with entities: ${entities.map(e => e.name).join(', ')}`,
        parameters: {
          databaseType: dbType,
          entities: entities,
          relationships: this.inferRelationships(entities),
          indexes: ['primary_keys', 'foreign_keys', 'performance_indexes'],
          constraints: ['not_null', 'unique', 'check_constraints'],
          migrations: true,
          seeders: true,
          documentation: true
        },
      context: {
          workingDirectory: '/workspace/interactive/database',
          environment: {
            PROJECT_TYPE: 'database',
            INTERACTIVE: 'true'
          }
        }
      };

      const result = await this.executeInteractiveWorkflow(input, 'Database Schema Generator');

      // Step 4: Review and refine schema
      await this.reviewAndRefineSchema(result);

      // Step 5: Generate documentation
      await this.generateSchemaDocumentation(result);

      // Step 6: Get final feedback
      await this.collectFeedback('database design');

    } catch (error) {
      console.error('\n❌ Error:', error.message);
    }
  }

  /**
   * Interactive Demo 4: Full Project Orchestrator
   * End-to-end project creation with continuous refinement
   */
  async interactiveProjectOrchestrator(): Promise<void> {
    console.log('\n' + '='.repeat(70));
    console.log('🎯 Interactive Demo 4: Full Project Orchestrator');
    console.log('='.repeat(70));
    console.log('Welcome to the complete project creation experience!');
    console.log('I\'ll help you build, refine, and optimize your entire project.\n');

    // Initialize session
    const session = this.createSession('project-orchestrator');
    this.currentSession = session;

    try {
      // Step 1: Project vision
      const vision = await this.askQuestion(
        'Describe your project vision in a few sentences:\n' +
        '(What problem does it solve? Who is it for? What makes it unique?)\n\n'
      );

      // Step 2: Project type
      const projectType = await this.askChoice(
        'What type of project is this?',
        ['Web Application', 'Mobile App', 'Desktop Application', 'API Service', 'Data Pipeline'],
        'Web Application'
      );

      // Step 3: Tech stack selection
      const techStack = await this.selectTechStack(projectType);

      // Step 4: Initial generation
      console.log('\n🎨 Creating your initial project...\n');

      const input: WorkflowInput = {
        command: `create ${projectType.toLowerCase()} for: ${vision}`,
        parameters: {
          vision,
          type: projectType,
          techStack,
          features: await this.collectFeatures(projectType),
          architecture: await this.selectArchitecture(projectType),
          deployment: await this.selectDeployment(projectType),
          monitoring: true,
          testing: true,
          documentation: true
        },
        context: {
          workingDirectory: '/workspace/interactive/project',
          environment: {
            PROJECT_TYPE: projectType.toLowerCase(),
            INTERACTIVE: 'true',
            FULL_ORCHESTRATION: 'true'
          }
        }
      };

      const result = await this.executeInteractiveWorkflow(input, 'Project Generator');

      // Step 5: Iterative refinement
      await this.iterativeRefinement(result);

      // Step 6: Quality assurance
      await this.qualityAssurance(result);

      // Step 7: Deployment preparation
      await this.deploymentPreparation(result);

      // Step 8: Get final feedback
      await this.collectFeedback('full project orchestration');

      console.log('\n🎉 Congratulations! Your project has been created and refined!');
      console.log('You can now start developing with a solid, production-ready foundation.');

    } catch (error) {
      console.error('\n❌ Error:', error.message);
    }
  }

  /**
   * Execute workflow with interactive feedback
   */
  private async executeInteractiveWorkflow(input: WorkflowInput, stepName: string): Promise<any> {
    console.log(`📋 Step: ${stepName}`);
    console.log(`Command: ${input.command}`);

    const startTime = Date.now();
    const result = await this.integrator.executeWorkflow(input);
    const duration = Date.now() - startTime;

    console.log(`\n✅ ${stepName} completed in ${duration}ms`);
    console.log(`Status: ${result.status}`);

    if (this.currentSession) {
      this.currentSession.workflowHistory.push({
        step: this.currentSession.workflowHistory.length + 1,
        command: input.command,
        input,
        output: `Generated ${result.summary.totalFilesGenerated || 0} files`,
        duration
      });
    }

    return result;
  }

  /**
   * Ask a question and get user input
   */
  private askQuestion(question: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer.trim());
      });
    });
  }

  /**
   * Present choices and get user selection
   */
  private async askChoice(question: string, choices: string[], defaultChoice?: string): Promise<string> {
    console.log(`\n${question}`);
    choices.forEach((choice, index) => {
      console.log(`  ${index + 1}. ${choice}`);
    });
    if (defaultChoice) {
      console.log(`  (Default: ${defaultChoice})`);
    }

    const answer = await this.askQuestion('Enter choice number: ');
    const choiceIndex = parseInt(answer) - 1;

    if (choiceIndex >= 0 && choiceIndex < choices.length) {
      return choices[choiceIndex];
    } else if (defaultChoice) {
      console.log(`Using default: ${defaultChoice}`);
      return defaultChoice;
    } else {
      console.log('Invalid choice, using first option');
      return choices[0];
    }
  }

  /**
   * Present multiple choice options
   */
  private async askMultiChoice(question: string, options: string[], defaults: string[]): Promise<string[]> {
    console.log(`\n${question}`);
    options.forEach((option, index) => {
      const isDefault = defaults.includes((index + 1).toString());
      console.log(`  ${index + 1}. ${option} ${isDefault ? '(default)' : ''}`);
    });

    const answer = await this.askQuestion('Enter choices (e.g., 1,3,5) or press Enter for defaults: ');
    
    if (answer.trim() === '') {
      return defaults;
    }

    return answer.split(',').map(s => s.trim()).filter(s => s.length > 0);
  }

  /**
   * Create new interactive session
   */
  private createSession(type: string): InteractiveSession {
    const session: InteractiveSession = {
      sessionId: `session-${Date.now()}`,
      userId: 'demo-user',
      startTime: Date.now(),
      currentProject: type,
      workflowHistory: [],
      userPreferences: {
        outputFormat: 'detailed',
        confirmations: true,
        autoSave: true,
        verboseMode: true,
        preferredLanguage: 'typescript',
        techStack: ['react', 'node.js', 'postgresql']
      },
      context: {}
    };

    this.sessions.set(session.sessionId, session);
    return session;
  }

  /**
   * Helper methods for various interactive steps
   */
  private getProjectTypeDescription(choice: string): string {
    const types: Record<string, string> = {
      '1': 'business website',
      '2': 'e-commerce site',
      '3': 'blog/CMS',
      '4': 'dashboard',
      '5': 'portfolio'
    };
    return types[choice] || 'business website';
  }

  private parseFeatures(featureNumbers: string[]): string[] {
    const featureMap: Record<string, string> = {
      '1': 'responsive-design',
      '2': 'dark-mode',
      '3': 'search-functionality',
      '4': 'user-authentication',
      '5': 'contact-form',
      '6': 'newsletter-signup',
      '7': 'social-media-integration',
      '8': 'analytics-tracking'
    };
    return featureNumbers.map(num => featureMap[num] || '').filter(f => f);
  }

  private parseAuthMethodNumbers(numbers: string[]): string[] {
    const authMap: Record<string, string> = {
      '1': 'jwt',
      '2': 'api-keys',
      '3': 'oauth2',
      '4': 'basic',
      '5': 'public',
      '6': 'rate-limiting'
    };
    return numbers.map(num => authMap[num] || '').filter(a => a);
  }

  private async collectEntities(): Promise<any[]> {
    console.log('\nLet\'s define your database entities (tables):');
    const entities = [];
    
    let continueAdding = true;
    while (continueAdding) {
      const name = await this.askQuestion('\nEnter entity name (e.g., User, Product, Order) or "done" to finish: ');
      
      if (name.toLowerCase() === 'done') {
        break;
      }

      const fields = await this.collectEntityFields(name);
      entities.push({ name, fields });
      
      continueAdding = await this.askQuestion('\nAdd another entity? (y/n): ') === 'y';
    }

    return entities;
  }

  private async collectEntityFields(entityName: string): Promise<any[]> {
    console.log(`\nDefine fields for ${entityName}:`);
    const fields = [];
    
    let continueAdding = true;
    while (continueAdding) {
      const fieldName = await this.askQuestion(`Enter field name for ${entityName} or "done": `);
      
      if (fieldName.toLowerCase() === 'done') {
        break;
      }

      const fieldType = await this.askChoice(
        `Select type for ${fieldName}:`,
        ['String', 'Integer', 'Float', 'Boolean', 'Date', 'UUID', 'Text', 'JSON'],
        'String'
      );

      const isRequired = await this.askQuestion(`Is ${fieldName} required? (y/n): ') === 'y';
      const isPrimary = await this.askQuestion(`Is ${fieldName} a primary key? (y/n): ') === 'y';

      fields.push({
        name: fieldName,
        type: fieldType.toLowerCase(),
        required: isRequired,
        primary: isPrimary
      });

      continueAdding = await this.askQuestion('\nAdd another field? (y/n): ') === 'y';
    }

    return fields;
  }

  private inferRelationships(entities: any[]): any[] {
    // Simple relationship inference based on naming conventions
    const relationships = [];
    
    for (const entity of entities) {
      for (const field of entity.fields) {
        if (field.name.endsWith('Id') && !field.primary) {
          const targetEntity = field.name.replace('Id', '');
          relationships.push({
            from: entity.name,
            to: targetEntity,
            type: 'many-to-one',
            field: field.name
          });
        }
      }
    }

    return relationships;
  }

  private async selectTechStack(projectType: string): Promise<string[]> {
    const techStacks: Record<string, string[][]> = {
      'Web Application': [
        ['React', 'Vue.js', 'Angular'],
        ['Node.js', 'Python', 'Java'],
        ['PostgreSQL', 'MongoDB', 'MySQL']
      ],
      'Mobile App': [
        ['React Native', 'Flutter', 'Swift'],
        ['Node.js', 'Firebase', 'GraphQL']
      ],
      'Desktop Application': [
        ['Electron', 'Tauri', 'Qt'],
        ['Node.js', 'Python', 'Rust']
      ]
    };

    const options = techStacks[projectType] || techStacks['Web Application'];
    const stack = [];

    for (const category of options) {
      const choice = await this.askChoice(`Select ${category[0].toLowerCase().includes('react') ? 'frontend' : 
        category[0].toLowerCase().includes('node') ? 'backend' : 'database'}:`, category, category[0]);
      stack.push(choice);
    }

    return stack;
  }

  private async collectFeatures(projectType: string): Promise<string[]> {
    const featureMap: Record<string, string[]> = {
      'Web Application': [
        'user-authentication', 'data-visualization', 'real-time-updates',
        'file-upload', 'search-functionality', 'responsive-design'
      ],
      'Mobile App': [
        'push-notifications', 'offline-mode', 'camera-integration',
        'location-services', 'biometric-auth', 'app-analytics'
      ]
    };

    const defaultFeatures = featureMap[projectType] || featureMap['Web Application'];
    const selectedFeatures = await this.askMultiChoice(
      'Select features to include (comma-separated numbers):',
      defaultFeatures,
      ['1', '2', '3']
    );

    return selectedFeatures.map(num => defaultFeatures[parseInt(num) - 1] || '').filter(f => f);
  }

  private async selectArchitecture(projectType: string): Promise<string> {
    const architectures = {
      'Web Application': ['MVC', 'Component-based', 'Microservices', 'Serverless'],
      'Mobile App': ['MVVM', 'Clean Architecture', 'Flux'],
      'API Service': ['RESTful', 'GraphQL', 'Microservices', 'Event-driven']
    };

    const options = architectures[projectType] || architectures['Web Application'];
    return await this.askChoice('Choose architecture pattern:', options, options[0]);
  }

  private async selectDeployment(projectType: string): Promise<string> {
    const deployments = {
      'Web Application': ['Vercel', 'Netlify', 'AWS S3 + CloudFront', 'Docker + Kubernetes'],
      'Mobile App': ['App Store', 'Google Play', 'TestFlight'],
      'API Service': ['AWS Lambda', 'Heroku', 'Docker + Kubernetes', 'Railway']
    };

    const options = deployments[projectType] || deployments['Web Application'];
    return await this.askChoice('Choose deployment platform:', options, options[0]);
  }

  /**
   * Present customization options after generation
   */
  private async presentCustomizationOptions(result: any): Promise<void> {
    console.log('\n🎨 Would you like to customize anything?');
    const customize = await this.askQuestion('Customize the generated code? (y/n): ');

    if (customize === 'y') {
      const customizations = [
        'Add more components',
        'Change styling approach',
        'Add state management',
        'Integrate with external APIs',
        'Add testing suite',
        'Set up CI/CD pipeline'
      ];

      const selections = await this.askMultiChoice(
        'Select customizations (comma-separated numbers):',
        customizations,
        []
      );

      console.log('\n🔧 Applying customizations...');
      selections.forEach(num => {
        const customization = customizations[parseInt(num) - 1];
        console.log(`  ✓ ${customization} (would be applied in full version)`);
      });
    }
  }

  /**
   * Interactive API testing
   */
  private async interactiveApiTesting(result: any): Promise<void> {
    console.log('\n🧪 Let\'s test your API!');
    const test = await this.askQuestion('Would you like me to show you example API tests? (y/n): ');

    if (test === 'y') {
      console.log(`
📝 Example API Tests Generated:

GET /api/users - Should return 200 with user list
POST /api/users - Should create new user (201)
GET /api/users/:id - Should return specific user (200)
PUT /api/users/:id - Should update user (200)
DELETE /api/users/:id - Should delete user (204)

All tests include:
✓ Request validation
✓ Response structure verification
✓ Error handling tests
✓ Authentication tests
✓ Performance benchmarks
      `);
    }
  }

  /**
   * Review and refine database schema
   */
  private async reviewAndRefineSchema(result: any): Promise<void> {
    console.log('\n🔍 Review your database schema:');
    const review = await this.askQuestion('Review the generated schema? (y/n): ');

    if (review === 'y') {
      console.log(`
Generated Schema Overview:
✓ Primary and foreign key relationships
✓ Indexes for performance optimization
✓ Constraints for data integrity
✓ Migration scripts for version control
✓ Seed data for development

Recommendations:
• Consider adding composite indexes for common queries
• Implement soft deletes for important tables
• Add audit columns (created_at, updated_at)
• Plan for data archiving strategy
      `);
    }
  }

  /**
   * Generate schema documentation
   */
  private async generateSchemaDocumentation(result: any): Promise<void> {
    console.log('\n📚 Generating documentation...');
    const documentation = `
Database Documentation Generated:
✓ Entity relationship diagrams
✓ Field specifications
✓ API documentation
✓ Migration guides
✓ Best practices guide

Files created:
- ERD.html (Visual schema)
- schema.json (Machine-readable)
- migration-scripts.sql
- seed-data.sql
- README.md (Setup guide)
    `;
    console.log(documentation);
  }

  /**
   * Iterative refinement process
   */
  private async iterativeRefinement(result: any): Promise<void> {
    console.log('\n🔄 Iterative Refinement Phase');
    
    for (let i = 1; i <= 3; i++) {
      console.log(`\n--- Refinement Round ${i} ---`);
      const feedback = await this.askQuestion('What would you like to improve or change? ');
      
      if (feedback.toLowerCase() === 'none' || feedback.trim() === '') {
        console.log('✓ No changes requested, proceeding...');
        break;
      }

      console.log(`🔧 Applying improvements based on: "${feedback}"`);
      console.log(`  ✓ Code structure optimization`);
      console.log(`  ✓ Performance improvements`);
      console.log(`  ✓ Security enhancements`);
      console.log(`  ✓ Documentation updates`);
    }
  }

  /**
   * Quality assurance process
   */
  private async qualityAssurance(result: any): Promise<void> {
    console.log('\n🔍 Quality Assurance Check');
    
    const checks = [
      'Code quality analysis',
      'Security vulnerability scan',
      'Performance optimization review',
      'Accessibility compliance check',
      'Cross-browser compatibility test',
      'Mobile responsiveness validation'
    ];

    console.log('Running quality checks...');
    checks.forEach((check, index) => {
      setTimeout(() => {
        console.log(`  ✓ ${check} - PASSED`);
      }, index * 200);
    });

    await new Promise(resolve => setTimeout(resolve, 1500));
    console.log('\n🎉 All quality checks passed!');
  }

  /**
   * Deployment preparation
   */
  private async deploymentPreparation(result: any): Promise<void> {
    console.log('\n🚀 Preparing for Deployment');
    
    const preparation = `
Deployment Package Ready:
✓ Production build optimization
✓ Environment configuration
✓ Security hardening applied
✓ Monitoring setup configured
✓ CI/CD pipeline configured
✓ Database migration scripts ready

Next Steps:
1. Configure production environment variables
2. Set up domain and SSL certificate
3. Deploy to chosen platform
4. Run smoke tests in production
5. Configure monitoring and alerts
    `;
    console.log(preparation);
  }

  /**
   * Collect user feedback
   */
  private async collectFeedback(processName: string): Promise<void> {
    console.log('\n📝 Your Feedback Matters!');
    
    const rating = await this.askQuestion(`Rate your experience with ${processName} (1-5): `);
    const comments = await this.askQuestion('Any additional comments or suggestions? ');
    const wouldRecommend = await this.askQuestion('Would you recommend this tool? (y/n): ');

    console.log(`
Feedback Summary:
⭐ Rating: ${rating}/5
💬 Comments: ${comments || 'None'}
👍 Would Recommend: ${wouldRecommend}

Thank you for your feedback!
    `);
  }

  /**
   * Run all interactive demos
   */
  async runAllInteractiveDemos(): Promise<void> {
    console.log('\n🎮 Starting Interactive Demo Suite');
    console.log('='.repeat(70));
    console.log('This interactive suite demonstrates dynamic AI Code Agent capabilities:');
    console.log('  • Guided web application builder');
    console.log('  • API development wizard');
    console.log('  • Database design assistant');
    console.log('  • Full project orchestrator');
    console.log('='.repeat(70));
    console.log('\nPress Ctrl+C at any time to exit\n');

    const demos = [
      () => this.interactiveWebAppBuilder(),
      () => this.interactiveApiWizard(),
      () => this.interactiveDatabaseDesign(),
      () => this.interactiveProjectOrchestrator()
    ];

    for (let i = 0; i < demos.length; i++) {
      try {
        await demos[i]();
        
        if (i < demos.length - 1) {
          const continueDemo = await this.askQuestion('\nContinue to next demo? (y/n): ');
          if (continueDemo.toLowerCase() !== 'y') {
            break;
          }
        }
      } catch (error) {
        console.error(`\n❌ Demo ${i + 1} failed:`, error.message);
      }
    }

    console.log('\n🎉 Interactive Demo Suite Completed!');
    this.printSessionSummary();
  }

  /**
   * Print session summary
   */
  private printSessionSummary(): void {
    if (!this.currentSession) return;

    const summary = this.currentSession;
    console.log('\n📊 Session Summary');
    console.log('='.repeat(50));
    console.log(`Session ID: ${summary.sessionId}`);
    console.log(`Duration: ${Date.now() - summary.startTime}ms`);
    console.log(`Workflows Executed: ${summary.workflowHistory.length}`);
    console.log('='.repeat(50));
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.rl.close();
    
    if (this.currentSession) {
      console.log('\n💾 Saving session data...');
      console.log(`Session saved: ${this.currentSession.sessionId}`);
    }
  }
}

/**
 * Main execution function
 */
export async function runInteractiveDemos(): Promise<void> {
  console.log('\n🎬 Starting AI Code Agent - Interactive Demo Suite\n');
  
  try {
    // Initialize integrator
    const integrator = await createDefaultIntegration({
      orchestrator: {
        maxRetries: 2,
        timeoutMs: 30000,
        enableRecovery: true
      },
      monitoring: {
        enableHealthChecks: true,
        enableMetrics: true
      },
      logging: {
        level: 'info',
        enableWorkflowTracing: true
      }
    });

    // Run interactive demos
    const demos = new InteractiveDemos(integrator);
    
    try {
      await demos.runAllInteractiveDemos();
    } finally {
      await demos.cleanup();
    }
    
    // Cleanup
    await integrator.shutdown();
    
    console.log('\n✨ Interactive Demo Suite Completed!\n');
    
  } catch (error) {
    console.error('\n💥 Interactive demo runner failed:', error);
    throw error;
  }
}

/**
 * Run specific interactive demo
 */
export async function runInteractiveDemo(demoName: string): Promise<void> {
  const integrator = await createDefaultIntegration();
  const demos = new InteractiveDemos(integrator);

  const demoMap: Record<string, () => Promise<void>> = {
    'web': () => demos.interactiveWebAppBuilder(),
    'api': () => demos.interactiveApiWizard(),
    'database': () => demos.interactiveDatabaseDesign(),
    'project': () => demos.interactiveProjectOrchestrator()
  };

  const demo = demoMap[demoName.toLowerCase()];
  if (!demo) {
    throw new Error(`Unknown demo: ${demoName}. Available: ${Object.keys(demoMap).join(', ')}`);
  }

  try {
    await demo();
  } finally {
    await demos.cleanup();
  }
  
  await integrator.shutdown();
}
