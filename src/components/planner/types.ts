/**
 * Type definitions for Planner Component
 */

import { AnalysisResult } from '../project-analyzer/types';

export interface PlannerConfig {
  enableAIAnalysis?: boolean;
  enableHeuristicAnalysis?: boolean;
  enableAmbiguityDetection?: boolean;
  enableQuestionGeneration?: boolean;
  maxTaskDepth?: number;
  maxSubtasksPerTask?: number;
  complexityThreshold?: number;
  timeoutMs?: number;
  parallelProcessing?: boolean;
  cacheEnabled?: boolean;
  aiModel?: string;
  confidenceThreshold?: number;
}

export interface PlanningInput {
  description: string;
  requirements?: string[];
  constraints?: string[];
  context?: PlanningContext;
  preferences?: PlanningPreferences;
  metadata?: Record<string, any>;
}

export interface PlanningContext {
  projectType: ProjectType;
  technologyStack?: string[];
  teamSize?: number;
  deadline?: Date;
  budget?: number;
  riskTolerance?: RiskTolerance;
  qualityRequirements?: QualityLevel;
  existingCodebase?: AnalysisResult;
}

export interface PlanningPreferences {
  methodology?: PlanningMethodology;
  taskSize?: TaskSize;
  priorityStrategy?: PriorityStrategy;
  resourceAllocation?: ResourceAllocation;
  communicationStyle?: CommunicationStyle;
}

export enum ProjectType {
  WEB_APPLICATION = 'web_application',
  MOBILE_APPLICATION = 'mobile_application',
  DESKTOP_APPLICATION = 'desktop_application',
  API_SERVICE = 'api_service',
  LIBRARY = 'library',
  CLI_TOOL = 'cli_tool',
  DATA_ANALYSIS = 'data_analysis',
  MACHINE_LEARNING = 'machine_learning',
  DEVOPS = 'devops',
  MIGRATION = 'migration',
  REFACTORING = 'refactoring',
  DOCUMENTATION = 'documentation',
  RESEARCH = 'research',
  OTHER = 'other',
}

