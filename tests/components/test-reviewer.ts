/**
 * Reviewer Component Test Suite
 * Comprehensive tests for the Reviewer component with performance benchmarks
 */

import { describe, beforeEach, afterEach, test, expect, jest, beforeAll, afterAll } from '@jest/globals';
import {
  Reviewer,
  createReviewer,
  AIReviewer,
  StaticAnalyzer,
  UserApproval,
  ReviewResult,
  ReviewContext,
  ReviewIssue,
  ReviewStatus,
  IssueSeverity
} from '@/components/reviewer';
import { mockEventData } from '../fixtures/mock-data';

// Mock dependencies
jest.mock('@/components/reviewer/ai-reviewer');
jest.mock('@/components/reviewer/static-analyzer');
jest.mock('@/components/reviewer/user-approval');

// Performance benchmarking utilities
class PerformanceBenchmark {
  private startTime: number = 0;
  private endTime: number = 0;
  private memoryBefore: number = 0;
  private memoryAfter: number = 0;

  start(): void {
    this.startTime = performance.now();
    this.memoryBefore = process.memoryUsage().heapUsed;
  }

  end(): { duration: number; memoryDiff: number } {
    this.endTime = performance.now();
    this.memoryAfter = process.memoryUsage().heapUsed;
    return {
      duration: this.endTime - this.startTime,
      memoryDiff: this.memoryAfter - this.memoryBefore
    };
  }
}

