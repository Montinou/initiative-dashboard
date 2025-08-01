<task name="Dashboard Filtering System">

<task_objective>
Implement a comprehensive filtering system for the existing dashboard that allows users to filter data across all tabs based on relevant criteria. Input includes the current dashboard structure, database schema (initiatives, areas, activities tables), and glassmorphism design system. Output will be modified dashboard components with integrated filtering UI, state management for filters, and dynamic data filtering logic that works across overview, initiatives, areas, and analytics tabs. Filters include Q1/Q2/Q3/Q4 quarters (based on target_date/due_date), area selection, completion percentage ranges, initiative status, and priority levels.
</task_objective>

<detailed_sequence_steps>
# Dashboard Filtering System Implementation - Detailed Sequence of Steps

## 1. Analyze Existing Dashboard Data Structure

1. Use the `read_file` command to examine current dashboard.tsx to understand:
   - Existing data models and mock data structure
   - Current tab implementation (overview, initiatives, areas, analytics)
   - State management patterns used
   - Component hierarchy and data flow

2. Use the `read_file` command to review public/schema-public.sql to identify filterable fields:
   - initiatives table: status, priority, progress, target_date
   - areas table: name, description
   - activities table: progress, status, due_date
   - Map quarter calculation logic based on target_date and due_date fields

3. Document available filter criteria:
   - **Quarters**: Q1 (Jan-Mar), Q2 (Apr-Jun), Q3 (Jul-Sep), Q4 (Oct-Dec)
   - **Areas**: From areas.name field
   - **Completion Progress**: 0-25%, 26-50%, 51-75%, 76-100%
   - **Initiative Status**: planning, in_progress, completed, on_hold
   - **Priority**: low, medium, high levels

## 2. Design Filter UI Components

1. Use the `write_to_file` command to create `components/filters/FilterContainer.tsx`:
   - Create main filter container with glassmorphism styling
   - Implement collapsible/expandable filter panel
   - Follow existing Radix UI patterns and glassmorphism design
   - Add responsive behavior for mobile/desktop

2. Use the `write_to_file` command to create `components/filters/QuarterFilter.tsx`:
   - Create quarter selector with Q1/Q2/Q3/Q4 options
   - Implement multi-select functionality with checkboxes
   - Add visual indicators for selected quarters
   - Use consistent styling with project theme

3. Use the `write_to_file` command to create `components/filters/AreaFilter.tsx`:
   - Create area dropdown using Radix UI Select
   - Fetch areas from database following existing patterns
   - Implement multi-select with search functionality
   - Add "All Areas" option

4. Use the `write_to_file` command to create `components/filters/ProgressFilter.tsx`:
   - Create progress range slider component
   - Implement dual-handle slider for min/max progress
   - Add preset ranges (0-25%, 26-50%, etc.)
   - Display current range values

5. Use the `write_to_file` command to create `components/filters/StatusFilter.tsx`:
   - Create status filter with initiative status options
   - Use badge-style selectors with status colors
   - Implement toggle functionality for multiple selections

6. Use the `write_to_file` command to create `components/filters/PriorityFilter.tsx`:
   - Create priority filter with priority level options
   - Use visual indicators (icons/colors) for priorities
   - Add multi-select capability

## 3. Implement Filtering Logic and State Management

1. Use the `write_to_file` command to create `hooks/useFilters.tsx`:
   - Create filter state management hook
   - Implement filter state interface with all filter types
   - Add methods to update, reset, and combine filters
   - Include URL parameter sync for sharable filtered views

2. Use the `write_to_file` command to create `lib/utils/filterUtils.ts`:
   - Create utility functions for date-to-quarter conversion
   - Implement filter application logic for each data type
   - Add functions to combine multiple filters
   - Create data transformation functions

3. Use the `write_to_file` command to create `lib/utils/dateUtils.ts`:
   - Create quarter calculation functions
   - Add date range utilities for quarter filtering
   - Implement date comparison helpers

4. Use the `edit_file` command to update existing dashboard data fetching:
   - Modify data queries to accept filter parameters
   - Add filtering logic to Supabase queries
   - Implement client-side filtering for complex combinations
   - Optimize query performance with proper indexing

## 4. Integrate Filters with Dashboard Tabs

1. Use the `edit_file` command to update main dashboard component:
   - Integrate FilterContainer at the top of dashboard
   - Connect filter state to data display components
   - Add filter summary/active filters display
   - Implement filter reset functionality

2. Use the `edit_file` command to update Overview tab:
   - Apply filters to overview metrics and charts
   - Update progress indicators based on filtered data
   - Modify initiative counts and completion rates
   - Ensure charts reflect filtered dataset

3. Use the `edit_file` command to update Initiatives tab:
   - Filter initiative list based on all active filters
   - Update initiative cards to show filtered results
   - Modify pagination to work with filtered data
   - Add "No results" state for empty filters

4. Use the `edit_file` command to update Areas tab:
   - Filter areas and their associated initiatives
   - Update area progress calculations with filtered data
   - Modify area-specific metrics and charts
   - Handle area filter interaction with area tab

5. Use the `edit_file` command to update Analytics tab:
   - Apply filters to all analytics charts and metrics
   - Update trend analysis with filtered data
   - Modify performance indicators
   - Ensure proper data aggregation with filters

## 5. Add Filter Persistence and URL Integration

1. Use the `edit_file` command to add URL parameter management:
   - Sync filter state with URL query parameters
   - Enable sharable filtered dashboard URLs
   - Implement proper encoding/decoding of filter values
   - Add browser back/forward navigation support

2. Use the `write_to_file` command to create `hooks/useFilterPersistence.tsx`:
   - Implement localStorage persistence for user preferences
   - Save commonly used filter combinations
   - Add "Save Current Filters" functionality
   - Create quick filter presets

3. Add filter state restoration on page load:
   - Load filters from URL parameters on initial render
   - Fallback to localStorage preferences
   - Handle invalid or outdated filter parameters

## 6. Testing and Validation

1. Use the `bash` command to run linting and type checking:
   ```bash
   npm run lint
   npm run typecheck
   ```

2. Test filtering functionality:
   - Verify each filter works independently
   - Test filter combinations
   - Check data accuracy across all tabs
   - Validate responsive behavior on mobile/desktop

3. Test performance with large datasets:
   - Monitor filtering speed with multiple active filters
   - Check memory usage during filter operations
   - Validate database query performance

4. Use the `bash` command to test production build:
   ```bash
   npm run build
   ```

5. Validate accessibility:
   - Test keyboard navigation through filters
   - Check screen reader compatibility
   - Verify focus management in filter components

</detailed_sequence_steps>

</task>