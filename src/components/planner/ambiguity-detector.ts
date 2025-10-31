/**
 * AmbiguityDetector - Detects ambiguities in tasks and requirements
 */

import {
  AmbiguityDetectionResult,
  Ambiguity,
  AmbiguityType,
  AmbiguitySeverity,
  ClarificationQuestion,
  QuestionCategory,
  QuestionPriority,
  AnswerType,
  Task,
  PlanningInput,
} from './types';
import { logger } from '../../core/logger';

export class AmbiguityDetector {
  private ambiguityPatterns: Map<AmbiguityType, AmbiguityPattern>;
  private keywordMaps: Map<AmbiguityType, string[]>;
  private severityThresholds: Map<AmbiguityType, number>;

  constructor() {
    this.initializeAmbiguityPatterns();
    this.initializeKeywordMaps();
    this.initializeSeverityThresholds();
  }

  /**
   * Detect ambiguities in planning input
   */
  async detectAmbiguities(
    input: PlanningInput,
    tasks?: Task[]
  ): Promise<AmbiguityDetectionResult> {
    try {
      logger.debug('Starting ambiguity detection', { 
        descriptionLength: input.description.length,
        taskCount: tasks?.length || 0
      });

      const ambiguities: Ambiguity[] = [];

      // Detect requirement ambiguities
      ambiguities.push(...this.detectRequirementAmbiguities(input));

      // Detect technical ambiguities
      ambiguities.push(...this.detectTechnicalAmbiguities(input, tasks));

      // Detect scope ambiguities
      ambiguities.push(...this.detectScopeAmbiguities(input, tasks));

      // Detect timeline ambiguities
      ambiguities.push(...this.detectTimelineAmbiguities(input));

      // Detect resource ambiguities
      ambiguities.push(...this.detectResourceAmbiguities(input, tasks));

      // Detect dependency ambiguities
      ambiguities.push(...this.detectDependencyAmbiguities(tasks));

      // Detect assumption ambiguities
      ambiguities.push(...this.detectAssumptionAmbiguities(input, tasks));

      // Calculate overall clarity score
      const clarityScore = this.calculateClarityScore(ambiguities);

      // Generate recommendations
      const recommendations = this.generateRecommendations(ambiguities);

      // Generate clarification questions
      const questions = this.generateClarificationQuestions(ambiguities, input);

      const result: AmbiguityDetectionResult = {
        ambiguities,
        clarityScore,
        recommendations,
        questions
      };

      logger.info('Ambiguity detection completed', { 
        ambiguityCount: ambiguities.length,
        clarityScore: clarityScore.toFixed(2)
      });

      return result;

    } catch (error) {
      logger.error('Ambiguity detection failed', { error });
      throw error;
    }
  }

  /**
   * Detect requirement ambiguities
   */
  private detectRequirementAmbiguities(input: PlanningInput): Ambiguity[] {
    const ambiguities: Ambiguity[] = [];
    
    // Check for vague requirements
    const vagueTerms = ['etc', 'and so on', 'such as', 'including', 'like'];
    const description = input.description.toLowerCase();
    
    for (const term of vagueTerms) {
      if (description.includes(term)) {
        ambiguities.push({
          id: `requirement-vague-${term}`,
          type: AmbiguityType.REQUIREMENT,
          description: `Vague requirement term "${term}" found in description`,
          location: 'project description',
          severity: AmbiguitySeverity.MEDIUM,
          suggestedResolution: 'Specify exact requirements instead of using vague terms',
          impact: 'May lead to scope creep or misunderstanding of deliverables'
        });
      }
    }

    // Check for missing acceptance criteria
    if (tasksNeedAcceptanceCriteria(input) && !this.hasAcceptanceCriteria(input)) {
      ambiguities.push({
        id: 'requirement-acceptance-criteria',
        type: AmbiguityType.REQUIREMENT,
        description: 'No acceptance criteria specified for project',
        location: 'requirements',
        severity: AmbiguitySeverity.HIGH,
        suggestedResolution: 'Define clear, measurable acceptance criteria for all deliverables',
        impact: 'Difficulty in determining when project is complete'
      });
    }

    // Check for conflicting requirements
    const conflicts = this.detectRequirementConflicts(input);
    ambiguities.push(...conflicts);

    // Check for incomplete requirements
    const incompleteRequirements = this.detectIncompleteRequirements(input);
    ambiguities.push(...incompleteRequirements);

    return ambiguities;
  }

