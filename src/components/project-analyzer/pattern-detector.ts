/**
 * PatternDetector - Detects code patterns in TypeScript/JavaScript
 * 
 * Features:
 * - Design patterns detection (GoF patterns)
 * - React-specific patterns
 * - Architectural patterns
 * - Anti-patterns identification
 * - Code quality patterns
 */

import * as ts from 'typescript';
import {
  CodePattern,
  PatternType,
  PatternCategory,
  PatternLocation,
} from './types';

export class PatternDetector {
  constructor() {}

  /**
   * Detect patterns in a source file
   */
  detectPatterns(sourceFile: ts.SourceFile, filePath: string): CodePattern[] {
    const patterns: CodePattern[] = [];
    
    // Visit all nodes to detect patterns
    const visit = (node: ts.Node) => {
      // Design patterns
      patterns.push(...this.detectFactoryPattern(node, filePath));
      patterns.push(...this.detectSingletonPattern(node, filePath));
      patterns.push(...this.detectObserverPattern(node, filePath));
      patterns.push(...this.detectStrategyPattern(node, filePath));
      patterns.push(...this.detectDecoratorPattern(node, filePath));
      patterns.push(...this.detectAdapterPattern(node, filePath));
      patterns.push(...this.detectFacadePattern(node, filePath));
      
      // React-specific patterns
      patterns.push(...this.detectReactComponent(node, filePath));
      patterns.push(...this.detectReactHook(node, filePath));
      patterns.push(...this.detectCustomHook(node, filePath));
      patterns.push(...this.detectReactContext(node, filePath));
      patterns.push(...this.detectHigherOrderComponent(node, filePath));
      patterns.push(...this.detectRenderProps(node, filePath));
      
      // Behavioral patterns
      patterns.push(...this.detectMiddlewarePattern(node, filePath));
      
      // Anti-patterns
      patterns.push(...this.detectAntiPatterns(node, filePath));
      
      ts.forEachChild(node, visit);
    };
    
    visit(sourceFile);
    return patterns;
  }

  // Design Patterns

  private detectFactoryPattern(node: ts.Node, filePath: string): CodePattern[] {
    if (ts.isClassDeclaration(node) && node.name) {
      const className = node.name.text;
      
      // Check for factory method pattern (method that creates instances)
      for (const member of node.members) {
        if (ts.isMethodDeclaration(member) && member.name) {
          const methodName = member.name.getText();
          const methodText = member.getText();
          
          // Factory methods typically return new instances
          if (this.returnsInstance(methodText) && this.matchesFactoryName(methodName, className)) {
            const pos = node.getSourceFile().getLineAndCharacterOfPosition(member.getStart());
            
            return [{
              type: PatternType.FACTORY,
              name: `${className}Factory`,
              description: `Factory pattern implementation using ${methodName} method`,
              files: [{
                file: filePath,
                line: pos.line + 1,
                column: pos.character + 1,
                context: methodText.substring(0, 100),
              }],
              severity: 'info',
              category: PatternCategory.CREATIONAL,
              recommendation: 'Factory pattern provides loose coupling and flexibility for object creation',
              examples: [`class ${className} {`, `  static ${methodName}() {`, `    return new ${className}();`, `  }`, `}`],
            }];
          }
        }
      }
    }
    
    return [];
  }

  private detectSingletonPattern(node: ts.Node, filePath: string): CodePattern[] {
    if (ts.isClassDeclaration(node) && node.name) {
      const className = node.name.text;
      const classText = node.getText();
      
      // Check for private constructor and static instance
      const hasPrivateConstructor = node.members.some(member => 
        ts.isConstructorDeclaration(member) && 
        member.modifiers?.some(m => m.kind === ts.SyntaxKind.PrivateKeyword)
      );
      
      const hasStaticInstance = node.members.some(member =>
        ts.isPropertyDeclaration(member) &&
        member.modifiers?.some(m => m.kind === ts.SyntaxKind.StaticKeyword) &&
        (member.name.getText() === 'instance' || member.name.getText() === 'getInstance')
      );
      
      if (hasPrivateConstructor && hasStaticInstance) {
        const pos = node.getSourceFile().getLineAndCharacterOfPosition(node.getStart());
        
        return [{
          type: PatternType.SINGLETON,
          name: `${className}Singleton`,
          description: `Singleton pattern ensuring only one instance exists`,
          files: [{
            file: filePath,
            line: pos.line + 1,
            column: pos.character + 1,
            context: classText.substring(0, 100),
          }],
          severity: 'info',
          category: PatternCategory.CREATIONAL,
          recommendation: 'Singleton pattern restricts instantiation to one object',
          examples: [
            `class ${className} {`,
            `  private constructor() {}`,
            `  private static instance: ${className};`,
            `  static getInstance() {`,
            `    if (!${className}.instance) {`,
            `      ${className}.instance = new ${className}();`,
            `    }`,
            `    return ${className}.instance;`,
            `  }`,
            `}`,
          ],
        }];
      }
    }
    
    return [];
  }

