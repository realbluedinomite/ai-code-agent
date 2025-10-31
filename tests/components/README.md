# Component Test Suite

Comprehensive component testing scripts for all core components of the AI Code Agent system.

## Overview

This test suite provides comprehensive testing coverage for each core component with performance benchmarks, error handling validation, and real-world scenario testing.

## Test Files

### 1. `test-input-parser.ts`
**Component**: Input Parser  
**Purpose**: Tests the AI-powered input parsing functionality

**Key Test Areas**:
- Component initialization and configuration
- Input parsing with various intent types (ADD_FEATURE, FIX_BUG, REFACTOR, etc.)
- Entity extraction (files, features, constraints, dependencies)
- Error handling and validation
- Performance benchmarks for different input types
- Concurrency testing
- Memory management
- Event system integration

**Performance Targets**:
- Simple inputs: < 1 second
- Complex inputs: < 2 seconds
- Memory usage: < 10MB for simple operations
- Concurrent requests: 5 requests in < 5 seconds

### 2. `test-project-analyzer.ts`
**Component**: Project Analyzer  
**Purpose**: Tests project structure analysis and dependency detection

**Key Test Areas**:
- Project structure analysis
- File analysis for different languages (TypeScript, JavaScript, Python, Java)
- Dependency analysis and unused dependency detection
- Code pattern detection
- Architecture analysis
- Caching system
- Project type detection (React, Node.js, Python, etc.)
- Performance with projects of various sizes

**Performance Targets**:
- Small projects: < 2 seconds
- Medium projects: < 10 seconds
- Large projects: < 30 seconds
- Memory usage: < 50MB for medium projects

### 3. `test-planner.ts`
**Component**: Planner  
**Purpose**: Tests task planning and complexity estimation

**Key Test Areas**:
- Task breakdown from requirements
- Dependency management and validation
- Complexity estimation
- Ambiguity detection
- Question generation for clarification
- Plan optimization and task ordering
- Circular dependency detection
- Parallel task execution planning

**Performance Targets**:
- Simple plans: < 1 second
- Complex plans: < 5 seconds
- Concurrent planning: 3 requests in < 8 seconds
- Memory usage: < 20MB

### 4. `test-implementer.ts`
**Component**: Implementer  
**Purpose**: Tests code generation and file writing functionality

**Key Test Areas**:
- Code generation for different frameworks (React, Node.js, Python)
- File creation, modification, and deletion
- Rollback management
- Code quality validation
- Security vulnerability detection
- Template-based generation
- Test generation
- Dry run mode
- Error handling for file system issues

**Performance Targets**:
- Simple implementations: < 2 seconds
- Complex implementations: < 15 seconds
- Large file handling: < 30 seconds
- Memory usage: < 50MB for complex operations

### 5. `test-reviewer.ts`
**Component**: Reviewer  
**Purpose**: Tests code review and quality assessment

**Key Test Areas**:
- AI-powered code review
- Static analysis integration
- Security vulnerability detection
- Code quality assessment
- Performance issue detection
- Maintainability analysis
- User approval workflow
- Issue deduplication and prioritization
- Review metrics and scoring

**Performance Targets**:
- Simple reviews: < 5 seconds
- Complex reviews: < 20 seconds
- Concurrent reviews: 3 reviews in < 30 seconds
- Memory usage: < 25MB

### 6. `test-orchestrator.ts`
**Component**: Orchestrator  
**Purpose**: Tests workflow coordination and component management

**Key Test Areas**:
- Workflow execution and management
- Component lifecycle management
- Session management
- Error handling and recovery
- Resource monitoring
- Event system integration
- Workflow templates and branching
- Configuration management
- Graceful shutdown

**Performance Targets**:
- Simple workflows: < 5 seconds
- Complex workflows: < 5 minutes
- Concurrent workflows: 3 workflows in < 15 seconds
- Memory usage: < 50MB

## Running the Tests

### Prerequisites
```bash
# Install dependencies
npm install

# Ensure Jest is properly configured
npm run test:setup
```

### Run All Component Tests
```bash
npm test tests/components/
```

### Run Individual Component Tests
```bash
# Input Parser tests
npm test tests/components/test-input-parser.ts

# Project Analyzer tests
npm test tests/components/test-project-analyzer.ts

# Planner tests
npm test tests/components/test-planner.ts

# Implementer tests
npm test tests/components/test-implementer.ts

# Reviewer tests
npm test tests/components/test-reviewer.ts

# Orchestrator tests
npm test tests/components/test-orchestrator.ts
```

### Run with Coverage
```bash
# All components with coverage
npm run test:coverage tests/components/

# Individual component with coverage
npm run test:coverage tests/components/test-input-parser.ts
```

### Run Performance Benchmarks
```bash
# Run only performance benchmarks
npm run test:benchmarks tests/components/
```

### Run Tests with Specific Configurations
```bash
# Debug mode
npm test tests/components/ -- --verbose --detectOpenHandles

# Watch mode for development
npm test tests/components/ -- --watch

# Run specific test pattern
npm test tests/components/ -- --testNamePattern="should parse simple inputs"
```

