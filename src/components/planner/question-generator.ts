/**
 * QuestionGenerator - Generates clarification questions for ambiguous requirements
 */

import {
  ClarificationQuestion,
  QuestionCategory,
  QuestionPriority,
  AnswerType,
  CommunicationStyle,
  QuestionGenerationConfig,
  Ambiguity,
  PlanningInput,
  Task,
} from './types';
import { logger } from '../../core/logger';

export class QuestionGenerator {
  private config: QuestionGenerationConfig;
  private questionTemplates: Map<QuestionCategory, QuestionTemplate>;
  private categoryPriorities: Map<QuestionCategory, QuestionPriority>;

  constructor(config: QuestionGenerationConfig) {
    this.config = config;
    this.initializeQuestionTemplates();
    this.initializeCategoryPriorities();
  }

  /**
   * Generate clarification questions based on ambiguities
   */
  async generateQuestions(
    ambiguities: Ambiguity[],
    input: PlanningInput,
    tasks?: Task[]
  ): Promise<ClarificationQuestion[]> {
    try {
      logger.debug('Generating clarification questions', { ambiguityCount: ambiguities.length });

      const questions: ClarificationQuestion[] = [];

      // Generate questions for each ambiguity
      for (const ambiguity of ambiguities) {
        const questionsForAmbiguity = this.generateQuestionsForAmbiguity(ambiguity, input);
        questions.push(...questionsForAmbiguity);
      }

      // Generate general project questions
      questions.push(...this.generateGeneralProjectQuestions(input, tasks));

      // Generate context-specific questions
      questions.push(...this.generateContextSpecificQuestions(input, tasks));

      // Apply filters and limits
      const filteredQuestions = this.applyFilters(questions, input);
      
      // Group similar questions
      const groupedQuestions = this.groupSimilarQuestions(filteredQuestions);
      
      // Prioritize and select final questions
      const finalQuestions = this.prioritizeAndSelectQuestions(groupedQuestions);

      logger.info('Generated clarification questions', { 
        originalCount: questions.length,
        finalCount: finalQuestions.length 
      });

      return finalQuestions;

    } catch (error) {
      logger.error('Question generation failed', { error });
      throw error;
    }
  }

  /**
   * Generate questions for a specific ambiguity
   */
  private generateQuestionsForAmbiguity(
    ambiguity: Ambiguity, 
    input: PlanningInput
  ): ClarificationQuestion[] {
    const questions: ClarificationQuestion[] = [];

    switch (ambiguity.type) {
      case 'requirement':
        questions.push(...this.generateRequirementQuestions(ambiguity, input));
        break;
      case 'technical':
        questions.push(...this.generateTechnicalQuestions(ambiguity, input));
        break;
      case 'scope':
        questions.push(...this.generateScopeQuestions(ambiguity, input));
        break;
      case 'timeline':
        questions.push(...this.generateTimelineQuestions(ambiguity, input));
        break;
      case 'resource':
        questions.push(...this.generateResourceQuestions(ambiguity, input));
        break;
      case 'dependency':
        questions.push(...this.generateDependencyQuestions(ambiguity, input));
        break;
      case 'assumption':
        questions.push(...this.generateAssumptionQuestions(ambiguity, input));
        break;
      case 'quality':
        questions.push(...this.generateQualityQuestions(ambiguity, input));
        break;
    }

    return questions;
  }

