/**
 * Example Workflows - Complete AI Agent Functionality Demonstrations
 * 
 * These examples showcase real-world usage patterns and complete workflows
 * that integrate all components of the AI agent system.
 */

import { ComponentIntegrator } from '../../../src/components/integration';
import { WorkflowInput } from '../../../src/orchestrator/types';
import { createDefaultIntegration } from '../../../src/components/integration';

/**
 * Example workflow scenarios demonstrating complete AI agent functionality
 */
export class ExampleWorkflows {
  private integrator: ComponentIntegrator;

  constructor(integrator: ComponentIntegrator) {
    this.integrator = integrator;
  }

  /**
   * Example 1: E-commerce Platform Development
   * Demonstrates complete web application development workflow
   */
  async ecommercePlatformDevelopment(): Promise<any> {
    console.log('\n=== E-commerce Platform Development ===');
    
    const input: WorkflowInput = {
      command: 'create a modern e-commerce platform with React frontend and Node.js backend',
      parameters: {
        frontend: {
          framework: 'React',
          language: 'TypeScript',
          stateManagement: 'Redux Toolkit',
          styling: 'Tailwind CSS',
          features: ['product-catalog', 'shopping-cart', 'user-auth', 'checkout', 'admin-panel']
        },
        backend: {
          framework: 'Node.js + Express',
          database: 'PostgreSQL',
          authentication: 'JWT',
          api: 'RESTful',
          features: ['product-management', 'order-processing', 'payment-integration', 'email-notifications']
        },
        infrastructure: {
          hosting: 'AWS',
          containerization: 'Docker',
          caching: 'Redis',
          monitoring: 'CloudWatch'
        },
        additional: {
          testing: 'Jest + Cypress',
          ci: 'GitHub Actions',
          documentation: 'Swagger',
          security: 'OWASP guidelines'
        }
      },
      context: {
        workingDirectory: '/workspace/ecommerce-platform',
        environment: {
          NODE_ENV: 'development',
          PROJECT_TYPE: 'full-stack'
        }
      }
    };

    return this.executeWorkflow('E-commerce Platform', input);
  }

  /**
   * Example 2: Microservices Architecture
   * Demonstrates complex system architecture planning
   */
  async microservicesArchitecture(): Promise<any> {
    console.log('\n=== Microservices Architecture Planning ===');
    
    const input: WorkflowInput = {
      command: 'design and plan a microservices-based banking system',
      parameters: {
        domain: 'banking',
        architecture: {
          pattern: 'microservices',
          communication: 'event-driven',
          dataStrategy: 'database-per-service',
          apiGateway: 'Kong',
          serviceDiscovery: 'Consul'
        },
        services: [
          {
            name: 'user-service',
            responsibilities: ['user-management', 'authentication', 'profile'],
            database: 'PostgreSQL'
          },
          {
            name: 'account-service',
            responsibilities: ['account-management', 'balance-tracking'],
            database: 'PostgreSQL'
          },
          {
            name: 'transaction-service',
            responsibilities: ['transaction-processing', 'ledger'],
            database: 'MongoDB'
          },
          {
            name: 'notification-service',
            responsibilities: ['email', 'sms', 'push-notifications'],
            database: 'Redis'
          },
          {
            name: 'fraud-detection-service',
            responsibilities: ['risk-analysis', 'fraud-prevention'],
            database: 'Cassandra'
          }
        ],
        infrastructure: {
          orchestration: 'Kubernetes',
          messageBroker: 'Apache Kafka',
          monitoring: 'Prometheus + Grafana',
          logging: 'ELK Stack',
          security: 'OAuth 2.0 + mTLS'
        },
        requirements: {
          scalability: 'horizontal',
          availability: '99.9%',
          security: 'PCI DSS compliance',
          performance: '<100ms response time'
        }
      },
      projectPath: '/workspace/banking-system',
      context: {
        workingDirectory: '/workspace/banking-system',
        environment: {
          DOMAIN: 'banking',
          COMPLIANCE: 'PCI-DSS'
        }
      }
    };

    return this.executeWorkflow('Microservices Banking System', input);
  }

