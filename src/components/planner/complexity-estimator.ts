/**
 * ComplexityEstimator - Estimates task complexity using AI and heuristics
 */

import {
  ComplexityScore,
  ComplexityFactor,
  ComplexityEstimate,
  AIComplexityAnalysis,
  HeuristicComplexityAnalysis,
  Task,
  Skill,
  Tool,
  TaskCategory,
  Deliverable,
  Risk,
} from './types';
import { logger } from '../../core/logger';

export class ComplexityEstimator {
  private aiModel: string;
  private heuristicWeights: Map<string, number>;
  private complexityPatterns: Map<TaskCategory, ComplexityFactor[]>;
  private riskImpactMap: Map<string, number>;

  constructor(config?: { aiModel?: string }) {
    this.aiModel = config?.aiModel || 'default';
    this.initializeHeuristicWeights();
    this.initializeComplexityPatterns();
    this.initializeRiskImpactMap();
  }

  /**
   * Estimate complexity for a single task
   */
  async estimateTaskComplexity(task: Task, context?: any): Promise<ComplexityEstimate> {
    try {
      logger.debug('Estimating task complexity', { taskId: task.id, taskName: task.name });

      // Get heuristic analysis
      const heuristicAnalysis = this.performHeuristicAnalysis(task, context);
      
      // Get AI analysis (if enabled)
      let aiAnalysis: AIComplexityAnalysis | undefined;
      try {
        aiAnalysis = await this.performAIAnalysis(task, context);
      } catch (error) {
        logger.warn('AI analysis failed, using heuristic only', { error, taskId: task.id });
      }

      // Combine analyses
      const estimate = this.combineAnalyses(task, heuristicAnalysis, aiAnalysis);

      logger.info('Task complexity estimated', { 
        taskId: task.id, 
        estimate: estimate.estimatedHours,
        confidence: estimate.confidence 
      });

      return estimate;

    } catch (error) {
      logger.error('Complexity estimation failed', { error, taskId: task.id });
      throw error;
    }
  }

  /**
   * Estimate complexity for multiple tasks
   */
  async estimateMultipleTasks(tasks: Task[], context?: any): Promise<ComplexityEstimate[]> {
    logger.info('Estimating complexity for multiple tasks', { taskCount: tasks.length });
    
    const estimates: ComplexityEstimate[] = [];
    
    for (const task of tasks) {
      try {
        const estimate = await this.estimateTaskComplexity(task, context);
        estimates.push(estimate);
      } catch (error) {
        logger.error('Failed to estimate task complexity', { error, taskId: task.id });
        // Add failed estimate with minimal data
        estimates.push({
          taskId: task.id,
          estimatedHours: task.estimatedHours || 1,
          confidence: 0.1,
          factors: [],
          heuristicAnalysis: {
            algorithm: 'fallback',
            factors: [],
            scoring: 0.5,
            reasoning: 'Estimation failed, using minimal baseline'
          }
        });
      }
    }
    
    return estimates;
  }

  /**
   * Perform heuristic analysis based on task characteristics
   */
  private performHeuristicAnalysis(task: Task, context?: any): HeuristicComplexityAnalysis {
    const factors: ComplexityFactor[] = [];

    // Factor 1: Task category complexity
    const categoryFactor = this.analyzeCategoryComplexity(task.category);
    factors.push(categoryFactor);

    // Factor 2: Dependency complexity
    const dependencyFactor = this.analyzeDependencyComplexity(task.dependencies);
    factors.push(dependencyFactor);

    // Factor 3: Deliverable complexity
    const deliverableFactor = this.analyzeDeliverableComplexity(task.deliverables);
    factors.push(deliverableFactor);

    // Factor 4: Skill requirements complexity
    const skillFactor = this.analyzeSkillComplexity(task.skills);
    factors.push(skillFactor);

    // Factor 5: Tool complexity
    const toolFactor = this.analyzeToolComplexity(task.tools);
    factors.push(toolFactor);

    // Factor 6: Risk complexity
    const riskFactor = this.analyzeRiskComplexity(task.risks);
    factors.push(riskFactor);

    // Factor 7: Task size complexity
    const sizeFactor = this.analyzeSizeComplexity(task.estimatedHours);
    factors.push(sizeFactor);

    // Factor 8: Integration complexity
    const integrationFactor = this.analyzeIntegrationComplexity(task, context);
    factors.push(integrationFactor);

    // Calculate overall score
    const scoring = this.calculateComplexityScore(factors);

    return {
      algorithm: 'multi_factor_heuristic',
      factors,
      scoring,
      reasoning: this.generateHeuristicReasoning(factors)
    };
  }