  /**
   * Generate requirement-specific questions
   */
  private generateRequirementQuestions(
    ambiguity: Ambiguity, 
    input: PlanningInput
  ): ClarificationQuestion[] {
    const questions: ClarificationQuestion[] = [];

    // Questions for vague requirements
    if (ambiguity.description.includes('vague') || ambiguity.description.includes('unclear')) {
      questions.push({
        id: `req-vague-${Date.now()}`,
        question: this.adjustCommunicationStyle(
          'Could you provide more specific details about what exactly needs to be delivered?',
          input.preferences?.communicationStyle
        ),
        category: QuestionCategory.REQUIREMENT,
        priority: this.mapSeverityToPriority(ambiguity.severity),
        context: ambiguity.impact,
        expectedAnswerType: AnswerType.TEXT,
        relatedAmbiguities: [ambiguity.id]
      });

      questions.push({
        id: `req-acceptance-${Date.now()}`,
        question: this.adjustCommunicationStyle(
          'What are the specific, measurable criteria that will indicate this requirement is complete?',
          input.preferences?.communicationStyle
        ),
        category: QuestionCategory.REQUIREMENT,
        priority: QuestionPriority.HIGH,
        context: 'Need acceptance criteria',
        expectedAnswerType: AnswerType.TEXT,
        relatedAmbiguities: [ambiguity.id]
      });
    }

    // Questions for missing requirements
    if (ambiguity.description.includes('missing') || ambiguity.description.includes('not specified')) {
      questions.push({
        id: `req-missing-${Date.now()}`,
        question: this.adjustCommunicationStyle(
          'Are there any additional requirements not yet documented that should be considered?',
          input.preferences?.communicationStyle
        ),
        category: QuestionCategory.REQUIREMENT,
        priority: QuestionPriority.MEDIUM,
        context: 'Comprehensive requirement gathering',
        expectedAnswerType: AnswerType.TEXT,
        relatedAmbiguities: [ambiguity.id]
      });
    }

    // Questions for conflicting requirements
    if (ambiguity.description.includes('conflict') || ambiguity.description.includes('contradict')) {
      questions.push({
        id: `req-conflict-${Date.now()}`,
        question: this.adjustCommunicationStyle(
          'How should we prioritize or resolve the apparent conflict between these requirements?',
          input.preferences?.communicationStyle
        ),
        category: QuestionCategory.REQUIREMENT,
        priority: QuestionPriority.HIGH,
        context: 'Resolve requirement conflicts',
        expectedAnswerType: AnswerType.MULTIPLE_CHOICE,
        options: [
          'Modify one requirement to eliminate conflict',
          'Implement both with trade-offs',
          'Add additional work to accommodate both',
          'Seek additional clarification from stakeholders'
        ],
        relatedAmbiguities: [ambiguity.id]
      });
    }

    return questions;
  }

  /**
   * Generate technical-specific questions
   */
  private generateTechnicalQuestions(
    ambiguity: Ambiguity, 
    input: PlanningInput
  ): ClarificationQuestion[] {
    const questions: ClarificationQuestion[] = [];

    // Questions for undefined APIs
    if (ambiguity.description.includes('API') || ambiguity.description.includes('interface')) {
      questions.push({
        id: `tech-api-${Date.now()}`,
        question: this.adjustCommunicationStyle(
          'What specific APIs or interfaces need to be integrated, and what are their current specifications?',
          input.preferences?.communicationStyle
        ),
        category: QuestionCategory.TECHNICAL,
        priority: QuestionPriority.HIGH,
        context: 'Integration planning',
        expectedAnswerType: AnswerType.LIST,
        relatedAmbiguities: [ambiguity.id]
      });

      questions.push({
        id: `tech-protocol-${Date.now()}`,
        question: this.adjustCommunicationStyle(
          'What communication protocols and data formats should be used for these integrations?',
          input.preferences?.communicationStyle
        ),
        category: QuestionCategory.TECHNICAL,
        priority: QuestionPriority.MEDIUM,
        context: 'Technical architecture',
        expectedAnswerType: AnswerType.MULTIPLE_CHOICE,
        options: [
          'REST API with JSON',
          'REST API with XML',
          'GraphQL',
          'gRPC',
          'WebSocket',
          'Message Queue',
          'File-based exchange',
          'Database integration'
        ],
        relatedAmbiguities: [ambiguity.id]
      });
    }

    // Questions for missing technical specifications
    if (ambiguity.description.includes('missing') || ambiguity.description.includes('not defined')) {
      questions.push({
        id: `tech-specs-${Date.now()}`,
        question: this.adjustCommunicationStyle(
          'What technology stack, frameworks, and tools should be used for this project?',
          input.preferences?.communicationStyle
        ),
        category: QuestionCategory.TECHNICAL,
        priority: QuestionPriority.HIGH,
        context: 'Technology decisions',
        expectedAnswerType: AnswerType.TEXT,
        relatedAmbiguities: [ambiguity.id]
      });
    }

    // Questions for performance requirements
    if (ambiguity.description.includes('performance') || ambiguity.description.includes('scalability')) {
      questions.push({
        id: `tech-performance-${Date.now()}`,
        question: this.adjustCommunicationStyle(
          'What are the specific performance requirements (response time, throughput, scalability)?',
          input.preferences?.communicationStyle
        ),
        category: QuestionCategory.TECHNICAL,
        priority: QuestionPriority.HIGH,
        context: 'Performance planning',
        expectedAnswerType: AnswerType.TEXT,
        relatedAmbiguities: [ambiguity.id]
      });

      questions.push({
        id: `tech-load-${Date.now()}`,
        question: this.adjustCommunicationStyle(
          'What is the expected load/usage volume that the system should handle?',
          input.preferences?.communicationStyle
        ),
        category: QuestionCategory.TECHNICAL,
        priority: QuestionPriority.MEDIUM,
        context: 'Capacity planning',
        expectedAnswerType: AnswerType.NUMBER,
        relatedAmbiguities: [ambiguity.id]
      });
    }

    return questions;
  }

