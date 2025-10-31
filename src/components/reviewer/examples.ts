/**
 * Reviewer Component Examples
 * 
 * This module provides comprehensive examples and usage patterns for the
 * Reviewer component system including all three layers.
 */

import { DatabaseConnectionManager } from '@/database/client';
import { TypedEventBus, eventBus } from '@/core/event-bus';
import {
  Reviewer,
  StaticAnalyzer,
  AIReviewer,
  UserApproval,
  ReviewerInitConfig,
  StaticAnalyzerConfig,
  AIReviewerConfig,
  UserApprovalConfig,
  ReviewConfiguration
} from './index';

/**
 * Example 1: Complete Reviewer System Setup
 * Demonstrates how to set up and use the complete reviewer system
 */
export async function completeReviewerExample(): Promise<void> {
  console.log('=== Complete Reviewer Example ===');

  // Initialize database connection
  const dbManager = new DatabaseConnectionManager();
  await dbManager.connect();

  // Configure event bus
  const eventBus = new TypedEventBus({ verbose: true });

  // Set up event listeners
  eventBus.on('review:session:started', (data) => {
    console.log(`Review session started: ${data.session_id}`);
  });

  eventBus.on('review:file:completed', (data) => {
    console.log(`File completed: ${data.file_path} - Score: ${data.overall_score}`);
  });

  eventBus.on('approval:required', (data) => {
    console.log(`Approval required for: ${data.file_path}`);
  });

  // Configure reviewer
  const reviewerConfig: ReviewerInitConfig = {
    dbManager,
    eventBus,
    reviewConfig: {
      enable_static_analysis: true,
      enable_ai_review: true,
      enable_user_approval: true,
      max_file_size_bytes: 1048576, // 1MB
      supported_languages: ['typescript', 'javascript', 'python'],
      approval_thresholds: {
        auto_approve_score: 85,
        require_approval_score: 70,
        critical_issues_auto_reject: true
      }
    },
    staticAnalyzerConfig: {
      enableTypeScript: true,
      enableESLint: true,
      maxFileSize: 1048576,
      supportedExtensions: ['.ts', '.js', '.tsx', '.jsx']
    },
    aiReviewerConfig: {
      groqConfig: {
        apiKey: process.env.GROQ_API_KEY || 'your-api-key',
        model: 'llama3-8b-8192',
        temperature: 0.1,
        maxTokens: 2048
      },
      enableLogicAnalysis: true,
      enableSecurityAnalysis: true,
      enablePerformanceAnalysis: true,
      enableArchitectureAnalysis: true,
      enableReadabilityAnalysis: true
    },
    userApprovalConfig: {
      enableAutoApproval: true,
      autoApprovalThreshold: 85,
      requireApprovalThreshold: 70,
      autoRejectCriticalIssues: true,
      approvalTimeoutMinutes: 1440
    }
  };

  // Create reviewer
  const reviewer = new Reviewer(reviewerConfig);

  try {
    // Start review session
    const sessionId = await reviewer.startReviewSession({
      project_id: 'example-project-123',
      user_id: 'user-456'
    });

    console.log(`Review session started: ${sessionId}`);

    // Sample code files to review
    const codeFiles = [
      {
        id: 'file-1',
        file_path: 'src/components/Button.tsx',
        content: `
import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ children, onClick, disabled }) => {
  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className="btn btn-primary"
    >
      {children}
    </button>
  );
};
        `,
        language: 'typescript'
      },
      {
        id: 'file-2',
        file_path: 'src/utils/helpers.js',
        content: `
// Utility functions
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function calculateTotal(items) {
  let total = 0;
  for (let i = 0; i < items.length; i++) {
    total += items[i].price;
  }
  return total;
}

export { formatDate, calculateTotal };
        `,
        language: 'javascript'
      }
    ];

    // Review individual file
    console.log('\n--- Reviewing individual file ---');
    const singleResult = await reviewer.reviewFile(codeFiles[0]);
    console.log(`Single file result:`, {
      file_path: singleResult.file_path,
      overall_score: singleResult.overall_score,
      decision: singleResult.approval_decision?.decision,
      processing_time_ms: singleResult.processing_time_ms
    });

    // Review multiple files in batch
    console.log('\n--- Reviewing files in batch ---');
    const batchResults = await reviewer.reviewFiles(codeFiles);
    console.log('Batch results:', batchResults.summary);

    // Complete session
    const session = await reviewer.completeReviewSession();
    console.log(`Session completed:`, {
      session_id: session.id,
      files_reviewed: session.files_reviewed,
      files_approved: session.files_approved,
      files_rejected: session.files_rejected,
      total_issues: session.total_issues,
      processing_time_ms: session.processing_stats.total_time_ms
    });

    // Get final statistics
    const stats = reviewer.getStats();
    console.log('Final statistics:', stats);

  } catch (error) {
    console.error('Reviewer example failed:', error);
  } finally {
    await reviewer.dispose();
    await dbManager.disconnect();
  }
}

