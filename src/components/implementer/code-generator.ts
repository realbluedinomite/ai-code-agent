/**
 * CodeGenerator Component
 * 
 * Handles AI-powered code generation using Groq with context awareness,
 * multiple output formats, and comprehensive error handling.
 */

import {
  CodeGenerationRequest,
  CodeGenerationResponse,
  CodeContext,
  CodeStyle,
  CodeConstraints,
  CodeFile,
  DEFAULT_CONFIG,
} from './types';
import { BaseError, ExternalServiceError, ValidationError, TimeoutError } from '@/core/errors';
import { TypedEventBus } from '@/core/event-bus';

/**
 * Code generation error
 */
export class CodeGenerationError extends BaseError {
  constructor(
    message: string,
    options: {
      prompt?: string;
      context?: any;
      model?: string;
      response?: any;
      context?: Record<string, unknown>;
      correlationId?: string;
      userId?: string;
      sessionId?: string;
      cause?: Error;
    } = {}
  ) {
    super(message, {
      code: 'CODE_GENERATION_ERROR',
      statusCode: 500,
      context: {
        prompt: options.prompt?.substring(0, 500), // Limit prompt length for logging
        context: options.context,
        model: options.model,
        response: options.response,
        ...options.context,
      },
      ...options,
    });
  }
}

/**
 * CodeGenerator class for AI-powered code generation
 */
export class CodeGenerator {
  private groqClient: any;
  private config: typeof DEFAULT_CONFIG.codeGeneration;
  private eventBus: TypedEventBus;

  constructor(
    groqApiKey: string,
    options: Partial<typeof DEFAULT_CONFIG.codeGeneration> = {},
    eventBus: TypedEventBus
  ) {
    if (!groqApiKey) {
      throw new ValidationError('Groq API key is required', {
        field: 'groqApiKey',
      });
    }

    this.config = {
      ...DEFAULT_CONFIG.codeGeneration,
      ...options,
    };

    this.eventBus = eventBus;

    // Initialize Groq client
    try {
      const Groq = require('groq-sdk');
      this.groqClient = new Groq({
        apiKey: groqApiKey,
        timeout: this.config.timeout,
      });
    } catch (error) {
      throw new ValidationError('Failed to initialize Groq client', {
        cause: error as Error,
      });
    }
  }