  /**
   * Example 3: Data Science Pipeline
   * Demonstrates data analysis and ML workflow
   */
  async dataSciencePipeline(): Promise<any> {
    console.log('\n=== Data Science Pipeline ===');
    
    const input: WorkflowInput = {
      command: 'build an end-to-end data science pipeline for customer churn prediction',
      parameters: {
        objective: 'predict customer churn',
        data: {
          sources: ['customer_database', 'usage_logs', 'support_tickets', 'transaction_history'],
          volume: '10M records',
          formats: ['CSV', 'JSON', 'Parquet']
        },
        pipeline: {
          ingestion: 'Apache Kafka + Spark Streaming',
          storage: 'Data Lake (S3) + Data Warehouse (Snowflake)',
          processing: 'Apache Spark + Pandas',
          machineLearning: {
            frameworks: ['scikit-learn', 'XGBoost', 'TensorFlow'],
            modelTypes: ['classification', 'ensemble'],
            features: ['customer-demographics', 'usage-patterns', 'interaction-history'],
            target: 'churn-probability'
          },
          deployment: {
            platform: 'AWS SageMaker',
            serving: 'REST API',
            monitoring: 'Model Drift Detection'
          }
        },
        visualization: {
          businessIntelligence: 'Tableau',
          dashboards: 'Grafana',
          reporting: 'Automated reports with insights'
        },
        requirements: {
          accuracy: '>85%',
          latency: '<500ms',
          explainability: 'SHAP values',
          compliance: 'GDPR'
        }
      },
      context: {
        workingDirectory: '/workspace/churn-prediction',
        environment: {
          PROJECT_TYPE: 'data-science',
          ML_FOCUS: 'supervised-learning'
        }
      }
    };

    return this.executeWorkflow('Customer Churn Prediction', input);
  }

  /**
   * Example 4: DevOps Infrastructure as Code
   * Demonstrates infrastructure and CI/CD setup
   */
  async devOpsInfrastructure(): Promise<any> {
    console.log('\n=== DevOps Infrastructure as Code ===');
    
    const input: WorkflowInput = {
      command: 'setup complete DevOps infrastructure with CI/CD for a fintech startup',
      parameters: {
        infrastructure: {
          cloudProvider: 'AWS',
          region: 'us-west-2',
          networking: {
            vpc: 'multi-tier',
            subnets: 'public-private',
            security: 'zero-trust'
          },
          compute: {
            containers: 'EKS (Kubernetes)',
            serverless: 'Lambda',
            databases: 'RDS + DynamoDB',
            caching: 'ElastiCache'
          },
          storage: {
            objectStorage: 'S3',
            fileStorage: 'EFS',
            backup: 'cross-region-replication'
          }
        },
        ci_cd: {
          versionControl: 'Git (GitHub)',
          ciPipeline: 'GitHub Actions',
          testing: ['unit-tests', 'integration-tests', 'security-scans'],
          deployment: 'blue-green',
          rollback: 'automated'
        },
        monitoring: {
          metrics: 'CloudWatch + Prometheus',
          logging: 'CloudWatch Logs + ELK',
          tracing: 'AWS X-Ray',
          alerting: 'PagerDuty',
          dashboards: 'Grafana'
        },
        security: {
          authentication: 'OAuth 2.0 + SAML',
          authorization: 'RBAC',
          secrets: 'AWS Secrets Manager',
          scanning: 'Snyk + Checkmarx',
          compliance: 'SOC2 + PCI-DSS'
        },
        development: {
          localEnvironment: 'Docker Compose',
          staging: 'full-production-mirror',
          environmentParity: '99% match'
        }
      },
      projectPath: '/workspace/fintech-app',
      context: {
        workingDirectory: '/workspace/fintech-app',
        environment: {
          INDUSTRY: 'fintech',
          COMPLIANCE: 'SOC2-PCI-DSS'
        }
      }
    };

    return this.executeWorkflow('Fintech DevOps Infrastructure', input);
  }