  /**
   * Detect technical ambiguities
   */
  private detectTechnicalAmbiguities(input: PlanningInput, tasks?: Task[]): Ambiguity[] {
    const ambiguities: Ambiguity[] = [];

    // Check for missing technical specifications
    if (this.isTechnicalProject(input.context?.projectType)) {
      const techAmbiguities = this.detectMissingTechSpecs(input);
      ambiguities.push(...techAmbiguities);
    }

    // Check task-specific technical ambiguities
    if (tasks) {
      for (const task of tasks) {
        const taskTechAmbiguities = this.detectTaskTechnicalAmbiguities(task);
        ambiguities.push(...taskTechAmbiguities);
      }
    }

    // Check for undefined APIs or integrations
    const integrationAmbiguities = this.detectIntegrationAmbiguities(input, tasks);
    ambiguities.push(...integrationAmbiguities);

    return ambiguities;
  }

  /**
   * Detect scope ambiguities
   */
  private detectScopeAmbiguities(input: PlanningInput, tasks?: Task[]): Ambiguity[] {
    const ambiguities: Ambiguity[] = [];

    // Check for unclear project boundaries
    const scopeKeywords = ['may', 'might', 'could', 'possibly', 'as needed'];
    const description = input.description.toLowerCase();
    
    const hasScopeUncertainty = scopeKeywords.some(keyword => description.includes(keyword));
    
    if (hasScopeUncertainty) {
      ambiguities.push({
        id: 'scope-uncertainty',
        type: AmbiguityType.SCOPE,
        description: 'Project scope contains uncertainty terms',
        location: 'project description',
        severity: AmbiguitySeverity.MEDIUM,
        suggestedResolution: 'Clearly define what is included and excluded from the project scope',
        impact: 'Unclear boundaries may lead to scope creep or missed deliverables'
      });
    }

    // Check for undefined deliverables
    if (this.hasUndefinedDeliverables(input, tasks)) {
      ambiguities.push({
        id: 'scope-undefined-deliverables',
        type: AmbiguityType.SCOPE,
        description: 'Some deliverables are not clearly defined',
        location: 'deliverables',
        severity: AmbiguitySeverity.HIGH,
        suggestedResolution: 'Provide detailed specifications for all deliverables',
        impact: 'Unclear deliverables make it difficult to measure success'
      });
    }

    // Check for missing exclusions
    if (this.needsScopeExclusions(input) && !this.hasScopeExclusions(input)) {
      ambiguities.push({
        id: 'scope-missing-exclusions',
        type: AmbiguityType.SCOPE,
        description: 'No explicit exclusions defined for project scope',
        location: 'scope definition',
        severity: AmbiguitySeverity.MEDIUM,
        suggestedResolution: 'Clearly state what is explicitly excluded from the project',
        impact: 'Without exclusions, scope may expand unintentionally'
      });
    }

    return ambiguities;
  }

  /**
   * Detect timeline ambiguities
   */
  private detectTimelineAmbiguities(input: PlanningInput): Ambiguity[] {
    const ambiguities: Ambiguity[] = [];

    // Check for missing deadline
    if (!input.context?.deadline && this.needsDeadline(input)) {
      ambiguities.push({
        id: 'timeline-missing-deadline',
        type: AmbiguityType.TIMELINE,
        description: 'No deadline specified for project',
        location: 'timeline',
        severity: AmbiguitySeverity.MEDIUM,
        suggestedResolution: 'Establish a clear deadline or timeline for project completion',
        impact: 'Without deadline, prioritization and resource allocation may be unclear'
      });
    }

    // Check for unrealistic timeline
    if (input.context?.deadline) {
      const timelineAmbiguities = this.checkTimelineFeasibility(input);
      ambiguities.push(...timelineAmbiguities);
    }

    // Check for undefined milestones
    if (this.needsMilestones(input) && !this.hasMilestones(input)) {
      ambiguities.push({
        id: 'timeline-missing-milestones',
        type: AmbiguityType.TIMELINE,
        description: 'No intermediate milestones defined',
        location: 'timeline',
        severity: AmbiguitySeverity.LOW,
        suggestedResolution: 'Define key milestones to track project progress',
        impact: 'Without milestones, progress tracking and risk identification are difficult'
      });
    }

    return ambiguities;
  }

