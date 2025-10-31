# Testing Dashboard - Quick Reference Guide

## 🚀 Quick Start Commands

```bash
# Interactive Dashboard (Recommended for daily use)
npm run test:dashboard

# Fast validation
npm run test:quick:smoke

# Full test suite
npm run test:auto all
```

---

## 📊 Available Tools

### 1. Test Dashboard (Interactive)
```bash
npm run test:dashboard           # Launch interactive dashboard
npm run test:dashboard:dev       # With auto-reload
```

**Features:**
- 11 interactive testing options
- Real-time progress tracking
- Visual test results
- Coverage reports
- Test history

---

### 2. Quick Test (Fast)
```bash
npm run test:quick               # All critical tests (~30 seconds)
npm run test:quick:smoke         # Smoke test (~10 seconds)
npm run test:quick:list          # List available tests
npm run test:quick:all           # All critical tests
npm run test:quick:all-optional  # Including optional tests
npm run test:quick test "name"   # Run specific test
```

**Available Tests:**
- Core Components ⭐ (critical)
- Input Parser ⭐ (critical)
- Planner ⭐ (critical)
- Implementer ⭐ (critical)
- Reviewer ⭐ (critical)
- Database Models ⭐ (critical)
- AI Providers ⭐ (critical)
- Orchestrator ⭐ (critical)
- Project Analyzer (optional)
- Integration Tests (optional)

---

### 3. Automated Test Runner (Comprehensive)
```bash
npm run test:auto all            # Full test suite with reports
npm run test:auto unit           # Unit tests only
npm run test:auto integration    # Integration tests
npm run test:auto e2e            # End-to-end tests
npm run test:auto:ci             # CI/CD mode with retry
npm run test:auto:coverage       # Coverage report
npm run test:auto:benchmark      # Performance tests
npm run test:auto:continuous     # Continuous (every 5 min)
npm run test:auto:continuous 600 # Custom interval (10 min)
npm run test:history             # View test history
npm run test:reports             # List all reports
```

---

### 4. Legacy Runner (Basic)
```bash
npm run test:runner all          # Basic test execution
npm run test:runner unit         # Unit tests
npm run test:runner coverage     # With coverage
npm run test:runner watch        # Watch mode
```

---

## 📁 Generated Reports

### Automatic Reports
- **Location:** `test-reports/`
- **Formats:** JSON, HTML, XML
- **History:** `test-history.json`
- **Coverage:** `coverage/`

### Viewing Reports
```bash
# List all reports
npm run test:reports

# View test history
npm run test:history

# Open HTML report (manual)
open test-reports/test-*.html
```

---

## 🎯 Common Workflows

### During Development
```bash
# Quick feedback
npm run test:quick:smoke

# Test specific component
npm run test:quick test "Input Parser"

# Full component testing
npm run test:dashboard
# → Select option 2 (Unit Tests) or 3 (Integration Tests)
```

### Before Commit
```bash
# Complete validation
npm run test:auto all

# With coverage
npm run test:auto:coverage
```

### Debugging Issues
```bash
# Debug specific test
npm run test:dashboard
# → Select option 8 → Enter test file path

# Or use legacy runner
npm run test:runner debug tests/unit/specific.test.ts
```

### CI/CD Pipeline
```bash
# For CI systems
npm run test:auto:ci

# Generate artifacts
npm run test:auto:coverage
```

### Performance Monitoring
```bash
# Run benchmarks
npm run test:auto:benchmark

# Continuous monitoring
npm run test:auto:continuous 300  # Every 5 minutes
```

---

## ⚡ Performance Tips

### Fastest (Smoke Test)
```bash
npm run test:quick:smoke
# Tests: 3 critical components
# Duration: ~10 seconds
```

### Fast (Quick Test)
```bash
npm run test:quick
# Tests: 10 component areas
# Duration: ~30 seconds
```

### Comprehensive (Full Suite)
```bash
npm run test:auto all
# Tests: All test files
# Duration: ~2-5 minutes
```

---

## 📖 Test Types & Locations

```
tests/
├── unit/           # Unit tests (fast)
├── integration/    # Integration tests (medium)
├── e2e/           # End-to-end tests (slow)
├── fixtures/      # Test data
└── helpers/       # Utilities
```

### Unit Tests
```bash
npm run test:auto unit          # Automated
npm run test:dashboard          # Interactive → Option 2
```

### Integration Tests
```bash
npm run test:auto integration   # Automated
npm run test:dashboard          # Interactive → Option 3
```

### End-to-End Tests
```bash
npm run test:auto e2e           # Automated
npm run test:dashboard          # Interactive → Option 4
```

---

## 🔧 Configuration

### Jest Config
- Location: `jest.config.ts`
- Already configured for project
- TypeScript support enabled
- Coverage reporting enabled

### Environment
```bash
# Setup test environment
npm run test:setup

# Setup database
npm run test:db:setup
npm run test:db:cleanup
```

---

## 🆘 Troubleshooting

### Tests Timeout
```bash
# Increase timeout via dashboard
npm run test:dashboard
# → Option 10 → Custom pattern with longer timeout
```

### Database Issues
```bash
# Reset database
npm run test:db:setup
```

### Coverage Missing
```bash
# Generate coverage
npm run test:auto:coverage
# Check: coverage/lcov-report/index.html
```

### Memory Issues
```bash
# Run serially
npm run test:auto unit -- --runInBand
```

---

## 📊 Understanding Output

### Dashboard Output
```
✓ Test Name (123ms)        # Passed test
✗ Test Name (456ms)        # Failed test
○ Test Name                # Skipped test
⊝ Test Name                # Pending test
```

### Progress Bar
```
Tests: [████████████░░░░░░░░░░░░░░░░░] 15/25 (60%)
```

### Coverage Display
```
Lines:     ████████████████████████░░░░░ 85.2%
Functions: ███████████████████████░░░░░░ 82.1%
Statements: ████████████████████████░░░░░ 86.7%
Branches:  ████████████████████░░░░░░░░░ 78.9%
```

---

## 💡 Pro Tips

1. **Use Dashboard for Exploration**
   - Interactive and informative
   - Great for learning the test structure

2. **Use Quick Test for Speed**
   - Fast feedback during development
   - Critical path validation

3. **Use Automated Runner for CI/CD**
   - Comprehensive reporting
   - Machine-readable outputs

4. **Check History Regularly**
   ```bash
   npm run test:history
   ```
   - Track performance trends
   - Identify flaky tests

5. **Monitor Coverage**
   ```bash
   npm run test:auto:coverage
   open coverage/lcov-report/index.html
   ```

---

## 📚 Additional Resources

- Full Documentation: `TESTING_TOOLS.md`
- Implementation Details: `TESTING_DASHBOARD_IMPLEMENTATION_SUMMARY.md`
- Legacy Runner Help: `npm run test:runner help`
- Quick Test Help: `npm run test:quick help`
- Automated Runner Help: `npm run test:auto help`

---

## 🎉 Getting Started

```bash
# 1. Verify installation
node scripts/verify-testing-tools.js

# 2. Try the dashboard
npm run test:dashboard

# 3. Run a quick test
npm run test:quick:smoke

# 4. Generate a full report
npm run test:auto all
```

**That's it! You're ready to use the testing dashboard and CLI interface.** 🚀