  /**
   * Example 5: Mobile App Development
   * Demonstrates cross-platform mobile development
   */
  async mobileAppDevelopment(): Promise<any> {
    console.log('\n=== Mobile App Development ===');
    
    const input: WorkflowInput = {
      command: 'develop a cross-platform fitness tracking mobile application',
      parameters: {
        platforms: ['iOS', 'Android', 'Web'],
        framework: 'React Native',
        stateManagement: 'Redux + RTK Query',
        navigation: 'React Navigation',
        uiLibrary: 'React Native Elements',
        features: {
          core: ['user-profile', 'workout-tracking', 'progress-analytics'],
          advanced: ['social-sharing', 'achievements', 'push-notifications'],
          integrations: ['health-kit', 'google-fit', 'wearables']
        },
        backend: {
          api: 'Node.js + GraphQL',
          database: 'MongoDB + Redis',
          storage: 'Firebase Storage',
          pushNotifications: 'Firebase Cloud Messaging'
        },
        monetization: {
          model: 'freemium',
          features: ['basic-free', 'premium-subscription', 'in-app-purchases']
        },
        analytics: {
          tracking: 'Firebase Analytics',
          crashReporting: 'Crashlytics',
          performance: 'Firebase Performance Monitoring'
        },
        testing: {
          unitTesting: 'Jest',
          integrationTesting: 'Detox',
          deviceTesting: 'AWS Device Farm'
        },
        deployment: {
          ios: 'App Store',
          android: 'Google Play Store',
          web: 'Netlify'
        }
      },
      context: {
        workingDirectory: '/workspace/fitness-app',
        environment: {
          PROJECT_TYPE: 'mobile',
          PLATFORMS: 'iOS-Android-Web'
        }
      }
    };

    return this.executeWorkflow('Fitness Tracking App', input);
  }

  /**
   * Example 6: Legacy System Modernization
   * Demonstrates refactoring and migration workflow
   */
  async legacySystemModernization(): Promise<any> {
    console.log('\n=== Legacy System Modernization ===');
    
    const input: WorkflowInput = {
      command: 'modernize a legacy monolithic Java application to modern microservices architecture',
      parameters: {
        currentState: {
          architecture: 'monolithic',
          technology: 'Java 8 + Spring MVC',
          database: 'Oracle DB',
          deployment: 'on-premise',
          challenges: ['scalability', 'maintainability', 'deployment-speed']
        },
        targetArchitecture: {
          pattern: 'microservices',
          technology: 'Java 17 + Spring Boot',
          database: 'PostgreSQL + MongoDB',
          deployment: 'Kubernetes + Docker',
          api: 'REST + GraphQL'
        },
        migrationStrategy: {
          approach: 'strangler-fig-pattern',
          phases: [
            {
              phase: 1,
              focus: 'extract-user-service',
              scope: 'user-authentication-and-management',
              timeline: '3 months'
            },
            {
              phase: 2,
              focus: 'extract-order-service',
              scope: 'order-processing-and-management',
              timeline: '4 months'
            },
            {
              phase: 3,
              focus: 'extract-payment-service',
              scope: 'payment-processing',
              timeline: '3 months'
            }
          ]
        },
        modernization: {
          database: 'gradual-migration',
          testing: 'contract-testing',
          monitoring: 'distributed-tracing',
          security: 'zero-trust'
        },
        risks: {
          dataIntegrity: 'gradual-migration-with-validation',
          systemDowntime: 'blue-green-deployment',
          businessContinuity: 'feature-flags'
        }
      },
      projectPath: '/workspace/legacy-monolith',
      context: {
        workingDirectory: '/workspace/legacy-monolith',
        environment: {
          MIGRATION: 'legacy-to-microservices',
          PHASE: 'planning'
        }
      }
    };

    return this.executeWorkflow('Legacy System Modernization', input);
  }

