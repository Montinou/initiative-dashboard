# Documentation System Setup Guide

## Overview
This guide explains how to set up and use the automatic documentation system for the Stratix application.

## Quick Start

### 1. View Documentation
```bash
# Serve documentation locally
npm run docs:serve

# Open in browser
npm run docs:open
# or visit http://localhost:3001
```

### 2. Validate Documentation
```bash
# Check documentation completeness
npm run docs:validate

# Generate dependency analysis
npm run docs:analyze

# Run full documentation build
npm run docs:build
```

### 3. Auto-Update Documentation
```bash
# Start file watcher (runs continuously)
npm run docs:watch
```

## Documentation Structure

```
docs/
├── README.md                    # Main documentation index
├── components/                  # Component documentation
│   ├── okr-dashboard.md        # Business components
│   ├── profile-dropdown.md     
│   └── ui/                     # UI library components
│       ├── button.md
│       ├── card.md
│       └── ...
├── hooks/                      # Custom hooks documentation
│   ├── useOKRData.md
│   ├── useUserProfile.md
│   └── ...
├── api/                        # API endpoint documentation
│   ├── profile.md
│   ├── upload.md
│   └── ...
├── lib/                        # Utility library documentation
├── architecture/               # System architecture docs
│   └── overview.md
├── guides/                     # How-to guides
│   ├── setup.md               # This file
│   └── development.md
├── dependency-analysis.json    # Auto-generated dependency data
└── validation-report.json     # Documentation quality report
```

## Automation Features

### File Watcher
The documentation system includes a file watcher that automatically updates documentation when source files change.

**What it watches:**
- `components/**/*.{ts,tsx}`
- `hooks/**/*.{ts,tsx}`
- `lib/**/*.{ts,tsx}`
- `app/api/**/*.ts`

**What it does:**
- Detects file changes with 2-second debounce
- Updates corresponding documentation files
- Regenerates dependency analysis
- Updates timestamps in existing docs
- Creates new documentation templates for new files

**Usage:**
```bash
# Start watching (runs until stopped)
npm run docs:watch

# Stop with Ctrl+C
```

### Git Hooks
Pre-commit hooks ensure documentation stays synchronized with code changes.

**Pre-commit hook does:**
1. Validates all documentation
2. Updates dependency analysis
3. Stages updated documentation files
4. Prevents commits if documentation validation fails

**Setup is automatic** when you run `npm install` (via husky).

### Validation System
Comprehensive validation ensures documentation quality and completeness.

**Validation checks:**
- ✅ All components have documentation
- ✅ All hooks have documentation  
- ✅ All API endpoints have documentation
- ✅ Required sections exist (Purpose, Usage, etc.)
- ✅ No placeholder content remains
- ✅ No broken internal links
- ✅ Source files exist for all documentation

**Run validation:**
```bash
npm run docs:validate
```

## Documentation Standards

### File Naming
- Use kebab-case: `my-component.md`
- Match source file names: `useMyHook.ts` → `useMyHook.md`
- Place in appropriate subdirectory

### Required Sections
All documentation files must include:

#### Components
```markdown
# Component Name

## Purpose
Brief description of what the component does.

## Usage
TypeScript code examples showing how to use it.

## Props
Table of all props with types and descriptions.

## Dependencies
What it depends on and what depends on it.

## Examples
Real-world usage scenarios.
```

#### Hooks
```markdown
# Hook Name

## Purpose
Brief description of what the hook does.

## Usage
TypeScript code examples.

## Parameters
Input parameters with types.

## Returns
Return values with types.

## Dependencies
Dependencies and relationships.

## Examples
Usage patterns and scenarios.
```

#### API Endpoints
```markdown
# API Name

## Endpoint
URL and HTTP methods.

## Authentication
Authentication requirements.

## Request/Response
Schemas and examples.

## Examples
cURL and JavaScript examples.

## Dependencies
Integration points and relationships.
```

### @sync Dependencies
Every documentation file should include a "@sync Dependencies" section that maps:
- **Depends On**: What this component/hook/API depends on
- **Used By**: What uses this component/hook/API
- **Related**: Connected functionality

## Creating New Documentation

### Manual Creation
1. Create `.md` file in appropriate `docs/` subdirectory
2. Follow the template structure
3. Include all required sections
4. Run `npm run docs:validate` to check

### Automatic Generation
1. Create new source file (component, hook, API)
2. File watcher will detect it and create template
3. Fill in the generated template
4. Remove placeholder content
5. Validate with `npm run docs:validate`

