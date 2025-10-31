# Linting and Formatting Setup

This project includes comprehensive linting and formatting configurations optimized for TypeScript/Node.js development with component-based architecture.

## Files Created

- `.eslintrc.json` - ESLint configuration with TypeScript, Node.js, and modern JavaScript rules
- `.prettierrc` - Code formatting configuration
- `.eslintignore` - Files/directories to exclude from ESLint
- `.prettierignore` - Files/directories to exclude from Prettier
- `package-scripts.json` - Recommended dependencies and scripts

## Features

### ESLint Configuration

**Language Support:**
- TypeScript (with type checking)
- ES2022 JavaScript
- Node.js environment
- Browser environment

**Code Quality Rules:**
- Type safety enforcement
- Import/export organization
- Promise handling best practices
- Modern JavaScript patterns (unicorn rules)
- Complexity limits (15 general, 20 plugins, 25 orchestrator)
- Magic number detection
- No console logs (configurable per file type)

**Architecture-Specific Rules:**
- Path alias support (`@/*` imports)
- Component organization patterns
- Plugin system compliance
- Event-driven architecture patterns
- Database migration handling

**Overridden Rules for:**
- Test files (relaxed type checking)
- Migration files (no console restrictions)
- Plugin files (higher complexity tolerance)
- Orchestrator files (highest complexity tolerance)

### Prettier Configuration

**Formatting Rules:**
- Semicolons enabled
- Trailing commas (ES5 compatible)
- Single quotes
- Arrow function parentheses
- 100 character line width
- LF line endings
- 2-space indentation

## Installation

1. Install dependencies:
```bash
npm install --save-dev \
  @typescript-eslint/eslint-plugin \
  @typescript-eslint/parser \
  eslint \
  eslint-config-prettier \
  eslint-plugin-import \
  eslint-plugin-jsx-a11y \
  eslint-plugin-promise \
  eslint-plugin-unicorn \
  prettier \
  husky \
  lint-staged
```

2. Add scripts to package.json (see package-scripts.json)

3. Setup pre-commit hooks (optional):
```bash
npx husky install
```

## Usage

### Run Linting
```bash
# Check for linting errors
npm run lint

# Fix auto-fixable linting errors
npm run lint:fix
```

### Code Formatting
```bash
# Format all code
npm run format

# Check formatting without changing files
npm run format:check
```

### Validation
```bash
# Run type checking, linting, and formatting checks
npm run validate
```

## IDE Integration

### VS Code
Install these extensions:
- ESLint
- Prettier - Code formatter
- TypeScript Importer

Recommended VS Code settings:
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "eslint.validate": ["typescript", "typescriptreact"],
  "prettier.singleQuote": true,
  "prettier.semi": true
}
```

## Key Rules Highlights

### TypeScript Safety
- No implicit any types (warning level)
- Strict null checks
- No unsafe assignments/member access
- Prefer nullish coalescing over logical OR
- Require await for async functions

### Import Organization
- Type imports preferred over value imports
- Sorted by type: builtin → external → internal → parent → sibling → index
- No duplicate imports
- No circular dependencies

### Code Quality
- Complexity limits prevent overly complex functions
- Magic numbers detected (configurable ignore list)
- Prefer const for variables that don't change
- No await in loops (prevents performance issues)

### Modern JavaScript
- Prefer array methods (map, filter, reduce)
- Use optional chaining (?.)
- Use nullish coalescing (??)
- Prefer string methods over regex when possible

## Customization

### Adjusting Complexity
Edit `.eslintrc.json`:
```json
"rules": {
  "complexity": ["warn", <NEW_LIMIT>]
}
```

### Ignoring Specific Rules
Add to `.eslintrc.json` rules section:
```json
"@typescript-eslint/no-explicit-any": "off"
```

### File-Specific Overrides
See existing overrides in `.eslintrc.json` for test files, migrations, etc.

### Prettier Options
Edit `.prettierrc` to adjust:
- Print width
- Quote style
- Indentation
- Line endings

## Architecture Pattern Support

The configuration is optimized for:

- **Component-Based Architecture**: Import ordering, type safety
- **Plugin System**: Custom complexity limits, plugin-specific rules
- **Event-Driven Patterns**: Promise handling, async/await best practices
- **Database Layer**: Migration file handling, SQL file exclusions
- **Provider Pattern**: Type safety, dependency organization

## Troubleshooting

### Common Issues

**"ESLint couldn't find the config"**
- Ensure all peer dependencies are installed
- Check that `.eslintrc.json` is in the project root

**"TypeScript type checking fails"**
- Ensure `tsconfig.json` is properly configured
- Check that `parserOptions.project` points to the correct TypeScript config

**"Import resolution fails"**
- Ensure path aliases in `tsconfig.json` match import statements
- Install `@typescript-eslint/parser` with type information

**"Prettier and ESLint conflict"**
- Ensure `eslint-config-prettier` is last in extends array
- Disable conflicting rules in `.eslintrc.json`

### Getting Help
- ESLint: https://eslint.org/docs/
- Prettier: https://prettier.io/docs/
- TypeScript ESLint: https://typescript-eslint.io/docs/