  private detectObserverPattern(node: ts.Node, filePath: string): CodePattern[] {
    if (ts.isClassDeclaration(node) && node.name) {
      const className = node.name.text;
      const classText = node.getText();
      
      // Check for observer methods
      const hasSubscribeMethod = node.members.some(member =>
        ts.isMethodDeclaration(member) &&
        (member.name.getText().includes('subscribe') || member.name.getText().includes('addListener'))
      );
      
      const hasNotifyMethod = node.members.some(member =>
        ts.isMethodDeclaration(member) &&
        (member.name.getText().includes('notify') || member.name.getText().includes('emit'))
      );
      
      const hasObserversProperty = node.members.some(member =>
        ts.isPropertyDeclaration(member) &&
        (member.name.getText().includes('observers') || member.name.getText().includes('listeners'))
      );
      
      if (hasSubscribeMethod && hasNotifyMethod && hasObserversProperty) {
        const pos = node.getSourceFile().getLineAndCharacterOfPosition(node.getStart());
        
        return [{
          type: PatternType.OBSERVER,
          name: `${className}Observer`,
          description: 'Observer pattern implementation for event-driven architecture',
          files: [{
            file: filePath,
            line: pos.line + 1,
            column: pos.character + 1,
            context: classText.substring(0, 100),
          }],
          severity: 'info',
          category: PatternCategory.BEHAVIORAL,
          recommendation: 'Observer pattern enables loose coupling between subjects and observers',
        }];
      }
    }
    
    return [];
  }

  private detectStrategyPattern(node: ts.Node, filePath: string): CodePattern[] {
    if (ts.isClassDeclaration(node) && node.name) {
      const className = node.name.text;
      
      // Check for strategy pattern (multiple implementations of same interface)
      const hasStrategyProperty = node.members.some(member =>
        ts.isPropertyDeclaration(member) &&
        (member.name.getText().includes('strategy') || member.name.getText().includes('algorithm'))
      );
      
      const hasSetStrategyMethod = node.members.some(member =>
        ts.isMethodDeclaration(member) &&
        (member.name.getText().includes('setStrategy') || member.name.getText().includes('setAlgorithm'))
      );
      
      if (hasStrategyProperty && hasSetStrategyMethod) {
        const pos = node.getSourceFile().getLineAndCharacterOfPosition(node.getStart());
        
        return [{
          type: PatternType.STRATEGY,
          name: `${className}Strategy`,
          description: 'Strategy pattern for interchangeable algorithms',
          files: [{
            file: filePath,
            line: pos.line + 1,
            column: pos.character + 1,
            context: node.getText().substring(0, 100),
          }],
          severity: 'info',
          category: PatternCategory.BEHAVIORAL,
          recommendation: 'Strategy pattern enables selecting algorithm at runtime',
        }];
      }
    }
    
    return [];
  }

  private detectDecoratorPattern(node: ts.Node, filePath: string): CodePattern[] {
    // Check for @decorator syntax or higher-order function patterns
    const nodeText = node.getText();
    
    if (nodeText.includes('@') && this.hasDecoratorSyntax(nodeText)) {
      const pos = node.getSourceFile().getLineAndCharacterOfPosition(node.getStart());
      
      return [{
        type: PatternType.DECORATOR,
        name: 'DecoratorPattern',
        description: 'Decorator pattern for adding behavior to objects dynamically',
        files: [{
          file: filePath,
          line: pos.line + 1,
          column: pos.character + 1,
          context: nodeText.substring(0, 100),
        }],
        severity: 'info',
        category: PatternCategory.STRUCTURAL,
        recommendation: 'Decorator pattern provides flexible alternative to subclassing',
      }];
    }
    
    return [];
  }