  /**
   * Perform AI analysis for task complexity
   */
  private async performAIAnalysis(task: Task, context?: any): Promise<AIComplexityAnalysis> {
    // In a real implementation, this would call an AI service
    // For now, we'll simulate AI analysis with pattern matching
    
    const prompt = this.buildAnalysisPrompt(task, context);
    const similarTasks = this.findSimilarTasks(task);
    
    // Simulate AI reasoning
    const reasoning = await this.simulateAIReasoning(task, similarTasks);
    
    // Generate alternatives
    const alternatives = this.generateAlternativeEstimates(task, similarTasks);
    
    return {
      model: this.aiModel,
      reasoning,
      confidence: this.calculateAIConfidence(task, similarTasks),
      alternatives,
      similarTasks: similarTasks.map(t => t.id)
    };
  }

  /**
   * Analyze task category complexity
   */
  private analyzeCategoryComplexity(category: TaskCategory): ComplexityFactor {
    const complexityMap: Record<TaskCategory, { score: number; weight: number; description: string }> = {
      [TaskCategory.DEVELOPMENT]: { score: 0.6, weight: 0.15, description: 'Development tasks involve coding and implementation' },
      [TaskCategory.TESTING]: { score: 0.5, weight: 0.12, description: 'Testing requires systematic validation and debugging' },
      [TaskCategory.DESIGN]: { score: 0.7, weight: 0.14, description: 'Design involves creativity and stakeholder communication' },
      [TaskCategory.DEPLOYMENT]: { score: 0.4, weight: 0.10, description: 'Deployment is mostly automation with some manual steps' },
      [TaskCategory.DOCUMENTATION]: { score: 0.3, weight: 0.08, description: 'Documentation is structured writing with some research' },
      [TaskCategory.ANALYSIS]: { score: 0.8, weight: 0.18, description: 'Analysis requires deep thinking and pattern recognition' },
      [TaskCategory.INTEGRATION]: { score: 0.9, weight: 0.20, description: 'Integration is complex due to external dependencies' },
      [TaskCategory.SECURITY]: { score: 0.85, weight: 0.16, description: 'Security requires specialized knowledge and thorough testing' },
      [TaskCategory.PERFORMANCE]: { score: 0.75, weight: 0.15, description: 'Performance optimization requires deep technical expertise' },
      [TaskCategory.MAINTENANCE]: { score: 0.4, weight: 0.09, description: 'Maintenance involves understanding existing code and fixes' },
      [TaskCategory.OPTIMIZATION]: { score: 0.7, weight: 0.13, description: 'Optimization requires analysis and careful implementation' },
      [TaskCategory.CONFIGURATION]: { score: 0.3, weight: 0.07, description: 'Configuration is straightforward setup and parameters' },
      [TaskCategory.MIGRATION]: { score: 0.8, weight: 0.17, description: 'Migration involves data transformation and testing' },
      [TaskCategory.RESEARCH]: { score: 0.6, weight: 0.11, description: 'Research requires investigation and documentation' },
    };

    const config = complexityMap[category] || { score: 0.5, weight: 0.10, description: 'Unknown category' };

    return {
      name: 'task_category',
      description: config.description,
      weight: config.weight,
      score: config.score,
      reasoning: `${category} tasks typically have ${(config.score * 100).toFixed(0)}% complexity level`
    };
  }

