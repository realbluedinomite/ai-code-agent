/**
 * Integration module for Planner component
 * 
 * This module provides interfaces and utilities for integrating the Planner
 * with Input Parser and Project Analyzer components.
 */

import {
  PlanningInput,
  ExecutionPlan,
  PlanningResult,
  ProjectType,
  RiskTolerance,
  QualityLevel,
  PlannerConfig,
} from './types';
import { Planner } from './planner';
import { AnalysisResult } from '../project-analyzer/types';

// Define Input Parser types (since they might not exist yet)
export interface ParsedInput {
  intent: {
    type: string;
    subType?: string;
    confidence: number;
    parameters?: Record<string, any>;
  };
  description: string;
  requirements?: string[];
  constraints?: string[];
  metadata?: Record<string, any>;
}

export interface InputParserOutput {
  parsed: ParsedInput;
  confidence: number;
  ambiguities?: string[];
  suggestions?: string[];
}

/**
 * Integration utility for combining Input Parser output with planning
 */
export class PlannerIntegration {
  private planner: Planner;

  constructor(config?: PlannerConfig) {
    this.planner = new Planner(config);
  }

  /**
   * Create execution plan from Input Parser output
   */
  async createPlanFromInput(
    inputParserOutput: InputParserOutput,
    projectAnalyzerOutput?: AnalysisResult
  ): Promise<PlanningResult> {
    // Convert Input Parser output to PlanningInput
    const planningInput = this.convertInputParserOutput(inputParserOutput);
    
    // Enhance with Project Analyzer insights
    if (projectAnalyzerOutput) {
      this.enhancePlanningInputWithAnalysis(planningInput, projectAnalyzerOutput);
    }

    // Create execution plan
    return this.planner.createExecutionPlan(planningInput, projectAnalyzerOutput);
  }

  /**
   * Convert Input Parser output to PlanningInput
   */
  private convertInputParserOutput(inputParserOutput: InputParserOutput): PlanningInput {
    const { parsed, confidence } = inputParserOutput;

    // Determine project type from intent
    const projectType = this.mapIntentToProjectType(parsed.intent);

    // Extract context from parsed input
    const context = {
      projectType,
      technologyStack: this.extractTechnologyStack(parsed),
      teamSize: this.extractTeamSize(parsed),
      deadline: this.extractDeadline(parsed),
      budget: this.extractBudget(parsed),
      riskTolerance: this.determineRiskTolerance(parsed, confidence),
      qualityRequirements: this.determineQualityLevel(parsed),
      existingCodebase: undefined // Will be set by Project Analyzer integration
    };

    // Extract preferences
    const preferences = {
      methodology: this.determineMethodology(parsed.intent),
      taskSize: this.determineTaskSize(parsed),
      priorityStrategy: 'dependency_first' as any,
      resourceAllocation: 'moderate' as any,
      communicationStyle: 'collaborative' as any
    };

    return {
      description: parsed.description,
      requirements: parsed.requirements,
      constraints: parsed.constraints,
      context,
      preferences,
      metadata: {
        ...parsed.metadata,
        inputParserConfidence: confidence,
        intentType: parsed.intent.type,
        intentSubType: parsed.intent.subType
      }
    };
  }

  /**
   * Map intent type to project type
   */
  private mapIntentToProjectType(intent: ParsedInput['intent']): ProjectType {
    const typeMap: Record<string, ProjectType> = {
      'web_development': ProjectType.WEB_APPLICATION,
      'api_development': ProjectType.API_SERVICE,
      'mobile_development': ProjectType.MOBILE_APPLICATION,
      'desktop_development': ProjectType.DESKTOP_APPLICATION,
      'library_development': ProjectType.LIBRARY,
      'cli_development': ProjectType.CLI_TOOL,
      'data_analysis': ProjectType.DATA_ANALYSIS,
      'machine_learning': ProjectType.MACHINE_LEARNING,
      'devops': ProjectType.DEVOPS,
      'refactoring': ProjectType.REFACTORING,
      'migration': ProjectType.MIGRATION,
      'documentation': ProjectType.DOCUMENTATION,
      'research': ProjectType.RESEARCH
    };

    return typeMap[intent.type] || ProjectType.OTHER;
  }