/**
 * Example 2: Standalone Static Analyzer
 * Shows how to use only the static analysis component
 */
export async function standaloneStaticAnalyzerExample(): Promise<void> {
  console.log('\n=== Standalone Static Analyzer Example ===');

  const dbManager = new DatabaseConnectionManager();
  await dbManager.connect();

  const staticAnalyzer = new StaticAnalyzer(dbManager, undefined, {
    enableTypeScript: true,
    enableESLint: true,
    maxFileSize: 1048576,
    supportedExtensions: ['.ts', '.js'],
    eslintRules: {
      'no-console': 'warn',
      'no-unused-vars': 'error'
    }
  });

  try {
    const testFile = {
      id: 'test-file',
      file_path: 'test.ts',
      content: `
const unusedVariable = "this is not used";

function calculateSum(a: number, b: number): number {
  return a + b;
}

console.log(calculateSum(1, 2));
      `,
      language: 'typescript'
    };

    const result = await staticAnalyzer.analyzeFile(testFile);
    
    console.log('Static analysis result:', {
      file_path: result.file_path,
      syntax_valid: result.syntax_valid,
      type_check_passed: result.type_check_passed,
      total_issues: result.syntax_issues.length + result.type_issues.length + result.best_practice_issues.length,
      metrics: result.metrics
    });

    // Analyze multiple files
    const files = [
      testFile,
      {
        id: 'test-file-2',
        file_path: 'test.js',
        content: `
function processData(data) {
  if (!data) return null;
  return data.map(item => item.value);
}
        `,
        language: 'javascript'
      }
    ];

    const batchResults = await staticAnalyzer.analyzeFiles(files);
    console.log('Batch analysis completed:', batchResults.length, 'files processed');

  } catch (error) {
    console.error('Static analyzer example failed:', error);
  } finally {
    await dbManager.disconnect();
  }
}

/**
 * Example 3: Standalone AI Reviewer
 * Shows how to use only the AI review component
 */