  /**
   * Example 7: Real-time Analytics Dashboard
   * Demonstrates real-time data processing and visualization
   */
  async realTimeAnalyticsDashboard(): Promise<any> {
    console.log('\n=== Real-time Analytics Dashboard ===');
    
    const input: WorkflowInput = {
      command: 'build a real-time analytics dashboard for IoT sensor data with machine learning insights',
      parameters: {
        useCase: 'industrial IoT monitoring',
        dataSources: {
          sensors: ['temperature', 'humidity', 'pressure', 'vibration', 'power-consumption'],
          systems: ['HVAC', 'production-line', 'safety-systems'],
          volume: '10,000 events/second',
          velocity: 'real-time-streaming'
        },
        technology: {
          ingestion: 'Apache Kafka + Kinesis',
          processing: 'Apache Flink + Spark Streaming',
          storage: {
            realtime: 'Redis + InfluxDB',
            historical: 'TimeSeries Database',
            analytics: 'Elasticsearch'
          },
          ml: {
            frameworks: ['Apache Spark MLlib', 'TensorFlow Serving'],
            models: ['anomaly-detection', 'predictive-maintenance', 'optimization'],
            features: ['pattern-recognition', 'threshold-alerts', 'trend-analysis']
          },
          visualization: {
            frontend: 'React + D3.js',
            charts: 'Recharts + Custom visualizations',
            realTime: 'WebSockets + Server-Sent Events'
          }
        },
        features: {
          dashboards: ['overview', 'sensors', 'alerts', 'trends'],
          analytics: ['predictive-maintenance', 'energy-optimization', 'performance-monitoring'],
          alerts: ['threshold-based', 'anomaly-based', 'predictive']
        },
        requirements: {
          latency: '<100ms for critical alerts',
          accuracy: '>95% for anomaly detection',
          availability: '99.9%',
          scalability: 'horizontal scaling'
        }
      },
      context: {
        workingDirectory: '/workspace/iot-analytics',
        environment: {
          DOMAIN: 'industrial-iot',
          REALTIME: 'true'
        }
      }
    };

    return this.executeWorkflow('IoT Analytics Dashboard', input);
  }

  /**
   * Execute workflow with comprehensive logging
   */
  private async executeWorkflow(name: string, input: WorkflowInput): Promise<any> {
    console.log(`\nExecuting: ${name}`);
    console.log('Command:', input.command);
    console.log('Parameters:', JSON.stringify(input.parameters, null, 2));
    
    const startTime = Date.now();
    const result = await this.integrator.executeWorkflow(input);
    const duration = Date.now() - startTime;

    console.log(`\n=== Workflow Results: ${name} ===`);
    console.log(`Status: ${result.status}`);
    console.log(`Duration: ${duration}ms`);
    console.log(`Components executed:`, Object.keys(result.summary.componentTimings));
    console.log(`Errors: ${result.errors.length}`);
    console.log(`Warnings: ${result.warnings.length}`);

    if (result.results.parsed) {
      console.log('\nParsed Intent:', result.results.parsed.parsed?.intent?.type);
    }

    if (result.results.planned?.plan) {
      console.log('\nPlan Details:');
      console.log(`- Title: ${result.results.planned.plan.title}`);
      console.log(`- Steps: ${result.results.planned.plan.steps?.length || 0}`);
      console.log(`- Complexity: ${result.results.planned.metadata?.planComplexity}`);
    }

    return result;
  }
}

/**
 * Demonstration runner for all example workflows
 */
