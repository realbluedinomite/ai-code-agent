# AI Code Agent Demo Suite

This directory contains comprehensive demonstration workflows that showcase the AI Code Agent's capabilities across different complexity levels and interaction patterns.

## 📋 Overview

The demo suite is organized into three distinct categories:

### 1. Simple Demos (`demo-simple.ts`)
Basic functionality demonstrations for newcomers
- **Purpose**: Showcase fundamental AI Code Agent capabilities
- **Audience**: New users, basic learning
- **Complexity**: Low to medium
- **Duration**: ~30 seconds per demo

**Demos Included:**
- 🌐 Web Page Creation - Basic HTML/CSS generation
- 🔌 REST API Development - Express.js API with endpoints
- 💻 CLI Tool Building - Command-line utility creation
- ⚙️ Configuration Management - Environment-based config setup

### 2. Realistic Scenarios (`demo-realistic.ts`)
Complex enterprise-grade workflow demonstrations
- **Purpose**: Demonstrate production-ready capabilities
- **Audience**: Enterprise users, architects
- **Complexity**: High to enterprise
- **Duration**: ~2 minutes per scenario

**Scenarios Included:**
- 🏢 Enterprise E-Commerce Platform - 8 microservices, payment processing, admin dashboard
- 🏦 FinTech Banking System - Bank-grade security, HIPAA compliance, fraud detection
- 🏥 Healthcare Information System - HIPAA-compliant EHR, patient portal, telemedicine

### 3. Interactive Demos (`demo-interactive.ts`)
User-driven interactive experiences with guided workflows
- **Purpose**: Showcase dynamic interaction capabilities
- **Audience**: All users, hands-on learners
- **Complexity**: Variable
- **Duration**: ~5 minutes per demo

**Demos Included:**
- 🎨 Guided Web Application Builder - Step-by-step web app creation
- 🔌 API Development Wizard - Interactive API design process
- 💾 Database Design Assistant - Schema design with real-time feedback
- 🎯 Full Project Orchestrator - End-to-end project creation

## 🚀 Quick Start

### Run All Demos
```bash
npm run demo:all
```

### Run Specific Demo Category
```bash
npm run demo:simple    # Basic demos
npm run demo:realistic # Enterprise scenarios
npm run demo:interactive # Interactive demos
```

### Run Individual Demo
```bash
npm run demo:web       # Simple web page
npm run demo:ecommerce # Realistic e-commerce scenario
npm run demo:web-builder # Interactive web app builder
```

## 📖 Usage Examples

### Programmatic Usage

```typescript
import { runSimpleDemos, runRealisticScenarios, runInteractiveDemos } from './tests/demo';

// Run simple demos only
await runSimpleDemos();

// Run realistic scenarios
await runRealisticScenarios();

// Run interactive demos (requires user input)
await runInteractiveDemos();

// Run all demos
await runAllDemoSuites();
```

### Individual Demo Execution

```typescript
import { runSimpleDemo, runRealisticScenario } from './tests/demo';

// Run specific simple demo
const result = await runSimpleDemo('web');

// Run specific realistic scenario
const result = await runRealisticScenario('ecommerce');
```

### Custom Demo Runner

```typescript
import { SimpleDemos, createDefaultIntegration } from './tests/demo';

const integrator = await createDefaultIntegration();
const demos = new SimpleDemos(integrator);

// Run specific demo
await demos.demoBasicWebPage();

// Get results
demos.printResults();
const summary = demos.getSummary();
console.log(`Success rate: ${summary.successful}/${summary.total}`);
```

## 📊 Expected Output

### Simple Demo Output

```
🚀 Starting Simple Demo Suite
============================================================
📄 Demo 1: Creating a Simple Web Page
============================================================

📥 Input Request:
  Command: create a simple HTML web page with CSS styling
  Output Type: web-page
  Features: responsive-design, modern-css, accessibility

📤 Output Generated:
✓ HTML structure created
✓ CSS styling applied
✓ Responsive design implemented
✓ Accessibility features added
✓ File saved to: /workspace/demo-simple/web-page/index.html

📊 Performance Metrics:
  Duration: 1250ms
  Status: success
  Components executed: 5
  Errors: 0
  Warnings: 0
```