export async function standaloneAIReviewerExample(): Promise<void> {
  console.log('\n=== Standalone AI Reviewer Example ===');

  const dbManager = new DatabaseConnectionManager();
  await dbManager.connect();

  const aiReviewer = new AIReviewer(dbManager, undefined, {
    groqConfig: {
      apiKey: process.env.GROQ_API_KEY || 'your-api-key',
      model: 'llama3-8b-8192',
      temperature: 0.1,
      maxTokens: 2048
    },
    enableLogicAnalysis: true,
    enableSecurityAnalysis: true,
    enablePerformanceAnalysis: true,
    enableArchitectureAnalysis: true,
    enableReadabilityAnalysis: true,
    scoringWeights: {
      logic: 0.25,
      security: 0.25,
      performance: 0.2,
      architecture: 0.15,
      readability: 0.15
    }
  });

  try {
    const testCode = {
      file_id: 'complex-component',
      file_path: 'src/components/UserProfile.tsx',
      content: `
import React, { useState, useEffect } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  profile: {
    avatar: string;
    bio: string;
  };
}

export const UserProfile: React.FC<{ userId: string }> = ({ userId }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      try {
        const response = await fetch(\`/api/users/\${userId}\`);
        const userData = await response.json();
        setUser(userData);
      } catch (error) {
        console.error('Failed to load user:', error);
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, [userId]);

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>User not found</div>;

  return (
    <div className="user-profile">
      <img src={user.profile.avatar} alt={user.name} />
      <h1>{user.name}</h1>
      <p>{user.profile.bio}</p>
      <a href={\`mailto:\${user.email}\`}>{user.email}</a>
    </div>
  );
};
      `,
      language: 'typescript',
      context: {
        project_type: 'web-application',
        framework: 'React',
        dependencies: ['react', 'typescript']
      }
    };

    const result = await aiReviewer.reviewFile(testCode);

    console.log('AI review result:', {
      file_path: result.file_path,
      overall_score: result.overall_score,
      findings_count: result.findings.length,
      critical_findings: result.findings.filter(f => f.severity === 'critical').length,
      recommendations: result.recommendations.slice(0, 3)
    });

    // Show some findings
    console.log('\nTop findings:');
    result.findings
      .filter(f => f.severity === 'critical' || f.severity === 'high')
      .slice(0, 3)
      .forEach((finding, index) => {
        console.log(\`\${index + 1}. [\${finding.severity.toUpperCase()}] \${finding.category}\`);
        console.log(\`   Message: \${finding.message}\`);
        console.log(\`   Suggestion: \${finding.suggestion}\`);
      });

    // Review multiple files
    const files = [
      testCode,
      {
        file_id: 'utility-function',
        file_path: 'src/utils/auth.ts',
        content: `
export function validatePassword(password: string): boolean {
  if (password.length < 8) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  return true;
}

export function hashPassword(password: string): string {
  // WARNING: This is a simplified example - use proper hashing in production
  return btoa(password);
}
        `,
        language: 'typescript'
      }
    ];

    const batchResults = await aiReviewer.reviewFiles(files);
    console.log(\`\nBatch AI review completed: \${batchResults.length} files reviewed\`);

  } catch (error) {
    console.error('AI reviewer example failed:', error);
  } finally {
    await dbManager.disconnect();
  }
}

/**
 * Example 4: Standalone User Approval System
 * Shows how to use only the user approval component
 */
export async function standaloneUserApprovalExample(): Promise<void> {
  console.log('\n=== Standalone User Approval Example ===');

  const dbManager = new DatabaseConnectionManager();
  await dbManager.connect();

  const userApproval = new UserApproval(dbManager, undefined, {
    enableAutoApproval: true,
    autoApprovalThreshold: 85,
    requireApprovalThreshold: 70,
    autoRejectCriticalIssues: true,
    maxIgnorableIssues: 5,
    approvalTimeoutMinutes: 60
  });

  try {
    // Simulate static analysis and AI review results
    const mockStaticAnalysis = {
      file_id: 'test-file',
      file_path: 'src/example.ts',
      syntax_valid: true,
      type_check_passed: true,
      syntax_issues: [],
      type_issues: [],
      best_practice_issues: [
        {
          file_id: 'test-file',
          file_path: 'src/example.ts',
          line: 5,
          message: 'Consider using const instead of let',
          severity: 'info' as const,
          rule_id: 'prefer-const',
          rule_name: 'Prefer Const',
          auto_fixable: true
        }
      ],
      metrics: {
        lines_of_code: 25,
        cyclomatic_complexity: 3,
        maintainability_index: 85
      },
      timestamp: new Date()
    };

    const mockAIReview = {
      file_id: 'test-file',
      file_path: 'src/example.ts',
      overall_score: 88,
      findings: [
        {
          id: 'finding-1',
          category: 'readability' as const,
          severity: 'low' as const,
          line: 8,
          message: 'Consider extracting complex logic into a separate function',
          explanation: 'This function does multiple things which reduces readability',
          suggestion: 'Split into smaller, focused functions',
          auto_fixable: false
        }
      ],
      summary: 'Code quality is good with minor improvements needed',
      recommendations: ['Consider function decomposition', 'Add more comments'],
      strengths: ['Good type safety', 'Clean structure'],
      weaknesses: ['Function complexity could be reduced'],
      timestamp: new Date(),
      processing_time_ms: 1500
    };

    // Process approval request
    const approvalRequest = {
      review_id: 'review-session-123',
      file_id: 'test-file',
      file_path: 'src/example.ts',
      static_analysis: mockStaticAnalysis,
      ai_review: mockAIReview,
      reviewer_notes: 'Initial review pass'
    };

    const decision = await userApproval.processApprovalRequest(approvalRequest);

    console.log('Approval decision:', {
      file_path: decision.file_id,
      decision: decision.decision,
      reasoning: decision.reasoning,
      auto_generated: decision.reasoning?.includes('auto')
    });

    // Simulate user making manual decision
    if (decision.decision === 'requires_manual_review') {
      const userDecision = await userApproval.processApprovalDecision({
        review_id: decision.review_id,
        file_id: decision.file_id,
        user_id: 'user-123',
        decision: 'approved',
        reasoning: 'Code looks good after review',
        reviewer_metadata: {
          experience_level: 'senior',
          domain_expertise: ['typescript', 'react'],
          time_spent_seconds: 120
        }
      });

      console.log('User decision:', userDecision);
    }

    // Batch approval processing
    const batchRequests = [
      approvalRequest,
      {
        review_id: 'review-session-123',
        file_id: 'test-file-2',
        file_path: 'src/example2.ts',
        static_analysis: {
          ...mockStaticAnalysis,
          file_id: 'test-file-2',
          syntax_valid: false,
          syntax_issues: [
            {
              file_id: 'test-file-2',
              file_path: 'src/example2.ts',
              line: 3,
              message: 'Syntax error: missing semicolon',
              severity: 'error' as const
            }
          ]
        },
        ai_review: {
          ...mockAIReview,
          file_id: 'test-file-2',
          overall_score: 45,
          findings: [
            {
              id: 'critical-1',
              category: 'security' as const,
              severity: 'critical' as const,
              message: 'Potential SQL injection vulnerability',
              explanation: 'User input is directly concatenated into SQL query',
              auto_fixable: false
            }
          ]
        }
      }
    ];

    const batchResults = await userApproval.processBatchApproval(batchRequests);
    console.log('Batch approval results:', {
      auto_approved: batchResults.auto_approved.length,
      requires_review: batchResults.requires_review.length,
      rejected: batchResults.rejected.length
    });

    // Get approval statistics
    const stats = userApproval.getApprovalStats();
    console.log('Approval statistics:', stats);

    // Get pending approvals
    const pending = userApproval.getPendingApprovals();
    console.log('Pending approvals:', pending.length);

  } catch (error) {
    console.error('User approval example failed:', error);
  } finally {
    await dbManager.disconnect();
  }
}

/**
 * Example 5: Custom Configuration and Rules
 * Shows how to configure custom rules and settings
 */
export async function customConfigurationExample(): Promise<void> {
  console.log('\n=== Custom Configuration Example ===');

  const dbManager = new DatabaseConnectionManager();
  await dbManager.connect();

  // Define custom validation rules
  const customRules = [
    {
      id: 'no-magic-numbers',
      name: 'No Magic Numbers',
      description: 'Avoid using magic numbers in code',
      severity: 'warning' as const,
      category: 'best-practice' as const,
      enabled: true,
      configuration: {
        maxNumber: 100,
        acceptableNumbers: [0, 1, -1, 100]
      }
    },
    {
      id: 'max-function-length',
      name: 'Maximum Function Length',
      description: 'Functions should not exceed specified length',
      severity: 'warning' as const,
      category: 'best-practice' as const,
      enabled: true,
      configuration: {
        maxLength: 30
      }
    }
  ];

  const customConfig: ReviewConfiguration = {
    enable_static_analysis: true,
    enable_ai_review: true,
    enable_user_approval: true,
    max_file_size_bytes: 2097152, // 2MB
    supported_languages: ['typescript', 'javascript', 'python'],
    custom_rules: customRules,
    approval_thresholds: {
      auto_approve_score: 95,
      require_approval_score: 80,
      critical_issues_auto_reject: true
    },
    exclude_patterns: ['**/test/**', '**/mocks/**'],
    include_patterns: ['src/**/*.{ts,js}', 'lib/**/*.{ts,js}']
  };

  const reviewer = new Reviewer({
    dbManager,
    reviewConfig: customConfig,
    staticAnalyzerConfig: {
      enableTypeScript: true,
      enableESLint: true,
      customRules: customRules,
      eslintRules: {
        'no-console': 'error',
        'max-lines-per-function': ['error', 50],
        'prefer-arrow-callback': 'warn'
      }
    }
  });

  try {
    const sessionId = await reviewer.startReviewSession({
      project_id: 'custom-project',
      user_id: 'admin'
    });

    const testFile = {
      id: 'custom-test',
      file_path: 'src/custom-example.ts',
      content: `
function processData(items: any[]) {
  const result = []; // Magic number - should be flagged
  const MAX_SIZE = 1000; // Magic number - should be flagged
  
  for (let i = 0; i < items.length; i++) {
    if (items[i].active && result.length < MAX_SIZE) {
      result.push({
        id: items[i].id,
        value: items[i].value * 2, // Magic number
        timestamp: new Date().getTime()
      });
    }
  }
  
  return result;
}

function veryLongFunctionThatExceedsRecommendedLength() {
  // This function is intentionally long to test the max function length rule
  // It has many lines and complex logic
  const data = [];
  for (let i = 0; i < 100; i++) {
    data.push({ index: i, value: i * 2 });
  }
  return data.filter(item => item.value > 50)
             .map(item => ({ ...item, doubled: item.value * 2 }))
             .reduce((acc, curr) => acc + curr.value, 0);
}
      `,
      language: 'typescript'
    };

    const result = await reviewer.reviewFile(testFile);
    
    console.log('Custom configuration review result:', {
      file_path: result.file_path,
      overall_score: result.overall_score,
      static_issues: result.static_analysis?.best_practice_issues.length || 0,
      ai_findings: result.ai_review?.findings.length || 0,
      decision: result.approval_decision?.decision
    });

    // Show custom rule violations
    const customViolations = result.static_analysis?.best_practice_issues.filter(
      issue => customRules.some(rule => rule.id === issue.rule_id)
    ) || [];

    console.log('Custom rule violations:', customViolations.length);
    customViolations.forEach(violation => {
      console.log(\`- \${violation.rule_name}: \${violation.message} (line \${violation.line})\`);
    });

  } catch (error) {
    console.error('Custom configuration example failed:', error);
  } finally {
    await reviewer.dispose();
    await dbManager.disconnect();
  }
}

/**
 * Example 6: Error Handling and Resilience
 * Shows how to handle errors and maintain system resilience
 */
export async function errorHandlingExample(): Promise<void> {
  console.log('\n=== Error Handling and Resilience Example ===');

  const dbManager = new DatabaseConnectionManager();
  await dbManager.connect();

  const reviewer = new Reviewer({
    dbManager,
    reviewConfig: {
      enable_static_analysis: true,
      enable_ai_review: true,
      enable_user_approval: true
    },
    aiReviewerConfig: {
      groqConfig: {
        apiKey: process.env.GROQ_API_KEY || 'invalid-key',
        model: 'llama3-8b-8192'
      }
    }
  });

  try {
    const sessionId = await reviewer.startReviewSession({
      project_id: 'error-test-project'
    });

    // Test with problematic files
    const problematicFiles = [
      {
        id: 'syntax-error',
        file_path: 'syntax-error.ts',
        content: 'const x = ; // Syntax error',
        language: 'typescript'
      },
      {
        id: 'very-large-file',
        file_path: 'large-file.ts',
        content: '// '.repeat(1000000), // Very large content
        language: 'typescript'
      },
      {
        id: 'empty-file',
        file_path: 'empty.ts',
        content: '',
        language: 'typescript'
      }
    ];

    for (const file of problematicFiles) {
      try {
        console.log(\`\\nProcessing: \${file.file_path}\`);
        const result = await reviewer.reviewFile(file);
        console.log(\`✅ Success: \${result.overall_score || 'N/A'} score, \${result.approval_decision?.decision}\`);
      } catch (error) {
        console.log(\`❌ Error: \${error instanceof Error ? error.message : 'Unknown error'}\`);
        // Continue processing other files
      }
    }

  } catch (error) {
    console.error('Error handling example failed:', error);
  } finally {
    await reviewer.dispose();
    await dbManager.disconnect();
  }
}

/**
 * Run all examples
 */
export async function runAllExamples(): Promise<void> {
  console.log('Running Reviewer Component Examples\\n');

  const examples = [
    completeReviewerExample,
    standaloneStaticAnalyzerExample,
    standaloneAIReviewerExample,
    standaloneUserApprovalExample,
    customConfigurationExample,
    errorHandlingExample
  ];

  for (const example of examples) {
    try {
      await example();
      console.log('\\n✅ Example completed successfully\\n');
    } catch (error) {
      console.log('\\n❌ Example failed\\n');
    }
    
    // Add delay between examples
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('All examples completed!');
}

// Default export for easy importing
export default {
  completeReviewerExample,
  standaloneStaticAnalyzerExample,
  standaloneAIReviewerExample,
  standaloneUserApprovalExample,
  customConfigurationExample,
  errorHandlingExample,
  runAllExamples
};