export enum RiskTolerance {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export enum QualityLevel {
  BASIC = 'basic',
  STANDARD = 'standard',
  HIGH = 'high',
  ENTERPRISE = 'enterprise',
}

export enum PlanningMethodology {
  AGILE = 'agile',
  WATERFALL = 'waterfall',
  SCRUM = 'scrum',
  KANBAN = 'kanban',
  LEAN = 'lean',
  HYBRID = 'hybrid',
}

export enum TaskSize {
  SMALL = 'small', // 1-3 days
  MEDIUM = 'medium', // 1-2 weeks
  LARGE = 'large', // 2-4 weeks
  XLARGE = 'xlarge', // 1-3 months
}

export enum PriorityStrategy {
  RISK_FIRST = 'risk_first',
  VALUE_FIRST = 'value_first',
  DEPENDENCY_FIRST = 'dependency_first',
  EQUAL = 'equal',
}

export enum ResourceAllocation {
  CONSERVATIVE = 'conservative',
  MODERATE = 'moderate',
  AGGRESSIVE = 'aggressive',
}

export enum CommunicationStyle {
  FORMAL = 'formal',
  CASUAL = 'casual',
  TECHNICAL = 'technical',
  COLLABORATIVE = 'collaborative',
}

export interface ExecutionPlan {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  estimatedDuration: number;
  actualDuration?: number;
  status: PlanStatus;
  tasks: Task[];
  milestones: Milestone[];
  dependencies: TaskDependency[];
  risks: Risk[];
  assumptions: Assumption[];
  alternatives: AlternativePlan[];
  metadata: PlanMetadata;
  validationResults: ValidationResult[];
}

export enum PlanStatus {
  DRAFT = 'draft',
  REVIEW = 'review',
  APPROVED = 'approved',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  ON_HOLD = 'on_hold',
}

export interface Task {
  id: string;
  name: string;
  description: string;
  category: TaskCategory;
  priority: Priority;
  status: TaskStatus;
  estimatedHours: number;
  actualHours?: number;
  dependencies: string[];
  assignees?: string[];
  deliverables: Deliverable[];
  acceptanceCriteria: string[];
  testCriteria: string[];
  risks: Risk[];
  complexityScore: ComplexityScore;
  confidence: number;
  prerequisites: string[];
  skills: Skill[];
  tools: Tool[];
  iterations?: Iteration[];
  subtasks: Task[];
  metadata: TaskMetadata;
  timeline?: TaskTimeline;
  qualityGates: QualityGate[];
}

export enum TaskCategory {
  ANALYSIS = 'analysis',
  DESIGN = 'design',
  DEVELOPMENT = 'development',
  TESTING = 'testing',
  DEPLOYMENT = 'deployment',
  DOCUMENTATION = 'documentation',
  RESEARCH = 'research',
  CONFIGURATION = 'configuration',
  MIGRATION = 'migration',
  INTEGRATION = 'integration',
  OPTIMIZATION = 'optimization',
  MAINTENANCE = 'maintenance',
  SECURITY = 'security',
  PERFORMANCE = 'performance',
}

export enum Priority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export enum TaskStatus {
  NOT_STARTED = 'not_started',
  READY = 'ready',
  IN_PROGRESS = 'in_progress',
  BLOCKED = 'blocked',
  IN_REVIEW = 'in_review',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  ON_HOLD = 'on_hold',
}

export interface Deliverable {
  id: string;
  name: string;
  type: DeliverableType;
  format: string;
  location?: string;
  size?: number;
  dependencies?: string[];
  validationCriteria?: string[];
}

export enum DeliverableType {
  CODE = 'code',
  DOCUMENTATION = 'documentation',
  TEST = 'test',
  CONFIGURATION = 'configuration',
  DATA = 'data',
  IMAGE = 'image',
  PRESENTATION = 'presentation',
  REPORT = 'report',
}

export interface Risk {
  id: string;
  name: string;
  description: string;
  probability: RiskProbability;
  impact: RiskImpact;
  severity: RiskSeverity;
  mitigation: string;
  contingency: string;
  owner?: string;
  status: RiskStatus;
  trigger?: string;
  affectedTasks: string[];
}

export enum RiskProbability {
  VERY_LOW = 'very_low', // 0-10%
  LOW = 'low', // 10-30%
  MEDIUM = 'medium', // 30-50%
  HIGH = 'high', // 50-70%
  VERY_HIGH = 'very_high', // 70-90%
}

export enum RiskImpact {
  MINOR = 'minor',
  MODERATE = 'moderate',
  MAJOR = 'major',
  SEVERE = 'severe',
  CRITICAL = 'critical',
}

export enum RiskSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum RiskStatus {
  IDENTIFIED = 'identified',
  ASSESSED = 'assessed',
  MITIGATED = 'mitigated',
  MONITORED = 'monitored',
  REALIZED = 'realized',
  CLOSED = 'closed',
}

export interface ComplexityScore {
  overall: number;
  cognitive: number;
  technical: number;
  business: number;
  uncertainty: number;
  dependencies: number;
  factors: ComplexityFactor[];
}

export interface ComplexityFactor {
  name: string;
  description: string;
  weight: number;
  score: number;
  reasoning: string;
}

export interface Skill {
  name: string;
  level: SkillLevel;
  category: SkillCategory;
  required: boolean;
}

export enum SkillLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert',
}

export enum SkillCategory {
  PROGRAMMING = 'programming',
  FRAMEWORK = 'framework',
  DATABASE = 'database',
  CLOUD = 'cloud',
  DEVOPS = 'devops',
  SECURITY = 'security',
  TESTING = 'testing',
  DESIGN = 'design',
  PROJECT_MANAGEMENT = 'project_management',
  DOMAIN_KNOWLEDGE = 'domain_knowledge',
}

export interface Tool {
  name: string;
  category: ToolCategory;
  version?: string;
  required: boolean;
  license?: string;
}

export enum ToolCategory {
  IDE = 'ide',
  VERSION_CONTROL = 'version_control',
  BUILD_TOOL = 'build_tool',
  TESTING = 'testing',
  DEPLOYMENT = 'deployment',
  MONITORING = 'monitoring',
  DESIGN = 'design',
  DOCUMENTATION = 'documentation',
  COMMUNICATION = 'communication',
  PROJECT_MANAGEMENT = 'project_management',
}

