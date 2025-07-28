<task name="Initiative Dashboard Building">

<task_objective>
Create a comprehensive initiative tracking dashboard with modal functionality for creating and editing initiatives with subtasks, using Supabase for session management and data persistence. Input includes existing React/Next.js components, Supabase SSR pattern, glassmorphism design system, and current dashboard structure. Output will be React component files (.tsx), Supabase table schemas/migrations, and markdown documentation with implemented features and TODO items.
</task_objective>

<detailed_sequence_steps>
# Initiative Dashboard Building Process - Detailed Sequence of Steps

## 1. Set up Supabase Database Schema

1. Use the `write_to_file` command to create database migration file `supabase/migrations/create_initiative_tables.sql`:
   - Create `company_areas` table with id, name, description, created_at, updated_at
   - Create `initiatives` table with id, title, description, progress, area_id, created_at, updated_at
   - Create `subtasks` table with id, title, description, completed, initiative_id, created_at, updated_at
   - Set up foreign key relationships between tables
   - Add indexes for performance optimization

2. Use the `write_to_file` command to create RLS policies file `supabase/migrations/setup_rls_policies.sql`:
   - Enable RLS on all tables
   - Create policies for authenticated users
   - Set up proper permissions for CRUD operations

3. Use the `bash` command to run migrations:
   ```bash
   supabase migration up
   ```

4. Use the `write_to_file` command to create TypeScript types file `types/database.ts`:
   - Define interfaces for CompanyArea, Initiative, Subtask
   - Export database types for type safety

## 2. Create the Main Dashboard Component

1. Use the `read_file` command to examine existing dashboard structure in `dashboard.tsx`

2. Use the `write_to_file` command to create `components/InitiativeDashboard.tsx`:
   - Build dashboard layout with glassmorphism styling following project conventions
   - Implement overall progress charts using Recharts
   - Add initiative completion percentage displays
   - Create responsive design for mobile/desktop using existing patterns

3. Use the `write_to_file` command to create `hooks/useInitiatives.tsx`:
   - Implement Supabase data fetching following SSR pattern from supabase.md
   - Add real-time subscriptions for live updates
   - Handle loading and error states

4. Use the `write_to_file` command to create `hooks/useCompanyAreas.tsx`:
   - Fetch company areas data
   - Implement caching for performance

5. Use the `edit_file` command to integrate InitiativeDashboard into existing app structure:
   - Update main dashboard component to include initiative tracking
   - Maintain existing glassmorphism design consistency

## 3. Build the Initiative Creation/Editing Modal

1. Use the `write_to_file` command to create `components/InitiativeModal.tsx`:
   - Create modal component using Radix UI Dialog (following existing UI patterns)
   - Implement glassmorphism styling consistent with project theme
   - Add responsive design for mobile and desktop

2. Use the `write_to_file` command to create `components/InitiativeForm.tsx`:
   - Implement form validation with react-hook-form and zod
   - Add fields for title, description, area assignment
   - Follow existing form patterns from the codebase

3. Use the `write_to_file` command to create `lib/validations/initiative.ts`:
   - Define Zod schemas for initiative validation
   - Export validation functions

4. Use the `write_to_file` command to create server actions `app/actions/initiatives.ts`:
   - Handle create/update operations with Supabase following server action pattern
   - Add proper error handling and validation
   - Use server-side Supabase client from utils/supabase/server

5. Add loading states and error handling to modal components using existing toast system

## 4. Implement Subtask Management Functionality

1. Use the `write_to_file` command to create `components/SubtaskList.tsx`:
   - Create subtask list component within initiative modal
   - Implement checkbox for marking subtasks complete
   - Add/remove subtask functionality with smooth animations

2. Use the `write_to_file` command to create `components/SubtaskItem.tsx`:
   - Individual subtask component with edit capabilities
   - Implement inline editing functionality
   - Add completion toggle with visual feedback

3. Use the `edit_file` command to update `hooks/useInitiatives.tsx`:
   - Add subtask-related functions
   - Update initiative progress calculation based on subtask completion
   - Implement real-time updates using Supabase subscriptions

4. Use the `write_to_file` command to create server actions `app/actions/subtasks.ts`:
   - Handle subtask CRUD operations
   - Update parent initiative progress automatically
   - Follow server action patterns from project

5. Implement optimistic updates for immediate UI feedback while server processes requests

## 5. Add Area Assignment Features

1. Use the `write_to_file` command to create `components/AreaSelector.tsx`:
   - Create area selector dropdown in initiative modal
   - Fetch and display company areas from database
   - Follow existing select component patterns from Radix UI

2. Use the `edit_file` command to update `components/InitiativeForm.tsx`:
   - Integrate area selector into initiative form
   - Handle area assignment validation

3. Use the `edit_file` command to update `components/InitiativeDashboard.tsx`:
   - Add area-based filtering functionality
   - Implement area-specific progress displays
   - Create area overview cards with initiative counts

4. Use the `write_to_file` command to create server actions `app/actions/areas.ts`:
   - Handle company area CRUD operations
   - Manage initiative-area relationships

5. Add area management functionality for administrators (create/edit/delete areas)

## 6. Generate Documentation

1. Use the `write_to_file` command to create `docs/initiative-dashboard-features.md`:
   - Document all implemented features
   - Include component hierarchy and relationships
   - Add usage instructions for each feature
   - Document database schema and relationships

2. Use the `write_to_file` command to create `docs/initiative-dashboard-todos.md`:
   - List any TODO items or future enhancements
   - Include technical debt items
   - Document known limitations or issues
   - Add enhancement ideas for future development

3. Use the `bash` command to run linting and type checking:
   ```bash
   npm run lint
   npm run typecheck
   ```

4. Use the `bash` command to test production build:
   ```bash
   npm run build
   ```

5. Document any build warnings or issues in the TODO file

6. Use the `write_to_file` command to create `docs/initiative-dashboard-deployment.md`:
   - Include deployment notes and requirements
   - Document environment variables needed
   - Add database setup instructions
   - Include testing procedures

## Output Validation

1. Use the `bash` command to verify all components render without errors:
   ```bash
   npm run dev
   ```

2. Test all CRUD operations:
   - Create new initiative with subtasks
   - Edit existing initiatives
   - Mark subtasks as complete
   - Assign initiatives to areas
   - Verify progress calculations

3. Ensure Supabase integration works:
   - Test authentication flow
   - Verify real-time updates
   - Check RLS policies are working

4. Validate responsive design:
   - Test on mobile devices
   - Verify glassmorphism effects
   - Check accessibility compliance

5. Generate final summary using `write_to_file` at `initiative-dashboard-summary.md`:
   - List all created files
   - Summarize implemented functionality
   - Include next steps for deployment
   - Document any remaining work items

</detailed_sequence_steps>

</task>