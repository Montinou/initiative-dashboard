<task name="Documentation Sync Implementation">

<task_objective>
Create a complete documentation @sync implementation for all app components and implement it in phases with automatic updates. Input: Next.js/TypeScript/React codebase with components, APIs, hooks, and utilities. Output: Comprehensive /docs/ folder with organized documentation, dependency maps, and automatic synchronization on code changes. Processing: Multi-phase implementation using static analysis tools, documentation generators, and file watchers for automatic updates.
</task_objective>

<detailed_sequence_steps>
# Documentation Sync Implementation - Detailed Sequence of Steps

## 1. Analyze & Inventory

1. **Scan React Components**
   - Use the `grep` command to find all component files in `/components`:
     ```bash
     find components -name "*.tsx" -o -name "*.ts" | head -20
     ```
   - Extract component props, interfaces, and JSDoc comments
   - Identify component relationships and dependencies
   - Document component usage patterns and examples

2. **Analyze API Routes**
   - Scan `/app/api` directory for all endpoint files
   - Extract HTTP methods, parameters, request/response schemas
   - Document authentication requirements and middleware usage
   - Map API relationships and data flows

3. **Document Custom Hooks**
   - Inventory all hooks in `/hooks` directory
   - Extract hook parameters, return values, and side effects
   - Document usage patterns and dependencies
   - Identify hook composition and relationships

4. **Map Utility Functions**
   - Scan `/lib` directory for utility functions
   - Document function signatures, purposes, and examples
   - Extract TypeScript types and interfaces
   - Map utility dependencies and cross-references

5. **Identify Theme and Design System**
   - Document Tailwind configuration and custom classes
   - Extract glassmorphism design system elements
   - Map color schemes, animations, and responsive breakpoints
   - Document component styling patterns

## 2. Setup Documentation Infrastructure

1. **Install Documentation Tools**
   ```bash
   npm install --save-dev typedoc @typedoc/plugin-markdown jsdoc-to-markdown
   npm install --save-dev madge dependency-cruiser
   npm install --save-dev chokidar-cli concurrently
   ```

2. **Create Documentation Directory Structure**
   ```bash
   mkdir -p docs/{components,api,hooks,lib,architecture,guides}
   mkdir -p docs/{diagrams,examples,types}
   ```

3. **Setup Configuration Files**
   - Create `typedoc.json` for TypeScript documentation
   - Setup `madge.config.js` for dependency analysis
   - Configure `.documentationrc.json` for custom settings
   - Create `docs-generator.js` script for automation

4. **Initialize Documentation Templates**
   - Create markdown templates for consistent documentation
   - Setup component documentation template with props tables
   - Create API documentation template with examples
   - Prepare architecture diagram templates

## 3. Generate Core Documentation

1. **Component Documentation Generation**
   - Run TypeDoc on all component files:
     ```bash
     npx typedoc --options typedoc.json components/
     ```
   - Generate component props tables with descriptions
   - Create live component examples with Storybook-style demos
   - Document component variants and usage patterns

2. **API Reference Documentation**
   - Extract API route information and generate OpenAPI specs
   - Create request/response examples for each endpoint
   - Document authentication flows and error responses
   - Generate API client examples and usage guides

3. **Hook Documentation**
   - Document all custom hooks with usage examples
   - Create hook dependency graphs
   - Generate TypeScript interface documentation
   - Provide real-world usage scenarios and best practices

4. **Business Logic Documentation**
   - Document the main dashboard component architecture (dashboard.tsx:1155 lines)
   - Map data flows and state management patterns
   - Document business rules and validation logic
   - Create architecture overview diagrams

## 4. Create Dependency Maps

1. **Generate Import/Export Graphs**
   ```bash
   npx madge --image deps.svg --extensions ts,tsx .
   npx dependency-cruiser --output-type dot | dot -T svg > architecture.svg
   ```

2. **Create Component Relationship Maps**
   - Map parent-child component relationships
   - Document prop drilling and data flow patterns
   - Identify tightly coupled components
   - Create visual component hierarchy diagrams

3. **Generate @sync Relationship Diagrams**
   - Create dependency matrices showing component interdependencies
   - Map hook usage across components
   - Document utility function usage patterns
   - Generate circular dependency warnings and recommendations

4. **External Dependency Documentation**
   - Document all package.json dependencies with purposes
   - Map critical dependencies and their usage
   - Identify potential security vulnerabilities
   - Create upgrade path documentation

