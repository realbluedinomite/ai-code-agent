/**
 * Project Scanner
 * Scans project structure, files, dependencies, and provides detailed analysis
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import {
  ProjectScanResult,
  ProjectStructure,
  ProjectMetrics,
  ScannedFile,
  ScannedDependency,
  ProjectConfiguration,
  ProjectHealth,
  ProjectIssue,
  DirectoryInfo,
  ProjectScanError,
  MAX_PROJECT_SCAN_DEPTH,
  MAX_FILES_PER_SCAN
} from './types';

export class ProjectScanner {
  private rootPath: string;

  constructor(rootPath: string = process.cwd()) {
    this.rootPath = path.resolve(rootPath);
  }

  /**
   * Perform comprehensive project scan
   */
  async scanProject(options?: {
    includeContent?: boolean;
    includeDependencies?: boolean;
    includeConfiguration?: boolean;
    maxDepth?: number;
    excludePatterns?: string[];
  }): Promise<ProjectScanResult> {
    try {
      const scanOptions = {
        includeContent: false,
        includeDependencies: true,
        includeConfiguration: true,
        maxDepth: MAX_PROJECT_SCAN_DEPTH,
        excludePatterns: ['node_modules', '.git', 'dist', 'build', '.next', '.nuxt', '.vscode'],
        ...options
      };

      const startTime = Date.now();
      const projectName = path.basename(this.rootPath);
      
      // Scan project structure
      const structure = await this.scanStructure(scanOptions);
      
      // Scan files
      const files = await this.scanFiles(scanOptions);
      
      // Scan dependencies
      const dependencies = scanOptions.includeDependencies 
        ? await this.scanDependencies() 
        : [];
      
      // Calculate metrics
      const metrics = this.calculateMetrics(files);
      
      // Analyze configuration
      const configuration = scanOptions.includeConfiguration 
        ? await this.analyzeConfiguration() 
        : this.getDefaultConfiguration();
      
      // Assess project health
      const health = await this.assessHealth(files, dependencies, configuration);
      
      const processingTime = Date.now() - startTime;
      const projectType = this.detectProjectType(files, configuration);

      return {
        projectPath: this.rootPath,
        projectName,
        projectType,
        structure,
        metrics,
        files,
        dependencies,
        configuration,
        health
      };
    } catch (error) {
      throw new ProjectScanError(
        `Failed to scan project: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { rootPath: this.rootPath, error }
      );
    }
  }

  /**
   * Scan project structure (directories and organization)
   */
  private async scanStructure(options: any): Promise<ProjectStructure> {
    const directories: DirectoryInfo[] = [];
    let fileCount = 0;
    let directoryCount = 0;
    let maxDepth = 0;

    const scanDirectory = async (dirPath: string, currentDepth: number = 0): Promise<DirectoryInfo | null> => {
      if (currentDepth > options.maxDepth) {
        return null;
      }

      try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        const dirInfo: DirectoryInfo = {
          path: path.relative(this.rootPath, dirPath),
          name: path.basename(dirPath),
          fileCount: 0,
          subdirectories: [],
          level: currentDepth
        };

        maxDepth = Math.max(maxDepth, currentDepth);

        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);
          
          // Check exclude patterns
          if (this.shouldExclude(fullPath, options.excludePatterns)) {
            continue;
          }

          if (entry.isDirectory()) {
            directoryCount++;
            const subDir = await scanDirectory(fullPath, currentDepth + 1);
            if (subDir) {
              dirInfo.subdirectories.push(subDir);
            }
          } else if (entry.isFile()) {
            fileCount++;
            dirInfo.fileCount++;
          }
        }

        directories.push(dirInfo);
        return dirInfo;
      } catch (error) {
        console.warn(`Failed to scan directory ${dirPath}:`, error);
        return null;
      }
    };

    await scanDirectory(this.rootPath);

    // Check for specific project indicators
    const hasTests = await this.checkHasTests();
    const hasDocumentation = await this.checkHasDocumentation();
    const hasConfig = await this.checkHasConfiguration();

    return {
      rootPath: this.rootPath,
      directories,
      fileCount,
      directoryCount,
      maxDepth,
      hasTests,
      hasDocumentation,
      hasConfig
    };
  }

  /**
   * Scan project files
   */
  private async scanFiles(options: any): Promise<ScannedFile[]> {
    const files: ScannedFile[] = [];
    
    const scanFiles = async (dirPath: string, currentDepth: number = 0): Promise<void> => {
      if (currentDepth > options.maxDepth || files.length >= MAX_FILES_PER_SCAN) {
        return;
      }

      try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        
        for (const entry of entries) {
          if (files.length >= MAX_FILES_PER_SCAN) break;
          
          const fullPath = path.join(dirPath, entry.name);
          const relativePath = path.relative(this.rootPath, fullPath);
          
          // Check exclude patterns
          if (this.shouldExclude(fullPath, options.excludePatterns)) {
            continue;
          }

          if (entry.isFile()) {
            try {
              const stats = await fs.stat(fullPath);
              const fileInfo = await this.analyzeFile(fullPath, relativePath, stats, options.includeContent);
              
              if (fileInfo) {
                files.push(fileInfo);
              }
            } catch (error) {
              console.warn(`Failed to analyze file ${fullPath}:`, error);
            }
          } else if (entry.isDirectory()) {
            await scanFiles(fullPath, currentDepth + 1);
          }
        }
      } catch (error) {
        console.warn(`Failed to scan directory ${dirPath}:`, error);
      }
    };

    await scanFiles(this.rootPath);
    return files;
  }

  /**
   * Analyze individual file
   */
  private async analyzeFile(
    fullPath: string, 
    relativePath: string, 
    stats: fs.Stats,
    includeContent: boolean
  ): Promise<ScannedFile | null> {
    try {
      const extension = path.extname(fullPath).toLowerCase();
      const language = this.detectLanguage(extension);
      const fileType = this.detectFileType(relativePath);
      const isTest = this.isTestFile(relativePath);
      const isConfig = this.isConfigFile(relativePath);

      let content: string | undefined;
      let imports: string[] | undefined;
      let exports: string[] | undefined;

      if (includeContent && stats.size < 1024 * 1024) { // Only read files < 1MB
        content = await fs.readFile(fullPath, 'utf-8');
        
        if (language) {
          const analysis = this.analyzeCodeContent(content, language);
          imports = analysis.imports;
          exports = analysis.exports;
        }
      }

      return {
        path: relativePath,
        name: path.basename(fullPath),
        type: fileType,
        size: stats.size,
        lineCount: includeContent && content ? content.split('\n').length : 0,
        language,
        modifiedAt: stats.mtime,
        isTest,
        isConfig,
        imports,
        exports,
        metadata: {
          extension,
          isSymlink: stats.isSymbolicLink(),
          permissions: stats.mode
        }
      };
    } catch (error) {
      console.warn(`Failed to analyze file ${fullPath}:`, error);
      return null;
    }
  }

  /**
   * Scan project dependencies
   */
  private async scanDependencies(): Promise<ScannedDependency[]> {
    const dependencies: ScannedDependency[] = [];

    // Scan package.json
    const packageJsonPath = path.join(this.rootPath, 'package.json');
    try {
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      
      const scanDependenciesSection = (deps: Record<string, string> | undefined, type: string) => {
        if (!deps) return;
        
        Object.entries(deps).forEach(([name, version]) => {
          dependencies.push({
            name,
            version,
            type: type as any,
            source: 'package.json',
            description: '',
            license: '',
            homepage: ''
          });
        });
      };

      scanDependenciesSection(packageJson.dependencies, 'dependency');
      scanDependenciesSection(packageJson.devDependencies, 'devDependency');
      scanDependenciesSection(packageJson.peerDependencies, 'peerDependency');
    } catch (error) {
      console.warn('Failed to parse package.json:', error);
    }

    // Scan other dependency files
    const dependencyFiles = [
      'requirements.txt',
      'Pipfile',
      'pyproject.toml',
      'Cargo.toml',
      'pom.xml',
      'build.gradle',
      'composer.json',
      'go.mod'
    ];

    for (const file of dependencyFiles) {
      const filePath = path.join(this.rootPath, file);
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const fileDeps = this.parseDependencyFile(file, content);
        dependencies.push(...fileDeps);
      } catch (error) {
        // File doesn't exist or can't be read, continue
      }
    }

    return dependencies;
  }

  /**
   * Parse dependency files for different package managers
   */
  private parseDependencyFile(fileName: string, content: string): ScannedDependency[] {
    const dependencies: ScannedDependency[] = [];
    
    try {
      switch (fileName) {
        case 'requirements.txt':
          content.split('\n').forEach(line => {
            line = line.trim();
            if (line && !line.startsWith('#')) {
              const match = line.match(/^([a-zA-Z0-9_-]+)([=<>!]+.*)?$/);
              if (match) {
                dependencies.push({
                  name: match[1],
                  version: match[2] || '',
                  type: 'dependency',
                  source: 'requirements.txt'
                });
              }
            }
          });
          break;
          
        case 'Cargo.toml':
          // Basic Cargo.toml parsing - simplified
          const cargoDeps = content.match(/\[dependencies\]([\s\S]*?)(?=\[|$)/);
          if (cargoDeps) {
            const depsText = cargoDeps[1];
            depsText.split('\n').forEach(line => {
              line = line.trim();
              if (line && !line.startsWith('#')) {
                const match = line.match(/^([a-zA-Z0-9_-]+)\s*=\s*"(.*?)"/);
                if (match) {
                  dependencies.push({
                    name: match[1],
                    version: match[2],
                    type: 'dependency',
                    source: 'Cargo.toml'
                  });
                }
              }
            });
          }
          break;
          
        // Add more parsers for other dependency files as needed
      }
    } catch (error) {
      console.warn(`Failed to parse ${fileName}:`, error);
    }

    return dependencies;
  }

  /**
   * Calculate project metrics
   */
  private calculateMetrics(files: ScannedFile[]): ProjectMetrics {
    let totalLines = 0;
    let codeLines = 0;
    let commentLines = 0;
    let blankLines = 0;

    files.forEach(file => {
      if (file.lineCount) {
        totalLines += file.lineCount;
        
        // Estimate code vs comment lines (simple heuristic)
        if (file.language && ['javascript', 'typescript', 'python', 'java', 'cpp'].includes(file.language)) {
          // This is a simplified estimation - in real implementation, you'd parse the actual content
          codeLines += Math.floor(file.lineCount * 0.8);
          commentLines += Math.floor(file.lineCount * 0.1);
          blankLines += Math.floor(file.lineCount * 0.1);
        }
      }
    });

    // Calculate complexity score (simplified)
    const complexityScore = this.calculateComplexityScore(files);

    return {
      totalFiles: files.length,
      totalLines,
      codeLines,
      commentLines,
      blankLines,
      complexityScore
    };
  }

  /**
   * Calculate complexity score based on files
   */
  private calculateComplexityScore(files: ScannedFile[]): number {
    // Simple complexity estimation based on file types and sizes
    let complexity = 0;
    
    files.forEach(file => {
      let fileComplexity = 1;
      
      // Add complexity based on file type
      if (file.language === 'typescript') fileComplexity += 2;
      else if (file.language === 'javascript') fileComplexity += 1;
      else if (['java', 'cpp', 'rust'].includes(file.language || '')) fileComplexity += 2;
      
      // Add complexity based on file size (lines)
      if (file.lineCount && file.lineCount > 500) fileComplexity += 2;
      else if (file.lineCount && file.lineCount > 200) fileComplexity += 1;
      
      complexity += fileComplexity;
    });
    
    // Normalize to 0-100 scale
    return Math.min(100, Math.round(complexity / files.length * 10));
  }

  /**
   * Analyze project configuration
   */
  private async analyzeConfiguration(): Promise<ProjectConfiguration> {
    const configFiles = [
      'package.json',
      'tsconfig.json',
      'eslint.config.js',
      '.eslintrc.json',
      'prettier.config.js',
      '.prettierrc',
      'jest.config.js',
      'vitest.config.js',
      'cypress.config.js',
      'next.config.js',
      'vue.config.js',
      'angular.json',
      '.github/workflows'
    ];

    const existingConfigs: string[] = [];
    
    for (const configFile of configFiles) {
      try {
        const filePath = path.join(this.rootPath, configFile);
        await fs.access(filePath);
        existingConfigs.push(configFile);
      } catch (error) {
        // File doesn't exist
      }
    }

    // Detect frameworks and libraries
    const frameworks: string[] = [];
    const libraries: string[] = [];
    
    if (existingConfigs.includes('next.config.js')) frameworks.push('Next.js');
    if (existingConfigs.includes('vue.config.js')) frameworks.push('Vue.js');
    if (existingConfigs.includes('angular.json')) frameworks.push('Angular');
    
    const packageJsonPath = path.join(this.rootPath, 'package.json');
    try {
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      if (deps.react) libraries.push('React');
      if (deps.vue) libraries.push('Vue.js');
      if (deps.angular) libraries.push('Angular');
      if (deps['@nestjs/core']) frameworks.push('NestJS');
    } catch (error) {
      // Failed to parse package.json
    }

    return {
      buildSystem: this.detectBuildSystem(existingConfigs),
      packageManager: this.detectPackageManager(),
      hasTypeScript: existingConfigs.includes('tsconfig.json'),
      hasESLint: existingConfigs.includes('eslint.config.js') || existingConfigs.includes('.eslintrc.json'),
      hasPrettier: existingConfigs.includes('prettier.config.js') || existingConfigs.includes('.prettierrc'),
      hasTests: existingConfigs.includes('jest.config.js') || existingConfigs.includes('vitest.config.js'),
      hasCI: existingConfigs.includes('.github/workflows'),
      frameworks,
      libraries
    };
  }

  /**
   * Get default configuration when analysis fails
   */
  private getDefaultConfiguration(): ProjectConfiguration {
    return {
      buildSystem: null,
      packageManager: null,
      hasTypeScript: false,
      hasESLint: false,
      hasPrettier: false,
      hasTests: false,
      hasCI: false,
      frameworks: [],
      libraries: []
    };
  }

  /**
   * Assess project health
   */
  private async assessHealth(
    files: ScannedFile[], 
    dependencies: ScannedDependency[], 
    configuration: ProjectConfiguration
  ): Promise<ProjectHealth> {
    const issues: ProjectIssue[] = [];
    const recommendations: string[] = [];
    
    // Check for common issues
    if (!configuration.hasTests) {
      issues.push({
        type: 'warning',
        category: 'maintainability',
        description: 'No test configuration found',
        severity: 'medium'
      });
      recommendations.push('Add test configuration (Jest, Vitest, etc.)');
    }

    if (!configuration.hasESLint) {
      issues.push({
        type: 'warning',
        category: 'maintainability',
        description: 'No ESLint configuration found',
        severity: 'low'
      });
      recommendations.push('Add ESLint for code quality');
    }

    if (!configuration.hasCI) {
      issues.push({
        type: 'info',
        category: 'maintainability',
        description: 'No CI/CD configuration found',
        severity: 'low'
      });
      recommendations.push('Consider adding CI/CD pipeline');
    }

    // Check for outdated dependencies (simplified)
    const oldDependencies = dependencies.filter(dep => 
      dep.version && dep.version.includes('^0.') || dep.version?.includes('~0.')
    );
    
    if (oldDependencies.length > 0) {
      issues.push({
        type: 'warning',
        category: 'compatibility',
        description: `${oldDependencies.length} dependencies appear to be outdated`,
        severity: 'medium'
      });
      recommendations.push('Update outdated dependencies');
    }

    // Calculate health score
    let score = 100;
    issues.forEach(issue => {
      switch (issue.severity) {
        case 'low': score -= 5; break;
        case 'medium': score -= 10; break;
        case 'high': score -= 20; break;
        case 'critical': score -= 30; break;
      }
    });

    return {
      score: Math.max(0, score),
      issues,
      recommendations,
      lastAnalyzed: new Date()
    };
  }

  // Utility methods

  private shouldExclude(filePath: string, excludePatterns: string[] = []): boolean {
    const relativePath = path.relative(this.rootPath, filePath);
    
    return excludePatterns.some(pattern => {
      if (pattern.includes('*')) {
        // Simple glob pattern matching
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(relativePath);
      }
      return relativePath.includes(pattern);
    });
  }

  private detectLanguage(extension: string): string | null {
    const languageMap: Record<string, string> = {
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.py': 'python',
      '.java': 'java',
      '.cpp': 'cpp',
      '.c': 'c',
      '.cs': 'csharp',
      '.go': 'go',
      '.rs': 'rust',
      '.php': 'php',
      '.rb': 'ruby',
      '.swift': 'swift',
      '.kt': 'kotlin',
      '.scala': 'scala',
      '.html': 'html',
      '.css': 'css',
      '.scss': 'scss',
      '.sass': 'sass',
      '.less': 'less',
      '.vue': 'vue',
      '.jsx': 'react',
      '.tsx': 'react',
      '.json': 'json',
      '.xml': 'xml',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.md': 'markdown',
      '.sql': 'sql'
    };

    return languageMap[extension.toLowerCase()] || null;
  }

  private detectFileType(filePath: string): string {
    if (filePath.includes('/src/')) return 'source';
    if (filePath.includes('/test') || filePath.includes('/tests') || filePath.includes('.test.') || filePath.includes('.spec.')) return 'test';
    if (filePath.includes('/config') || filePath.includes('.config.') || filePath.startsWith('.')) return 'config';
    if (filePath.includes('/docs') || filePath.includes('/documentation') || filePath.endsWith('.md')) return 'documentation';
    if (filePath.includes('/public') || filePath.includes('/assets')) return 'asset';
    return 'other';
  }

  private isTestFile(filePath: string): boolean {
    const testPatterns = [
      /\.test\./,
      /\.spec\./,
      /\/test\//,
      /\/tests\//,
      /\/__tests__\//,
      /test\.js$/,
      /test\.ts$/,
      /spec\.js$/,
      /spec\.ts$/
    ];

    return testPatterns.some(pattern => pattern.test(filePath));
  }

  private isConfigFile(filePath: string): boolean {
    const configPatterns = [
      /webpack\.config\./,
      /vite\.config\./,
      /rollup\.config\./,
      /babel\.config\./,
      /jest\.config\./,
      /eslint\.config\./,
      /\.eslintrc/,
      /prettier\.config\./,
      /\.prettierrc/,
      /tsconfig\.json/,
      /package\.json/,
      /\.github\/workflows\//
    ];

    return configPatterns.some(pattern => pattern.test(filePath));
  }

  private analyzeCodeContent(content: string, language: string): { imports: string[]; exports: string[] } {
    const imports: string[] = [];
    const exports: string[] = [];

    try {
      switch (language) {
        case 'javascript':
        case 'typescript':
          // Extract import statements
          const importMatches = content.match(/import\s+.*?\s+from\s+['"]([^'"]+)['"]/g) || [];
          importMatches.forEach(match => {
            const importMatch = match.match(/from\s+['"]([^'"]+)['"]/);
            if (importMatch) imports.push(importMatch[1]);
          });

          // Extract export statements
          const exportMatches = content.match(/export\s+(?:default\s+)?(?:function|class|const|let|var)/g) || [];
          exports.push(...exportMatches);
          break;

        case 'python':
          // Extract import statements
          const pyImportMatches = content.match(/^(?:from\s+[\w.]+\s+)?import\s+[\w.,\s*]+/gm) || [];
          imports.push(...pyImportMatches);
          break;
      }
    } catch (error) {
      console.warn('Failed to analyze code content:', error);
    }

    return { imports, exports };
  }

  private detectProjectType(files: ScannedFile[], configuration: ProjectConfiguration): string {
    // Check frameworks first
    if (configuration.frameworks.includes('Next.js')) return 'nextjs';
    if (configuration.frameworks.includes('Vue.js')) return 'vue';
    if (configuration.frameworks.includes('Angular')) return 'angular';
    if (configuration.frameworks.includes('NestJS')) return 'nestjs';

    // Check by file patterns
    const hasReactFiles = files.some(f => f.path.includes('react') || f.path.includes('.tsx'));
    const hasVueFiles = files.some(f => f.path.includes('.vue'));
    const hasAngularFiles = files.some(f => f.path.includes('angular'));
    const hasNodeModules = files.some(f => f.path.includes('node_modules'));

    if (hasReactFiles) return 'react';
    if (hasVueFiles) return 'vue';
    if (hasAngularFiles) return 'angular';
    if (hasNodeModules) return 'nodejs';

    // Check by file extensions
    const extSet = new Set(files.map(f => path.extname(f.path).toLowerCase()));
    if (extSet.has('.py')) return 'python';
    if (extSet.has('.java')) return 'java';
    if (extSet.has('.go')) return 'go';
    if (extSet.has('.rs')) return 'rust';

    return 'generic';
  }

  private detectBuildSystem(configFiles: string[]): string | null {
    if (configFiles.includes('package.json')) return 'npm';
    if (configFiles.includes('Cargo.toml')) return 'cargo';
    if (configFiles.includes('pom.xml')) return 'maven';
    if (configFiles.includes('build.gradle')) return 'gradle';
    return null;
  }

  private detectPackageManager(): string | null {
    // Check for lock files
    if (fs.existsSync(path.join(this.rootPath, 'yarn.lock'))) return 'yarn';
    if (fs.existsSync(path.join(this.rootPath, 'pnpm-lock.yaml'))) return 'pnpm';
    if (fs.existsSync(path.join(this.rootPath, 'package-lock.json'))) return 'npm';
    return null;
  }

  private async checkHasTests(): Promise<boolean> {
    try {
      const entries = await fs.readdir(this.rootPath);
      return entries.some(entry => 
        entry.includes('test') || entry.includes('spec') || 
        entry.includes('__tests__') || entry.includes('.test.')
      );
    } catch (error) {
      return false;
    }
  }

  private async checkHasDocumentation(): Promise<boolean> {
    try {
      const entries = await fs.readdir(this.rootPath);
      return entries.some(entry => 
        entry.toLowerCase().includes('doc') || 
        entry.endsWith('.md') || 
        entry.endsWith('.rst') ||
        entry.endsWith('.txt')
      );
    } catch (error) {
      return false;
    }
  }

  private async checkHasConfiguration(): Promise<boolean> {
    try {
      const entries = await fs.readdir(this.rootPath);
      const configPatterns = [
        /package\.json/,
        /\.eslintrc/,
        /prettier\.config/,
        /tsconfig\.json/,
        /webpack\.config/,
        /vite\.config/,
        /\.github/
      ];

      return entries.some(entry => 
        configPatterns.some(pattern => pattern.test(entry))
      );
    } catch (error) {
      return false;
    }
  }
}