  /**
   * Generate scope-specific questions
   */
  private generateScopeQuestions(
    ambiguity: Ambiguity, 
    input: PlanningInput
  ): ClarificationQuestion[] {
    const questions: ClarificationQuestion[] = [];

    // Questions for unclear boundaries
    if (ambiguity.description.includes('scope') || ambiguity.description.includes('boundary')) {
      questions.push({
        id: `scope-boundaries-${Date.now()}`,
        question: this.adjustCommunicationStyle(
          'What is explicitly included in the project scope, and what should be excluded?',
          input.preferences?.communicationStyle
        ),
        category: QuestionCategory.SCOPE,
        priority: QuestionPriority.HIGH,
        context: 'Define project boundaries',
        expectedAnswerType: AnswerType.TEXT,
        relatedAmbiguities: [ambiguity.id]
      });

      questions.push({
        id: `scope-in-out-${Date.now()}`,
        question: this.adjustCommunicationStyle(
          'Could you list 3-5 things that are definitely IN scope and 3-5 that are definitely OUT of scope?',
          input.preferences?.communicationStyle
        ),
        category: QuestionCategory.SCOPE,
        priority: QuestionPriority.HIGH,
        context: 'Clear scope definition',
        expectedAnswerType: AnswerType.LIST,
        relatedAmbiguities: [ambiguity.id]
      });
    }

    // Questions for undefined deliverables
    if (ambiguity.description.includes('deliverable') || ambiguity.description.includes('output')) {
      questions.push({
        id: `scope-deliverables-${Date.now()}`,
        question: this.adjustCommunicationStyle(
          'What are the specific deliverables expected from this project, and in what format?',
          input.preferences?.communicationStyle
        ),
        category: QuestionCategory.SCOPE,
        priority: QuestionPriority.HIGH,
        context: 'Define expected outputs',
        expectedAnswerType: AnswerType.TEXT,
        relatedAmbiguities: [ambiguity.id]
      });

      questions.push({
        id: `scope-recipients-${Date.now()}`,
        question: this.adjustCommunicationStyle(
          'Who will be the primary recipients/users of these deliverables?',
          input.preferences?.communicationStyle
        ),
        category: QuestionCategory.SCOPE,
        priority: QuestionPriority.MEDIUM,
        context: 'Stakeholder identification',
        expectedAnswerType: AnswerType.TEXT,
        relatedAmbiguities: [ambiguity.id]
      });
    }

    return questions;
  }

