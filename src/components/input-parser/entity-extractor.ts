/**
 * Entity Extractor
 * Uses Groq AI to extract entities from user requests
 */

import Groq from 'groq-sdk';
import {
  ExtractedEntities,
  FilePath,
  Feature,
  Constraint,
  Dependency,
  CodePattern,
  LLMResponse,
  ParserConfig,
  EntityExtractionError,
  ENTITY_CONFIDENCE_THRESHOLD
} from './types';

export class EntityExtractor {
  private groq: Groq;
  private config: ParserConfig;

  constructor(config: ParserConfig) {
    this.config = {
      modelName: 'mixtral-8x7b-32768',
      maxTokens: 2000,
      temperature: 0.1,
      timeout: 30000,
      maxRetries: 3,
      ...config
    };

    if (!this.config.groqApiKey) {
      throw new EntityExtractionError('Groq API key is required');
    }

    this.groq = new Groq({
      apiKey: this.config.groqApiKey
    });
  }

  /**
   * Extract all entities from user input
   */
  async extractEntities(input: string, context?: Record<string, any>): Promise<ExtractedEntities> {
    try {
      const prompt = this.buildEntityPrompt(input, context);
      const response = await this.callGroq(prompt);
      
      return this.parseEntityResponse(response);
    } catch (error) {
      throw new EntityExtractionError(
        `Failed to extract entities: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { input, context, error }
      );
    }
  }

  /**
   * Extract specific types of entities
   */
  async extractFiles(input: string): Promise<FilePath[]> {
    const entities = await this.extractEntities(input);
    return entities.files || [];
  }

  async extractFeatures(input: string): Promise<Feature[]> {
    const entities = await this.extractEntities(input);
    return entities.features || [];
  }

  async extractConstraints(input: string): Promise<Constraint[]> {
    const entities = await this.extractEntities(input);
    return entities.constraints || [];
  }

  async extractDependencies(input: string): Promise<Dependency[]> {
    const entities = await this.extractEntities(input);
    return entities.dependencies || [];
  }

  async extractCodePatterns(input: string): Promise<CodePattern[]> {
    const entities = await this.extractEntities(input);
    return entities.codePatterns || [];
  }

  /**
   * Build the prompt for entity extraction
   */
  private buildEntityPrompt(input: string, context?: Record<string, any>): string {
    const contextInfo = context ? `Context: ${JSON.stringify(context, null, 2)}` : '';
    
    return `
You are an expert entity extraction assistant that identifies and categorizes entities in user requests.

Extract entities from the following user input:

User Input: "${input}"
${contextInfo}

Entity Types to Extract:

1. Files: File paths, directories, file patterns (glob patterns)
   - Type: "file", "directory", or "pattern"
   - Include full or relative paths
   - Mark if it's a glob pattern (*, ?, **)

2. Features: Features, functionality, components, modules
   - Type: "functionality", "endpoint", "component", or "module"
   - Include descriptive names and types

3. Constraints: Requirements, limitations, restrictions
   - Type: "performance", "security", "compatibility", "style", "architecture"
   - Include severity levels: "low", "medium", "high", "critical"

4. Dependencies: Packages, libraries, frameworks, modules
   - Include package names, versions if mentioned
   - Type: "package", "module", "library", "framework"

5. Code Patterns: Algorithms, design patterns, anti-patterns
   - Type: "algorithm", "pattern", "anti-pattern", "best-practice"

Instructions:
1. Analyze the user input carefully
2. Extract all relevant entities
3. Assign appropriate types and metadata
4. Rate confidence (0.0 to 1.0) for each entity
5. Only include entities with confidence >= 0.6

Respond in the following JSON format:
{
  "files": [
    {
      "path": "src/components/Button.tsx",
      "type": "file",
      "confidence": 0.9
    }
  ],
  "features": [
    {
      "name": "user authentication",
      "type": "functionality",
      "description": "User login and registration system",
      "confidence": 0.85
    }
  ],
  "constraints": [
    {
      "type": "performance",
      "description": "Must handle 1000+ concurrent users",
      "severity": "high",
      "confidence": 0.8
    }
  ],
  "dependencies": [
    {
      "name": "react",
      "version": "^18.0.0",
      "type": "library",
      "confidence": 0.95
    }
  ],
  "codePatterns": [
    {
      "pattern": "observer pattern",
      "type": "pattern",
      "confidence": 0.7
    }
  ]
}

Only respond with valid JSON, no additional text.
`;
  }

  /**
   * Call Groq API for entity extraction
   */
  private async callGroq(prompt: string): Promise<string> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        const completion = await this.groq.chat.completions.create({
          messages: [
            {
              role: 'system',
              content: 'You are a precise entity extraction assistant. Always respond with valid JSON only.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          model: this.config.modelName,
          max_tokens: this.config.maxTokens,
          temperature: this.config.temperature,
          stream: false
        });

        const response = completion.choices[0]?.message?.content;
        if (!response) {
          throw new Error('No response from Groq API');
        }

        return response;
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < this.config.maxRetries) {
          // Exponential backoff
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new EntityExtractionError(
      `Failed after ${this.config.maxRetries} attempts`,
      { originalError: lastError }
    );
  }

  /**
   * Parse the Groq response to extract entities
   */
  private parseEntityResponse(response: string): ExtractedEntities {
    try {
      // Clean the response to extract JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        files: this.validateAndFilterEntities(parsed.files, 'files') as FilePath[],
        features: this.validateAndFilterEntities(parsed.features, 'features') as Feature[],
        constraints: this.validateAndFilterEntities(parsed.constraints, 'constraints') as Constraint[],
        dependencies: this.validateAndFilterEntities(parsed.dependencies, 'dependencies') as Dependency[],
        codePatterns: this.validateAndFilterEntities(parsed.codePatterns, 'codePatterns') as CodePattern[],
        customEntities: parsed.customEntities || {}
      };
    } catch (error) {
      // Fallback: try to extract entities from text
      return this.extractEntitiesFromText(response);
    }
  }

  /**
   * Validate and filter entities by confidence threshold
   */
  private validateAndFilterEntities(entities: any[], entityType: string): any[] {
    if (!Array.isArray(entities)) {
      return [];
    }

    return entities
      .filter(entity => entity && typeof entity === 'object')
      .filter(entity => {
        const confidence = typeof entity.confidence === 'number' ? entity.confidence : 0;
        return confidence >= ENTITY_CONFIDENCE_THRESHOLD;
      })
      .map(entity => {
        // Ensure required fields exist
        const validated = { ...entity };
        if (typeof validated.confidence !== 'number') {
          validated.confidence = 0.5;
        }
        return validated;
      });
  }

  /**
   * Fallback method to extract entities from text response
   */
  private extractEntitiesFromText(text: string): ExtractedEntities {
    const entities: ExtractedEntities = {
      files: [],
      features: [],
      constraints: [],
      dependencies: [],
      codePatterns: []
    };

    // Extract file paths using regex
    const filePathRegex = /(?:[a-zA-Z]:)?[\/\w\-\.]+\.[a-zA-Z]{2,}/g;
    const fileMatches = text.match(filePathRegex) || [];
    
    entities.files = fileMatches.map(path => ({
      path,
      type: 'file' as const,
      confidence: 0.6
    }));

    // Extract package/library mentions
    const dependencyRegex = /\b(?:react|vue|angular|node|npm|yarn|typescript|javascript|python|java|go|rust|c\+\+|php|ruby|swift|kotlin)\b/gi;
    const depMatches = text.match(dependencyRegex) || [];
    
    entities.dependencies = [...new Set(depMatches)].map(name => ({
      name: name.toLowerCase(),
      type: 'library' as const,
      confidence: 0.5
    }));

    // Extract common feature keywords
    const featureKeywords = ['login', 'register', 'search', 'filter', 'sort', 'upload', 'download', 'auth'];
    const featureMatches = featureKeywords.filter(keyword => 
      text.toLowerCase().includes(keyword)
    );
    
    entities.features = featureMatches.map(name => ({
      name,
      type: 'functionality' as const,
      confidence: 0.4
    }));

    return entities;
  }

  /**
   * Extract entities with higher precision for specific types
   */
  async extractPreciseEntities(input: string, types: string[]): Promise<ExtractedEntities> {
    const prompt = `
Extract ONLY the following entity types from: "${input}"

Allowed types: ${types.join(', ')}

Respond with JSON containing only the requested types:
`;

    const response = await this.callGroq(prompt);
    return this.parseEntityResponse(response);
  }

  /**
   * Batch extract entities from multiple inputs
   */
  async extractEntitiesBatch(inputs: string[]): Promise<Array<{
    input: string;
    entities: ExtractedEntities;
    error?: Error;
  }>> {
    const results = await Promise.allSettled(
      inputs.map(input => this.extractEntities(input))
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return {
          input: inputs[index],
          entities: result.value
        };
      } else {
        return {
          input: inputs[index],
          entities: {
            files: [],
            features: [],
            constraints: [],
            dependencies: [],
            codePatterns: []
          },
          error: result.reason
        };
      }
    });
  }

  /**
   * Get entity statistics
   */
  getEntityStats(results: ExtractedEntities[]): {
    totalFiles: number;
    totalFeatures: number;
    totalConstraints: number;
    totalDependencies: number;
    totalPatterns: number;
    averageConfidence: number;
    entityTypeDistribution: Record<string, number>;
  } {
    let totalFiles = 0;
    let totalFeatures = 0;
    let totalConstraints = 0;
    let totalDependencies = 0;
    let totalPatterns = 0;
    let totalConfidence = 0;
    let totalEntities = 0;

    const distribution: Record<string, number> = {};

    results.forEach(result => {
      if (result.files) {
        totalFiles += result.files.length;
        totalConfidence += result.files.reduce((sum, f) => sum + f.confidence, 0);
        totalEntities += result.files.length;
      }
      if (result.features) {
        totalFeatures += result.features.length;
        totalConfidence += result.features.reduce((sum, f) => sum + f.confidence, 0);
        totalEntities += result.features.length;
      }
      if (result.constraints) {
        totalConstraints += result.constraints.length;
        totalConfidence += result.constraints.reduce((sum, c) => sum + c.confidence, 0);
        totalEntities += result.constraints.length;
      }
      if (result.dependencies) {
        totalDependencies += result.dependencies.length;
        totalConfidence += result.dependencies.reduce((sum, d) => sum + d.confidence, 0);
        totalEntities += result.dependencies.length;
      }
      if (result.codePatterns) {
        totalPatterns += result.codePatterns.length;
        totalConfidence += result.codePatterns.reduce((sum, p) => sum + p.confidence, 0);
        totalEntities += result.codePatterns.length;
      }
    });

    // Calculate distribution
    distribution.files = totalFiles;
    distribution.features = totalFeatures;
    distribution.constraints = totalConstraints;
    distribution.dependencies = totalDependencies;
    distribution.codePatterns = totalPatterns;

    return {
      totalFiles,
      totalFeatures,
      totalConstraints,
      totalDependencies,
      totalPatterns,
      averageConfidence: totalEntities > 0 ? totalConfidence / totalEntities : 0,
      entityTypeDistribution: distribution
    };
  }

  /**
   * Validate extracted entities
   */
  validateEntities(entities: ExtractedEntities): {
    isValid: boolean;
    issues: string[];
    suggestions: string[];
  } {
    const issues: string[] = [];
    const suggestions: string[] = [];

    // Check for empty results
    const hasEntities = entities.files?.length || entities.features?.length || 
                       entities.constraints?.length || entities.dependencies?.length || 
                       entities.codePatterns?.length;

    if (!hasEntities) {
      issues.push('No entities extracted');
      suggestions.push('Try providing more specific details in your request');
    }

    // Check confidence levels
    const allEntities = [
      ...(entities.files || []),
      ...(entities.features || []),
      ...(entities.constraints || []),
      ...(entities.dependencies || []),
      ...(entities.codePatterns || [])
    ];

    const lowConfidenceEntities = allEntities.filter(e => e.confidence < 0.7);
    if (lowConfidenceEntities.length > 0) {
      issues.push(`${lowConfidenceEntities.length} entities have low confidence`);
      suggestions.push('Consider clarifying your request for better entity extraction');
    }

    return {
      isValid: issues.length === 0,
      issues,
      suggestions
    };
  }
}