describe('Reviewer Component Tests', () => {
  let reviewer: Reviewer;
  let performanceBenchmarks: PerformanceBenchmark;
  
  const mockConfig = {
    reviewMode: 'comprehensive' as const,
    enableAI: true,
    enableStaticAnalysis: true,
    requireUserApproval: true,
    severityThreshold: IssueSeverity.MEDIUM,
    maxIssues: 100,
    timeouts: {
      aiReview: 30000,
      staticAnalysis: 10000,
      userApproval: 300000
    },
    aiConfig: {
      provider: 'groq',
      model: 'mixtral-8x7b-32768',
      temperature: 0.1
    }
  };

  const mockImplementationResult = {
    taskId: 'task-1',
    status: 'completed' as const,
    changes: [
      {
        filePath: 'src/auth/Login.tsx',
        type: 'create' as const,
        content: `import React from 'react';

export const Login: React.FC = () => {
  return (
    <div className="login-container">
      <h1>Login</h1>
      <form>
        <input type="email" placeholder="Email" />
        <input type="password" placeholder="Password" />
        <button type="submit">Login</button>
      </form>
    </div>
  );
};`,
        originalContent: null,
        backupCreated: false,
        checksum: 'login123'
      },
      {
        filePath: 'src/utils/helpers.ts',
        type: 'create' as const,
        content: `export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
  return emailRegex.test(email);
};

export const formatDate = (date: Date): string => {
  return date.toLocaleDateString();
};

export const processData = (data: any[]) => {
  return data.map(item => ({
    ...item,
    processed: true
  }));
};`,
        originalContent: null,
        backupCreated: false,
        checksum: 'helpers123'
      }
    ],
    metrics: {
      filesCreated: 2,
      filesModified: 0,
      linesAdded: 25,
      linesRemoved: 0,
      duration: 5000
    }
  };

  const mockReviewContext: ReviewContext = {
    implementation: mockImplementationResult,
    projectPath: '/test/project',
    reviewPath: '/test/review',
    config: mockConfig,
    user: {
      id: 'test-user',
      role: 'developer',
      permissions: ['review:write', 'approve:changes']
    },
    metadata: {
      sessionId: 'review-session-1',
      timestamp: new Date()
    }
  };

  const sampleIssues: ReviewIssue[] = [
    {
      id: 'issue-1',
      type: 'security',
      severity: IssueSeverity.HIGH,
      category: 'authentication',
      title: 'Missing input validation',
      description: 'Email and password inputs lack validation',
      file: 'src/auth/Login.tsx',
      line: 6,
      column: 15,
      suggestion: 'Add proper input validation and sanitization',
      fixable: true,
      confidence: 0.95,
      evidence: [
        'Input fields without validation attributes',
        'No client-side validation logic'
      ]
    },
    {
      id: 'issue-2',
      type: 'style',
      severity: IssueSeverity.LOW,
      category: 'code-style',
      title: 'Inconsistent formatting',
      description: 'Missing semicolons and inconsistent spacing',
      file: 'src/utils/helpers.ts',
      line: 1,
      column: 1,
      suggestion: 'Add semicolons and format code consistently',
      fixable: true,
      confidence: 0.9,
      evidence: ['Missing semicolons', 'Inconsistent spacing']
    },
    {
      id: 'issue-3',
      type: 'performance',
      severity: IssueSeverity.MEDIUM,
      category: 'optimization',
      title: 'Inefficient data processing',
      description: 'Data processing function creates unnecessary objects',
      file: 'src/utils/helpers.ts',
      line: 15,
      column: 5,
      suggestion: 'Use object spread operator more efficiently',
      fixable: true,
      confidence: 0.8,
      evidence: ['Unnecessary object spread in map function']
    }
  ];

  beforeAll(() => {
    process.env.NODE_ENV = 'test';
  });

  afterAll(() => {
    delete process.env.NODE_ENV;
  });

  beforeEach(() => {
    performanceBenchmarks = new PerformanceBenchmark();
    jest.clearAllMocks();
    
    reviewer = createReviewer(mockConfig);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Component Initialization', () => {
    test('should initialize with valid configuration', () => {
      performanceBenchmarks.start();
      
      expect(reviewer).toBeDefined();
      expect(reviewer).toBeInstanceOf(Reviewer);
      
      const perf = performanceBenchmarks.end();
      expect(perf.duration).toBeLessThan(50); // Should initialize in < 50ms
    });

    test('should initialize with default configuration', () => {
      const defaultReviewer = createReviewer();
      expect(defaultReviewer).toBeDefined();
    });

    test('should validate configuration parameters', () => {
      const invalidConfig = {
        severityThreshold: 'invalid' as any,
        maxIssues: -1,
        timeouts: {
          aiReview: -1000
        }
      };
      
      expect(() => {
        createReviewer(invalidConfig);
      }).toThrow();
    });

    test('should handle missing configuration gracefully', () => {
      const undefinedReviewer = createReviewer(undefined);
      expect(undefinedReviewer).toBeDefined();
    });
  });

  describe('Code Review Functionality', () => {
    test('should perform comprehensive review successfully', async () => {
      const mockReviewResult: ReviewResult = {
        reviewId: 'review-1',
        status: ReviewStatus.COMPLETED,
        implementationId: mockImplementationResult.taskId,
        issues: sampleIssues,
        summary: {
          totalIssues: 3,
          criticalIssues: 0,
          highIssues: 1,
          mediumIssues: 1,
          lowIssues: 1,
          fixableIssues: 3,
          overallScore: 7.5
        },
        recommendations: [
          'Add comprehensive input validation',
          'Implement proper error handling',
          'Consider adding unit tests'
        ],
        metrics: {
          aiReviewDuration: 2000,
          staticAnalysisDuration: 500,
          totalReviewDuration: 3500,
          filesReviewed: 2,
          linesOfCodeReviewed: 25
        },
        userApproval: {
          required: true,
          granted: true,
          approver: 'test-user',
          timestamp: new Date()
        },
        createdAt: new Date(),
        completedAt: new Date()
      };

      // Mock the internal methods
      (reviewer as any).aiReviewer.review = jest.fn()
        .mockResolvedValue(sampleIssues);
      (reviewer as any).staticAnalyzer.analyze = jest.fn()
        .mockResolvedValue(sampleIssues);
      (reviewer as any).userApproval.requestApproval = jest.fn()
        .mockResolvedValue({ granted: true, approver: 'test-user' });

      performanceBenchmarks.start();
      const result = await reviewer.reviewImplementation(mockReviewContext);
      const perf = performanceBenchmarks.end();
      
      expect(result).toBeDefined();
      expect(result.status).toBe(ReviewStatus.COMPLETED);
      expect(result.issues).toHaveLength(3);
      expect(result.summary.totalIssues).toBe(3);
      expect(result.overallScore).toBe(7.5);
      expect(perf.duration).toBeLessThan(10000); // Should review in < 10s
    });

    test('should handle AI review failures gracefully', async () => {
      const mockResult: ReviewResult = {
        reviewId: 'review-2',
        status: ReviewStatus.COMPLETED,
        implementationId: mockImplementationResult.taskId,
        issues: sampleIssues.slice(1), // Only static analysis issues
        summary: {
          totalIssues: 2,
          criticalIssues: 0,
          highIssues: 0,
          mediumIssues: 1,
          lowIssues: 1,
          fixableIssues: 2,
          overallScore: 8.0
        },
        recommendations: ['Fix formatting issues'],
        metrics: {
          aiReviewDuration: 0,
          staticAnalysisDuration: 500,
          totalReviewDuration: 1500,
          filesReviewed: 2,
          linesOfCodeReviewed: 25
        },
        userApproval: {
          required: true,
          granted: true,
          approver: 'test-user',
          timestamp: new Date()
        },
        createdAt: new Date(),
        completedAt: new Date()
      };

      // Mock AI failure but static analysis success
      (reviewer as any).aiReviewer.review = jest.fn()
        .mockRejectedValue(new Error('AI service unavailable'));
      (reviewer as any).staticAnalyzer.analyze = jest.fn()
        .mockResolvedValue(sampleIssues.slice(1));
      (reviewer as any).userApproval.requestApproval = jest.fn()
        .mockResolvedValue({ granted: true, approver: 'test-user' });

      const result = await reviewer.reviewImplementation(mockReviewContext);
      
      expect(result.status).toBe(ReviewStatus.COMPLETED);
      expect(result.issues).toHaveLength(2);
      expect(result.metrics.aiReviewDuration).toBe(0);
    });

    test('should handle static analysis failures', async () => {
      const mockResult: ReviewResult = {
        reviewId: 'review-3',
        status: ReviewStatus.COMPLETED,
        implementationId: mockImplementationResult.taskId,
        issues: [sampleIssues[0], sampleIssues[2]], // Only AI review issues
        summary: {
          totalIssues: 2,
          criticalIssues: 0,
          highIssues: 1,
          mediumIssues: 1,
          lowIssues: 0,
          fixableIssues: 2,
          overallScore: 6.5
        },
        recommendations: ['Add input validation', 'Optimize data processing'],
        metrics: {
          aiReviewDuration: 2000,
          staticAnalysisDuration: 0,
          totalReviewDuration: 3000,
          filesReviewed: 2,
          linesOfCodeReviewed: 25
        },
        userApproval: {
          required: true,
          granted: true,
          approver: 'test-user',
          timestamp: new Date()
        },
        createdAt: new Date(),
        completedAt: new Date()
      };

      // Mock static analysis failure but AI success
      (reviewer as any).aiReviewer.review = jest.fn()
        .mockResolvedValue([sampleIssues[0], sampleIssues[2]]);
      (reviewer as any).staticAnalyzer.analyze = jest.fn()
        .mockRejectedValue(new Error('Static analysis failed'));
      (reviewer as any).userApproval.requestApproval = jest.fn()
        .mockResolvedValue({ granted: true, approver: 'test-user' });

      const result = await reviewer.reviewImplementation(mockReviewContext);
      
      expect(result.status).toBe(ReviewStatus.COMPLETED);
      expect(result.issues).toHaveLength(2);
      expect(result.metrics.staticAnalysisDuration).toBe(0);
    });

    test('should handle user approval rejection', async () => {
      const mockResult: ReviewResult = {
        reviewId: 'review-4',
        status: ReviewStatus.REJECTED,
        implementationId: mockImplementationResult.taskId,
        issues: sampleIssues,
        summary: {
          totalIssues: 3,
          criticalIssues: 0,
          highIssues: 1,
          mediumIssues: 1,
          lowIssues: 1,
          fixableIssues: 3,
          overallScore: 7.5
        },
        recommendations: [
          'Address critical issues before approval',
          'Add comprehensive input validation',
          'Implement proper error handling'
        ],
        metrics: {
          aiReviewDuration: 2000,
          staticAnalysisDuration: 500,
          totalReviewDuration: 3500,
          filesReviewed: 2,
          linesOfCodeReviewed: 25
        },
        userApproval: {
          required: true,
          granted: false,
          approver: null,
          timestamp: new Date(),
          reason: 'Too many high-severity issues'
        },
        createdAt: new Date(),
        completedAt: new Date()
      };

      (reviewer as any).aiReviewer.review = jest.fn()
        .mockResolvedValue(sampleIssues);
      (reviewer as any).staticAnalyzer.analyze = jest.fn()
        .mockResolvedValue(sampleIssues);
      (reviewer as any).userApproval.requestApproval = jest.fn()
        .mockResolvedValue({ granted: false, reason: 'Too many high-severity issues' });

      const result = await reviewer.reviewImplementation(mockReviewContext);
      
      expect(result.status).toBe(ReviewStatus.REJECTED);
      expect(result.userApproval.granted).toBe(false);
    });
  });

  describe('Security Review', () => {
    test('should detect security vulnerabilities', async () => {
      const insecureImplementation = {
        ...mockImplementationResult,
        changes: [
          {
            filePath: 'src/insecure.ts',
            type: 'create',
            content: `export const insecureFunction = (userInput) => {
  eval(userInput); // Security risk
  return document.getElementById('result').innerHTML = userInput; // XSS risk
};

export const unsafeSQL = (query) => {
  return "SELECT * FROM users WHERE " + query;
};`,
            originalContent: null,
            backupCreated: false,
            checksum: 'insecure123'
          }
        ]
      };

      const securityContext: ReviewContext = {
        ...mockReviewContext,
        implementation: insecureImplementation
      };

      const securityIssues: ReviewIssue[] = [
        {
          id: 'sec-1',
          type: 'security',
          severity: IssueSeverity.CRITICAL,
          category: 'injection',
          title: 'Code injection vulnerability',
          description: 'Use of eval() function allows code injection',
          file: 'src/insecure.ts',
          line: 2,
          column: 3,
          suggestion: 'Avoid eval() and use safer alternatives',
          fixable: true,
          confidence: 0.98,
          evidence: ['eval(userInput)']
        },
        {
          id: 'sec-2',
          type: 'security',
          severity: IssueSeverity.CRITICAL,
          category: 'xss',
          title: 'Cross-site scripting vulnerability',
          description: 'Direct innerHTML assignment allows XSS attacks',
          file: 'src/insecure.ts',
          line: 3,
          column: 25,
          suggestion: 'Use textContent or sanitize HTML',
          fixable: true,
          confidence: 0.95,
          evidence: ['innerHTML = userInput']
        },
        {
          id: 'sec-3',
          type: 'security',
          severity: IssueSeverity.HIGH,
          category: 'injection',
          title: 'SQL injection vulnerability',
          description: 'String concatenation allows SQL injection',
          file: 'src/insecure.ts',
          line: 7,
          column: 12,
          suggestion: 'Use parameterized queries',
          fixable: true,
          confidence: 0.9,
          evidence: ['String concatenation in SQL query']
        }
      ];

      (reviewer as any).aiReviewer.review = jest.fn()
        .mockResolvedValue(securityIssues);
      (reviewer as any).staticAnalyzer.analyze = jest.fn()
        .mockResolvedValue(securityIssues);
      (reviewer as any).userApproval.requestApproval = jest.fn()
        .mockResolvedValue({ granted: false, reason: 'Critical security issues' });

      const result = await reviewer.reviewImplementation(securityContext);
      
      const securityOnlyIssues = result.issues.filter(i => i.type === 'security');
      expect(securityOnlyIssues).toHaveLength(3);
      expect(result.summary.criticalIssues).toBe(2);
      expect(result.summary.highIssues).toBe(1);
    });

    test('should detect authentication and authorization issues', async () => {
      const authImplementation = {
        ...mockImplementationResult,
        changes: [
          {
            filePath: 'src/auth/weak-auth.ts',
            type: 'create',
            content: `export const authenticate = (username, password) => {
  // Weak password validation
  if (password.length > 4) {
    return { success: true, token: 'hardcoded-token' };
  }
  return { success: false };
};

export const checkPermission = (user, resource) => {
  // Missing authorization check
  return true;
};`,
            originalContent: null,
            backupCreated: false,
            checksum: 'auth123'
          }
        ]
      };

      const authContext: ReviewContext = {
        ...mockReviewContext,
        implementation: authImplementation
      };

      const authIssues: ReviewIssue[] = [
        {
          id: 'auth-1',
          type: 'security',
          severity: IssueSeverity.HIGH,
          category: 'authentication',
          title: 'Weak password validation',
          description: 'Password validation is too weak',
          file: 'src/auth/weak-auth.ts',
          line: 2,
          column: 15,
          suggestion: 'Implement stronger password policies',
          fixable: true,
          confidence: 0.9,
          evidence: ['password.length > 4']
        },
        {
          id: 'auth-2',
          type: 'security',
          severity: IssueSeverity.HIGH,
          category: 'authentication',
          title: 'Hardcoded authentication token',
          description: 'Authentication token is hardcoded',
          file: 'src/auth/weak-auth.ts',
          line: 3,
          column: 35,
          suggestion: 'Generate secure tokens dynamically',
          fixable: true,
          confidence: 0.95,
          evidence: ['hardcoded-token']
        },
        {
          id: 'auth-3',
          type: 'security',
          severity: IssueSeverity.MEDIUM,
          category: 'authorization',
          title: 'Missing authorization check',
          description: 'No proper authorization validation',
          file: 'src/auth/weak-auth.ts',
          line: 9,
          column: 5,
          suggestion: 'Implement proper authorization checks',
          fixable: true,
          confidence: 0.85,
          evidence: ['return true without checks']
        }
      ];

      (reviewer as any).aiReviewer.review = jest.fn()
        .mockResolvedValue(authIssues);
      (reviewer as any).staticAnalyzer.analyze = jest.fn()
        .mockResolvedValue(authIssues);
      (reviewer as any).userApproval.requestApproval = jest.fn()
        .mockResolvedValue({ granted: false, reason: 'Authentication weaknesses' });

      const result = await reviewer.reviewImplementation(authContext);
      
      const authIssues = result.issues.filter(i => i.category === 'authentication' || i.category === 'authorization');
      expect(authIssues).toHaveLength(3);
    });
  });

  describe('Code Quality Review', () => {
    test('should detect code style violations', async () => {
      const poorlyStyledImplementation = {
        ...mockImplementationResult,
        changes: [
          {
            filePath: 'src/poor-style.ts',
            type: 'create',
            content: `export const poorlyStyled=()=>{return"very long line that exceeds maximum length limits and should be wrapped properly but isn't formatted correctly"};`,
            originalContent: null,
            backupCreated: false,
            checksum: 'style123'
          }
        ]
      };

      const styleContext: ReviewContext = {
        ...mockReviewContext,
        implementation: poorlyStyledImplementation
      };

      const styleIssues: ReviewIssue[] = [
        {
          id: 'style-1',
          type: 'style',
          severity: IssueSeverity.LOW,
          category: 'formatting',
          title: 'Missing spaces around operators',
          description: 'Spaces missing around assignment operator',
          file: 'src/poor-style.ts',
          line: 1,
          column: 17,
          suggestion: 'Add spaces around = operator',
          fixable: true,
          confidence: 0.95,
          evidence: ['poorlyStyled=']
        },
        {
          id: 'style-2',
          type: 'style',
          severity: IssueSeverity.MEDIUM,
          category: 'formatting',
          title: 'Line too long',
          description: 'Line exceeds maximum length of 100 characters',
          file: 'src/poor-style.ts',
          line: 1,
          column: 1,
          suggestion: 'Split long line into multiple lines',
          fixable: true,
          confidence: 0.9,
          evidence: ['Line exceeds 100 characters']
        }
      ];

      (reviewer as any).aiReviewer.review = jest.fn()
        .mockResolvedValue(styleIssues);
      (reviewer as any).staticAnalyzer.analyze = jest.fn()
        .mockResolvedValue(styleIssues);
      (reviewer as any).userApproval.requestApproval = jest.fn()
        .mockResolvedValue({ granted: true, approver: 'test-user' });

      const result = await reviewer.reviewImplementation(styleContext);
      
      const styleOnlyIssues = result.issues.filter(i => i.type === 'style');
      expect(styleOnlyIssues).toHaveLength(2);
    });

    test('should detect performance issues', async () => {
      const performanceImplementation = {
        ...mockImplementationResult,
        changes: [
          {
            filePath: 'src/performance.ts',
            type: 'create',
            content: `export const inefficientLoop = (data) => {
  const result = [];
  for (let i = 0; i < data.length; i++) {
    for (let j = 0; j < data.length; j++) {
      if (data[i] === data[j]) {
        result.push(data[i]);
      }
    }
  }
  return result;
};

export const noMemoization = (n) => {
  if (n <= 1) return n;
  return noMemoization(n - 1) + noMemoization(n - 2);
};`,
            originalContent: null,
            backupCreated: false,
            checksum: 'perf123'
          }
        ]
      };

      const perfContext: ReviewContext = {
        ...mockReviewContext,
        implementation: performanceImplementation
      };

      const perfIssues: ReviewIssue[] = [
        {
          id: 'perf-1',
          type: 'performance',
          severity: IssueSeverity.MEDIUM,
          category: 'optimization',
          title: 'Inefficient nested loop',
          description: 'Nested loop with O(n²) complexity could be optimized',
          file: 'src/performance.ts',
          line: 2,
          column: 3,
          suggestion: 'Use more efficient algorithm or data structure',
          fixable: true,
          confidence: 0.9,
          evidence: ['Nested loop with same array']
        },
        {
          id: 'perf-2',
          type: 'performance',
          severity: IssueSeverity.HIGH,
          category: 'optimization',
          title: 'No memoization for recursive function',
          description: 'Fibonacci calculation without memoization causes exponential complexity',
          file: 'src/performance.ts',
          line: 11,
          column: 5,
          suggestion: 'Add memoization to improve performance',
          fixable: true,
          confidence: 0.95,
          evidence: ['Recursive calls without memoization']
        }
      ];

      (reviewer as any).aiReviewer.review = jest.fn()
        .mockResolvedValue(perfIssues);
      (reviewer as any).staticAnalyzer.analyze = jest.fn()
        .mockResolvedValue(perfIssues);
      (reviewer as any).userApproval.requestApproval = jest.fn()
        .mockResolvedValue({ granted: true, approver: 'test-user' });

      const result = await reviewer.reviewImplementation(perfContext);
      
      const perfOnlyIssues = result.issues.filter(i => i.type === 'performance');
      expect(perfOnlyIssues).toHaveLength(2);
    });

    test('should detect maintainability issues', async () => {
      const maintainabilityImplementation = {
        ...mockImplementationResult,
        changes: [
          {
            filePath: 'src/unmaintainable.ts',
            type: 'create',
            content: `export const godFunction = (a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p) => {
  let x = a + b;
  let y = c - d;
  let z = e * f;
  let w = g / h;
  let v = i % j;
  let u = k ** l;
  let t = m && n;
  let s = o || p;
  if (x > y && y > z && z > w && w > v && v > u && u > t && t > s) {
    return { result: x + y + z + w + v + u + t + s };
  } else {
    return null;
  }
};

// Magic numbers everywhere
export const calculateScore = (points) => {
  return points * 2.5 + 100 - 15 + 0.1 * points;
};`,
            originalContent: null,
            backupCreated: false,
            checksum: 'maintain123'
          }
        ]
      };

      const maintainContext: ReviewContext = {
        ...mockReviewContext,
        implementation: maintainabilityImplementation
      };

      const maintainIssues: ReviewIssue[] = [
        {
          id: 'maint-1',
          type: 'maintainability',
          severity: IssueSeverity.MEDIUM,
          category: 'complexity',
          title: 'Function with too many parameters',
          description: 'Function has 16 parameters, should be refactored',
          file: 'src/unmaintainable.ts',
          line: 1,
          column: 33,
          suggestion: 'Use object parameter or break into smaller functions',
          fixable: true,
          confidence: 0.9,
          evidence: ['16 parameters in function signature']
        },
        {
          id: 'maint-2',
          type: 'maintainability',
          severity: IssueSeverity.MEDIUM,
          category: 'complexity',
          title: 'Complex conditional logic',
          description: 'Long chain of conditions is hard to understand',
          file: 'src/unmaintainable.ts',
          line: 10,
          column: 5,
          suggestion: 'Break complex condition into smaller, named conditions',
          fixable: true,
          confidence: 0.85,
          evidence: ['Long chain of && conditions']
        },
        {
          id: 'maint-3',
          type: 'maintainability',
          severity: IssueSeverity.HIGH,
          category: 'readability',
          title: 'Magic numbers',
          description: 'Unnamed numeric constants make code hard to maintain',
          file: 'src/unmaintainable.ts',
          line: 20,
          column: 15,
          suggestion: 'Replace magic numbers with named constants',
          fixable: true,
          confidence: 0.95,
          evidence: ['2.5, 100, 15, 0.1 are magic numbers']
        }
      ];

      (reviewer as any).aiReviewer.review = jest.fn()
        .mockResolvedValue(maintainIssues);
      (reviewer as any).staticAnalyzer.analyze = jest.fn()
        .mockResolvedValue(maintainIssues);
      (reviewer as any).userApproval.requestApproval = jest.fn()
        .mockResolvedValue({ granted: true, approver: 'test-user' });

      const result = await reviewer.reviewImplementation(maintainContext);
      
      const maintainOnlyIssues = result.issues.filter(i => i.type === 'maintainability');
      expect(maintainOnlyIssues).toHaveLength(3);
    });
  });

  describe('Performance Benchmarks', () => {
    test('should review simple implementations quickly', async () => {
      const simpleImplementation = {
        ...mockImplementationResult,
        changes: [
          {
            filePath: 'src/simple.ts',
            type: 'create',
            content: 'export const simple = () => "simple";',
            originalContent: null,
            backupCreated: false,
            checksum: 'simple123'
          }
        ]
      };

      const simpleContext: ReviewContext = {
        ...mockReviewContext,
        implementation: simpleImplementation
      };

      const simpleIssues: ReviewIssue[] = [];

      (reviewer as any).aiReviewer.review = jest.fn()
        .mockResolvedValue(simpleIssues);
      (reviewer as any).staticAnalyzer.analyze = jest.fn()
        .mockResolvedValue(simpleIssues);
      (reviewer as any).userApproval.requestApproval = jest.fn()
        .mockResolvedValue({ granted: true, approver: 'test-user' });

      performanceBenchmarks.start();
      const result = await reviewer.reviewImplementation(simpleContext);
      const perf = performanceBenchmarks.end();
      
      expect(result.status).toBe(ReviewStatus.COMPLETED);
      expect(perf.duration).toBeLessThan(5000); // < 5 seconds for simple review
      expect(perf.memoryDiff).toBeLessThan(10 * 1024 * 1024); // < 10MB memory
    });

    test('should handle complex reviews efficiently', async () => {
      const complexChanges = Array.from({ length: 20 }, (_, i) => ({
        filePath: `src/complex-${i}.ts`,
        type: 'create' as const,
        content: `export const complex${i} = (input: any) => {
  return {
    processed: true,
    data: input,
    timestamp: new Date(),
    index: ${i}
  };
};`,
        originalContent: null,
        backupCreated: false,
        checksum: `complex${i}`
      }));

      const complexImplementation = {
        ...mockImplementationResult,
        changes: complexChanges
      };

      const complexContext: ReviewContext = {
        ...mockReviewContext,
        implementation: complexImplementation
      };

      const complexIssues = Array.from({ length: 10 }, (_, i) => ({
        id: `complex-issue-${i}`,
        type: 'style' as const,
        severity: IssueSeverity.LOW,
        category: 'formatting',
        title: `Formatting issue ${i}`,
        description: `Formatting issue in file ${i}`,
        file: `src/complex-${i}.ts`,
        line: 1,
        column: 1,
        suggestion: 'Fix formatting',
        fixable: true,
        confidence: 0.9,
        evidence: []
      }));

      (reviewer as any).aiReviewer.review = jest.fn()
        .mockResolvedValue(complexIssues);
      (reviewer as any).staticAnalyzer.analyze = jest.fn()
        .mockResolvedValue(complexIssues);
      (reviewer as any).userApproval.requestApproval = jest.fn()
        .mockResolvedValue({ granted: true, approver: 'test-user' });

      performanceBenchmarks.start();
      const result = await reviewer.reviewImplementation(complexContext);
      const perf = performanceBenchmarks.end();
      
      expect(result.changes).toHaveLength(20);
      expect(result.issues).toHaveLength(10);
      expect(perf.duration).toBeLessThan(20000); // < 20 seconds for complex review
    });

    test('should handle concurrent reviews', async () => {
      const concurrentContexts = Array.from({ length: 3 }, (_, i) => ({
        ...mockReviewContext,
        implementation: {
          ...mockImplementationResult,
          taskId: `task-${i}`,
          changes: [{
            filePath: `src/concurrent-${i}.ts`,
            type: 'create' as const,
            content: `export const concurrent${i} = () => "concurrent ${i}";`,
            originalContent: null,
            backupCreated: false,
            checksum: `concurrent${i}`
          }]
        }
      }));

      concurrentContexts.forEach((_, i) => {
        (reviewer as any).aiReviewer.review = jest.fn()
          .mockResolvedValue([]);
        (reviewer as any).staticAnalyzer.analyze = jest.fn()
          .mockResolvedValue([]);
        (reviewer as any).userApproval.requestApproval = jest.fn()
          .mockResolvedValue({ granted: true, approver: 'test-user' });
      });

      performanceBenchmarks.start();
      const results = await Promise.all(
        concurrentContexts.map(context => reviewer.reviewImplementation(context))
      );
      const perf = performanceBenchmarks.end();
      
      expect(results).toHaveLength(3);
      expect(perf.duration).toBeLessThan(30000); // < 30 seconds for 3 concurrent reviews
    });
  });

  describe('Error Handling', () => {
    test('should handle AI service failures gracefully', async () => {
      (reviewer as any).aiReviewer.review = jest.fn()
        .mockRejectedValue(new Error('AI service unavailable'));
      (reviewer as any).staticAnalyzer.analyze = jest.fn()
        .mockResolvedValue([]);
      (reviewer as any).userApproval.requestApproval = jest.fn()
        .mockResolvedValue({ granted: true, approver: 'test-user' });

      const result = await reviewer.reviewImplementation(mockReviewContext);
      
      expect(result.status).toBe(ReviewStatus.COMPLETED);
      expect(result.issues).toHaveLength(0); // Only static analysis issues
      expect(result.metrics.aiReviewDuration).toBe(0);
    });

    test('should handle static analysis tool failures', async () => {
      (reviewer as any).aiReviewer.review = jest.fn()
        .mockResolvedValue([]);
      (reviewer as any).staticAnalyzer.analyze = jest.fn()
        .mockRejectedValue(new Error('Static analysis tool crashed'));
      (reviewer as any).userApproval.requestApproval = jest.fn()
        .mockResolvedValue({ granted: true, approver: 'test-user' });

      const result = await reviewer.reviewImplementation(mockReviewContext);
      
      expect(result.status).toBe(ReviewStatus.COMPLETED);
      expect(result.metrics.staticAnalysisDuration).toBe(0);
    });

    test('should handle user approval timeouts', async () => {
      (reviewer as any).aiReviewer.review = jest.fn()
        .mockResolvedValue(sampleIssues);
      (reviewer as any).staticAnalyzer.analyze = jest.fn()
        .mockResolvedValue(sampleIssues);
      (reviewer as any).userApproval.requestApproval = jest.fn()
        .mockRejectedValue(new Error('User approval timeout'));

      const result = await reviewer.reviewImplementation(mockReviewContext);
      
      expect(result.status).toBe(ReviewStatus.TIMEOUT);
      expect(result.userApproval.granted).toBe(false);
    });

    test('should handle review configuration errors', async () => {
      const invalidContext: ReviewContext = {
        ...mockReviewContext,
        config: {
          ...mockConfig,
          severityThreshold: 'invalid' as any
        }
      };

      await expect(reviewer.reviewImplementation(invalidContext)).rejects.toThrow();
    });
  });

  describe('Issue Management', () => {
    test('should filter issues by severity threshold', async () => {
      const allIssues = [
        ...sampleIssues,
        {
          id: 'low-issue',
          type: 'style' as const,
          severity: IssueSeverity.LOW,
          category: 'formatting',
          title: 'Minor formatting issue',
          description: 'Minor formatting issue',
          file: 'src/test.ts',
          line: 1,
          column: 1,
          suggestion: 'Fix formatting',
          fixable: true,
          confidence: 0.8,
          evidence: []
        }
      ];

      (reviewer as any).aiReviewer.review = jest.fn()
        .mockResolvedValue(allIssues);
      (reviewer as any).staticAnalyzer.analyze = jest.fn()
        .mockResolvedValue(allIssues);
      (reviewer as any).userApproval.requestApproval = jest.fn()
        .mockResolvedValue({ granted: true, approver: 'test-user' });

      const result = await reviewer.reviewImplementation(mockReviewContext);
      
      // Should include all issues since threshold is MEDIUM
      expect(result.issues).toHaveLength(4);
      expect(result.summary.lowIssues).toBe(1);
    });

    test('should deduplicate similar issues', async () => {
      const duplicateIssues = [
        ...sampleIssues,
        {
          id: 'duplicate-1',
          type: 'security' as const,
          severity: IssueSeverity.HIGH,
          category: 'authentication',
          title: 'Missing input validation',
          description: 'Another instance of missing validation',
          file: 'src/auth/Login.tsx',
          line: 8,
          column: 15,
          suggestion: 'Add input validation',
          fixable: true,
          confidence: 0.9,
          evidence: ['Another missing validation']
        }
      ];

      (reviewer as any).aiReviewer.review = jest.fn()
        .mockResolvedValue(duplicateIssues);
      (reviewer as any).staticAnalyzer.analyze = jest.fn()
        .mockResolvedValue(duplicateIssues);
      (reviewer as any).userApproval.requestApproval = jest.fn()
        .mockResolvedValue({ granted: true, approver: 'test-user' });

      const result = await reviewer.reviewImplementation(mockReviewContext);
      
      // Should deduplicate similar issues
      const securityIssues = result.issues.filter(i => i.type === 'security');
      expect(securityIssues.length).toBeLessThanOrEqual(2); // Should have at most 2 unique security issues
    });

    test('should prioritize critical issues', async () => {
      const criticalIssues = [
        {
          id: 'critical-1',
          type: 'security' as const,
          severity: IssueSeverity.CRITICAL,
          category: 'injection',
          title: 'SQL injection vulnerability',
          description: 'Critical SQL injection flaw',
          file: 'src/db.ts',
          line: 5,
          column: 10,
          suggestion: 'Use parameterized queries',
          fixable: true,
          confidence: 0.95,
          evidence: ['Direct string concatenation in SQL']
        },
        {
          id: 'medium-1',
          type: 'style' as const,
          severity: IssueSeverity.MEDIUM,
          category: 'formatting',
          title: 'Formatting issue',
          description: 'Minor formatting problem',
          file: 'src/test.ts',
          line: 1,
          column: 1,
          suggestion: 'Fix formatting',
          fixable: true,
          confidence: 0.9,
          evidence: []
        }
      ];

      (reviewer as any).aiReviewer.review = jest.fn()
        .mockResolvedValue(criticalIssues);
      (reviewer as any).staticAnalyzer.analyze = jest.fn()
        .mockResolvedValue(criticalIssues);
      (reviewer as any).userApproval.requestApproval = jest.fn()
        .mockResolvedValue({ granted: false, reason: 'Critical security issues present' });

      const result = await reviewer.reviewImplementation(mockReviewContext);
      
      expect(result.summary.criticalIssues).toBe(1);
      expect(result.summary.mediumIssues).toBe(1);
      
      // Critical issues should be at the top
      const criticalIssue = result.issues.find(i => i.severity === IssueSeverity.CRITICAL);
      expect(criticalIssue).toBeDefined();
      expect(criticalIssue?.id).toBe('critical-1');
    });
  });

  describe('Integration with Event System', () => {
    test('should emit review started events', async () => {
      const eventSpy = jest.spyOn(reviewer, 'emit');
      
      (reviewer as any).aiReviewer.review = jest.fn()
        .mockResolvedValue([]);
      (reviewer as any).staticAnalyzer.analyze = jest.fn()
        .mockResolvedValue([]);
      (reviewer as any).userApproval.requestApproval = jest.fn()
        .mockResolvedValue({ granted: true, approver: 'test-user' });

      await reviewer.reviewImplementation(mockReviewContext);
      
      expect(eventSpy).toHaveBeenCalledWith(
        'review:started',
        expect.objectContaining({
          reviewId: expect.any(String),
          context: expect.objectContaining({
            implementation: expect.any(Object)
          }),
          timestamp: expect.any(Date)
        })
      );
    });

    test('should emit review completed events', async () => {
      const eventSpy = jest.spyOn(reviewer, 'emit');
      
      (reviewer as any).aiReviewer.review = jest.fn()
        .mockResolvedValue(sampleIssues);
      (reviewer as any).staticAnalyzer.analyze = jest.fn()
        .mockResolvedValue(sampleIssues);
      (reviewer as any).userApproval.requestApproval = jest.fn()
        .mockResolvedValue({ granted: true, approver: 'test-user' });

      const result = await reviewer.reviewImplementation(mockReviewContext);
      
      expect(eventSpy).toHaveBeenCalledWith(
        'review:completed',
        expect.objectContaining({
          reviewId: result.reviewId,
          result: expect.objectContaining({
            status: expect.any(String),
            issues: expect.any(Array)
          }),
          duration: expect.any(Number)
        })
      );
    });

    test('should emit issue detected events', async () => {
      const eventSpy = jest.spyOn(reviewer, 'emit');
      
      (reviewer as any).aiReviewer.review = jest.fn()
        .mockResolvedValue(sampleIssues);
      (reviewer as any).staticAnalyzer.analyze = jest.fn()
        .mockResolvedValue(sampleIssues);
      (reviewer as any).userApproval.requestApproval = jest.fn()
        .mockResolvedValue({ granted: true, approver: 'test-user' });

      await reviewer.reviewImplementation(mockReviewContext);
      
      expect(eventSpy).toHaveBeenCalledWith(
        'issue:detected',
        expect.objectContaining({
          issue: expect.objectContaining({
            id: expect.any(String),
            severity: expect.any(String),
            type: expect.any(String)
          })
        })
      );
    });

    test('should emit approval events', async () => {
      const eventSpy = jest.spyOn(reviewer, 'emit');
      
      (reviewer as any).aiReviewer.review = jest.fn()
        .mockResolvedValue(sampleIssues);
      (reviewer as any).staticAnalyzer.analyze = jest.fn()
        .mockResolvedValue(sampleIssues);
      (reviewer as any).userApproval.requestApproval = jest.fn()
        .mockResolvedValue({ granted: true, approver: 'test-user' });

      await reviewer.reviewImplementation(mockReviewContext);
      
      expect(eventSpy).toHaveBeenCalledWith(
        'approval:granted',
        expect.objectContaining({
          approver: 'test-user',
          reviewId: expect.any(String),
          timestamp: expect.any(Date)
        })
      );
    });
  });

  describe('Resource Management', () => {
    test('should not leak memory during repeated reviews', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Perform many review operations
      for (let i = 0; i < 30; i++) {
        (reviewer as any).aiReviewer.review = jest.fn()
          .mockResolvedValue([]);
        (reviewer as any).staticAnalyzer.analyze = jest.fn()
          .mockResolvedValue([]);
        (reviewer as any).userApproval.requestApproval = jest.fn()
          .mockResolvedValue({ granted: true, approver: 'test-user' });

        await reviewer.reviewImplementation({
          ...mockReviewContext,
          implementation: {
            ...mockImplementationResult,
            taskId: `mem-review-${i}`
          }
        });
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be minimal (less than 25MB)
      expect(memoryIncrease).toBeLessThan(25 * 1024 * 1024);
    });

    test('should clean up resources properly', async () => {
      const resourceSpy = jest.spyOn(reviewer as any, 'cleanup');
      
      reviewer.destroy();
      
      expect(resourceSpy).toHaveBeenCalled();
    });
  });

  describe('Review Metrics and Scoring', () => {
    test('should calculate overall quality score', async () => {
      (reviewer as any).aiReviewer.review = jest.fn()
        .mockResolvedValue(sampleIssues);
      (reviewer as any).staticAnalyzer.analyze = jest.fn()
        .mockResolvedValue(sampleIssues);
      (reviewer as any).userApproval.requestApproval = jest.fn()
        .mockResolvedValue({ granted: true, approver: 'test-user' });

      const result = await reviewer.reviewImplementation(mockReviewContext);
      
      expect(result.overallScore).toBeDefined();
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(10);
      
      // Score should be lower with more critical issues
      expect(result.overallScore).toBeLessThan(8); // Has high severity issues
    });

    test('should generate meaningful recommendations', async () => {
      (reviewer as any).aiReviewer.review = jest.fn()
        .mockResolvedValue(sampleIssues);
      (reviewer as any).staticAnalyzer.analyze = jest.fn()
        .mockResolvedValue(sampleIssues);
      (reviewer as any).userApproval.requestApproval = jest.fn()
        .mockResolvedValue({ granted: true, approver: 'test-user' });

      const result = await reviewer.reviewImplementation(mockReviewContext);
      
      expect(result.recommendations).toBeDefined();
      expect(result.recommendations).toHaveLength.greaterThan(0);
      expect(result.recommendations[0]).toContain('validation');
    });

    test('should provide detailed metrics', async () => {
      (reviewer as any).aiReviewer.review = jest.fn()
        .mockResolvedValue(sampleIssues);
      (reviewer as any).staticAnalyzer.analyze = jest.fn()
        .mockResolvedValue(sampleIssues);
      (reviewer as any).userApproval.requestApproval = jest.fn()
        .mockResolvedValue({ granted: true, approver: 'test-user' });

      const result = await reviewer.reviewImplementation(mockReviewContext);
      
      expect(result.metrics).toBeDefined();
      expect(result.metrics.filesReviewed).toBe(2);
      expect(result.metrics.linesOfCodeReviewed).toBe(25);
      expect(result.metrics.aiReviewDuration).toBeGreaterThan(0);
      expect(result.metrics.staticAnalysisDuration).toBeGreaterThan(0);
      expect(result.metrics.totalReviewDuration).toBeGreaterThan(0);
    });
  });
});