  /**
   * Generate timeline-specific questions
   */
  private generateTimelineQuestions(
    ambiguity: Ambiguity, 
    input: PlanningInput
  ): ClarificationQuestion[] {
    const questions: ClarificationQuestion[] = [];

    // Questions for missing deadlines
    if (ambiguity.description.includes('deadline') || ambiguity.description.includes('timeline')) {
      questions.push({
        id: `timeline-deadline-${Date.now()}`,
        question: this.adjustCommunicationStyle(
          'What is the target completion date for this project?',
          input.preferences?.communicationStyle
        ),
        category: QuestionCategory.TIMELINE,
        priority: QuestionPriority.HIGH,
        context: 'Project scheduling',
        expectedAnswerType: AnswerType.DATE,
        relatedAmbiguities: [ambiguity.id]
      });

      questions.push({
        id: `timeline-milestones-${Date.now()}`,
        question: this.adjustCommunicationStyle(
          'Are there any critical milestones or intermediate deliverables that have specific dates?',
          input.preferences?.communicationStyle
        ),
        category: QuestionCategory.TIMELINE,
        priority: QuestionPriority.MEDIUM,
        context: 'Milestone planning',
        expectedAnswerType: AnswerType.LIST,
        relatedAmbiguities: [ambiguity.id]
      });
    }

    // Questions for unrealistic timelines
    if (ambiguity.description.includes('unrealistic') || ambiguity.description.includes('urgent')) {
      questions.push({
        id: `timeline-feasibility-${Date.now()}`,
        question: this.adjustCommunicationStyle(
          'Is this timeline flexible, or are there external constraints driving this schedule?',
          input.preferences?.communicationStyle
        ),
        category: QuestionCategory.TIMELINE,
        priority: QuestionPriority.HIGH,
        context: 'Timeline validation',
        expectedAnswerType: AnswerType.MULTIPLE_CHOICE,
        options: [
          'Timeline is firm due to external deadlines',
          'Timeline has some flexibility (±1 week)',
          'Timeline has significant flexibility',
          'Timeline is negotiable'
        ],
        relatedAmbiguities: [ambiguity.id]
      });
    }

    return questions;
  }

  /**
   * Generate resource-specific questions
   */
  private generateResourceQuestions(
    ambiguity: Ambiguity, 
    input: PlanningInput
  ): ClarificationQuestion[] {
    const questions: ClarificationQuestion[] = [];

    // Questions for missing team size
    if (ambiguity.description.includes('team') || ambiguity.description.includes('resource')) {
      questions.push({
        id: `resource-team-${Date.now()}`,
        question: this.adjustCommunicationStyle(
          'How many people will be working on this project, and what roles/skills do they have?',
          input.preferences?.communicationStyle
        ),
        category: QuestionCategory.RESOURCE,
        priority: QuestionPriority.HIGH,
        context: 'Resource planning',
        expectedAnswerType: AnswerType.TEXT,
        relatedAmbiguities: [ambiguity.id]
      });
    }

    // Questions for missing budget
    if (ambiguity.description.includes('budget') || ambiguity.description.includes('cost')) {
      questions.push({
        id: `resource-budget-${Date.now()}`,
        question: this.adjustCommunicationStyle(
          'What is the approximate budget for this project? Are there constraints on spending?',
          input.preferences?.communicationStyle
        ),
        category: QuestionCategory.RESOURCE,
        priority: QuestionPriority.HIGH,
        context: 'Budget planning',
        expectedAnswerType: AnswerType.MULTIPLE_CHOICE,
        options: [
          'No budget constraints',
          'Flexible budget with approval process',
          'Fixed budget with strict limits',
          'Budget approval needed for specific items',
          'Prefer open-source/solution to minimize costs'
        ],
        relatedAmbiguities: [ambiguity.id]
      });
    }

    return questions;
  }