### Documentation Templates

#### Component Template
```markdown
# ComponentName Component

## Purpose
[Describe what this component does and why it exists]

## Usage
\`\`\`typescript
import { ComponentName } from '@/components/ComponentName';

function Example() {
  return <ComponentName prop="value" />;
}
\`\`\`

## Props
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `prop` | `string` | Yes | Description of prop |

## Dependencies
### @sync Dependencies
- **Depends on**: List dependencies
- **Used by**: List components that use this
- **Related**: Related functionality

## Examples
[Real-world usage examples]

---
*File: \`/path/to/source.tsx\`*
*Last updated: [timestamp]*
```

## Tools and Scripts

### Available Scripts
```bash
# Documentation management
npm run docs:serve     # Serve docs on http://localhost:3001
npm run docs:open      # Open docs in browser
npm run docs:watch     # Start file watcher
npm run docs:validate  # Validate documentation
npm run docs:analyze   # Generate dependency analysis
npm run docs:build     # Full documentation build

# Development workflow
npm run dev           # Start development server
npm run lint          # Run linting
npm run build         # Build application
```

### Dependency Analysis
The system automatically generates dependency graphs and analysis:

```bash
# Manual dependency analysis
npm run docs:analyze

# Output: docs/dependency-analysis.json
{
  "summary": {
    "totalFiles": 104,
    "components": 45,
    "hooks": 8,
    "apis": 12
  },
  "componentDependencies": { /* ... */ },
  "hookUsage": { /* ... */ },
  "apiEndpoints": { /* ... */ }
}
```

### Validation Reports
Validation generates detailed reports:

```bash
# Run validation
npm run docs:validate

# Output: docs/validation-report.json
{
  "stats": {
    "totalFiles": 65,
    "documentedFiles": 58,
    "coverage": 89.2
  },
  "issues": [ /* validation issues */ ]
}
```

## Troubleshooting

### Common Issues

**File watcher not starting:**
```bash
# Check if chokidar is installed
npm list chokidar-cli

# Reinstall if missing
npm install --save-dev chokidar-cli
```

**Validation failing:**
```bash
# Run validation to see specific issues
npm run docs:validate

# Check the generated TODO list
cat docs/documentation-todo.md
```

**Git hooks not working:**
```bash
# Reinstall husky
npm run prepare

# Check hook permissions
ls -la .husky/pre-commit
chmod +x .husky/pre-commit
```

**Documentation server not starting:**
```bash
# Alternative: use Node.js server
npx http-server docs -p 3001

# Or use VS Code Live Server extension
```

### Performance Issues

**Large file watching:**
- Exclude unnecessary directories in `.gitignore`
- Use `docs:validate` instead of continuous watching for CI

**Slow dependency analysis:**
- Analysis runs automatically but can be disabled
- Use `--skip-analysis` flag for faster validation

### Integration Issues

**TypeScript errors:**
- Ensure all imports use correct paths
- Check `tsconfig.json` path mapping
- Validate component exports

**Missing documentation:**
- Check `docs/documentation-todo.md` for missing files
- Use file watcher to auto-generate templates
- Follow naming conventions

## Best Practices

### 1. Keep Documentation Current
- Enable file watcher during development
- Review auto-generated templates promptly
- Update documentation when changing APIs

### 2. Write for Your Audience
- Include practical examples
- Explain the "why" not just the "what"
- Link to related documentation

### 3. Maintain Quality
- Run validation before commits
- Remove placeholder content
- Fix broken links promptly

### 4. Use @sync Dependencies
- Map all component relationships
- Document data flow patterns
- Identify circular dependencies

### 5. Automate Everything
- Use git hooks for consistency
- Enable continuous validation
- Generate reports regularly

## Contributing

### Adding New Features
1. Update relevant source files
2. Let file watcher generate templates
3. Complete documentation templates
4. Run validation to ensure quality
5. Submit PR with both code and docs

### Improving Documentation
1. Identify gaps using validation reports
2. Add missing sections or examples
3. Fix broken links and references
4. Update @sync dependency mappings
5. Validate changes before committing

### Extending the System
1. Modify scripts in `/scripts/` directory
2. Update validation rules as needed
3. Add new documentation categories
4. Enhance dependency analysis
5. Update this setup guide

---

*This setup guide is part of the automatic documentation system.*
*For questions or issues, check the troubleshooting section above.*
*Last updated: Auto-generated from system analysis*