  private detectAdapterPattern(node: ts.Node, filePath: string): CodePattern[] {
    if (ts.isClassDeclaration(node) && node.name) {
      const className = node.name.text;
      const classText = node.getText();
      
      // Check for adapter characteristics
      const hasInterfaceProperty = node.heritageClauses?.some(clause =>
        clause.token === ts.SyntaxKind.ImplementsKeyword
      );
      
      const hasWrapperMethod = node.members.some(member =>
        ts.isMethodDeclaration(member) &&
        (member.name.getText().includes('adapt') || 
         member.name.getText().includes('convert') ||
         member.name.getText().includes('wrap'))
      );
      
      if (hasInterfaceProperty && hasWrapperMethod) {
        const pos = node.getSourceFile().getLineAndCharacterOfPosition(node.getStart());
        
        return [{
          type: PatternType.ADAPTER,
          name: `${className}Adapter`,
          description: 'Adapter pattern for interface compatibility',
          files: [{
            file: filePath,
            line: pos.line + 1,
            column: pos.character + 1,
            context: classText.substring(0, 100),
          }],
          severity: 'info',
          category: PatternCategory.STRUCTURAL,
          recommendation: 'Adapter pattern allows incompatible interfaces to work together',
        }];
      }
    }
    
    return [];
  }

  private detectFacadePattern(node: ts.Node, filePath: string): CodePattern[] {
    if (ts.isClassDeclaration(node) && node.name) {
      const className = node.name.text;
      
      // Check for facade characteristics (delegates to other classes)
      const hasMultiplePrivateProperties = node.members.filter(member =>
        ts.isPropertyDeclaration(member) &&
        member.modifiers?.some(m => m.kind === ts.SyntaxKind.PrivateKeyword)
      ).length > 1;
      
      const hasDelegationMethods = node.members.some(member =>
        ts.isMethodDeclaration(member) &&
        member.body && // Has implementation
        member.modifiers?.every(m => m.kind !== ts.SyntaxKind.PrivateKeyword) // Public methods
      );
      
      if (hasMultiplePrivateProperties && hasDelegationMethods) {
        const pos = node.getSourceFile().getLineAndCharacterOfPosition(node.getStart());
        
        return [{
          type: PatternType.FACADE,
          name: `${className}Facade`,
          description: 'Facade pattern providing simplified interface to complex subsystem',
          files: [{
            file: filePath,
            line: pos.line + 1,
            column: pos.character + 1,
            context: node.getText().substring(0, 100),
          }],
          severity: 'info',
          category: PatternCategory.STRUCTURAL,
          recommendation: 'Facade pattern simplifies complex subsystem usage',
        }];
      }
    }
    
    return [];
  }

  // React-specific patterns

  private detectReactComponent(node: ts.Node, filePath: string): CodePattern[] {
    if (ts.isClassDeclaration(node) && node.name) {
      const className = node.name.text;
      
      // Check for React component characteristics
      const extendsReactComponent = node.heritageClauses?.some(clause =>
        clause.token === ts.SyntaxKind.ExtendsKeyword &&
        clause.types.some(type => type.expression.getText().includes('Component'))
      );
      
      const hasRenderMethod = node.members.some(member =>
        ts.isMethodDeclaration(member) &&
        member.name.getText() === 'render'
      );
      
      if (extendsReactComponent && hasRenderMethod) {
        const pos = node.getSourceFile().getLineAndCharacterOfPosition(node.getStart());
        
        return [{
          type: PatternType.COMPONENT,
          name: `${className}Component`,
          description: 'React class component',
          files: [{
            file: filePath,
            line: pos.line + 1,
            column: pos.character + 1,
            context: node.getText().substring(0, 100),
          }],
          severity: 'info',
          category: PatternCategory.REACT_SPECIFIC,
          recommendation: 'Consider using functional components with hooks for better performance',
        }];
      }
    }
    
    return [];
  }

