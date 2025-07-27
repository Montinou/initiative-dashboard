<task name="Master Branch Integration">

<task_objective>
Take dashboards, components, and dependencies from master branch, analyze compatibility issues, adapt code to work with main branch architecture, and produce a fully integrated main branch with the improved features from master. The workflow will identify all valuable assets, fix compatibility issues, remove mocks and test data, and prepare a production-ready codebase.
</task_objective>

<detailed_sequence_steps>
# Master Branch Integration Process - Detailed Sequence of Steps

## 1. Analyze and Inventory All Improvements

1. Use the `bash` command to check current branch status:
   ```bash
   git status
   git branch -a
   ```

2. Use the `bash` command to fetch latest changes from all branches:
   ```bash
   git fetch --all
   ```

3. Use the `bash` command to create a comprehensive diff between main and master:
   ```bash
   git diff main..master --name-status > branch-differences.txt
   git diff main..master --stat >> branch-differences.txt
   ```

4. Use the `read_file` command to analyze the branch differences and identify:
   - Dashboard files and components
   - UI components and libraries
   - Configuration changes
   - New features and improvements
   - Dependency updates

5. Create an inventory document using `write_to_file` listing:
   - Primary targets (dashboards)
   - Secondary valuable features
   - Potential conflicts
   - Dependencies to update

## 2. Migrate Dashboards and UI Components

1. Use the `bash` command to create a feature branch for the integration:
   ```bash
   git checkout -b feature/master-integration
   ```

2. For each dashboard identified, use the `bash` command to cherry-pick or checkout specific files:
   ```bash
   git checkout master -- path/to/dashboard
   ```

3. Use the `read_file` command to examine each migrated dashboard file for:
   - Import statements that need updating
   - API endpoints or service calls
   - Component dependencies
   - Mock data to be removed

4. Use the `edit_file` or `multiedit` command to:
   - Update import paths to match main branch structure
   - Adapt component references
   - Remove or replace mock data with production endpoints

5. Use the `bash` command to check for missing dependencies:
   ```bash
   npm list
   ```

## 3. Migrate Other Valuable Features

1. Review the inventory from Step 1 for non-dashboard improvements

2. For each valuable feature identified:
   - Use `bash` to checkout the specific files from master
   - Use `read_file` to understand the feature implementation
   - Use `edit_file` to adapt the code to main branch patterns

3. Document each migrated feature with:
   - Original purpose
   - Changes made for compatibility
   - Integration points with existing code

## 4. Update Dependencies and Resolve Conflicts

1. Use the `read_file` command to compare package.json files:
   ```bash
   git show master:package.json > master-package.json
   diff package.json master-package.json
   ```

2. Use the `edit_file` command to update package.json with:
   - New dependencies from master that are needed
   - Updated versions for shared dependencies
   - Removal of unused dependencies

3. Use the `bash` command to install and audit dependencies:
   ```bash
   npm install
   npm audit
   npm dedupe
   ```

4. Use the `bash` command to check for TypeScript or linting errors:
   ```bash
   npm run typecheck
   npm run lint
   ```

5. Fix any dependency conflicts or type errors using `edit_file`

## 5. Adapt Code to Main Branch Architecture

1. Use the `read_file` command to review main branch architecture patterns:
   - File structure conventions
   - Component patterns
   - State management approach
   - API integration patterns

2. For each migrated file, use `edit_file` or `multiedit` to:
   - Align with main branch coding standards
   - Update to use main branch utilities and helpers
   - Integrate with existing authentication/authorization
   - Connect to production services instead of mocks

3. Use the `bash` command to ensure consistent formatting:
   ```bash
   npm run format
   ```

4. Create or update integration points:
   - Navigation/routing updates
   - Menu items for new features
   - Permission checks if applicable

## 6. Remove Mocks and Production Preparation

1. Use the `grep` command to find all mock data and TODO comments:
   ```bash
   grep -r "mock\|Mock\|TODO\|FIXME" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" .
   ```

2. For each mock or test data found:
   - Use `read_file` to understand the context
   - Use `edit_file` to replace with production implementations
   - Add proper error handling and loading states

3. Use the `edit_file` command to update environment variables:
   - Remove development-only variables
   - Add production API endpoints
   - Update configuration for production builds

4. Use the `bash` command to test production build:
   ```bash
   npm run build
   ```

5. Fix any build errors or warnings

## 7. Test and Validate Integration

1. Use the `bash` command to run existing tests:
   ```bash
   npm test
   ```

2. Use the `bash` command to start development server:
   ```bash
   npm run dev
   ```

3. Create a testing checklist using `write_to_file` that includes:
   - All migrated dashboards functioning correctly
   - New features working as expected
   - No console errors or warnings
   - Performance is acceptable
   - Mobile responsiveness maintained

4. Document any manual testing steps required

5. Use the `bash` command to commit the changes:
   ```bash
   git add .
   git commit -m "feat: integrate master branch improvements - dashboards and features"
   ```

6. Create a pull request description using `write_to_file` that includes:
   - Summary of changes
   - List of migrated features
   - Breaking changes (if any)
   - Testing performed
   - Deployment notes

## Output Generation

1. Generate a migration report using `write_to_file` at `migration-report.md` containing:
   - Executive summary
   - List of all migrated components
   - Compatibility changes made
   - Removed mocks and test data
   - Production readiness checklist
   - Known issues or future improvements

2. Use the `bash` command to show final status:
   ```bash
   git status
   git log --oneline -10
   echo "Migration complete. See migration-report.md for details."
   ```

</detailed_sequence_steps>

</task>