  /**
   * Detect resource ambiguities
   */
  private detectResourceAmbiguities(input: PlanningInput, tasks?: Task[]): Ambiguity[] {
    const ambiguities: Ambiguity[] = [];

    // Check for missing team size
    if (!input.context?.teamSize && this.needsTeamSize(input)) {
      ambiguities.push({
        id: 'resource-missing-team-size',
        type: AmbiguityType.RESOURCE,
        description: 'Team size not specified',
        location: 'resource planning',
        severity: AmbiguitySeverity.MEDIUM,
        suggestedResolution: 'Specify the number of team members available',
        impact: 'Team size affects task allocation and timeline estimates'
      });
    }

    // Check for missing budget
    if (!input.context?.budget && this.needsBudget(input)) {
      ambiguities.push({
        id: 'resource-missing-budget',
        type: AmbiguityType.RESOURCE,
        description: 'Project budget not specified',
        location: 'resource planning',
        severity: AmbiguitySeverity.HIGH,
        suggestedResolution: 'Define project budget constraints',
        impact: 'Budget constraints may affect tool choices and implementation approach'
      });
    }

    // Check for undefined skills
    if (tasks && this.hasSkillAmbiguities(tasks)) {
      ambiguities.push({
        id: 'resource-skill-ambiguities',
        type: AmbiguityType.RESOURCE,
        description: 'Required skills for some tasks are not clearly defined',
        location: 'task requirements',
        severity: AmbiguitySeverity.MEDIUM,
        suggestedResolution: 'Specify required skills and experience levels for each task',
        impact: 'Unclear skill requirements may lead to assignment issues'
      });
    }

    return ambiguities;
  }

  /**
   * Detect dependency ambiguities
   */
  private detectDependencyAmbiguities(tasks?: Task[]): Ambiguity[] {
    const ambiguities: Ambiguity[] = [];

    if (!tasks) return ambiguities;

    // Check for circular dependencies
    const circularDeps = this.findCircularDependencies(tasks);
    if (circularDeps.length > 0) {
      ambiguities.push({
        id: 'dependency-circular',
        type: AmbiguityType.DEPENDENCY,
        description: `Circular dependencies detected: ${circularDeps.map(dep => dep.join(' -> ')).join(', ')}`,
        location: 'task dependencies',
        severity: AmbiguitySeverity.CRITICAL,
        suggestedResolution: 'Refactor task dependencies to eliminate circular references',
        impact: 'Circular dependencies make task sequencing impossible'
      });
    }

    // Check for missing dependencies
    const missingDeps = this.findMissingDependencies(tasks);
    if (missingDeps.length > 0) {
      ambiguities.push({
        id: 'dependency-missing',
        type: AmbiguityType.DEPENDENCY,
        description: `${missingDeps.length} tasks may have missing dependencies`,
        location: 'task dependencies',
        severity: AmbiguitySeverity.MEDIUM,
        suggestedResolution: 'Review task sequence and identify implicit dependencies',
        impact: 'Missing dependencies may lead to execution conflicts'
      });
    }

    // Check for undefined dependency types
    const undefinedDepTypes = this.findUndefinedDependencyTypes(tasks);
    if (undefinedDepTypes.length > 0) {
      ambiguities.push({
        id: 'dependency-undefined-types',
        type: AmbiguityType.DEPENDENCY,
        description: 'Some dependencies do not specify relationship type',
        location: 'task dependencies',
        severity: AmbiguitySeverity.LOW,
        suggestedResolution: 'Specify dependency types (finish-to-start, start-to-start, etc.)',
        impact: 'Without dependency types, task scheduling may be inefficient'
      });
    }

    return ambiguities;
  }

  /**
   * Detect assumption ambiguities
   */
  private detectAssumptionAmbiguities(input: PlanningInput, tasks?: Task[]): Ambiguity[] {
    const ambiguities: Ambiguity[] = [];

    // Check for unstated assumptions
    const commonAssumptions = [
      'existing infrastructure',
      'stakeholder availability',
      'technology stack',
      'compliance requirements',
      'performance requirements',
      'security requirements'
    ];

    const description = input.description.toLowerCase();
    const mentionedAssumptions = commonAssumptions.filter(assumption => 
      description.includes(assumption)
    );

    if (mentionedAssumptions.length < commonAssumptions.length / 2) {
      ambiguities.push({
        id: 'assumption-unstated',
        type: AmbiguityType.ASSUMPTION,
        description: 'Many common assumptions are not explicitly stated',
        location: 'project assumptions',
        severity: AmbiguitySeverity.MEDIUM,
        suggestedResolution: 'Document all key assumptions about the project context',
        impact: 'Unstated assumptions may lead to project risks'
      });
    }

    // Check for conflicting assumptions
    if (tasks) {
      const conflictingAssumptions = this.findConflictingAssumptions(tasks);
      ambiguities.push(...conflictingAssumptions);
    }

    // Check for unverifiable assumptions
    const unverifiableAssumptions = this.findUnverifiableAssumptions(input, tasks);
    if (unverifiableAssumptions.length > 0) {
      ambiguities.push({
        id: 'assumption-unverifiable',
        type: AmbiguityType.ASSUMPTION,
        description: `${unverifiableAssumptions.length} assumptions cannot be easily verified`,
        location: 'project assumptions',
        severity: AmbiguitySeverity.HIGH,
        suggestedResolution: 'Make assumptions verifiable or add validation steps',
        impact: 'Unverifiable assumptions increase project risk'
      });
    }

    return ambiguities;
  }