  /**
   * Generate dependency-specific questions
   */
  private generateDependencyQuestions(
    ambiguity: Ambiguity, 
    input: PlanningInput
  ): ClarificationQuestion[] {
    const questions: ClarificationQuestion[] = [];

    // Questions for circular dependencies
    if (ambiguity.description.includes('circular') || ambiguity.description.includes('cycle')) {
      questions.push({
        id: `dep-circular-${Date.now()}`,
        question: this.adjustCommunicationStyle(
          'How should we resolve the circular dependencies? Can tasks be reordered or parallelized?',
          input.preferences?.communicationStyle
        ),
        category: QuestionCategory.DEPENDENCY,
        priority: QuestionPriority.CRITICAL,
        context: 'Dependency resolution',
        expectedAnswerType: AnswerType.MULTIPLE_CHOICE,
        options: [
          'Reorder tasks to eliminate cycles',
          'Split complex tasks into smaller ones',
          'Identify which task dependencies can be relaxed',
          'Add additional resources to work in parallel',
          'Use different implementation approach'
        ],
        relatedAmbiguities: [ambiguity.id]
      });
    }

    // Questions for external dependencies
    if (ambiguity.description.includes('external') || ambiguity.description.includes('third-party')) {
      questions.push({
        id: `dep-external-${Date.now()}`,
        question: this.adjustCommunicationStyle(
          'What external systems, APIs, or third-party services does this project depend on?',
          input.preferences?.communicationStyle
        ),
        category: QuestionCategory.DEPENDENCY,
        priority: QuestionPriority.HIGH,
        context: 'External dependency mapping',
        expectedAnswerType: AnswerType.LIST,
        relatedAmbiguities: [ambiguity.id]
      });

      questions.push({
        id: `dep-external-availability-${Date.now()}`,
        question: this.adjustCommunicationStyle(
          'Are these external dependencies available now, or do they need to be developed/obtained first?',
          input.preferences?.communicationStyle
        ),
        category: QuestionCategory.DEPENDENCY,
        priority: QuestionPriority.HIGH,
        context: 'Dependency availability',
        expectedAnswerType: AnswerType.MULTIPLE_CHOICE,
        options: [
          'All dependencies are currently available',
          'Some dependencies need development/setup',
          'Dependencies will be developed in parallel',
          'Dependencies are not yet decided',
          'Need to evaluate dependency options'
        ],
        relatedAmbiguities: [ambiguity.id]
      });
    }

    return questions;
  }

  /**
   * Generate assumption-specific questions
   */
  private generateAssumptionQuestions(
    ambiguity: Ambiguity, 
    input: PlanningInput
  ): ClarificationQuestion[] {
    const questions: ClarificationQuestion[] = [];

    // Questions for unstated assumptions
    if (ambiguity.description.includes('assumption') || ambiguity.description.includes('implied')) {
      questions.push({
        id: `assump-unstated-${Date.now()}`,
        question: this.adjustCommunicationStyle(
          'What assumptions are we making about the project environment, constraints, or requirements?',
          input.preferences?.communicationStyle
        ),
        category: QuestionCategory.ASSUMPTION,
        priority: QuestionPriority.MEDIUM,
        context: 'Identify implicit assumptions',
        expectedAnswerType: AnswerType.TEXT,
        relatedAmbiguities: [ambiguity.id]
      });

      questions.push({
        id: `assump-validity-${Date.now()}`,
        question: this.adjustCommunicationStyle(
          'How can we validate these assumptions? Are there any that might be incorrect?',
          input.preferences?.communicationStyle
        ),
        category: QuestionCategory.ASSUMPTION,
        priority: QuestionPriority.MEDIUM,
        context: 'Assumption validation',
        expectedAnswerType: AnswerType.TEXT,
        relatedAmbiguities: [ambiguity.id]
      });
    }

    return questions;
  }