export interface Iteration {
  id: string;
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  goals: string[];
  scope: string[];
  deliverables: Deliverable[];
  retrospective?: Retrospective;
}

export interface Retrospective {
  whatWentWell: string[];
  whatCouldImprove: string[];
  actionItems: ActionItem[];
  learnings: string[];
}

export interface ActionItem {
  description: string;
  owner: string;
  dueDate: Date;
  status: TaskStatus;
}

export interface TaskMetadata {
  createdBy: string;
  createdAt: Date;
  lastModified: Date;
  version: number;
  tags: string[];
  labels: string[];
  customFields: Record<string, any>;
}

export interface TaskTimeline {
  plannedStart: Date;
  plannedEnd: Date;
  actualStart?: Date;
  actualEnd?: Date;
  criticalPath: boolean;
  slack: number;
  milestones: string[];
}

export interface QualityGate {
  name: string;
  criteria: string[];
  automatedChecks: AutomatedCheck[];
  manualReview: boolean;
  blocking: boolean;
}

export interface AutomatedCheck {
  type: CheckType;
  description: string;
  threshold?: number;
  tool: string;
}

export enum CheckType {
  CODE_COVERAGE = 'code_coverage',
  COMPLEXITY = 'complexity',
  PERFORMANCE = 'performance',
  SECURITY = 'security',
  STYLE = 'style',
  TEST_PASSING = 'test_passing',
  DOCUMENTATION = 'documentation',
}

export interface Milestone {
  id: string;
  name: string;
  description: string;
  date: Date;
  status: MilestoneStatus;
  deliverables: Deliverable[];
  criteria: string[];
  dependencies: string[];
}

export enum MilestoneStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  DELAYED = 'delayed',
  CANCELLED = 'cancelled',
}

export interface TaskDependency {
  from: string;
  to: string;
  type: DependencyType;
  strength: DependencyStrength;
  description?: string;
}

export enum DependencyType {
  FINISH_TO_START = 'finish_to_start',
  START_TO_START = 'start_to_start',
  FINISH_TO_FINISH = 'finish_to_finish',
  START_TO_FINISH = 'start_to_finish',
}

export enum DependencyStrength {
  HARD = 'hard',
  SOFT = 'soft',
  CONDITIONAL = 'conditional',
}

export interface Assumption {
  id: string;
  description: string;
  impact: AssumptionImpact;
  validation: string;
  owner: string;
  status: AssumptionStatus;
}