  private detectReactHook(node: ts.Node, filePath: string): CodePattern[] {
    if (ts.isFunctionDeclaration(node) && node.name) {
      const functionName = node.name.text;
      
      // Check for hook naming convention (starts with 'use')
      if (functionName.startsWith('use')) {
        const functionText = node.getText();
        
        // Check for hook characteristics (uses other hooks)
        const usesHooks = this.usesReactHooks(functionText);
        
        if (usesHooks) {
          const pos = node.getSourceFile().getLineAndCharacterOfPosition(node.getStart());
          
          return [{
            type: PatternType.HOOK,
            name: `${functionName}Hook`,
            description: 'React hook implementation',
            files: [{
              file: filePath,
              line: pos.line + 1,
              column: pos.character + 1,
              context: functionText.substring(0, 100),
            }],
            severity: 'info',
            category: PatternCategory.REACT_SPECIFIC,
            recommendation: 'Hooks enable stateful logic reuse in functional components',
          }];
        }
      }
    }
    
    return [];
  }

  private detectCustomHook(node: ts.Node, filePath: string): CodePattern[] {
    if (ts.isFunctionDeclaration(node) && node.name) {
      const functionName = node.name.text;
      
      // Custom hooks start with 'use' and contain complex logic
      if (functionName.startsWith('use') && this.hasComplexLogic(node)) {
        const pos = node.getSourceFile().getLineAndCharacterOfPosition(node.getStart());
        
        return [{
          type: PatternType.CUSTOM_HOOK,
          name: `${functionName}CustomHook`,
          description: 'Custom React hook with complex logic',
          files: [{
            file: filePath,
            line: pos.line + 1,
            column: pos.character + 1,
            context: node.getText().substring(0, 100),
          }],
          severity: 'info',
          category: PatternCategory.REACT_SPECIFIC,
          recommendation: 'Custom hooks help extract component logic into reusable functions',
        }];
      }
    }
    
    return [];
  }

  private detectReactContext(node: ts.Node, filePath: string): CodePattern[] {
    // Check for React Context usage
    const nodeText = node.getText();
    
    if (nodeText.includes('createContext') || nodeText.includes('useContext')) {
      const pos = node.getSourceFile().getLineAndCharacterOfPosition(node.getStart());
      
      return [{
        type: PatternType.CONTEXT,
        name: 'ReactContext',
        description: 'React Context for state management',
        files: [{
          file: filePath,
          line: pos.line + 1,
          column: pos.character + 1,
          context: nodeText.substring(0, 100),
        }],
        severity: 'info',
        category: PatternCategory.REACT_SPECIFIC,
        recommendation: 'Context provides a way to pass data through component tree without prop drilling',
      }];
    }
    
    return [];
  }

  private detectHigherOrderComponent(node: ts.Node, filePath: string): CodePattern[] {
    // Check for HOC pattern
    const nodeText = node.getText();
    
    // HOCs typically return functions that accept components
    if (nodeText.includes('return') && 
        nodeText.includes('Component') && 
        nodeText.includes('=>') &&
        !nodeText.includes('function')) {
      const pos = node.getSourceFile().getLineAndCharacterOfPosition(node.getStart());
      
      return [{
        type: PatternType.HOC,
        name: 'HigherOrderComponent',
        description: 'Higher-Order Component pattern',
        files: [{
          file: filePath,
          line: pos.line + 1,
          column: pos.character + 1,
          context: nodeText.substring(0, 100),
        }],
        severity: 'info',
        category: PatternCategory.REACT_SPECIFIC,
        recommendation: 'HOCs enhance components with additional functionality',
      }];
    }
    
    return [];
  }

  private detectRenderProps(node: ts.Node, filePath: string): CodePattern[] {
    // Check for render props pattern
    const nodeText = node.getText();
    
    // Render props typically use children as function or have prop functions
    if ((nodeText.includes('children') && nodeText.includes('function')) ||
        nodeText.includes('render') && nodeText.includes('function')) {
      const pos = node.getSourceFile().getLineAndCharacterOfPosition(node.getStart());
      
      return [{
        type: PatternType.RENDER_PROPS,
        name: 'RenderPropsPattern',
        description: 'Render props pattern for component composition',
        files: [{
          file: filePath,
          line: pos.line + 1,
          column: pos.character + 1,
          context: nodeText.substring(0, 100),
        }],
        severity: 'info',
        category: PatternCategory.REACT_SPECIFIC,
        recommendation: 'Render props provide flexibility in component behavior',
      }];
    }
    
    return [];
  }

