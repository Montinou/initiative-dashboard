<task name="Clean Frontend Mock Data and Implement Database Queries">

<task_objective>
Remove all hardcoded mock data from frontend components and implement proper Firebase/Firestore database queries with real-time updates. Input: Frontend components with static data arrays. Output: Fully integrated components with live database connections. Processing: Multi-agent parallel implementation of Firebase hooks, functions, and component updates.
</task_objective>

<detailed_sequence_steps>
# Clean Frontend Mock Data - Detailed Sequence of Steps

## 1. Analyze Current Mock Data Usage

1. Use the `grep` command to search for hardcoded arrays and static data patterns:
   - Search for patterns like `const clients = [`, `const reports = [`, `const kpis = {`
   - Identify components using `useState` with mock initial data
   - Document all files containing mock data with line numbers

2. Review Firebase function implementations to identify missing CRUD operations:
   - Check `functions/index.js` for existing database functions
   - List all missing functions needed for frontend operations

3. Create a comprehensive inventory of:
   - Components with mock data
   - Missing Firebase functions
   - Required TypeScript interfaces
   - Database schema requirements

## 2. Setup Implementation Infrastructure

1. Create `implementation-progress.md` for multi-agent tracking:
   ```markdown
   # Frontend Mock Data Cleanup - Implementation Progress
   
   ## Agent Status
   - AGENT_FIREBASE_HOOKS_[TIMESTAMP]: Creating Firebase hooks
   - AGENT_FIREBASE_FUNCTIONS_[TIMESTAMP]: Implementing backend functions
   - AGENT_TYPES_[TIMESTAMP]: Creating TypeScript interfaces
   [etc...]
   ```

2. Prepare the directory structure:
   - Ensure `lib/hooks/` directory exists for Firebase hooks
   - Verify `types/` directory for TypeScript interfaces
   - Check Firebase configuration in `lib/firebase-config.ts`

## 3. Phase 1: Firebase Infrastructure (Parallel Multi-Agent)

1. **Agent 1 - Firebase Hooks Creation**:
   ```bash
   claude -p "Create comprehensive Firebase hooks in lib/hooks/:
   - useClients.ts: Real-time listener for all clients in an organization with loading/error states
   - useClient.ts: Single client data with real-time updates
   - useReports.ts: Client-specific reports with pagination and filtering
   - useKPIs.ts: Real-time KPI data for a specific client
   Include proper TypeScript typing, error handling, and unsubscribe cleanup" \
   --permission-mode bypassPermissions --max-turns 15 &
   ```

2. **Agent 2 - Firebase Functions Implementation**:
   ```bash
   claude -p "Implement complete CRUD operations in functions/index.js:
   - getClients: Fetch all clients for an organization
   - createClient: Add new client with validation
   - updateClient: Update client details
   - deleteClient: Soft delete with cascade handling
   - getReports: Fetch reports with filtering
   - createReport: Generate and store new report
   - deleteReport: Remove report with storage cleanup
   - getKPIs: Fetch current KPIs
   - updateKPIs: Update KPI values
   Ensure proper authentication, error handling, and Firestore transactions" \
   --permission-mode bypassPermissions --max-turns 15 &
   ```

3. **Agent 3 - TypeScript Interfaces**:
   ```bash
   claude -p "Create comprehensive TypeScript interfaces in types/index.ts:
   - Client interface matching Firestore schema
   - Report interface with all status types
   - KPI interface with metric definitions
   - Organization interface
   - User interface with roles
   - Integration interface
   Ensure all interfaces are properly exported and match the database schema exactly" \
   --permission-mode bypassPermissions --max-turns 10 &
   ```

## 4. Phase 2: Component Updates (Parallel Multi-Agent)