  /**
   * Extract technology stack from parsed input
   */
  private extractTechnologyStack(parsed: ParsedInput): string[] | undefined {
    const techKeywords = [
      'react', 'angular', 'vue', 'nodejs', 'python', 'java', 'typescript',
      'javascript', 'csharp', 'php', 'ruby', 'go', 'rust', 'swift', 'kotlin',
      'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'mysql', 'postgres',
      'mongodb', 'redis', 'elasticsearch', 'kafka', 'rabbitmq'
    ];

    const text = parsed.description.toLowerCase();
    const foundTechnologies = techKeywords.filter(tech => text.includes(tech));

    return foundTechnologies.length > 0 ? foundTechnologies : undefined;
  }

  /**
   * Extract team size from parsed input
   */
  private extractTeamSize(parsed: ParsedInput): number | undefined {
    const teamSizeRegex = /(?:team|developer|sprint).*?(\d+)/i;
    const match = parsed.description.match(teamSizeRegex);
    
    if (match) {
      const size = parseInt(match[1], 10);
      return size >= 1 && size <= 50 ? size : undefined;
    }

    return undefined;
  }

  /**
   * Extract deadline from parsed input
   */
  private extractDeadline(parsed: ParsedInput): Date | undefined {
    const dateKeywords = [
      /(?:by|deadline|due).*?(\d{1,2}\/\d{1,2}\/\d{4})/i,
      /(?:by|deadline|due).*?(\d{4}-\d{2}-\d{2})/i,
      /(?:by|deadline|due).*?(next week|next month|tomorrow|today)/i
    ];

    for (const regex of dateKeywords) {
      const match = parsed.description.match(regex);
      if (match) {
        const dateStr = match[1];
        
        // Handle relative dates
        if (dateStr.includes('tomorrow')) {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          return tomorrow;
        }
        
        if (dateStr.includes('today')) {
          return new Date();
        }
        
        if (dateStr.includes('next week')) {
          const nextWeek = new Date();
          nextWeek.setDate(nextWeek.getDate() + 7);
          return nextWeek;
        }
        
        if (dateStr.includes('next month')) {
          const nextMonth = new Date();
          nextMonth.setMonth(nextMonth.getMonth() + 1);
          return nextMonth;
        }
        
        // Try to parse as actual date
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    }

    return undefined;
  }

  /**
   * Extract budget from parsed input
   */
  private extractBudget(parsed: ParsedInput): number | undefined {
    const budgetRegex = /(?:budget|cost|spend|\$).*?(\d+(?:,\d{3})*(?:\.\d{2})?)/i;
    const match = parsed.description.match(budgetRegex);
    
    if (match) {
      const budget = parseFloat(match[1].replace(/,/g, ''));
      return budget >= 0 ? budget : undefined;
    }

    return undefined;
  }

  /**
   * Determine risk tolerance from parsed input
   */
  private determineRiskTolerance(parsed: ParsedInput, confidence: number): RiskTolerance {
    const text = parsed.description.toLowerCase();
    
    // High risk indicators
    if (text.includes('prototype') || text.includes('experiment') || text.includes('poc')) {
      return RiskTolerance.HIGH;
    }
    
    // Low risk indicators
    if (text.includes('stable') || text.includes('production') || text.includes('enterprise')) {
      return RiskTolerance.LOW;
    }
    
    // Medium confidence in input suggests medium risk tolerance
    if (confidence > 0.8) {
      return RiskTolerance.MEDIUM;
    }
    
    return RiskTolerance.MEDIUM; // Default
  }

  /**
   * Determine quality level from parsed input
   */
  private determineQualityLevel(parsed: ParsedInput): QualityLevel {
    const text = parsed.description.toLowerCase();
    
    if (text.includes('enterprise') || text.includes('mission-critical')) {
      return QualityLevel.ENTERPRISE;
    }
    
    if (text.includes('high-quality') || text.includes('robust')) {
      return QualityLevel.HIGH;
    }
    
    if (text.includes('basic') || text.includes('simple') || text.includes('prototype')) {
      return QualityLevel.BASIC;
    }
    
    return QualityLevel.STANDARD; // Default
  }

  /**
   * Determine methodology from intent
   */
  private determineMethodology(intent: ParsedInput['intent']): any {
    const methodologyMap: Record<string, any> = {
      'agile': 'agile',
      'scrum': 'scrum',
      'waterfall': 'waterfall',
      'devops': 'hybrid'
    };

    return methodologyMap[intent.type] || 'hybrid';
  }

  /**
   * Determine task size preference from parsed input
   */
  private determineTaskSize(parsed: ParsedInput): any {
    const text = parsed.description.toLowerCase();
    
    if (text.includes('quick') || text.includes('simple') || text.includes('small')) {
      return 'small';
    }
    
    if (text.includes('large') || text.includes('complex') || text.includes('comprehensive')) {
      return 'large';
    }
    
    return 'medium'; // Default
  }

  /**
   * Enhance PlanningInput with Project Analyzer insights
   */
  private enhancePlanningInputWithAnalysis(
    planningInput: PlanningInput,
    analysis: AnalysisResult
  ): void {
    // Add technology stack from analysis
    const analysisTechStack = this.extractTechStackFromAnalysis(analysis);
    if (analysisTechStack.length > 0) {
      planningInput.context.technologyStack = [
        ...(planningInput.context.technologyStack || []),
        ...analysisTechStack
      ];
    }

    // Add existing codebase info
    planningInput.context.existingCodebase = analysis;

    // Adjust quality requirements based on analysis
    if (analysis.patterns?.architecturalIssues.length > 0) {
      planningInput.context.qualityRequirements = QualityLevel.HIGH;
    }

    // Add constraints based on analysis findings
    const analysisConstraints = this.generateConstraintsFromAnalysis(analysis);
    planningInput.constraints = [
      ...(planningInput.constraints || []),
      ...analysisConstraints
    ];
  }

  /**
   * Extract technology stack from project analysis
   */
  private extractTechStackFromAnalysis(analysis: AnalysisResult): string[] {
    const technologies: string[] = [];
    
    // Extract from symbol table
    if (analysis.symbolTable?.symbols) {
      const symbols = Array.from(analysis.symbolTable.symbols.values());
      
      // Look for framework/library symbols
      symbols.forEach(symbol => {
        const name = symbol.name.toLowerCase();
        if (name.includes('react') || name.includes('angular') || name.includes('vue')) {
          technologies.push(name);
        }
      });
    }

    // Extract from dependency graph
    if (analysis.dependencyGraph?.nodes) {
      const nodes = Array.from(analysis.dependencyGraph.nodes.values());
      
      nodes.forEach(node => {
        const path = node.path.toLowerCase();
        if (path.includes('node_modules')) {
          const moduleName = path.split('/').pop()?.split('@')[0];
          if (moduleName && !technologies.includes(moduleName)) {
            technologies.push(moduleName);
          }
        }
      });
    }

    return technologies;
  }

  /**
   * Generate constraints from analysis findings
   */
  private generateConstraintsFromAnalysis(analysis: AnalysisResult): string[] {
    const constraints: string[] = [];

    // Add constraints based on errors
    if (analysis.errors.length > 0) {
      constraints.push('Must address existing compilation errors');
    }

    // Add constraints based on circular dependencies
    if (analysis.dependencyAnalysis?.circularDependencies.length > 0) {
      constraints.push('Must resolve circular dependencies');
    }

    // Add constraints based on complexity
    if (analysis.fileCount > 100) {
      constraints.push('Must handle large codebase structure');
    }

    return constraints;
  }

  /**
   * Get planner instance for advanced usage
   */
  getPlanner(): Planner {
    return this.planner;
  }

  /**
   * Update planner configuration
   */
  updateConfig(config: Partial<PlannerConfig>): void {
    this.planner.updateConfig(config);
  }
}

/**
 * Convenience function to create integrated planning
 */
export async function createIntegratedPlan(
  inputParserOutput: InputParserOutput,
  projectAnalyzerOutput?: AnalysisResult,
  config?: PlannerConfig
): Promise<PlanningResult> {
  const integration = new PlannerIntegration(config);
  return integration.createPlanFromInput(inputParserOutput, projectAnalyzerOutput);
}

/**
 * Utility to validate integration compatibility
 */
export function validateIntegrationCompatibility(
  inputParserOutput: InputParserOutput,
  projectAnalyzerOutput?: AnalysisResult
): { compatible: boolean; issues: string[] } {
  const issues: string[] = [];

  // Check input parser output
  if (!inputParserOutput.parsed.description) {
    issues.push('Input parser output missing description');
  }

  if (!inputParserOutput.parsed.intent?.type) {
    issues.push('Input parser output missing intent type');
  }

  // Check project analyzer output if provided
  if (projectAnalyzerOutput) {
    if (!projectAnalyzerOutput.projectPath) {
      issues.push('Project analyzer output missing project path');
    }
  }

  return {
    compatible: issues.length === 0,
    issues
  };
}