  // Behavioral patterns

  private detectMiddlewarePattern(node: ts.Node, filePath: string): CodePattern[] {
    // Check for middleware characteristics
    const nodeText = node.getText();
    
    // Middleware typically has next parameter and calls it
    if (nodeText.includes('next') && nodeText.includes('=>')) {
      const pos = node.getSourceFile().getLineAndCharacterOfPosition(node.getStart());
      
      return [{
        type: PatternType.MIDDLEWARE,
        name: 'MiddlewarePattern',
        description: 'Middleware pattern for processing requests/responses',
        files: [{
          file: filePath,
          line: pos.line + 1,
          column: pos.character + 1,
          context: nodeText.substring(0, 100),
        }],
        severity: 'info',
        category: PatternCategory.BEHAVIORAL,
        recommendation: 'Middleware provides a way to process data in a pipeline',
      }];
    }
    
    return [];
  }

  // Anti-patterns

  private detectAntiPatterns(node: ts.Node, filePath: string): CodePattern[] {
    const patterns: CodePattern[] = [];
    
    // Large class anti-pattern
    if (ts.isClassDeclaration(node) && node.name) {
      const memberCount = node.members.length;
      if (memberCount > 20) {
        const pos = node.getSourceFile().getLineAndCharacterOfPosition(node.getStart());
        
        patterns.push({
          type: PatternType.ANTI_PATTERN as any, // Type assertion needed for anti-patterns
          name: 'LargeClass',
          description: 'Class has too many members (over 20)',
          files: [{
            file: filePath,
            line: pos.line + 1,
            column: pos.character + 1,
            context: `Class has ${memberCount} members`,
          }],
          severity: 'warning',
          category: PatternCategory.ANTI_PATTERN,
          recommendation: 'Consider splitting this class into smaller, more focused classes',
        });
      }
    }
    
    // Complex function anti-pattern
    if (ts.isFunctionDeclaration(node) && node.name) {
      const functionText = node.getText();
      const lineCount = functionText.split('\n').length;
      
      if (lineCount > 50) {
        const pos = node.getSourceFile().getLineAndCharacterOfPosition(node.getStart());
        
        patterns.push({
          type: PatternType.ANTI_PATTERN as any,
          name: 'LargeFunction',
          description: 'Function is too long (over 50 lines)',
          files: [{
            file: filePath,
            line: pos.line + 1,
            column: pos.character + 1,
            context: `Function has ${lineCount} lines`,
          }],
          severity: 'warning',
          category: PatternCategory.ANTI_PATTERN,
          recommendation: 'Consider breaking this function into smaller, more focused functions',
        });
      }
    }
    
    return patterns;
  }

  // Helper methods

  private returnsInstance(methodText: string): boolean {
    return methodText.includes('return new') || methodText.includes('return this');
  }

  private matchesFactoryName(methodName: string, className: string): boolean {
    return methodName.toLowerCase().includes('factory') ||
           methodName.toLowerCase().includes('create') ||
           methodName.toLowerCase().includes(className.toLowerCase());
  }

  private hasDecoratorSyntax(text: string): boolean {
    return text.includes('@Component') || text.includes('@Injectable') || text.includes('@NgModule');
  }

  private usesReactHooks(text: string): boolean {
    const reactHooks = ['useState', 'useEffect', 'useContext', 'useReducer', 'useCallback', 'useMemo'];
    return reactHooks.some(hook => text.includes(hook));
  }

  private hasComplexLogic(node: ts.Node): boolean {
    const text = node.getText();
    const complexityIndicators = ['if', 'for', 'while', 'switch', 'try'];
    const count = complexityIndicators.reduce((acc, indicator) => {
      return acc + (text.match(new RegExp(indicator, 'g')) || []).length;
    }, 0);
    
    return count > 2; // More than 2 complexity indicators suggests complex logic
  }
}