### Realistic Scenario Output

```
🏢 Scenario 1: Enterprise E-Commerce Platform
======================================================================

📋 Project Requirements:
  Architecture: microservices
  Microservices: 8
  Frontend Framework: Next.js
  Backend Framework: Node.js + NestJS
  Compliance: PCI-DSS, GDPR, SOC2

🎯 ENTERPRISE E-COMMERCE PLATFORM GENERATED

📦 MICROSERVICES ARCHITECTURE (8 Services)
✓ User Service - Authentication & profile management
✓ Product Service - Catalog & inventory management
✓ Order Service - Shopping cart & order processing
✓ Payment Service - Secure payment processing (PCI-DSS)
[... extensive output ...]

📊 Generated Artifacts:
  1. Monorepo structure with 8 microservices
  2. Next.js frontend application
  3. 8 NestJS backend services
  [... complete list ...]

📈 Project Metrics:
  Duration: 15420ms
  Status: success
  Services Created: 8
  Estimated LOC: 50,000+ lines
  Estimated Dev Time: 6-8 months
```

### Interactive Demo Output

```
🎮 Starting Interactive Demo Suite
======================================================================
🌐 Interactive Demo 1: Guided Web Application Builder
======================================================================
Welcome! I'll guide you through creating a web application.
Let's start with some questions...

What type of web application do you want to build?
1. Business website
2. E-commerce site
3. Blog/CMS
4. Dashboard
5. Portfolio

Enter choice (1-5): 2

Choose your preferred framework:
  1. React
  2. Vue.js
  3. Angular
  4. Svelte
  5. Vanilla JS

Enter choice number: 1

🚀 Generating your web application...

📋 Step: Web Application Generator
Command: create e-commerce site with React and Tailwind CSS

✅ Web Application Generator completed in 2340ms
Status: success

🎨 Would you like to customize anything?
Customize the generated code? (y/n): y
[... interactive session continues ...]
```

## 🔧 Configuration

### Environment Variables

```bash
# Enable interactive demos (requires user input)
DEMO_INTERACTIVE=true

# Set demo timeout (in milliseconds)
DEMO_TIMEOUT=60000

# Enable performance benchmarking
DEMO_BENCHMARK=true

# Output format (console, json, html, csv)
DEMO_OUTPUT_FORMAT=console

# Demo mode (quick, standard, full, custom)
DEMO_MODE=standard
```

### Demo Configuration

```typescript
import { DemoConfig } from './tests/demo';

console.log(DemoConfig.categories);
// {
//   simple: { name: 'Simple Demos', estimatedDuration: 30000 },
//   realistic: { name: 'Realistic Scenarios', estimatedDuration: 120000 },
//   interactive: { name: 'Interactive Demos', estimatedDuration: 300000 }
// }
```

## 📈 Performance Metrics

Each demo captures comprehensive metrics:

### Simple Demos Metrics
- Execution time (duration)
- Success/failure status
- Generated files count
- Components executed
- Errors and warnings count
- Code quality indicators

### Realistic Scenarios Metrics
- All simple metrics plus:
- Architectural complexity
- Security features count
- Compliance standards
- Performance targets
- Estimated development time
- LOC (lines of code) estimates
- Service count

### Interactive Demos Metrics
- All previous metrics plus:
- User interaction count
- Session duration
- Customization requests
- Refinement iterations
- Quality assurance results
- Deployment readiness

## 🎯 Use Cases

### For New Users
Start with **Simple Demos** to understand basic capabilities:
```bash
npm run demo:simple
```

### For Enterprise Evaluation
Run **Realistic Scenarios** to assess enterprise readiness:
```bash
npm run demo:realistic
```

### For Hands-On Learning
Use **Interactive Demos** for guided exploration:
```bash
DEMO_INTERACTIVE=true npm run demo:interactive
```