  /**
   * Analyze dependency complexity
   */
  private analyzeDependencyComplexity(dependencies: string[]): ComplexityFactor {
    const depCount = dependencies.length;
    const dependencyScore = Math.min(0.9, depCount * 0.1 + 0.1);
    const dependencyWeight = 0.12;

    return {
      name: 'dependency_complexity',
      description: `Task has ${depCount} dependencies`,
      weight: dependencyWeight,
      score: dependencyScore,
      reasoning: `More dependencies increase coordination complexity. ${depCount} dependencies score ${(dependencyScore * 100).toFixed(0)}%`
    };
  }

  /**
   * Analyze deliverable complexity
   */
  private analyzeDeliverableComplexity(deliverables: any[]): ComplexityFactor {
    const deliverableCount = deliverables.length;
    const complexityTypes = ['code', 'documentation', 'test', 'integration'];
    const complexDeliverables = deliverables.filter(d => 
      complexityTypes.includes(d.type) && d.format === 'complex'
    ).length;

    const complexityScore = Math.min(0.9, (deliverableCount * 0.1) + (complexDeliverables * 0.15));

    return {
      name: 'deliverable_complexity',
      description: `Task produces ${deliverableCount} deliverables, ${complexDeliverables} complex`,
      weight: 0.10,
      score: complexityScore,
      reasoning: `Multiple and complex deliverables increase effort and coordination needs`
    };
  }

  /**
   * Analyze skill complexity
   */
  private analyzeSkillComplexity(skills: Skill[]): ComplexityFactor {
    if (skills.length === 0) {
      return {
        name: 'skill_complexity',
        description: 'No specific skills required',
        weight: 0.08,
        score: 0.2,
        reasoning: 'Basic task with minimal skill requirements'
      };
    }

    const avgSkillLevel = skills.reduce((sum, skill) => {
      const levelValues = { beginner: 0.2, intermediate: 0.5, advanced: 0.8, expert: 1.0 };
      return sum + levelValues[skill.level];
    }, 0) / skills.length;

    const requiredSkillsCount = skills.filter(s => s.required).length;

    const complexityScore = Math.min(0.9, avgSkillLevel * 0.6 + (requiredSkillsCount * 0.1));

    return {
      name: 'skill_complexity',
      description: `${skills.length} skills required, ${requiredSkillsCount} mandatory`,
      weight: 0.13,
      score: complexityScore,
      reasoning: `Skill requirements complexity based on level and count: ${(complexityScore * 100).toFixed(0)}%`
    };
  }

  /**
   * Analyze tool complexity
   */
  private analyzeToolComplexity(tools: Tool[]): ComplexityFactor {
    const toolCount = tools.length;
    const complexTools = tools.filter(t => 
      ['ide', 'testing', 'deployment', 'monitoring'].includes(t.category)
    ).length;

    const requiredTools = tools.filter(t => t.required).length;

    const complexityScore = Math.min(0.8, (toolCount * 0.05) + (complexTools * 0.15));

    return {
      name: 'tool_complexity',
      description: `${toolCount} tools, ${complexTools} complex, ${requiredTools} required`,
      weight: 0.08,
      score: complexityScore,
      reasoning: `Tool complexity affects setup and learning curve`
    };
  }

  /**
   * Analyze risk complexity
   */
  private analyzeRiskComplexity(risks: Risk[]): ComplexityFactor {
    if (risks.length === 0) {
      return {
        name: 'risk_complexity',
        description: 'No identified risks',
        weight: 0.10,
        score: 0.2,
        reasoning: 'Low risk task with clear mitigation paths'
      };
    }

    const avgImpact = risks.reduce((sum, risk) => {
      const impactValues = { minor: 0.2, moderate: 0.4, major: 0.7, severe: 0.9, critical: 1.0 };
      return sum + impactValues[risk.impact];
    }, 0) / risks.length;

    const highProbabilityRisks = risks.filter(r => 
      ['medium', 'high', 'very_high'].includes(r.probability)
    ).length;

    const complexityScore = Math.min(0.95, avgImpact * 0.7 + (highProbabilityRisks * 0.1));

    return {
      name: 'risk_complexity',
      description: `${risks.length} risks, ${highProbabilityRisks} high probability`,
      weight: 0.15,
      score: complexityScore,
      reasoning: `Risk complexity affects planning and contingency requirements`
    };
  }