  /**
   * Generate quality-specific questions
   */
  private generateQualityQuestions(
    ambiguity: Ambiguity, 
    input: PlanningInput
  ): ClarificationQuestion[] {
    const questions: ClarificationQuestion[] = [];

    questions.push({
      id: `quality-requirements-${Date.now()}`,
      question: this.adjustCommunicationStyle(
        'What are the quality standards and requirements for this project?',
        input.preferences?.communicationStyle
      ),
      category: QuestionCategory.QUALITY,
      priority: QuestionPriority.HIGH,
      context: 'Quality expectations',
      expectedAnswerType: AnswerType.MULTIPLE_CHOICE,
      options: [
        'Basic quality with quick delivery',
        'Standard quality with good performance',
        'High quality with comprehensive testing',
        'Enterprise-grade with full documentation',
        'Maximum quality regardless of time/cost'
      ],
      relatedAmbiguities: [ambiguity.id]
    });

    return questions;
  }

  /**
   * Generate general project questions
   */
  private generateGeneralProjectQuestions(
    input: PlanningInput, 
    tasks?: Task[]
  ): ClarificationQuestion[] {
    const questions: ClarificationQuestion[] = [];

    // Stakeholder questions
    questions.push({
      id: `general-stakeholders-${Date.now()}`,
      question: this.adjustCommunicationStyle(
        'Who are the key stakeholders for this project, and who will be making final decisions?',
        input.preferences?.communicationStyle
      ),
      category: QuestionCategory.REQUIREMENT,
      priority: QuestionPriority.HIGH,
      context: 'Stakeholder identification',
      expectedAnswerType: AnswerType.TEXT,
      relatedAmbiguities: []
    });

    // Success criteria questions
    questions.push({
      id: `general-success-${Date.now()}`,
      question: this.adjustCommunicationStyle(
        'How will we measure the success of this project?',
        input.preferences?.communicationStyle
      ),
      category: QuestionCategory.REQUIREMENT,
      priority: QuestionPriority.HIGH,
      context: 'Success metrics',
      expectedAnswerType: AnswerType.TEXT,
      relatedAmbiguities: []
    });

    // Risk tolerance questions
    questions.push({
      id: `general-risk-${Date.now()}`,
      question: this.adjustCommunicationStyle(
        'What is the organization\'s risk tolerance for this project?',
        input.preferences?.communicationStyle
      ),
      category: QuestionCategory.RISK,
      priority: QuestionPriority.MEDIUM,
      context: 'Risk assessment',
      expectedAnswerType: AnswerType.MULTIPLE_CHOICE,
      options: [
        'Very low risk - must have backup plans',
        'Low risk - prefer proven solutions',
        'Medium risk - willing to try new approaches',
        'High risk - innovation is prioritized',
        'Very high risk - disruption is acceptable'
      ],
      relatedAmbiguities: []
    });

    return questions;
  }

  /**
   * Generate context-specific questions
   */
  private generateContextSpecificQuestions(
    input: PlanningInput, 
    tasks?: Task[]
  ): ClarificationQuestion[] {
    const questions: ClarificationQuestion[] = [];

    // Questions based on project type
    if (input.context?.projectType === 'web_application') {
      questions.push({
        id: `context-web-browser-${Date.now()}`,
        question: this.adjustCommunicationStyle(
          'Which browsers and devices should the web application support?',
          input.preferences?.communicationStyle
        ),
        category: QuestionCategory.TECHNICAL,
        priority: QuestionPriority.MEDIUM,
        context: 'Browser support requirements',
        expectedAnswerType: AnswerType.MULTIPLE_CHOICE,
        options: [
          'Modern browsers only (last 2 versions)',
          'All major browsers including older versions',
          'Specific browsers only',
          'Mobile browsers prioritized',
          'Desktop browsers prioritized'
        ],
        relatedAmbiguities: []
      });
    }

    if (input.context?.projectType === 'api_service') {
      questions.push({
        id: `context-api-versioning-${Date.now()}`,
        question: this.adjustCommunicationStyle(
          'Should the API include versioning, and what is the versioning strategy?',
          input.preferences?.communicationStyle
        ),
        category: QuestionCategory.TECHNICAL,
        priority: QuestionPriority.HIGH,
        context: 'API versioning strategy',
        expectedAnswerType: AnswerType.MULTIPLE_CHOICE,
        options: [
          'No versioning needed',
          'URL-based versioning (/v1/, /v2/)',
          'Header-based versioning',
          'Content negotiation',
          'Separate deployments for versions'
        ],
        relatedAmbiguities: []
      });
    }

    return questions;
  }

