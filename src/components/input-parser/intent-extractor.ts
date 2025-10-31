/**
 * Intent Extractor
 * Uses Groq AI to extract intent from user requests
 */

import Groq from 'groq-sdk';
import {
  IntentType,
  LLMResponse,
  ParserConfig,
  IntentExtractionError,
  ENTITY_CONFIDENCE_THRESHOLD
} from './types';

export class IntentExtractor {
  private groq: Groq;
  private config: ParserConfig;

  constructor(config: ParserConfig) {
    this.config = {
      modelName: 'mixtral-8x7b-32768',
      maxTokens: 1000,
      temperature: 0.1,
      timeout: 30000,
      maxRetries: 3,
      ...config
    };

    if (!this.config.groqApiKey) {
      throw new IntentExtractionError('Groq API key is required');
    }

    this.groq = new Groq({
      apiKey: this.config.groqApiKey
    });
  }

  /**
   * Extract intent from user input
   */
  async extractIntent(input: string, context?: Record<string, any>): Promise<{
    intent: IntentType;
    confidence: number;
    rawResponse: string;
  }> {
    try {
      const prompt = this.buildIntentPrompt(input, context);
      const response = await this.callGroq(prompt);
      
      return this.parseIntentResponse(response);
    } catch (error) {
      throw new IntentExtractionError(
        `Failed to extract intent: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { input, context, error }
      );
    }
  }

  /**
   * Build the prompt for intent extraction
   */
  private buildIntentPrompt(input: string, context?: Record<string, any>): string {
    const contextInfo = context ? `Context: ${JSON.stringify(context, null, 2)}` : '';
    
    return `
You are an expert AI assistant that analyzes user requests and classifies them into specific intents.

Analyze the following user input and determine the most likely intent:

User Input: "${input}"
${contextInfo}

Available Intent Types:
- ADD_FEATURE: Adding new functionality, components, or features to code
- FIX_BUG: Debugging, fixing errors, resolving issues or problems
- REFACTOR: Restructuring, improving, or reorganizing existing code
- EXPLAIN_CODE: Analyzing, explaining, or documenting code functionality
- ANALYZE_CODE: Reviewing code quality, performance, or architecture
- OPTIMIZE_CODE: Improving performance, efficiency, or resource usage
- DOCUMENT_CODE: Creating or updating documentation, comments, or guides
- TEST_CODE: Writing, running, or improving tests
- DEPLOY_CODE: Deployment, publishing, or releasing code
- REVIEW_CODE: Code review, quality assessment, or feedback

Instructions:
1. Read the user input carefully
2. Consider the context if provided
3. Choose the single best matching intent
4. Provide confidence score (0.0 to 1.0)
5. Explain briefly why you chose this intent

Respond in the following JSON format:
{
  "intent": "INTENT_TYPE",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation of the choice"
}

Only respond with valid JSON, no additional text.
`;
  }

  /**
   * Call Groq API for intent extraction
   */
  private async callGroq(prompt: string): Promise<string> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        const completion = await this.groq.chat.completions.create({
          messages: [
            {
              role: 'system',
              content: 'You are a precise intent classification assistant. Always respond with valid JSON only.'
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

    throw new IntentExtractionError(
      `Failed after ${this.config.maxRetries} attempts`,
      { originalError: lastError }
    );
  }

  /**
   * Parse the Groq response to extract intent
   */
  private parseIntentResponse(response: string): {
    intent: IntentType;
    confidence: number;
    rawResponse: string;
  } {
    try {
      // Clean the response to extract JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const intent = parsed.intent as IntentType;
      const confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0.0;

      // Validate intent type
      if (!Object.values(IntentType).includes(intent)) {
        throw new Error(`Invalid intent type: ${intent}`);
      }

      // Check confidence threshold
      if (confidence < ENTITY_CONFIDENCE_THRESHOLD) {
        return {
          intent: IntentType.UNKNOWN,
          confidence,
          rawResponse: response
        };
      }

      return {
        intent,
        confidence,
        rawResponse: response
      };
    } catch (error) {
      // Fallback: try to extract intent from text
      const textIntent = this.extractIntentFromText(response);
      return {
        intent: textIntent,
        confidence: 0.5,
        rawResponse: response
      };
    }
  }

  /**
   * Fallback method to extract intent from text response
   */
  private extractIntentFromText(text: string): IntentType {
    const textLower = text.toLowerCase();
    
    // Check for keywords that indicate specific intents
    if (textLower.includes('add') && (textLower.includes('feature') || textLower.includes('function'))) {
      return IntentType.ADD_FEATURE;
    }
    if (textLower.includes('fix') || textLower.includes('bug') || textLower.includes('error') || textLower.includes('issue')) {
      return IntentType.FIX_BUG;
    }
    if (textLower.includes('refactor') || textLower.includes('restructure') || textLower.includes('improve')) {
      return IntentType.REFACTOR;
    }
    if (textLower.includes('explain') || textLower.includes('analyze') || textLower.includes('understand')) {
      return IntentType.EXPLAIN_CODE;
    }
    if (textLower.includes('optimize') || textLower.includes('performance') || textLower.includes('efficient')) {
      return IntentType.OPTIMIZE_CODE;
    }
    if (textLower.includes('document') || textLower.includes('documentation') || textLower.includes('comment')) {
      return IntentType.DOCUMENT_CODE;
    }
    if (textLower.includes('test') || textLower.includes('testing') || textLower.includes('unit test')) {
      return IntentType.TEST_CODE;
    }
    if (textLower.includes('deploy') || textLower.includes('deployment') || textLower.includes('publish')) {
      return IntentType.DEPLOY_CODE;
    }
    if (textLower.includes('review') || textLower.includes('quality') || textLower.includes('assessment')) {
      return IntentType.REVIEW_CODE;
    }

    // Default to UNKNOWN if no clear intent found
    return IntentType.UNKNOWN;
  }

  /**
   * Extract multiple intents with confidence scores
   */
  async extractIntentsBatch(inputs: string[]): Promise<Array<{
    input: string;
    intent: IntentType;
    confidence: number;
    rawResponse: string;
  }>> {
    const results = await Promise.allSettled(
      inputs.map(input => this.extractIntent(input))
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return {
          input: inputs[index],
          ...result.value
        };
      } else {
        return {
          input: inputs[index],
          intent: IntentType.UNKNOWN,
          confidence: 0.0,
          rawResponse: '',
          error: result.reason
        };
      }
    });
  }

  /**
   * Get intent statistics
   */
  getIntentStats(results: Array<{ intent: IntentType; confidence: number }>): {
    distribution: Record<IntentType, number>;
    averageConfidence: number;
    confidenceThreshold: number;
  } {
    const distribution = {} as Record<IntentType, number>;
    let totalConfidence = 0;
    let validResults = 0;

    // Initialize distribution
    Object.values(IntentType).forEach(intent => {
      distribution[intent] = 0;
    });

    // Count occurrences and sum confidence
    results.forEach(result => {
      distribution[result.intent]++;
      if (result.confidence > 0) {
        totalConfidence += result.confidence;
        validResults++;
      }
    });

    return {
      distribution,
      averageConfidence: validResults > 0 ? totalConfidence / validResults : 0,
      confidenceThreshold: ENTITY_CONFIDENCE_THRESHOLD
    };
  }

  /**
   * Validate intent extraction result
   */
  validateIntent(intent: IntentType, confidence: number): {
    isValid: boolean;
    isConfident: boolean;
    suggestions: string[];
  } {
    const suggestions: string[] = [];
    let isValid = true;
    let isConfident = confidence >= ENTITY_CONFIDENCE_THRESHOLD;

    // Check if intent is recognized
    if (intent === IntentType.UNKNOWN) {
      suggestions.push('Consider rephrasing your request to be more specific');
      isValid = false;
    }

    // Check confidence level
    if (!isConfident) {
      suggestions.push('Provide more context or details to improve intent recognition');
    }

    // Check for very low confidence
    if (confidence < 0.3) {
      suggestions.push('Your request might need clarification');
      isValid = false;
    }

    return {
      isValid,
      isConfident,
      suggestions
    };
  }
}
