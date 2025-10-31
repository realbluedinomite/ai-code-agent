# TypeScript Configuration Guide

This AI Code Agent project uses a comprehensive TypeScript setup with multiple configuration files for different use cases.

## Configuration Files

### 1. `tsconfig.json` (Main Configuration)
- **Purpose**: Primary TypeScript configuration for the main application
- **Target**: ES2022 with NodeNext module resolution
- **Features**:
  - Strict type checking enabled
  - Path mapping for modular imports (`@/components/*`, `@/types/*`, etc.)
  - Declaration files generation
  - Source maps enabled
  - Experimental decorators support

### 2. `tsconfig.test.json` (Test Configuration)
- **Purpose**: Specialized configuration for test files
- **Extends**: Inherits from main `tsconfig.json`
- **Features**:
  - Separate output directory (`dist-test`)
  - Relaxed rules for test files (allows unused locals/parameters)
  - Includes test patterns (`*.test.ts`, `*.spec.ts`)

### 3. `tsconfig.node.json` (Node.js Tools Configuration)
- **Purpose**: Configuration for build tools and development scripts
- **Features**:
  - Node.js focused settings
  - No declaration file generation
  - Relaxed type checking for tools

## Path Mapping

The configurations provide convenient path aliases:

```typescript
// Import using path aliases
import { Component } from '@/components/Component';
import { User } from '@/types/User';
import { config } from '@/config/app';
import { utils } from '@/utils/helpers';
```

## Recommended Scripts

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "build": "tsc",
    "build:test": "tsc -p tsconfig.test.json",
    "build:watch": "tsc -w",
    "clean": "rimraf dist dist-test dist-tools",
    "type-check": "tsc --noEmit",
    "type-check:test": "tsc -p tsconfig.test.json --noEmit",
    "test": "jest",
    "test:watch": "jest --watch",
    "dev": "npm run build:watch & nodemon dist/index.js"
  }
}
```

## Usage Examples

### Building the Application
```bash
# Build main application
npm run build

# Build with watch mode
npm run build:watch

# Type check without emitting files
npm run type-check
```

### Testing
```bash
# Build test files
npm run build:test

# Run tests
npm test

# Watch mode for tests
npm run test:watch
```

### Development
```bash
# Clean build artifacts
npm run clean

# Check types in test files
npm run type-check:test
```

## IDE Integration

### VS Code
The configurations work seamlessly with VS Code. Ensure you have the TypeScript extension installed and the workspace TypeScript version is being used.

### WebStorm/IntelliJ
The IDE should automatically detect and use the TypeScript configurations.

## Key Features Explained

### Strict Type Checking
- `strict`: Enables all strict type-checking options
- `noUnusedLocals`/`noUnusedParameters`: Ensures clean code
- `exactOptionalPropertyTypes`: Prevents common assignment mistakes
- `noUncheckedIndexedAccess`: Catches potential undefined access

### ES2022 Features
- Modern JavaScript features supported
- Native ES modules with NodeNext resolution
- Top-level await support
- Private class methods

### Path Mapping Benefits
- Cleaner import statements
- Better IDE autocomplete
- Easier code refactoring
- Relative path elimination

## Troubleshooting

### Module Resolution Issues
- Ensure Node.js version is 16+ for NodeNext resolution
- Check that `package.json` has `"type": "module"` for ES modules

### Path Alias Not Working
- Verify `baseUrl` and `paths` configuration
- Restart TypeScript server in VS Code
- Check that resolved paths exist

### Build Performance
- Use `incremental` for faster subsequent builds
- `skipLibCheck` skips type checking of declaration files
- Separate configs for different build targets reduce compilation time