  /**
   * Apply filters to questions
   */
  private applyFilters(questions: ClarificationQuestion[], input: PlanningInput): ClarificationQuestion[] {
    let filtered = [...questions];

    // Filter by priority threshold
    if (this.config.priorityThreshold) {
      filtered = filtered.filter(q => this.getPriorityValue(q.priority) >= this.getPriorityValue(this.config.priorityThreshold!));
    }

    // Filter by category
    if (this.config.categoryFilter && this.config.categoryFilter.length > 0) {
      filtered = filtered.filter(q => this.config.categoryFilter!.includes(q.category));
    }

    // Limit maximum questions
    if (filtered.length > this.config.maxQuestions) {
      // Keep higher priority questions
      filtered.sort((a, b) => this.getPriorityValue(b.priority) - this.getPriorityValue(a.priority));
      filtered = filtered.slice(0, this.config.maxQuestions);
    }

    return filtered;
  }

  /**
   * Group similar questions
   */
  private groupSimilarQuestions(questions: ClarificationQuestion[]): ClarificationQuestion[] {
    if (!this.config.groupSimilar) return questions;

    const grouped: ClarificationQuestion[] = [];
    const processed = new Set<string>();

    for (const question of questions) {
      if (processed.has(question.id)) continue;

      // Find similar questions (same category and similar text)
      const similar = questions.filter(q => 
        q.id !== question.id &&
        q.category === question.category &&
        !processed.has(q.id) &&
        this.areQuestionsSimilar(question.question, q.question)
      );

      if (similar.length > 0) {
        // Combine similar questions
        const combinedQuestion = this.combineSimilarQuestions(question, similar);
        grouped.push(combinedQuestion);
        processed.add(question.id);
        similar.forEach(q => processed.add(q.id));
      } else {
        grouped.push(question);
        processed.add(question.id);
      }
    }

    return grouped;
  }

  /**
   * Prioritize and select final questions
   */
  private prioritizeAndSelectQuestions(questions: ClarificationQuestion[]): ClarificationQuestion[] {
    // Sort by priority and include context if requested
    return questions
      .sort((a, b) => this.getPriorityValue(b.priority) - this.getPriorityValue(a.priority))
      .slice(0, this.config.maxQuestions);
  }

  /**
   * Adjust communication style of question text
   */
  private adjustCommunicationStyle(question: string, style?: CommunicationStyle): string {
    if (!style || style === CommunicationStyle.COLLABORATIVE) {
      return question;
    }

    switch (style) {
      case CommunicationStyle.FORMAL:
        return question.replace(/Could you/gi, 'Please provide').replace(/should/gi, 'shall');
      case CommunicationStyle.CASUAL:
        return question.replace(/Could you/gi, 'Can you').replace(/Please/gi, '');
      case CommunicationStyle.TECHNICAL:
        return question.replace(/What/gi, 'What specific').replace(/How/gi, 'How exactly');
      default:
        return question;
    }
  }

  /**
   * Map ambiguity severity to question priority
   */
  private mapSeverityToPriority(severity: string): QuestionPriority {
    switch (severity) {
      case 'critical': return QuestionPriority.CRITICAL;
      case 'high': return QuestionPriority.HIGH;
      case 'medium': return QuestionPriority.MEDIUM;
      case 'low': return QuestionPriority.LOW;
      default: return QuestionPriority.MEDIUM;
    }
  }