export enum AssumptionImpact {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum AssumptionStatus {
  IDENTIFIED = 'identified',
  VALIDATED = 'validated',
  INVALIDATED = 'invalidated',
  NEEDS_VALIDATION = 'needs_validation',
}

export interface AlternativePlan {
  id: string;
  name: string;
  description: string;
  pros: string[];
  cons: string[];
  cost: number;
  timeline: number;
  risks: Risk[];
}

export interface PlanMetadata {
  version: string;
  createdBy: string;
  lastModified: Date;
  template?: string;
  tags: string[];
  customFields: Record<string, any>;
}

export interface ValidationResult {
  type: ValidationType;
  passed: boolean;
  message: string;
  details?: string;
  suggestions?: string[];
}

export enum ValidationType {
  DEPENDENCY_CHECK = 'dependency_check',
  RESOURCE_CHECK = 'resource_check',
  TIMELINE_CHECK = 'timeline_check',
  CONSTRAINT_CHECK = 'constraint_check',
  RISK_CHECK = 'risk_check',
  FEASIBILITY_CHECK = 'feasibility_check',
}

export interface AmbiguityDetectionResult {
  ambiguities: Ambiguity[];
  clarityScore: number;
  recommendations: string[];
  questions: ClarificationQuestion[];
}

export interface Ambiguity {
  id: string;
  type: AmbiguityType;
  description: string;
  location: string;
  severity: AmbiguitySeverity;
  suggestedResolution: string;
  impact: string;
}

export enum AmbiguityType {
  REQUIREMENT = 'requirement',
  TECHNICAL = 'technical',
  SCOPE = 'scope',
  TIMELINE = 'timeline',
  RESOURCE = 'resource',
  QUALITY = 'quality',
  DEPENDENCY = 'dependency',
  ASSUMPTION = 'assumption',
}

export enum AmbiguitySeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface ClarificationQuestion {
  id: string;
  question: string;
  category: QuestionCategory;
  priority: QuestionPriority;
  context?: string;
  options?: string[];
  expectedAnswerType: AnswerType;
  relatedAmbiguities: string[];
}

export enum QuestionCategory {
  REQUIREMENT = 'requirement',
  TECHNICAL = 'technical',
  SCOPE = 'scope',
  TIMELINE = 'timeline',
  RESOURCE = 'resource',
  CONSTRAINT = 'constraint',
  PREFERENCE = 'preference',
  RISK = 'risk',
  QUALITY = 'quality',
}

export enum QuestionPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum AnswerType {
  YES_NO = 'yes_no',
  MULTIPLE_CHOICE = 'multiple_choice',
  TEXT = 'text',
  NUMBER = 'number',
  DATE = 'date',
  LIST = 'list',
  FILE = 'file',
  URL = 'url',
}

export interface PlanningResult {
  success: boolean;
  plan?: ExecutionPlan;
  ambiguityResult?: AmbiguityDetectionResult;
  errors: PlanningError[];
  warnings: PlanningWarning[];
  metadata: PlanningResultMetadata;
}

export interface PlanningError {
  code: string;
  message: string;
  details?: string;
  stack?: string;
}

export interface PlanningWarning {
  type: string;
  message: string;
  suggestion?: string;
}

export interface PlanningResultMetadata {
  processingTime: number;
  complexity: ComplexityScore;
  confidence: number;
  version: string;
  cacheKey?: string;
}

export interface TaskBreakdownConfig {
  maxDepth: number;
  maxSubtasksPerTask: number;
  minTaskSize: number; // in hours
  maxTaskSize: number; // in hours
  enableAutomaticGrouping: boolean;
  enableDependencyAnalysis: boolean;
  granularityPreference: TaskGranularity;
}

export enum TaskGranularity {
  VERY_COARSE = 'very_coarse', // weeks
  COARSE = 'coarse', // multi-day
  MEDIUM = 'medium', // daily
  FINE = 'fine', // hourly
  VERY_FINE = 'very_fine', // sub-hourly
}

export interface ComplexityEstimate {
  taskId: string;
  estimatedHours: number;
  confidence: number;
  factors: ComplexityFactor[];
  aiAnalysis?: AIComplexityAnalysis;
  heuristicAnalysis?: HeuristicComplexityAnalysis;
}

export interface AIComplexityAnalysis {
  model: string;
  reasoning: string;
  confidence: number;
  alternatives: ComplexityEstimate[];
  similarTasks: string[];
}

export interface HeuristicComplexityAnalysis {
  algorithm: string;
  factors: ComplexityFactor[];
  scoring: number;
  reasoning: string;
}

export interface QuestionGenerationConfig {
  maxQuestions: number;
  priorityThreshold: QuestionPriority;
  categoryFilter?: QuestionCategory[];
  style?: CommunicationStyle;
  includeContext: boolean;
  groupSimilar: boolean;
}

export interface PlannerEvent {
  type: PlannerEventType;
  timestamp: Date;
  data: any;
  source: string;
}

export enum PlannerEventType {
  PLANNING_STARTED = 'planning_started',
  TASK_BREAKDOWN_COMPLETE = 'task_breakdown_complete',
  COMPLEXITY_ANALYSIS_COMPLETE = 'complexity_analysis_complete',
  AMBIGUITY_DETECTION_COMPLETE = 'ambiguity_detection_complete',
  QUESTION_GENERATION_COMPLETE = 'question_generation_complete',
  PLAN_VALIDATION_COMPLETE = 'plan_validation_complete',
  PLANNING_COMPLETE = 'planning_complete',
  ERROR = 'error',
  WARNING = 'warning',
}

export { AnalysisResult } from '../project-analyzer/types';