  /**
   * Analyze size complexity
   */
  private analyzeSizeComplexity(estimatedHours: number): ComplexityFactor {
    let score: number;
    let description: string;
    let reasoning: string;

    if (estimatedHours <= 4) {
      score = 0.2;
      description = 'Small task (≤4 hours)';
      reasoning = 'Small tasks are typically straightforward and well-defined';
    } else if (estimatedHours <= 16) {
      score = 0.4;
      description = 'Medium task (4-16 hours)';
      reasoning = 'Medium tasks require planning and may have multiple components';
    } else if (estimatedHours <= 40) {
      score = 0.6;
      description = 'Large task (16-40 hours)';
      reasoning = 'Large tasks require significant planning and likely multiple iterations';
    } else {
      score = 0.8;
      description = 'Very large task (>40 hours)';
      reasoning = 'Very large tasks are complex and require detailed breakdown';
    }

    return {
      name: 'task_size',
      description,
      weight: 0.12,
      score,
      reasoning: `Task size complexity: ${reasoning}`
    };
  }

  /**
   * Analyze integration complexity
   */
  private analyzeIntegrationComplexity(task: Task, context?: any): ComplexityFactor {
    const integrationKeywords = ['api', 'service', 'external', 'third-party', 'integration', 'interface'];
    const hasIntegration = task.description.toLowerCase().includes('integration') ||
                          task.deliverables.some(d => integrationKeywords.some(k => d.type.includes(k)));

    if (hasIntegration) {
      return {
        name: 'integration_complexity',
        description: 'Task involves integration with external systems',
        weight: 0.18,
        score: 0.8,
        reasoning: 'Integration tasks involve external dependencies and compatibility concerns'
      };
    }

    return {
      name: 'integration_complexity',
      description: 'No external integration required',
      weight: 0.05,
      score: 0.2,
      reasoning: 'Self-contained task with no external dependencies'
    };
  }

  /**
   * Calculate overall complexity score
   */
  private calculateComplexityScore(factors: ComplexityFactor[]): number {
    return factors.reduce((total, factor) => total + (factor.score * factor.weight), 0);
  }

  /**
   * Generate heuristic reasoning
   */
  private generateHeuristicReasoning(factors: ComplexityFactor[]): string {
    const sortedFactors = factors
      .sort((a, b) => (b.score * b.weight) - (a.score * a.weight))
      .slice(0, 3);

    const reasoningParts = sortedFactors.map(factor => 
      `${factor.name} (${(factor.score * 100).toFixed(0)}%)`
    );

    return `Primary complexity drivers: ${reasoningParts.join(', ')}. ` +
           `Overall complexity assessment based on multi-factor analysis.`;
  }

  /**
   * Build analysis prompt for AI
   */
  private buildAnalysisPrompt(task: Task, context?: any): string {
    return `
      Analyze the complexity of this task:
      
      Task: ${task.name}
      Description: ${task.description}
      Category: ${task.category}
      Estimated Hours: ${task.estimatedHours}
      Dependencies: ${task.dependencies.length}
      Deliverables: ${task.deliverables.length}
      Skills Required: ${task.skills.length}
      Risks Identified: ${task.risks.length}
      
      Context: ${JSON.stringify(context)}
      
      Consider technical complexity, domain knowledge requirements, 
      integration challenges, and delivery uncertainty.
    `;
  }

  /**
   * Find similar tasks for AI analysis
   */
  private findSimilarTasks(task: Task): Task[] {
    // In a real implementation, this would search a task database
    // For now, return mock similar tasks
    return [
      {
        id: 'similar-1',
        name: 'Similar task 1',
        category: task.category,
        estimatedHours: task.estimatedHours * 0.9,
        complexityScore: { overall: 0.6, cognitive: 0.5, technical: 0.7, business: 0.5, uncertainty: 0.4, dependencies: 0.6, factors: [] },
      } as Task
    ];
  }