## 5. Setup Automation

1. **Configure File Watchers**
   ```bash
   # Add to package.json scripts
   "docs:watch": "chokidar 'components/**/*.tsx' 'app/**/*.ts' 'hooks/**/*.ts' 'lib/**/*.ts' -c 'npm run docs:generate'"
   "docs:generate": "node scripts/docs-generator.js"
   ```

2. **Setup Git Hooks**
   - Install husky for git hook management
   - Create pre-commit hook to update documentation
   - Setup pre-push hook to validate documentation completeness
   - Configure commit message templates for documentation changes

3. **Create NPM Scripts**
   ```json
   {
     "docs:build": "npm run docs:components && npm run docs:api && npm run docs:deps",
     "docs:components": "typedoc --options typedoc.json",
     "docs:api": "node scripts/generate-api-docs.js",
     "docs:deps": "madge --json . > docs/dependencies.json",
     "docs:serve": "http-server docs -p 3001",
     "docs:validate": "node scripts/validate-docs.js"
   }
   ```

4. **Integrate with Build Process**
   - Add documentation generation to CI/CD pipeline
   - Setup documentation deployment to GitHub Pages or Vercel
   - Configure automatic documentation updates on releases
   - Create documentation versioning strategy

## 6. Validation & Testing

1. **Verify Documentation Completeness**
   - Check that all components have documentation
   - Validate that all API endpoints are documented
   - Ensure all hooks have usage examples
   - Verify all utility functions have descriptions

2. **Link Validation**
   - Check for broken internal links in documentation
   - Validate external links and references
   - Ensure code examples are syntactically correct
   - Test documentation build process

3. **Accuracy Validation**
   - Compare documented component props with actual implementations
   - Validate API documentation against actual endpoints
   - Ensure hook documentation matches implementation
   - Test all code examples for correctness

4. **Performance Testing**
   - Measure documentation generation time
   - Test file watcher performance impact
   - Validate that documentation updates don't block development
   - Ensure documentation site loads quickly

## 7. Create Main README and Index

1. **Generate Main Documentation Index**
   ```markdown
   # Application Documentation

   ## Quick Start
   - [Setup Guide](guides/setup.md)
   - [Development Workflow](guides/development.md)
   - [Deployment Guide](guides/deployment.md)

   ## Architecture
   - [System Overview](architecture/overview.md)
   - [Component Architecture](architecture/components.md)
   - [Data Flow](architecture/data-flow.md)
   - [Dependency Graph](diagrams/dependencies.svg)

   ## API Reference
   - [Authentication](api/auth.md)
   - [User Management](api/users.md)
   - [Data Operations](api/data.md)

   ## Components
   - [UI Components](components/ui.md)
   - [Business Components](components/business.md)
   - [Layout Components](components/layout.md)

   ## @sync Dependencies and Relations
   - [Component Dependencies](dependencies/components.md)
   - [Hook Dependencies](dependencies/hooks.md)
   - [Utility Dependencies](dependencies/utilities.md)
   - [External Dependencies](dependencies/external.md)
   ```

2. **Create @sync Relationship Documentation**
   - Document all component interdependencies
   - Map hook usage patterns across components
   - Create utility function usage matrices
   - Generate recommendations for reducing coupling

3. **Setup Documentation Maintenance**
   - Create documentation style guide
   - Setup automated documentation quality checks
   - Configure documentation review process
   - Create documentation update workflows

## Implementation Commands

Execute these commands in sequence:

```bash
# Phase 1: Setup
npm install --save-dev typedoc @typedoc/plugin-markdown madge dependency-cruiser chokidar-cli

# Phase 2: Generate initial documentation
mkdir -p docs/{components,api,hooks,lib,architecture,guides,diagrams,examples,types}
npx typedoc --options typedoc.json
npm run docs:generate

# Phase 3: Setup automation
npm install --save-dev husky
npx husky install
npx husky add .husky/pre-commit "npm run docs:validate"

# Phase 4: Validate and deploy
npm run docs:build
npm run docs:validate
npm run docs:serve
```

## Maintenance Schedule

- **Daily**: Automatic updates via file watchers
- **Weekly**: Validation of documentation accuracy
- **Monthly**: Review and update documentation templates
- **Quarterly**: Full documentation audit and dependency analysis

</detailed_sequence_steps>

</task>