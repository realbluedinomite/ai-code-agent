/**
 * AI Code Agent Demo Suite
 * 
 * This directory contains demonstration workflows showcasing the AI Code Agent
 * in action through three distinct demo suites:
 * 
 * 1. Simple Demos - Basic functionality demonstrations
 * 2. Realistic Scenarios - Complex enterprise-grade workflows
 * 3. Interactive Demos - User-driven interactive experiences
 */

export { SimpleDemos, runSimpleDemos, runSimpleDemo } from './demo-simple';
export { RealisticScenarios, runRealisticScenarios, runRealisticScenario } from './demo-realistic';
export { InteractiveDemos, runInteractiveDemos, runInteractiveDemo } from './demo-interactive';

/**
 * Main demo runner that executes all demo suites
 */
export async function runAllDemoSuites(): Promise<void> {
  console.log('\n🚀 AI Code Agent Demo Suite Runner');
  console.log('='.repeat(80));
  console.log('This comprehensive demo showcases AI Code Agent capabilities:');
  console.log('');
  console.log('📄 Simple Demos:');
  console.log('  • Basic web page creation');
  console.log('  • REST API development');
  console.log('  • CLI tool building');
  console.log('  • Configuration management');
  console.log('');
  console.log('🏢 Realistic Scenarios:');
  console.log('  • Enterprise e-commerce platform');
  console.log('  • FinTech banking system');
  console.log('  • Healthcare information system');
  console.log('');
  console.log('🎮 Interactive Demos:');
  console.log('  • Guided web application builder');
  console.log('  • API development wizard');
  console.log('  • Database design assistant');
  console.log('  • Full project orchestrator');
  console.log('='.repeat(80));
  console.log('');

  try {
    // Import all demo suites
    const { runSimpleDemos } = await import('./demo-simple');
    const { runRealisticScenarios } = await import('./demo-realistic');
    const { runInteractiveDemos } = await import('./demo-interactive');

    // Run simple demos
    console.log('\n🎬 Phase 1: Running Simple Demos...');
    await runSimpleDemos();

    // Run realistic scenarios
    console.log('\n🎬 Phase 2: Running Realistic Scenarios...');
    await runRealisticScenarios();

    // Run interactive demos (optional - requires user interaction)
    const runInteractive = process.env.DEMO_INTERACTIVE === 'true';
    if (runInteractive) {
      console.log('\n🎬 Phase 3: Running Interactive Demos...');
      await runInteractiveDemos();
    } else {
      console.log('\n⏭️ Interactive Demos skipped (set DEMO_INTERACTIVE=true to enable)');
    }

    // Final summary
    console.log('\n' + '='.repeat(80));
    console.log('🎉 ALL DEMO SUITES COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(80));
    console.log('');
    console.log('Demo Execution Summary:');
    console.log('✓ Simple Demos - Basic functionality demonstrated');
    console.log('✓ Realistic Scenarios - Enterprise capabilities showcased');
    console.log(runInteractive ? '✓ Interactive Demos - User experience highlighted' : '⏭️ Interactive Demos - Skipped');
    console.log('');
    console.log('Next Steps:');
    console.log('1. Review the generated artifacts and code');
    console.log('2. Examine the demo output and metrics');
    console.log('3. Explore individual demo suites for detailed insights');
    console.log('4. Run specific demos using the individual runner functions');
    console.log('');
    console.log('For more information, see: /workspace/tests/demo/README.md');
    console.log('');

  } catch (error) {
    console.error('\n💥 Demo suite runner failed:', error);
    throw error;
  }
}

/**
 * Quick demo runner for CI/CD environments
 * Runs only non-interactive demos
 */
export async function runQuickDemo(): Promise<void> {
  console.log('\n🚀 AI Code Agent Quick Demo');
  console.log('='.repeat(60));
  console.log('Running quick demo suite (non-interactive only)...');
  console.log('='.repeat(60));

  try {
    const { runSimpleDemos } = await import('./demo-simple');
    const { runRealisticScenarios } = await import('./demo-realistic');

    // Run simple demos
    await runSimpleDemos();
    
    // Run realistic scenarios
    await runRealisticScenarios();

    console.log('\n✅ Quick demo completed successfully!');

  } catch (error) {
    console.error('\n💥 Quick demo failed:', error);
    throw error;
  }
}

/**
 * Demo suite configuration
 */
export const DemoConfig = {
  /**
   * Timeout for demo execution (in milliseconds)
   */
  defaultTimeout: 60000,

  /**
   * Maximum number of retries for failed demos
   */
  maxRetries: 2,

  /**
   * Enable detailed metrics collection
   */
  collectMetrics: true,

  /**
   * Enable performance benchmarking
   */
  enableBenchmarking: true,

  /**
   * Demo suite categories
   */
  categories: {
    simple: {
      name: 'Simple Demos',
      description: 'Basic AI Code Agent functionality',
      estimatedDuration: 30000 // 30 seconds
    },
    realistic: {
      name: 'Realistic Scenarios',
      description: 'Complex enterprise-grade workflows',
      estimatedDuration: 120000 // 2 minutes
    },
    interactive: {
      name: 'Interactive Demos',
      description: 'User-driven interactive experiences',
      estimatedDuration: 300000, // 5 minutes
      requiresUserInput: true
    }
  },

  /**
   * Supported output formats
   */
  outputFormats: ['console', 'json', 'html', 'csv'],

  /**
   * Demo execution modes
   */
  modes: {
    quick: 'Run basic demos only',
    standard: 'Run simple and realistic demos',
    full: 'Run all demos including interactive',
    custom: 'Run selected demos'
  }
};

/**
 * Utility function to validate demo environment
 */
export function validateDemoEnvironment(): {
  valid: boolean;
  warnings: string[];
  recommendations: string[];
} {
  const warnings: string[] = [];
  const recommendations: string[] = [];

  // Check Node.js version
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  if (majorVersion < 16) {
    warnings.push(`Node.js version ${nodeVersion} may not be fully supported`);
    recommendations.push('Upgrade to Node.js 16 or higher for best results');
  }

  // Check available memory
  const availableMemory = process.memoryUsage().heapTotal / 1024 / 1024; // MB
  if (availableMemory < 100) {
    warnings.push('Low available memory may impact demo performance');
    recommendations.push('Increase memory limit or close other applications');
  }

  // Check if running in CI/CD
  const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS !== undefined;
  if (isCI) {
    recommendations.push('Consider setting DEMO_INTERACTIVE=false in CI environment');
  }

  return {
    valid: warnings.length === 0,
    warnings,
    recommendations
  };
}

/**
 * Generate demo execution report
 */
export async function generateDemoReport(results: any): Promise<string> {
  const timestamp = new Date().toISOString();
  
  return `
# AI Code Agent Demo Execution Report

**Generated:** ${timestamp}
**Version:** ${process.env.npm_package_version || 'Unknown'}
**Node.js:** ${process.version}

## Executive Summary

This report summarizes the execution of AI Code Agent demonstration workflows,
showcasing the system's capabilities across three key areas:

1. **Simple Demos** - Basic functionality demonstrations
2. **Realistic Scenarios** - Complex enterprise workflows  
3. **Interactive Demos** - User-driven experiences

## Demo Results

${JSON.stringify(results, null, 2)}

## Performance Metrics

- Total execution time
- Success rate
- Generated artifacts
- Code quality metrics

## Recommendations

Based on the demo execution:

1. Review generated artifacts for quality and completeness
2. Examine performance metrics for optimization opportunities
3. Consider running individual demos for deeper exploration
4. Use interactive demos for hands-on experience

## Next Steps

1. Explore specific demo suites based on your needs
2. Review the generated code and configurations
3. Run demos in your own environment
4. Customize demos for your specific use cases

---
*Report generated by AI Code Agent Demo Suite*
  `;
}
