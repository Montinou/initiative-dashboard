<task name="Fix Data Fetching Patterns">

<task_objective>
Systematically analyze and fix data fetching patterns across the Next.js application to ensure proper loading states, error handling, and empty state implementations. This workflow examines all React components, API route handlers, and database query functions to identify missing or improper data fetching patterns. Processing involves pattern matching, code analysis, testing actual data flows, and applying standardized fixes. Output will be a comprehensive report of issues found and fixes applied, ensuring robust data handling throughout the application.
</task_objective>

<detailed_sequence_steps>
# Fix Data Fetching Patterns - Detailed Sequence of Steps

## 1. Audit Current Data Fetching Implementation

1. **Map All Data-Fetching Components**
   - Use `find` and `glob` tools to locate all React components in `/app` and `/components` directories
   - Identify components that fetch data using hooks (useEffect, custom hooks, etc.)
   - Document API calls, database queries, and external service integrations
   - Map components that display dynamic data vs static content

2. **Analyze API Route Handlers**
   - Examine all API routes in `/app/api` directory
   - Document data fetching patterns in route handlers
   - Identify error handling mechanisms in API endpoints
   - Check for proper HTTP status codes and response formats

3. **Review Database Query Functions**
   - Examine Supabase client usage in `/lib/supabase.ts` and related files
   - Identify direct database queries in components and utilities
   - Document authentication-dependent queries
   - Map tenant-specific data fetching patterns

4. **Identify Custom Hooks and Data Utilities**
   - Review custom hooks in `/hooks` directory (useChartData.ts, useOKRData.ts, useUserProfile.ts)
   - Examine data utilities in `/lib` directory
   - Document shared data fetching patterns and abstractions

## 2. Identify Data Fetching Issues

1. **Check for Missing Loading States**
   - Scan components for data fetching without loading indicators
   - Identify async operations without user feedback
   - Look for components that render before data is available
   - Document components lacking skeleton or spinner states

2. **Audit Error Handling Patterns**
   - Identify data fetching without try-catch blocks
   - Look for API calls without error state management
   - Check for missing error boundaries around data-dependent components
   - Document components that fail silently on data errors

3. **Verify Empty State Implementations**
   - Identify lists/tables that don't handle empty data
   - Look for missing "no data" messages or placeholders
   - Check for components that break when receiving empty arrays/objects
   - Document missing fallback content for failed data loads

4. **Analyze Data Consistency Issues**
   - Check for stale data display during updates
   - Identify race conditions in data fetching
   - Look for missing data invalidation patterns
   - Document inconsistent data refresh mechanisms

## 3. Test Data Fetching Flows

1. **Simulate Network Conditions**
   - Test components with slow network responses
   - Verify behavior during network failures
   - Check data fetching during authentication state changes
   - Test concurrent data fetching scenarios

2. **Validate Database Query Performance**
   - Test queries with large datasets
   - Verify pagination and data limiting
   - Check for N+1 query problems
   - Test database connection failures

3. **Test Authentication-Dependent Data**
   - Verify data access with different user roles
   - Test data fetching during authentication transitions
   - Check tenant-specific data isolation
   - Validate superadmin data access patterns

4. **Cross-Browser and Device Testing**
   - Test data fetching on mobile devices
   - Verify behavior across different browsers
   - Check data handling with varying screen sizes
   - Test offline/online state transitions

## 4. Implement Standardized Fixes

1. **Apply Consistent Loading States**
   - Implement standardized loading skeletons
   - Add loading spinners for async operations
   - Create reusable loading state components
   - Ensure all data fetching shows appropriate feedback

2. **Standardize Error Handling**
   - Implement consistent error boundaries
   - Add user-friendly error messages
   - Create retry mechanisms for failed requests
   - Implement proper error logging and reporting

3. **Implement Proper Empty States**
   - Add "no data" components for empty lists
   - Create placeholder content for missing data
   - Implement empty state illustrations/messages
   - Add call-to-action buttons for empty states

4. **Optimize Data Fetching Performance**
   - Implement data caching strategies
   - Add request deduplication
   - Optimize database query patterns
   - Implement proper data invalidation

## 5. Create Reusable Data Fetching Patterns

1. **Develop Standard Data Hooks**
   - Create consistent patterns for API calls
   - Implement standardized error handling hooks
   - Build reusable data fetching abstractions
   - Add data caching and invalidation utilities

2. **Build Data Component Wrappers**
   - Create higher-order components for data fetching
   - Implement render props patterns for data states
   - Build standardized data display components
   - Add consistent loading and error wrappers

3. **Establish Data Fetching Guidelines**
   - Document best practices for data fetching
   - Create code examples and templates
   - Establish naming conventions for data-related code
   - Build linting rules for data fetching patterns

## 6. Validate and Test Fixes

1. **Comprehensive Component Testing**
   - Test all modified components thoroughly
   - Verify loading states work correctly
   - Confirm error handling behaves as expected
   - Validate empty states display properly

2. **Integration Testing**
   - Test data flows across component boundaries
   - Verify API integration continues to work
   - Test authentication-dependent data access
   - Confirm tenant data isolation remains intact

3. **Performance Validation**
   - Measure data fetching performance improvements
   - Verify reduced network requests where applicable
   - Test application responsiveness during data loading
   - Confirm database query optimization

4. **User Experience Testing**
   - Test user workflows involving data fetching
   - Verify smooth transitions between loading/loaded states
   - Confirm error recovery flows work intuitively
   - Test accessibility of loading and error states

## 7. Generate Comprehensive Report

1. **Document Issues Found**
   - List all data fetching anti-patterns identified
   - Document missing loading states and their locations
   - Report error handling gaps and their impact
   - Catalog empty state implementation issues

2. **Report Fixes Applied**
   - Document all code changes made
   - List new components and utilities created
   - Report performance improvements achieved
   - Document new patterns and guidelines established

3. **Provide Recommendations**
   - Suggest ongoing maintenance practices
   - Recommend monitoring and alerting strategies
   - Provide guidelines for future data fetching implementations
   - Suggest additional tooling or library integrations

4. **Create Testing Documentation**
   - Document test scenarios for data fetching
   - Provide examples of proper implementation patterns
   - Create troubleshooting guides for common issues
   - Establish code review checklists for data fetching code

</detailed_sequence_steps>

</task>