export async function runAllExamples(): Promise<void> {
  console.log('🚀 Starting AI Agent Component Integration Examples\n');
  console.log('='.repeat(60));
  
  try {
    // Initialize integrator
    const integrator = await createDefaultIntegration({
      orchestrator: {
        maxRetries: 3,
        timeoutMs: 30000,
        enableRecovery: true
      },
      monitoring: {
        enableHealthChecks: true,
        enableMetrics: true,
        healthCheckInterval: 10000
      },
      logging: {
        level: 'info',
        enableWorkflowTracing: true
      }
    });

    const examples = new ExampleWorkflows(integrator);

    // Run all examples
    const workflows = [
      () => examples.ecommercePlatformDevelopment(),
      () => examples.microservicesArchitecture(),
      () => examples.dataSciencePipeline(),
      () => examples.devOpsInfrastructure(),
      () => examples.mobileAppDevelopment(),
      () => examples.legacySystemModernization(),
      () => examples.realTimeAnalyticsDashboard()
    ];

    for (let i = 0; i < workflows.length; i++) {
      try {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`Example ${i + 1} of ${workflows.length}`);
        await workflows[i]();
      } catch (error) {
        console.error(`\n❌ Example ${i + 1} failed:`, error.message);
      }
    }

    // Final summary
    console.log('\n' + '='.repeat(60));
    console.log('🎉 All example workflows completed!');
    console.log('='.repeat(60));

    // Cleanup
    await integrator.shutdown();
    
  } catch (error) {
    console.error('\n💥 Example runner failed:', error);
    throw error;
  }
}

/**
 * Individual example runner
 */
export async function runExample(exampleName: string): Promise<void> {
  const integrator = await createDefaultIntegration();
  const examples = new ExampleWorkflows(integrator);

  const exampleMap: Record<string, () => Promise<any>> = {
    'ecommerce': () => examples.ecommercePlatformDevelopment(),
    'microservices': () => examples.microservicesArchitecture(),
    'datascience': () => examples.dataSciencePipeline(),
    'devops': () => examples.devOpsInfrastructure(),
    'mobile': () => examples.mobileAppDevelopment(),
    'legacy': () => examples.legacySystemModernization(),
    'analytics': () => examples.realTimeAnalyticsDashboard()
  };

  const example = exampleMap[exampleName.toLowerCase()];
  if (!example) {
    throw new Error(`Unknown example: ${exampleName}. Available: ${Object.keys(exampleMap).join(', ')}`);
  }

  await example();
  await integrator.shutdown();
}

/**
 * Performance benchmark across all examples
 */
export async function runPerformanceBenchmark(): Promise<any> {
  console.log('🏁 Running Performance Benchmark\n');
  
  const integrator = await createDefaultIntegration();
  const examples = new ExampleWorkflows(integrator);
  
  const benchmarkScenarios = [
    { name: 'Simple', input: {
      command: 'create simple web app',
      parameters: {},
      context: { workingDirectory: '/tmp', environment: {} }
    }},
    { name: 'Medium', input: {
      command: 'build e-commerce platform with React and Node.js',
      parameters: { complexity: 'medium' },
      context: { workingDirectory: '/tmp', environment: {} }
    }},
    { name: 'Complex', input: {
      command: 'design microservices banking system with advanced security',
      parameters: { complexity: 'high', security: 'advanced' },
      context: { workingDirectory: '/tmp', environment: {} }
    }}
  ];

  const results = [];

  for (const scenario of benchmarkScenarios) {
    const startTime = Date.now();
    const result = await integrator.executeWorkflow(scenario.input);
    const duration = Date.now() - startTime;

    results.push({
      scenario: scenario.name,
      duration,
      status: result.status,
      errors: result.errors.length,
      warnings: result.warnings.length
    });

    console.log(`${scenario.name}: ${duration}ms - ${result.status}`);
  }

  await integrator.shutdown();

  console.log('\n📊 Performance Benchmark Summary:');
  results.forEach(result => {
    console.log(`- ${result.scenario}: ${result.duration}ms (${result.status})`);
  });

  return results;
}