  /**
   * Calculate overall clarity score
   */
  private calculateClarityScore(ambiguities: Ambiguity[]): number {
    if (ambiguities.length === 0) return 1.0;

    const severityWeights = {
      [AmbiguitySeverity.LOW]: 0.1,
      [AmbiguitySeverity.MEDIUM]: 0.3,
      [AmbiguitySeverity.HIGH]: 0.7,
      [AmbiguitySeverity.CRITICAL]: 1.0
    };

    const totalAmbiguity = ambiguities.reduce((sum, ambiguity) => 
      sum + severityWeights[ambiguity.severity], 0
    );

    // Normalize to 0-1 scale, where 1 is perfectly clear
    const maxPossibleAmbiguity = ambiguities.length * 1.0; // All critical
    const clarityScore = Math.max(0, 1 - (totalAmbiguity / Math.max(maxPossibleAmbiguity, 1)));

    return clarityScore;
  }

  /**
   * Generate recommendations for resolving ambiguities
   */
  private generateRecommendations(ambiguities: Ambiguity[]): string[] {
    const recommendations: string[] = [];
    
    // Group ambiguities by type
    const byType = ambiguities.reduce((groups, ambiguity) => {
      if (!groups[ambiguity.type]) groups[ambiguity.type] = [];
      groups[ambiguity.type].push(ambiguity);
      return groups;
    }, {} as Record<AmbiguityType, Ambiguity[]>);

    // Generate type-specific recommendations
    if (byType[AmbiguityType.REQUIREMENT]) {
      recommendations.push('Create detailed acceptance criteria for all requirements');
      recommendations.push('Review and clarify any vague or ambiguous requirement statements');
    }

    if (byType[AmbiguityType.SCOPE]) {
      recommendations.push('Define clear project boundaries and exclusions');
      recommendations.push('Create a detailed deliverable specification document');
    }

    if (byType[AmbiguityType.TIMELINE]) {
      recommendations.push('Establish concrete milestones and deadlines');
      recommendations.push('Validate timeline feasibility with stakeholders');
    }

    if (byType[AmbiguityType.DEPENDENCY]) {
      recommendations.push('Resolve circular dependencies in task sequence');
      recommendations.push('Document all implicit dependencies between tasks');
    }

    if (byType[AmbiguityType.TECHNICAL]) {
      recommendations.push('Document technical architecture and decisions');
      recommendations.push('Define clear API specifications and integration points');
    }

    // General recommendations for high ambiguity
    const criticalCount = ambiguities.filter(a => a.severity === AmbiguitySeverity.CRITICAL).length;
    if (criticalCount > 0) {
      recommendations.push('Address critical ambiguities before project initiation');
    }

    return recommendations;
  }