1. **Agent 4 - Dashboard Components Cleanup**:
   ```bash
   claude -p "Replace all mock data in dashboard components:
   - dashboard-with-cards.tsx: Remove hardcoded clients array (lines 11-58)
   - Implement useClients hook with organization filtering
   - Add loading skeleton while data loads
   - Add empty state when no clients exist
   - Ensure client card click navigation works
   - Update all three dashboard variants consistently" \
   --permission-mode bypassPermissions --max-turns 20 &
   ```

2. **Agent 5 - KPI Dashboard Update**:
   ```bash
   claude -p "Transform kpi-dashboard.tsx to use real data:
   - Remove all hardcoded KPI data (lines 17-138)
   - Implement useKPIs hook with client selection
   - Fetch client list dynamically with useClients
   - Add real-time KPI updates
   - Implement loading states for each KPI card
   - Add error handling with retry capability" \
   --permission-mode bypassPermissions --max-turns 20 &
   ```

3. **Agent 6 - Reports Table Integration**:
   ```bash
   claude -p "Update reports-table.tsx with database integration:
   - Remove static reports array (lines 17-48)
   - Implement useReports hook with client context
   - Add real delete functionality calling Firebase function
   - Implement optimistic UI updates
   - Add confirmation dialog for delete operations
   - Include loading and empty states" \
   --permission-mode bypassPermissions --max-turns 20 &
   ```

4. **Agent 7 - Client Workspace Fix**:
   ```bash
   claude -p "Fix client-workspace.tsx hardcoded data:
   - Remove hardcoded clientName and orgId
   - Get clientId from URL params
   - Fetch client details with useClient hook
   - Get real orgId from auth context
   - Update all child components to receive real data
   - Implement proper loading states during data fetch" \
   --permission-mode bypassPermissions --max-turns 20 &
   ```

## 5. Phase 3: Integration and Polish (Sequential)

1. **Agent 8 - Component Integration**:
   ```bash
   claude -p "Ensure complete integration across all components:
   - Verify all navigation flows work with real IDs
   - Connect all modals to Firebase functions
   - Ensure create/update/delete operations trigger UI updates
   - Implement optimistic updates where appropriate
   - Add success/error toasts for all operations
   - Verify real-time updates work across browser tabs" \
   --permission-mode bypassPermissions --max-turns 25
   ```

2. **Agent 9 - Error Handling and UX**:
   ```bash
   claude -p "Add comprehensive error handling and UX improvements:
   - Add error boundaries to catch component errors
   - Implement retry logic for failed requests
   - Add skeleton loaders matching component layouts
   - Create empty state designs with action buttons
   - Add offline detection and messaging
   - Implement request debouncing where needed" \
   --permission-mode bypassPermissions --max-turns 15
   ```

## 6. Testing and Validation

1. Create test checklist in implementation-progress.md:
   - [ ] Dashboard loads real clients from Firestore
   - [ ] Creating a client updates UI immediately
   - [ ] KPIs update in real-time
   - [ ] Reports can be deleted successfully
   - [ ] Navigation maintains proper state
   - [ ] Error states display correctly
   - [ ] Loading states appear during data fetch

2. Manual testing sequence:
   - Start Firebase emulators
   - Create test organization and clients
   - Verify all CRUD operations
   - Test real-time updates
   - Check error scenarios

3. Performance validation:
   - Ensure queries are optimized
   - Check for memory leaks in listeners
   - Verify proper cleanup on unmount

## 7. Cleanup and Documentation

1. Update .gitignore to exclude:
   ```
   implementation-progress.md
   spawn-*.sh
   .agents/
   ```

2. Create final commit with message:
   ```
   feat: remove all mock data and implement complete Firebase integration

   - Replace hardcoded client arrays with useClients hook
   - Implement real-time KPI updates with Firestore listeners  
   - Add complete CRUD operations for clients and reports
   - Include comprehensive error handling and loading states
   - Zero mock data remaining in codebase
   ```

3. Document any configuration requirements in CLAUDE.md

</detailed_sequence_steps>

</task>