  /**
   * Generate code based on the request
   */
  async generateCode(request: CodeGenerationRequest): Promise<CodeGenerationResponse> {
    const startTime = Date.now();
    const correlationId = `codegen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      this.eventBus.emit('implementer:code:generation:started', {
        requestId: correlationId,
        model: this.config.model,
        promptLength: request.prompt.length,
      });

      // Validate request
      this.validateRequest(request);

      // Build comprehensive prompt
      const prompt = this.buildPrompt(request);
      
      // Generate code using Groq
      const response = await this.generateWithGroq(prompt, request);

      // Parse and structure the response
      const result = await this.parseResponse(response, request);

      // Create file objects
      const files = this.createFileObjects(result.code, request);

      // Generate documentation if needed
      const documentation = await this.generateDocumentation(result.code, request);

      // Generate tests if needed
      const tests = await this.generateTests(result.code, request);

      const finalResult: CodeGenerationResponse = {
        code: result.code,
        language: this.detectLanguage(result.code, request),
        files,
        explanations: result.explanations,
        tests,
        documentation,
        metadata: {
          model: this.config.model,
          tokens: response.usage?.total_tokens || 0,
          confidence: this.calculateConfidence(result.code, request),
          duration: Date.now() - startTime,
        },
      };

      this.eventBus.emit('implementer:code:generation:completed', {
        requestId: correlationId,
        filesGenerated: files.length,
        duration: finalResult.metadata.duration,
      });

      return finalResult;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      this.eventBus.emit('implementer:code:generation:failed', {
        requestId: correlationId,
        error: errorMessage,
        cause: error,
      });

      throw new CodeGenerationError(
        `Code generation failed: ${errorMessage}`,
        {
          prompt: request.prompt,
          context: request.context,
          model: this.config.model,
          correlationId,
          cause: error instanceof Error ? error : undefined,
        }
      );
    }
  }

  /**
   * Generate code with streaming support
   */
  async *generateCodeStream(
    request: CodeGenerationRequest
  ): AsyncGenerator<string, CodeGenerationResponse, unknown> {
    const correlationId = `codegen_stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    let accumulatedCode = '';
    let response: any;

    try {
      this.eventBus.emit('implementer:code:generation:started', {
        requestId: correlationId,
        model: this.config.model,
        streaming: true,
      });

      // Validate request
      this.validateRequest(request);

      // Build prompt
      const prompt = this.buildPrompt(request);

      // Generate with streaming
      const stream = await this.groqClient.chat.completions.create({
        model: this.config.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
        stream: true,
      });

      for await (const chunk of stream) {
        const delta = chunk.choices?.[0]?.delta?.content || '';
        if (delta) {
          accumulatedCode += delta;
          yield delta;
        }
        response = chunk;
      }

      // Create final response
      const result: CodeGenerationResponse = {
        code: accumulatedCode,
        language: this.detectLanguage(accumulatedCode, request),
        files: this.createFileObjects(accumulatedCode, request),
        explanations: [],
        metadata: {
          model: this.config.model,
          tokens: response?.usage?.total_tokens || 0,
          confidence: this.calculateConfidence(accumulatedCode, request),
          duration: 0, // Will be set by caller
        },
      };

      this.eventBus.emit('implementer:code:generation:completed', {
        requestId: correlationId,
        filesGenerated: result.files.length,
        streaming: true,
      });

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      this.eventBus.emit('implementer:code:generation:failed', {
        requestId: correlationId,
        error: errorMessage,
        streaming: true,
        cause: error,
      });

      throw new CodeGenerationError(
        `Streaming code generation failed: ${errorMessage}`,
        {
          prompt: request.prompt,
          context: request.context,
          model: this.config.model,
          correlationId,
          cause: error instanceof Error ? error : undefined,
        }
      );
    }
  }

  /**
   * Get available models for code generation
   */
  getAvailableModels(): string[] {
    return [
      'mixtral-8x7b-32768',
      'llama-3.1-8b-instant',
      'llama-3.1-70b-versatile',
      'llama-3.1-405b-versatile',
    ];
  }