### For CI/CD Integration
Run quick demo for validation:
```bash
npm run demo:quick
```

### For Performance Analysis
Enable benchmarking:
```bash
DEMO_BENCHMARK=true npm run demo:all
```

## 📝 Customization

### Creating Custom Demos

```typescript
import { SimpleDemos, ComponentIntegrator } from './tests/demo';

class CustomDemos extends SimpleDemos {
  async customWebAppDemo(): Promise<DemoResult> {
    const input: WorkflowInput = {
      command: 'create custom web application',
      parameters: {
        // Your custom parameters
      },
      context: {
        workingDirectory: '/workspace/custom',
        environment: {}
      }
    };

    return await this.executeDemoWorkflow(input, 'Custom Web App');
  }
}
```

### Extending Realistic Scenarios

```typescript
import { RealisticScenarios } from './tests/demo';

class ExtendedScenarios extends RealisticScenarios {
  async customEnterpriseSystem(): Promise<RealisticScenarioResult> {
    // Implement custom enterprise scenario
  }
}
```

## 🐛 Troubleshooting

### Common Issues

**Demo hangs during execution**
```bash
# Check timeout settings
DEMO_TIMEOUT=120000 npm run demo:simple
```

**Interactive demos not responding**
```bash
# Ensure DEMO_INTERACTIVE is set
DEMO_INTERACTIVE=true npm run demo:interactive
```

**Out of memory errors**
```bash
# Increase Node.js memory limit
NODE_OPTIONS="--max-old-space-size=4096" npm run demo:realistic
```

**Missing dependencies**
```bash
# Install required dependencies
npm install
npm run demo:setup
```

### Debug Mode

```bash
# Enable verbose logging
DEBUG=ai-code-agent:* npm run demo:all

# Enable component tracing
DEMO_TRACE_COMPONENTS=true npm run demo:simple
```

## 📊 Sample Results

### Simple Demo Results Summary
```
📊 Simple Demo Results Summary
============================================================
Total Demos: 4
Successful: 4 ✓
Failed: 0 ✗
Total Duration: 5420ms
Average Duration: 1355ms
============================================================

Demo 1: ✓ 1250ms
Demo 2: ✓ 1340ms
Demo 3: ✓ 1450ms
Demo 4: ✓ 1380ms
```

### Realistic Scenario Results Summary
```
📊 Realistic Scenario Results Summary
============================================================
Total Scenarios: 3
Successful: 3 ✓
Failed: 0 ✗
Total Duration: 45230ms
Total Artifacts Generated: 36
Estimated Total LOC: 225,000+ lines
Complexity Breakdown: { enterprise: 3 }
============================================================

Scenario 1: ✓ Enterprise E-Commerce Platform
  Status: ✓ 15420ms
  Complexity: enterprise
  Artifacts: 12
  Metrics: { servicesCreated: 8, estimatedLOC: '50,000+' }

Scenario 2: ✓ FinTech Banking System
  Status: ✓ 18950ms
  Complexity: enterprise
  Artifacts: 13
  Metrics: { securityFeatures: 8, estimatedLOC: '75,000+' }

Scenario 3: ✓ Healthcare Information System
  Status: ✓ 10860ms
  Complexity: enterprise
  Artifacts: 11
  Metrics: { complianceStandards: 4, estimatedLOC: '100,000+' }
```

## 📚 Additional Resources

- [Main Testing Guide](../../TESTING_TOOLS.md)
- [Component Documentation](../../src/components/README.md)
- [Integration Examples](../../tests/integration/example-workflows.ts)
- [Performance Benchmarks](../../tests/integration/performance-benchmarks.md)

## 🤝 Contributing

To add new demos:

1. Create demo file in appropriate category
2. Follow existing patterns and naming conventions
3. Include comprehensive documentation
4. Add to index.ts exports
5. Update this README with new demo details

## 📄 License

See main project license for details.

---

**Happy Demoing!** 🎉

For questions or issues, please refer to the main project documentation or open an issue in the project repository.