  /**
   * Simulate AI reasoning process
   */
  private async simulateAIReasoning(task: Task, similarTasks: Task[]): Promise<string> {
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const categorySpecificReasoning = this.getCategorySpecificReasoning(task.category);
    
    return `Based on pattern analysis and similarity to ${similarTasks.length} previous tasks: ` +
           `${categorySpecificReasoning} ` +
           `Task complexity is primarily driven by ${task.category.toLowerCase()} nature ` +
           `and estimated ${task.estimatedHours} hours of effort.`;
  }

  /**
   * Get category-specific reasoning
   */
  private getCategorySpecificReasoning(category: TaskCategory): string {
    const reasoningMap: Record<TaskCategory, string> = {
      [TaskCategory.DEVELOPMENT]: 'Coding complexity varies with feature scope and integration needs.',
      [TaskCategory.TESTING]: 'Testing complexity depends on test coverage requirements and automation level.',
      [TaskCategory.DESIGN]: 'Design complexity relates to stakeholder alignment and iteration cycles.',
      [TaskCategory.DEPLOYMENT]: 'Deployment complexity is influenced by infrastructure dependencies.',
      [TaskCategory.DOCUMENTATION]: 'Documentation complexity varies with audience and technical depth.',
      [TaskCategory.ANALYSIS]: 'Analysis complexity depends on data availability and decision impact.',
      [TaskCategory.INTEGRATION]: 'Integration complexity is driven by external system dependencies.',
      [TaskCategory.SECURITY]: 'Security complexity involves threat modeling and compliance requirements.',
      [TaskCategory.PERFORMANCE]: 'Performance complexity relates to optimization scope and measurement.',
      [TaskCategory.MAINTENANCE]: 'Maintenance complexity depends on system age and documentation quality.',
      [TaskCategory.OPTIMIZATION]: 'Optimization complexity varies with performance goals and constraints.',
      [TaskCategory.CONFIGURATION]: 'Configuration complexity is typically straightforward setup work.',
      [TaskCategory.MIGRATION]: 'Migration complexity involves data transformation and testing scope.',
      [TaskCategory.RESEARCH]: 'Research complexity depends on available information and decision urgency.',
    };

    return reasoningMap[category] || 'Task complexity requires detailed analysis of scope and constraints.';
  }

  /**
   * Generate alternative complexity estimates
   */
  private generateAlternativeEstimates(task: Task, similarTasks: Task[]): ComplexityEstimate[] {
    return similarTasks.map(similar => ({
      taskId: similar.id,
      estimatedHours: similar.estimatedHours,
      confidence: 0.6,
      factors: [],
      heuristicAnalysis: {
        algorithm: 'similarity_based',
        factors: [],
        scoring: similar.complexityScore.overall,
        reasoning: 'Estimate based on similar historical task'
      }
    }));
  }

  /**
   * Calculate AI confidence score
   */
  private calculateAIConfidence(task: Task, similarTasks: Task[]): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence based on similarity matches
    confidence += Math.min(0.3, similarTasks.length * 0.1);

    // Decrease confidence for very unique tasks
    if (task.dependencies.length > 10) confidence -= 0.1;
    if (task.risks.length > 5) confidence -= 0.1;