  /**
   * Estimate token count for a prompt
   */
  estimateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters for English text
    return Math.ceil(text.length / 4);
  }

  /**
   * Validate code generation request
   */
  private validateRequest(request: CodeGenerationRequest): void {
    if (!request.prompt || request.prompt.trim().length === 0) {
      throw new ValidationError('Prompt is required for code generation', {
        field: 'prompt',
      });
    }

    if (request.prompt.length > 10000) {
      throw new ValidationError('Prompt is too long (max 10,000 characters)', {
        field: 'prompt',
        value: request.prompt.length,
      });
    }

    if (this.estimateTokens(request.prompt) > this.config.maxTokens) {
      throw new ValidationError('Prompt exceeds token limit', {
        field: 'prompt',
        estimatedTokens: this.estimateTokens(request.prompt),
        maxTokens: this.config.maxTokens,
      });
    }
  }

  /**
   * Build comprehensive prompt for code generation
   */
  private buildPrompt(request: CodeGenerationRequest): string {
    let prompt = '';

    // System instructions
    prompt += 'You are an expert software engineer. Generate clean, maintainable, and well-documented code.\n\n';

    // Context information
    if (request.context) {
      prompt += 'Context:\n';
      if (request.context.projectPath) {
        prompt += `- Project: ${request.context.projectPath}\n`;
      }
      if (request.context.existingFiles?.length) {
        prompt += `- Existing files: ${request.context.existingFiles.join(', ')}\n`;
      }
      if (request.context.dependencies?.length) {
        prompt += `- Dependencies: ${request.context.dependencies.join(', ')}\n`;
      }
      if (request.context.architecture) {
        prompt += `- Architecture: ${request.context.architecture}\n`;
      }
      if (request.context.businessLogic) {
        prompt += `- Business Logic: ${request.context.businessLogic}\n`;
      }
      prompt += '\n';
    }

    // Style preferences
    if (request.style) {
      prompt += 'Style Requirements:\n';
      prompt += `- Naming: ${request.style.naming}\n`;
      prompt += `- Comments: ${request.style.comments}\n`;
      prompt += `- Formatting: ${request.style.formatting}\n`;
      prompt += `- Error Handling: ${request.style.errorHandling}\n`;
      prompt += `- Testing: ${request.style.testing}\n\n`;
    }

    // Constraints
    if (request.constraints) {
      prompt += 'Constraints:\n';
      if (request.constraints.maxLines) {
        prompt += `- Max lines: ${request.constraints.maxLines}\n`;
      }
      if (request.constraints.maxComplexity) {
        prompt += `- Max complexity: ${request.constraints.maxComplexity}\n`;
      }
      if (request.constraints.requiredPatterns?.length) {
        prompt += `- Required patterns: ${request.constraints.requiredPatterns.join(', ')}\n`;
      }
      if (request.constraints.prohibitedPatterns?.length) {
        prompt += `- Prohibited patterns: ${request.constraints.prohibitedPatterns.join(', ')}\n`;
      }
      prompt += '\n';
    }

    // Language preference
    if (request.language) {
      prompt += `Generate code in ${request.language}.\n\n`;
    }

    // Main prompt
    prompt += 'Task:\n';
    prompt += request.prompt;
    prompt += '\n\nPlease generate the code with explanations for each major section.';

    return prompt;
  }

  /**
   * Generate code using Groq API
   */
  private async generateWithGroq(prompt: string, request: CodeGenerationRequest): Promise<any> {
    const retries = this.config.retries;
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await this.groqClient.chat.completions.create({
          model: this.config.model,
          messages: [
            {
              role: 'system',
              content: 'You are an expert software engineer. Generate clean, maintainable, and well-documented code.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: this.config.temperature,
          max_tokens: this.config.maxTokens,
          stream: false,
        });

        return response;

      } catch (error) {
        lastError = error as Error;

        // Handle specific error types
        if (error instanceof Error) {
          if (error.message.includes('timeout') || error.message.includes('TIMEOUT')) {
            if (attempt === retries) {
              throw new TimeoutError('Code generation', this.config.timeout);
            }
            continue;
          }

          if (error.message.includes('rate limit') || error.message.includes('RATE_LIMIT')) {
            // Wait before retrying rate-limited requests
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            if (attempt === retries) {
              throw new ExternalServiceError('Groq', 'Rate limit exceeded', {
                operation: 'generateCode',
                statusCode: 429,
              });
            }
            continue;
          }

          if (error.message.includes('401') || error.message.includes('unauthorized')) {
            throw new ExternalServiceError('Groq', 'Authentication failed', {
              operation: 'generateCode',
              statusCode: 401,
              cause: error,
            });
          }

          if (error.message.includes('429')) {
            if (attempt === retries) {
              throw new ExternalServiceError('Groq', 'Rate limit exceeded', {
                operation: 'generateCode',
                statusCode: 429,
                cause: error,
              });
            }
            // Exponential backoff
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
            continue;
          }
        }

        // If it's the last attempt, throw the error
        if (attempt === retries) {
          throw new ExternalServiceError('Groq', 'Code generation failed', {
            operation: 'generateCode',
            cause: lastError,
          });
        }
      }
    }

    throw lastError!;
  }

  /**
   * Parse and structure the AI response
   */
  private async parseResponse(response: any, request: CodeGenerationRequest): Promise<{
    code: string;
    explanations: string[];
  }> {
    const content = response.choices?.[0]?.message?.content;

    if (!content) {
      throw new CodeGenerationError('No code generated in response', {
        prompt: request.prompt,
        response,
      });
    }

    // Extract code blocks
    const codeBlocks = this.extractCodeBlocks(content);
    
    if (codeBlocks.length === 0) {
      // If no code blocks found, treat the entire response as code
      return {
        code: content.trim(),
        explanations: [],
      };
    }

    // Extract explanations
    const explanations = this.extractExplanations(content);

    return {
      code: codeBlocks.join('\n\n'),
      explanations,
    };
  }

  /**
   * Extract code blocks from response
   */
  private extractCodeBlocks(content: string): string[] {
    const codeBlocks: string[] = [];
    
    // Match code blocks with ```language or ```
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let match;
    
    while ((match = codeBlockRegex.exec(content)) !== null) {
      codeBlocks.push(match[2].trim());
    }

    // If no code blocks found, look for indented code
    if (codeBlocks.length === 0) {
      const lines = content.split('\n');
      const codeLines: string[] = [];
      let inCodeBlock = false;

      for (const line of lines) {
        if (line.trim().startsWith('```')) {
          inCodeBlock = !inCodeBlock;
          continue;
        }

        if (inCodeBlock || this.looksLikeCode(line)) {
          codeLines.push(line);
        }
      }

      if (codeLines.length > 0) {
        codeBlocks.push(codeLines.join('\n'));
      }
    }

    return codeBlocks;
  }

  /**
   * Extract explanations from response
   */
  private extractExplanations(content: string): string[] {
    const explanations: string[] = [];
    
    // Look for explanations in regular text
    const lines = content.split('\n');
    let currentExplanation = '';

    for (const line of lines) {
      if (line.trim().startsWith('```')) {
        continue;
      }

      // If line looks like an explanation (starts with common explanation phrases)
      if (this.looksLikeExplanation(line)) {
        if (currentExplanation) {
          explanations.push(currentExplanation.trim());
        }
        currentExplanation = line;
      } else if (currentExplanation && line.trim()) {
        currentExplanation += '\n' + line;
      }
    }

    if (currentExplanation) {
      explanations.push(currentExplanation.trim());
    }

    return explanations;
  }

  /**
   * Check if a line looks like code
   */
  private looksLikeCode(line: string): boolean {
    const trimmed = line.trim();
    return (
      trimmed.startsWith('function ') ||
      trimmed.startsWith('const ') ||
      trimmed.startsWith('let ') ||
      trimmed.startsWith('var ') ||
      trimmed.startsWith('class ') ||
      trimmed.startsWith('export ') ||
      trimmed.startsWith('import ') ||
      trimmed.startsWith('def ') ||
      trimmed.startsWith('public ') ||
      trimmed.startsWith('private ') ||
      trimmed.includes('=>') ||
      trimmed.endsWith('{') ||
      trimmed.endsWith('}') ||
      trimmed.endsWith(';')
    );
  }

  /**
   * Check if a line looks like an explanation
   */
  private looksLikeExplanation(line: string): boolean {
    const trimmed = line.toLowerCase().trim();
    return (
      trimmed.startsWith('this code') ||
      trimmed.startsWith('the function') ||
      trimmed.startsWith('we are') ||
      trimmed.startsWith('the following') ||
      trimmed.startsWith('here we') ||
      trimmed.startsWith('this will') ||
      trimmed.startsWith('first,') ||
      trimmed.startsWith('next,') ||
      trimmed.startsWith('then,')
    );
  }

  /**
   * Create file objects from generated code
   */
  private createFileObjects(code: string, request: CodeGenerationRequest): CodeFile[] {
    const files: CodeFile[] = [];

    // Try to detect multiple files in the code
    const fileParts = this.splitCodeIntoFiles(code, request);

    if (fileParts.length > 1) {
      // Multiple files detected
      fileParts.forEach((part, index) => {
        const fileName = this.generateFileName(part, request, index);
        files.push({
          path: fileName,
          content: part.content,
          language: this.detectLanguage(part.content, request),
          type: part.type || 'source',
          description: part.description,
        });
      });
    } else {
      // Single file
      const fileName = this.generateFileName(code, request, 0);
      files.push({
        path: fileName,
        content: code,
        language: this.detectLanguage(code, request),
        type: 'source',
      });
    }

    return files;
  }

  /**
   * Split code into multiple files if possible
   */
  private splitCodeIntoFiles(code: string, request: CodeGenerationRequest): Array<{
    content: string;
    type?: string;
    description?: string;
  }> {
    // Look for file separators or clear file divisions
    const parts: Array<{ content: string; type?: string; description?: string }> = [];
    
    // Check for file path comments or markers
    const lines = code.split('\n');
    let currentPart = '';
    let currentType: string | undefined;
    let currentDescription: string | undefined;

    for (const line of lines) {
      // Detect file markers
      if (line.trim().startsWith('// File:') || line.trim().startsWith('/* File:')) {
        if (currentPart) {
          parts.push({
            content: currentPart.trim(),
            type: currentType,
            description: currentDescription,
          });
          currentPart = '';
        }
        currentDescription = line.replace(/\/\/ File:|\/\* File:/, '').trim();
      } else if (line.trim().startsWith('// Type:') || line.trim().startsWith('/* Type:')) {
        currentType = line.replace(/\/\/ Type:|\/\* Type:/, '').trim().toLowerCase();
      } else {
        currentPart += line + '\n';
      }
    }

    if (currentPart) {
      parts.push({
        content: currentPart.trim(),
        type: currentType,
        description: currentDescription,
      });
    }

    return parts.length > 0 ? parts : [{ content: code }];
  }

  /**
   * Generate file name based on content and request
   */
  private generateFileName(code: string, request: CodeGenerationRequest, index: number): string {
    // Try to extract filename from code comments
    const filenameMatch = code.match(/\/\/ File:?\s*(.+)/i) || code.match(/\/\* File:?\s*(.+?)\*\//i);
    if (filenameMatch) {
      return filenameMatch[1].trim();
    }

    // Generate based on language and context
    const language = request.language || this.detectLanguage(code, request);
    const suffix = this.getFileExtension(language);
    
    // Try to infer name from prompt
    const promptWords = request.prompt.toLowerCase().split(/\s+/);
    let inferredName = 'generated';
    
    for (const word of promptWords) {
      if (word.length > 3 && /^[a-zA-Z]+$/.test(word)) {
        inferredName = word;
        break;
      }
    }

    return `${inferredName}_${index + 1}${suffix}`;
  }

  /**
   * Detect programming language from code
   */
  private detectLanguage(code: string, request?: CodeGenerationRequest): string {
    // First check request preference
    if (request?.language) {
      return request.language;
    }

    // Detect from file extension patterns in code
    const extensionMatch = code.match(/\/\/ File:?\s*.*?(\.\w+)/i);
    if (extensionMatch) {
      return this.getLanguageFromExtension(extensionMatch[1]);
    }

    // Detect from code patterns
    if (code.includes('def ') && code.includes('import ')) {
      return 'python';
    }
    if (code.includes('function ') && code.includes('console.log')) {
      return 'javascript';
    }
    if (code.includes('const ') && code.includes('import ')) {
      return 'typescript';
    }
    if (code.includes('public class ') || code.includes('System.out.println')) {
      return 'java';
    }
    if (code.includes('package ') && code.includes('import ')) {
      return 'go';
    }
    if (code.includes('fn ') && code.includes('let ')) {
      return 'rust';
    }
    if (code.includes('#include') && code.includes('int main')) {
      return 'c';
    }
    if (code.includes('<?php')) {
      return 'php';
    }
    if (code.includes('using namespace') && code.includes('int main')) {
      return 'cpp';
    }

    // Default to JavaScript/TypeScript
    return 'javascript';
  }

  /**
   * Get file extension for language
   */
  private getFileExtension(language: string): string {
    const extensions: Record<string, string> = {
      javascript: '.js',
      typescript: '.ts',
      python: '.py',
      java: '.java',
      go: '.go',
      rust: '.rs',
      c: '.c',
      cpp: '.cpp',
      php: '.php',
      ruby: '.rb',
      swift: '.swift',
      kotlin: '.kt',
      scala: '.scala',
      sql: '.sql',
      html: '.html',
      css: '.css',
      scss: '.scss',
      json: '.json',
      yaml: '.yml',
      yml: '.yml',
      xml: '.xml',
      markdown: '.md',
    };

    return extensions[language.toLowerCase()] || '.txt';
  }

  /**
   * Get language from file extension
   */
  private getLanguageFromExtension(extension: string): string {
    const languages: Record<string, string> = {
      '.js': 'javascript',
      '.ts': 'typescript',
      '.py': 'python',
      '.java': 'java',
      '.go': 'go',
      '.rs': 'rust',
      '.c': 'c',
      '.cpp': 'cpp',
      '.cc': 'cpp',
      '.php': 'php',
      '.rb': 'ruby',
      '.swift': 'swift',
      '.kt': 'kotlin',
      '.scala': 'scala',
      '.sql': 'sql',
      '.html': 'html',
      '.css': 'css',
      '.scss': 'scss',
      '.json': 'json',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.xml': 'xml',
      '.md': 'markdown',
    };

    return languages[extension.toLowerCase()] || 'text';
  }

  /**
   * Calculate confidence score for generated code
   */
  private calculateConfidence(code: string, request: CodeGenerationRequest): number {
    let confidence = 0.5; // Base confidence

    // Adjust based on code completeness
    if (code.includes('function') || code.includes('class') || code.includes('def')) {
      confidence += 0.1;
    }

    if (code.includes('return') || code.includes('}') || code.includes('end')) {
      confidence += 0.1;
    }

    // Adjust based on documentation
    if (code.includes('/**') || code.includes('//') || code.includes('#')) {
      confidence += 0.1;
    }

    // Adjust based on error handling
    if (code.includes('try') || code.includes('catch') || code.includes('except')) {
      confidence += 0.1;
    }

    // Adjust based on constraints
    if (request.constraints?.maxLines && code.split('\n').length <= request.constraints.maxLines) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Generate documentation for the code
   */
  private async generateDocumentation(code: string, request: CodeGenerationRequest): Promise<CodeFile[]> {
    if (!request.style || request.style.comments === 'none') {
      return [];
    }

    try {
      const docRequest: CodeGenerationRequest = {
        ...request,
        prompt: `Generate comprehensive documentation for this code:\n\n${code}\n\nInclude:\n1. Overview/Purpose\n2. Key functions/classes and their purposes\n3. Usage examples\n4. Dependencies\n5. Configuration options\n6. API reference if applicable\n\nFormat the documentation in Markdown.`,
      };

      const docResponse = await this.generateCode(docRequest);
      
      return [{
        path: this.generateDocumentationFilename(request),
        content: docResponse.code,
        language: 'markdown',
        type: 'documentation',
        description: 'Generated documentation',
      }];

    } catch (error) {
      // Don't fail the entire generation if documentation fails
      console.warn('Documentation generation failed:', error);
      return [];
    }
  }

  /**
   * Generate tests for the code
   */
  private async generateTests(code: string, request: CodeGenerationRequest): Promise<CodeFile[]> {
    if (!request.style || request.style.testing === 'none') {
      return [];
    }

    try {
      const testRequest: CodeGenerationRequest = {
        ...request,
        prompt: `Generate comprehensive unit tests for this code:\n\n${code}\n\nInclude:\n1. Test cases for all major functions/methods\n2. Edge cases\n3. Error cases\n4. Mock data and fixtures\n5. Test utilities\n\nUse appropriate testing framework for the language.`,
      };

      const testResponse = await this.generateCode(testRequest);
      
      return [{
        path: this.generateTestFilename(request),
        content: testResponse.code,
        language: this.detectLanguage(testResponse.code, request),
        type: 'test',
        description: 'Generated unit tests',
      }];

    } catch (error) {
      // Don't fail the entire generation if tests fail
      console.warn('Test generation failed:', error);
      return [];
    }
  }

  /**
   * Generate documentation filename
   */
  private generateDocumentationFilename(request: CodeGenerationRequest): string {
    const baseName = this.extractBaseName(request.prompt);
    return `docs/${baseName}_documentation.md`;
  }

  /**
   * Generate test filename
   */
  private generateTestFilename(request: CodeGenerationRequest): string {
    const baseName = this.extractBaseName(request.prompt);
    const language = request.language || 'javascript';
    const extension = this.getFileExtension(language);
    
    if (language === 'typescript' || language === 'javascript') {
      return `tests/${baseName}.test${extension}`;
    } else if (language === 'python') {
      return `tests/test_${baseName}.py`;
    } else {
      return `tests/test_${baseName}${extension}`;
    }
  }

  /**
   * Extract base name from prompt
   */
  private extractBaseName(prompt: string): string {
    const words = prompt.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2);
    
    return words.slice(0, 3).join('_') || 'generated';
  }
}