  /**
   * Generate clarification questions
   */
  private generateClarificationQuestions(
    ambiguities: Ambiguity[], 
    input: PlanningInput
  ): ClarificationQuestion[] {
    const questions: ClarificationQuestion[] = [];

    // Generate questions for each ambiguity
    for (const ambiguity of ambiguities) {
      const question = this.generateQuestionForAmbiguity(ambiguity, input);
      if (question) {
        questions.push(question);
      }
    }

    // Generate general clarification questions
    questions.push(...this.generateGeneralQuestions(input));

    // Sort by priority
    questions.sort((a, b) => {
      const priorityOrder = {
        [QuestionPriority.CRITICAL]: 4,
        [QuestionPriority.HIGH]: 3,
        [QuestionPriority.MEDIUM]: 2,
        [QuestionPriority.LOW]: 1
      };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    return questions;
  }

  /**
   * Generate question for specific ambiguity
   */
  private generateQuestionForAmbiguity(
    ambiguity: Ambiguity, 
    input: PlanningInput
  ): ClarificationQuestion | null {
    const questionId = `question-${ambiguity.id}`;

    switch (ambiguity.type) {
      case AmbiguityType.REQUIREMENT:
        if (ambiguity.description.includes('acceptance criteria')) {
          return {
            id: questionId,
            question: 'What are the specific, measurable acceptance criteria for this project?',
            category: QuestionCategory.REQUIREMENT,
            priority: QuestionPriority.HIGH,
            context: 'Need clear success metrics',
            expectedAnswerType: AnswerType.TEXT,
            relatedAmbiguities: [ambiguity.id]
          };
        }
        break;

      case AmbiguityType.SCOPE:
        return {
          id: questionId,
          question: 'What is explicitly included and excluded from this project scope?',
          category: QuestionCategory.SCOPE,
          priority: QuestionPriority.HIGH,
          context: 'Need clear boundaries',
          expectedAnswerType: AnswerType.TEXT,
          relatedAmbiguities: [ambiguity.id]
        };

      case AmbiguityType.TIMELINE:
        return {
          id: questionId,
          question: 'What is the target completion date for this project?',
          category: QuestionCategory.TIMELINE,
          priority: QuestionPriority.HIGH,
          context: 'Need timeline for planning',
          expectedAnswerType: AnswerType.DATE,
          relatedAmbiguities: [ambiguity.id]
        };

      case AmbiguityType.RESOURCE:
        return {
          id: questionId,
          question: 'How many team members will be assigned to this project?',
          category: QuestionCategory.RESOURCE,
          priority: QuestionPriority.MEDIUM,
          context: 'Need resource allocation info',
          expectedAnswerType: AnswerType.NUMBER,
          relatedAmbiguities: [ambiguity.id]
        };

      case AmbiguityType.TECHNICAL:
        return {
          id: questionId,
          question: 'What technology stack and architectural decisions have been made?',
          category: QuestionCategory.TECHNICAL,
          priority: QuestionPriority.HIGH,
          context: 'Need technical context',
          expectedAnswerType: AnswerType.TEXT,
          relatedAmbiguities: [ambiguity.id]
        };

      case AmbiguityType.DEPENDENCY:
        return {
          id: questionId,
          question: 'Are there any external dependencies or constraints not yet documented?',
          category: QuestionCategory.DEPENDENCY,
          priority: QuestionPriority.MEDIUM,
          context: 'Need complete dependency list',
          expectedAnswerType: AnswerType.TEXT,
          relatedAmbiguities: [ambiguity.id]
        };
    }

    return null;
  }

  /**
   * Generate general clarification questions
   */
  private generateGeneralQuestions(input: PlanningInput): ClarificationQuestion[] {
    const questions: ClarificationQuestion[] = [];

    // Check what's missing from input
    if (!input.requirements || input.requirements.length === 0) {
      questions.push({
        id: 'general-requirements',
        question: 'What are the specific requirements for this project?',
        category: QuestionCategory.REQUIREMENT,
        priority: QuestionPriority.HIGH,
        expectedAnswerType: AnswerType.TEXT,
        relatedAmbiguities: []
      });
    }

    if (!input.context?.deadline) {
      questions.push({
        id: 'general-timeline',
        question: 'What is the expected timeline for project completion?',
        category: QuestionCategory.TIMELINE,
        priority: QuestionPriority.HIGH,
        expectedAnswerType: AnswerType.DATE,
        relatedAmbiguities: []
      });
    }

    if (!input.context?.teamSize) {
      questions.push({
        id: 'general-team',
        question: 'What is the available team size for this project?',
        category: QuestionCategory.RESOURCE,
        priority: QuestionPriority.MEDIUM,
        expectedAnswerType: AnswerType.NUMBER,
        relatedAmbiguities: []
      });
    }

    return questions;
  }

  // Helper methods for detection patterns

  private detectRequirementConflicts(input: PlanningInput): Ambiguity[] {
    // Implementation for detecting conflicting requirements
    return [];
  }

  private detectIncompleteRequirements(input: PlanningInput): Ambiguity[] {
    // Implementation for detecting incomplete requirements
    return [];
  }

  private detectTaskTechnicalAmbiguities(task: Task): Ambiguity[] {
    // Implementation for detecting technical ambiguities in tasks
    return [];
  }

  private detectIntegrationAmbiguities(input: PlanningInput, tasks?: Task[]): Ambiguity[] {
    // Implementation for detecting integration-related ambiguities
    return [];
  }

  private detectMissingTechSpecs(input: PlanningInput): Ambiguity[] {
    // Implementation for detecting missing technical specifications
    return [];
  }

  private checkTimelineFeasibility(input: PlanningInput): Ambiguity[] {
    // Implementation for checking timeline feasibility
    return [];
  }

  private findCircularDependencies(tasks: Task[]): string[][] {
    // Implementation for finding circular dependencies
    return [];
  }

  private findMissingDependencies(tasks: Task[]): string[] {
    // Implementation for finding missing dependencies
    return [];
  }

  private findUndefinedDependencyTypes(tasks: Task[]): string[] {
    // Implementation for finding undefined dependency types
    return [];
  }

  private findConflictingAssumptions(tasks: Task[]): Ambiguity[] {
    // Implementation for finding conflicting assumptions
    return [];
  }

  private findUnverifiableAssumptions(input: PlanningInput, tasks?: Task[]): string[] {
    // Implementation for finding unverifiable assumptions
    return [];
  }

  // Utility methods

  private hasAcceptanceCriteria(input: PlanningInput): boolean {
    return input.requirements?.some(req => 
      req.toLowerCase().includes('acceptance') || 
      req.toLowerCase().includes('criteria')
    ) || false;
  }

  private isTechnicalProject(projectType?: string): boolean {
    return projectType === 'web_application' || 
           projectType === 'mobile_application' || 
           projectType === 'api_service';
  }

  private hasUndefinedDeliverables(input: PlanningInput, tasks?: Task[]): boolean {
    // Check if deliverables are properly defined
    return false;
  }

  private needsDeadline(input: PlanningInput): boolean {
    return input.context?.projectType !== 'research';
  }

  private hasMilestones(input: PlanningInput): boolean {
    return false; // Implementation would check for milestone specifications
  }

  private needsTeamSize(input: PlanningInput): boolean {
    return input.context?.projectType !== 'research';
  }

  private needsBudget(input: PlanningInput): boolean {
    return input.context?.projectType !== 'research';
  }

  private hasSkillAmbiguities(tasks: Task[]): boolean {
    return tasks.some(task => task.skills.length === 0);
  }

  private hasScopeExclusions(input: PlanningInput): boolean {
    return input.description.toLowerCase().includes('exclude') ||
           input.description.toLowerCase().includes('except');
  }

  private needsScopeExclusions(input: PlanningInput): boolean {
    return input.description.length > 100; // Simple heuristic
  }

  private needsMilestones(input: PlanningInput): boolean {
    return input.context?.deadline !== undefined;
  }

  private tasksNeedAcceptanceCriteria(input: PlanningInput): boolean {
    return input.context?.projectType !== 'research';
  }

  /**
   * Initialize ambiguity patterns
   */
  private initializeAmbiguityPatterns(): void {
    this.ambiguityPatterns = new Map([
      [AmbiguityType.REQUIREMENT, {
        patterns: ['vague_terms', 'missing_criteria', 'conflicting_requirements'],
        severity: AmbiguitySeverity.MEDIUM
      }],
      [AmbiguityType.TECHNICAL, {
        patterns: ['undefined_apis', 'missing_specs', 'integration_ambiguities'],
        severity: AmbiguitySeverity.HIGH
      }],
    ]);
  }

  /**
   * Initialize keyword maps
   */
  private initializeKeywordMaps(): void {
    this.keywordMaps = new Map([
      [AmbiguityType.REQUIREMENT, ['etc', 'and so on', 'such as', 'including', 'like', 'may', 'might']],
      [AmbiguityType.SCOPE, ['may', 'might', 'could', 'possibly', 'as needed', 'flexible']],
      [AmbiguityType.TIMELINE, ['asap', 'when possible', 'eventually', 'flexible timeline']],
      [AmbiguityType.TECHNICAL, ['somehow', 'magic', 'automatically', 'seamlessly']],
    ]);
  }

  /**
   * Initialize severity thresholds
   */
  private initializeSeverityThresholds(): void {
    this.severityThresholds = new Map([
      [AmbiguityType.REQUIREMENT, 0.7],
      [AmbiguityType.TECHNICAL, 0.8],
      [AmbiguityType.SCOPE, 0.6],
      [AmbiguityType.TIMELINE, 0.5],
      [AmbiguityType.RESOURCE, 0.6],
      [AmbiguityType.DEPENDENCY, 0.9],
      [AmbiguityType.ASSUMPTION, 0.5],
    ]);
  }
}

interface AmbiguityPattern {
  patterns: string[];
  severity: AmbiguitySeverity;
}