    return Math.max(0.1, Math.min(0.9, confidence));
  }

  /**
   * Combine heuristic and AI analyses
   */
  private combineAnalyses(
    task: Task, 
    heuristic: HeuristicComplexityAnalysis, 
    ai?: AIComplexityAnalysis
  ): ComplexityEstimate {
    let finalHours: number;
    let finalConfidence: number;
    let combinedFactors: ComplexityFactor[] = [...heuristic.factors];

    if (ai) {
      // Weight the estimates based on confidence
      const heuristicWeight = 0.6;
      const aiWeight = 0.4 * ai.confidence;
      
      const heuristicEstimate = this.estimateHoursFromScore(task.estimatedHours, heuristic.scoring);
      const aiEstimate = this.estimateHoursFromScore(task.estimatedHours, ai.confidence * 0.8);
      
      finalHours = (heuristicEstimate * heuristicWeight) + (aiEstimate * aiWeight);
      finalConfidence = (heuristic.scoring * heuristicWeight) + (ai.confidence * aiWeight);
    } else {
      // Use only heuristic analysis
      finalHours = this.estimateHoursFromScore(task.estimatedHours, heuristic.scoring);
      finalConfidence = heuristic.scoring;
    }

    // Ensure reasonable bounds
    finalHours = Math.max(0.5, finalHours);
    finalConfidence = Math.max(0.1, Math.min(0.95, finalConfidence));

    return {
      taskId: task.id,
      estimatedHours: finalHours,
      confidence: finalConfidence,
      factors: combinedFactors,
      heuristicAnalysis: heuristic,
      aiAnalysis: ai
    };
  }

  /**
   * Estimate hours from complexity score
   */
  private estimateHoursFromScore(baseHours: number, complexityScore: number): number {
    // Adjust hours based on complexity score
    // Base hours * (0.5 to 2.0 multiplier based on complexity)
    const multiplier = 0.5 + (complexityScore * 1.5);
    return baseHours * multiplier;
  }

  /**
   * Initialize heuristic weights
   */
  private initializeHeuristicWeights(): void {
    this.heuristicWeights = new Map([
      ['task_category', 0.15],
      ['dependency_complexity', 0.12],
      ['deliverable_complexity', 0.10],
      ['skill_complexity', 0.13],
      ['tool_complexity', 0.08],
      ['risk_complexity', 0.15],
      ['task_size', 0.12],
      ['integration_complexity', 0.15],
    ]);
  }

  /**
   * Initialize complexity patterns
   */
  private initializeComplexityPatterns(): void {
    this.complexityPatterns = new Map([
      [TaskCategory.DEVELOPMENT, [
        { name: 'code_organization', weight: 0.2, score: 0.6, reasoning: 'Code structure affects maintainability' },
        { name: 'algorithm_complexity', weight: 0.3, score: 0.7, reasoning: 'Algorithm choice impacts development time' },
        { name: 'integration_points', weight: 0.3, score: 0.8, reasoning: 'External integrations add complexity' },
        { name: 'testing_requirements', weight: 0.2, score: 0.5, reasoning: 'Test coverage affects development effort' },
      ]],
      [TaskCategory.TESTING, [
        { name: 'test_coverage', weight: 0.4, score: 0.7, reasoning: 'High coverage requirements increase effort' },
        { name: 'test_automation', weight: 0.3, score: 0.6, reasoning: 'Automation setup adds initial complexity' },
        { name: 'environment_setup', weight: 0.3, score: 0.4, reasoning: 'Test environment configuration' },
      ]],
    ]);
  }

  /**
   * Initialize risk impact mapping
   */
  private initializeRiskImpactMap(): void {
    this.riskImpactMap = new Map([
      ['minor', 0.2],
      ['moderate', 0.5],
      ['major', 0.8],
      ['severe', 0.9],
      ['critical', 1.0],
    ]);
  }

  /**
   * Update complexity patterns based on historical data
   */
  updatePatterns(taskCategory: TaskCategory, actualComplexity: number, factors: ComplexityFactor[]): void {
    if (!this.complexityPatterns.has(taskCategory)) {
      this.complexityPatterns.set(taskCategory, []);
    }

    const existing = this.complexityPatterns.get(taskCategory)!;
    
    // Update factor weights based on actual outcomes
    factors.forEach(factor => {
      const existingFactor = existing.find(f => f.name === factor.name);
      if (existingFactor) {
        // Simple adaptive update
        existingFactor.weight = (existingFactor.weight * 0.8) + (factor.weight * 0.2);
        existingFactor.score = (existingFactor.score * 0.8) + (actualComplexity * 0.2);
      } else {
        existing.push({ ...factor });
      }
    });

    logger.debug('Updated complexity patterns', { taskCategory, patternCount: existing.length });
  }
}