## Test Configuration

### Jest Configuration
The tests use Jest with the following key settings:
- Test environment: Node.js
- Coverage threshold: 80% for all metrics
- Test timeout: 10-30 seconds (varies by component)
- Parallel execution: Enabled (50% of available cores)

### Mock Strategies
- **AI Services**: Mocked with predefined responses
- **File System**: Mocked with virtual file systems
- **Database**: Mocked with in-memory implementations
- **External APIs**: Mocked with simulated responses

### Performance Measurement
Each test file includes `PerformanceBenchmark` class that measures:
- Execution time (milliseconds)
- Memory usage (bytes)
- CPU utilization (where applicable)

## Test Data and Fixtures

### Mock Data Location
- General fixtures: `tests/fixtures/mock-data.ts`
- Component-specific: Embedded in each test file

### Common Mock Data
- Configuration objects
- API responses
- File structures
- Workflow definitions
- Event data
- Error scenarios

## Test Categories

### 1. Unit Tests
- Component initialization
- Configuration validation
- Basic functionality
- Error handling

### 2. Integration Tests
- Component interactions
- Data flow between components
- Event system integration
- Database operations

### 3. Performance Tests
- Response time benchmarks
- Memory usage tracking
- Concurrent operation handling
- Resource consumption

### 4. Stress Tests
- High-load scenarios
- Edge case handling
- Failure recovery
- Resource limits

### 5. Security Tests
- Input validation
- Vulnerability detection
- Access control
- Data sanitization

## Coverage Goals

### Code Coverage Targets
- **Statements**: 85%+
- **Branches**: 80%+
- **Functions**: 85%+
- **Lines**: 85%+

### Functional Coverage
- All public methods tested
- All event types covered
- All error scenarios tested
- All configuration options validated

## Performance Benchmarks

### Response Time Benchmarks
| Component | Simple | Medium | Complex |
|-----------|--------|--------|---------|
| Input Parser | < 1s | < 2s | < 5s |
| Project Analyzer | < 2s | < 10s | < 30s |
| Planner | < 1s | < 5s | < 10s |
| Implementer | < 2s | < 15s | < 30s |
| Reviewer | < 5s | < 20s | < 45s |
| Orchestrator | < 5s | < 5min | < 15min |

### Memory Usage Benchmarks
| Component | Initial | Per Operation | Peak |
|-----------|---------|---------------|------|
| Input Parser | 5MB | +2MB | 20MB |
| Project Analyzer | 10MB | +5MB | 100MB |
| Planner | 5MB | +3MB | 50MB |
| Implementer | 8MB | +5MB | 100MB |
| Reviewer | 10MB | +4MB | 75MB |
| Orchestrator | 15MB | +10MB | 200MB |

## Continuous Integration

### Pre-commit Hooks
```bash
# Run all component tests before commit
npm run pre-commit
```

### CI Pipeline
1. **Lint**: Code style validation
2. **Unit Tests**: Component-level tests
3. **Integration Tests**: Cross-component tests
4. **Performance Tests**: Benchmark validation
5. **Coverage Report**: Generate coverage artifacts

### Quality Gates
- All tests must pass
- Coverage must meet targets
- Performance benchmarks must pass
- No high-severity security issues

## Troubleshooting

### Common Issues

#### Test Timeouts
- Increase timeout for slow operations
- Check for hanging promises
- Verify mock implementations

#### Memory Leaks
- Use `--detectOpenHandles` flag
- Check for uncleaned timers
- Verify event listener cleanup

#### Flaky Tests
- Increase wait times for async operations
- Check for race conditions
- Verify test isolation

### Debug Mode
```bash
# Run with debugging
npm test tests/components/ -- --verbose --no-coverage

# Debug specific test
npm test tests/components/ -- --testNamePattern="specific test name" --verbose
```

## Contributing

### Adding New Tests
1. Follow the existing test structure
2. Include performance benchmarks
3. Add appropriate mocks
4. Update this README
5. Ensure coverage goals are met

### Test Naming Conventions
- Test suites: `describe('ComponentName', ...)`
- Test cases: `test('should [action] [expected result]', ...)`
- Performance tests: `test('[operation] performance', ...)`

### Mock Guidelines
- Keep mocks simple and focused
- Reset mocks between tests
- Use meaningful mock data
- Document mock behavior

## Maintenance

### Regular Updates
- Update mock data as components evolve
- Review and update performance benchmarks
- Add tests for new features
- Remove obsolete tests

### Test Health Monitoring
- Track test execution times
- Monitor coverage trends
- Review flaky test reports
- Update performance targets

## References

- [Jest Documentation](https://jestjs.io/docs)
- [Testing Best Practices](../docs/testing-best-practices.md)
- [Performance Testing Guide](../docs/performance-testing.md)
- [Component Architecture](../docs/architecture/component-design.md)