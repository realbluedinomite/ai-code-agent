/**
 * Orchestrator Usage Example
 * 
 * Demonstrates how to use the complete Orchestrator workflow including:
 * - Input Parser
 * - Project Analyzer
 * - Planner
 * - User Approval
 * - Implementer
 * - Reviewer
 */

import { Orchestrator, OrchestratorConfig } from './orchestrator';

async function example() {
  // Create orchestrator configuration
  const config: OrchestratorConfig = {
    components: {
      inputParser: 'InputParser',
      projectAnalyzer: 'ProjectAnalyzer',
      planner: 'BasicPlanner',
      implementer: 'Implementer',
      reviewer: 'Reviewer'
    },
    workflow: {
      maxRetries: 3,
      timeoutMs: 300000, // 5 minutes
      enableRecovery: true,
      validateIntermediateResults: true
    },
    session: {
      enablePersistence: false,
      sessionTimeoutMs: 1800000, // 30 minutes
      maxConcurrentSessions: 10
    },
    logging: {
      level: 'info',
      enablePerformanceTracking: true,
      enableWorkflowTracing: true
    }
  };

  // Initialize orchestrator
  const orchestrator = new Orchestrator(config);
  
  // Set up event listeners for workflow tracking
  setupEventListeners(orchestrator);
  
  await orchestrator.initialize();

  try {
    // Execute a complete workflow
    const input = {
      command: 'add a new user authentication feature with JWT tokens',
      parameters: {},
      context: {
        workingDirectory: process.cwd(),
        environment: process.env
      }
    };

    console.log('🚀 Starting complete workflow execution...');
    console.log('📋 Command:', input.command);
    
    const result = await orchestrator.executeWorkflow(input);
    
    console.log('\n✅ Workflow completed!');
    console.log('Status:', result.status);
    console.log('Summary:', result.summary);
    
    if (result.results.plan) {
      console.log('\n📝 Plan created with', result.results.plan.steps.length, 'steps');
    }
    
    if (result.results.userApproval) {
      console.log('👤 User approval:', result.results.userApproval.status);
    }
    
    if (result.results.implementation) {
      console.log('🛠️ Implementation completed with', 
        result.results.implementation.summary?.totalChanges || 0, 'changes');
    }
    
    if (result.results.review) {
      console.log('🔍 Review completed with score:', result.results.review.score);
    }

    if (result.errors.length > 0) {
      console.log('\n⚠️ Errors encountered:', result.errors.length);
      result.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error.message} (${error.code})`);
      });
    }

    // Get orchestrator health
    const health = await orchestrator.getHealthStatus();
    console.log('\n🏥 Orchestrator health status:', {
      healthy: health.healthy,
      components: Object.keys(health.components).length,
      activeSessions: health.sessions.active
    });

  } catch (error) {
    console.error('❌ Workflow failed:', error);
  } finally {
    // Cleanup
    await orchestrator.cleanup();
  }
}

// Set up event listeners for tracking workflow progress
function setupEventListeners(orchestrator: Orchestrator) {
  orchestrator.on('initialized', () => {
    console.log('🔧 Orchestrator initialized');
  });

  orchestrator.on('workflow:start', (data) => {
    console.log('🔄 Workflow started:', data.context.workflowId);
  });

  orchestrator.on('workflow:complete', (data) => {
    console.log('✅ Workflow completed:', data.result.status);
  });

  orchestrator.on('approval:requested', (data) => {
    console.log('👤 User approval requested for plan:', data.plan?.title || 'Untitled');
  });

  orchestrator.on('approval:response', (data) => {
    console.log('👤 User approval response:', data.approval.status);
  });

  orchestrator.on('component:registered', (data) => {
    console.log('🔌 Component registered:', data.component);
  });

  // Handle errors
  orchestrator.on('error', (error) => {
    console.error('💥 Orchestrator error:', error);
  });
}

// Example of advanced usage with session management and multiple workflows
async function advancedExample() {
  const config: OrchestratorConfig = {
    components: {
      inputParser: 'InputParser',
      projectAnalyzer: 'ProjectAnalyzer',
      planner: 'BasicPlanner',
      implementer: 'Implementer',
      reviewer: 'Reviewer'
    },
    workflow: {
      maxRetries: 3,
      timeoutMs: 300000,
      enableRecovery: true,
      validateIntermediateResults: true
    },
    session: {
      enablePersistence: true,
      sessionTimeoutMs: 3600000, // 1 hour
      maxConcurrentSessions: 5
    },
    logging: {
      level: 'debug',
      enablePerformanceTracking: true,
      enableWorkflowTracing: true
    }
  };

  const orchestrator = new Orchestrator(config);
  await orchestrator.initialize();

  try {
    // Create a session
    const sessionId = await (orchestrator as any).sessionManager.createSession(
      process.cwd(),
      'developer@example.com'
    );

    console.log(`🔐 Created session: ${sessionId}`);

    // Execute multiple workflows in the same session
    const workflows = [
      {
        command: 'add user registration functionality',
        description: 'Simple feature addition'
      },
      {
        command: 'implement authentication system with OAuth',
        description: 'Complex feature requiring multiple steps'
      },
      {
        command: 'refactor database models for better performance',
        description: 'Refactoring task'
      }
    ];

    for (let i = 0; i < workflows.length; i++) {
      const workflow = workflows[i];
      console.log(`\n🔄 Executing workflow ${i + 1}/${workflows.length}`);
      console.log(`📝 Command: ${workflow.command}`);
      
      try {
        const result = await orchestrator.executeWorkflow({
          command: workflow.command,
          parameters: {},
          context: {
            workingDirectory: process.cwd(),
            environment: process.env
          }
        }, sessionId);

        console.log(`✅ Workflow ${i + 1} completed:`, result.status);
        
        // Display workflow details
        if (result.results.plan) {
          console.log(`  📋 Plan: ${result.results.plan.steps.length} steps`);
        }
        if (result.results.userApproval) {
          console.log(`  👤 Approval: ${result.results.userApproval.status}`);
        }
        if (result.results.implementation) {
          console.log(`  🛠️ Implementation: ${result.results.implementation.summary?.completed || 0} steps completed`);
        }
        if (result.results.review) {
          console.log(`  🔍 Review: Score ${result.results.review.score}/100`);
        }

      } catch (error) {
        console.error(`❌ Workflow ${i + 1} failed:`, error.message);
      }
    }

    // Get session information
    const sessions = orchestrator.getActiveSessions();
    const session = orchestrator.getSession(sessionId);
    
    console.log(`\n📊 Session Summary:`);
    console.log(`  🔢 Active sessions: ${sessions.length}`);
    console.log(`  📁 Workspace: ${session?.metadata.workspacePath}`);
    console.log(`  👤 User: ${session?.metadata.userId}`);
    console.log(`  ⏰ Created: ${session?.metadata.createdAt.toISOString()}`);
    console.log(`  🔄 Active workflows: ${session?.activeWorkflows.length || 0}`);

    // Cleanup session
    await orchestrator.terminateSession(sessionId);
    console.log('🗑️ Session terminated');

  } catch (error) {
    console.error('❌ Advanced workflow failed:', error);
  } finally {
    await orchestrator.cleanup();
  }
}

// Export examples for use in other modules
export { example, advancedExample };

// Run example if this file is executed directly
if (require.main === module) {
  console.log('Running Orchestrator example...');
  example().catch(console.error);
}