  /**
   * Get priority numeric value for comparison
   */
  private getPriorityValue(priority: QuestionPriority): number {
    switch (priority) {
      case QuestionPriority.CRITICAL: return 4;
      case QuestionPriority.HIGH: return 3;
      case QuestionPriority.MEDIUM: return 2;
      case QuestionPriority.LOW: return 1;
      default: return 2;
    }
  }

  /**
   * Check if two questions are similar enough to group
   */
  private areQuestionsSimilar(text1: string, text2: string): boolean {
    // Simple similarity check - in practice, this could use NLP techniques
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size > 0.6; // 60% similarity threshold
  }

  /**
   * Combine similar questions into a single comprehensive question
   */
  private combineSimilarQuestions(
    mainQuestion: ClarificationQuestion, 
    similarQuestions: ClarificationQuestion[]
  ): ClarificationQuestion {
    // Combine contexts if available
    const contexts = [mainQuestion.context, ...similarQuestions.map(q => q.context)].filter(Boolean);
    const combinedContext = contexts.length > 1 ? contexts.join('; ') : contexts[0];

    // Combine related ambiguities
    const allAmbiguities = [
      mainQuestion.relatedAmbiguities,
      ...similarQuestions.map(q => q.relatedAmbiguities)
    ].flat();

    return {
      ...mainQuestion,
      context: combinedContext,
      relatedAmbiguities: [...new Set(allAmbiguities)],
      question: this.combineQuestionTexts(mainQuestion.question, similarQuestions.map(q => q.question))
    };
  }

  /**
   * Combine multiple question texts into one comprehensive question
   */
  private combineQuestionTexts(mainText: string, similarTexts: string[]): string {
    if (similarTexts.length === 0) return mainText;

    // Extract key words from similar questions
    const keyPhrases = similarTexts.map(text => {
      // Extract the main question part (after the first "?", or full text)
      const match = text.match(/[^\?]+\?/);
      return match ? match[0].trim() : text;
    });

    return `${mainText} Additionally, ${keyPhrases.join(' Also, ')}`;
  }

  /**
   * Initialize question templates
   */
  private initializeQuestionTemplates(): void {
    this.questionTemplates = new Map([
      [QuestionCategory.REQUIREMENT, {
        templates: [
          'What are the specific requirements for {topic}?',
          'How will we measure success for {topic}?',
          'What constraints apply to {topic}?'
        ],
        contexts: ['requirement gathering', 'success criteria', 'constraints']
      }],
      [QuestionCategory.TECHNICAL, {
        templates: [
          'What technical approach should be used for {topic}?',
          'What are the technical constraints for {topic}?',
          'What tools or frameworks are preferred for {topic}?'
        ],
        contexts: ['technical planning', 'constraints', 'tool selection']
      }]
    ]);
  }

  /**
   * Initialize category priorities
   */
  private initializeCategoryPriorities(): void {
    this.categoryPriorities = new Map([
      [QuestionCategory.REQUIREMENT, QuestionPriority.HIGH],
      [QuestionCategory.TECHNICAL, QuestionPriority.HIGH],
      [QuestionCategory.SCOPE, QuestionPriority.HIGH],
      [QuestionCategory.TIMELINE, QuestionPriority.MEDIUM],
      [QuestionCategory.RESOURCE, QuestionPriority.MEDIUM],
      [QuestionCategory.CONSTRAINT, QuestionPriority.MEDIUM],
      [QuestionCategory.PREFERENCE, QuestionPriority.LOW],
      [QuestionCategory.RISK, QuestionPriority.MEDIUM],
      [QuestionCategory.QUALITY, QuestionPriority.MEDIUM],
    ]);
  }
}

interface QuestionTemplate {
  templates: string[];
  contexts: string[];
}