<task name="Verify Database Connections and Data Upload">

<task_objective>
Verify and fix Firebase Firestore database connections across all app pages (Dashboard, Clients, Integrations) and implement a new XLSX/CSV data upload component for client-specific data import. The workflow uses parallel subagents to handle different aspects: database verification/fixes, upload component development, backend integration, and final integration testing.

**Inputs**: Current Next.js app with Firebase, existing pages, requirements for file upload functionality
**Outputs**: Verified database connections, new upload component, Firebase Functions integration
**Tools**: Firebase Firestore, Firebase Storage, Firebase Functions, XLSX/CSV parsing libraries, Next.js components
</task_objective>

<detailed_sequence_steps>
# Database Connections & Data Upload - Parallel Subagent Workflow

## Prerequisites
```bash
# Ensure we're on the main branch
git checkout main
git pull origin main

# Create base timestamp for this workflow
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BASE_BRANCH=$(git branch --show-current)
```

## Step 1: Spawn Parallel Subagents

Execute all subagents in parallel using the claude-code-subagents pattern:

```bash
#!/bin/bash
# spawn-db-upload-agents.sh

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BASE_BRANCH=$(git branch --show-current)

# Agent 1: Database Connection Verification & Fixes
git checkout -b "feature/db-verification-$TIMESTAMP" "$BASE_BRANCH"
(
  claude -p "Audit and fix Firebase Firestore database connections across all app pages. Check Dashboard (/app/dashboard/page.tsx), Clients (/app/clientes/[clientId]/page.tsx), and Integrations (/app/clientes/[clientId]/integraciones/page.tsx). Verify connections are working, add missing ones, fix any errors. Ensure proper error handling and loading states." \
    --permission-mode bypassPermissions \
    --max-turns 15
) &

# Agent 2: XLSX/CSV Upload Component
git checkout -b "feature/data-upload-component-$TIMESTAMP" "$BASE_BRANCH"
(
  claude -p "Create a reusable XLSX/CSV upload component for client-specific data import. Component should: 1) Accept drag-drop and file selection, 2) Support XLSX and CSV formats, 3) Show upload progress, 4) Preview first few rows after upload, 5) Integrate with Firebase Storage for file persistence. Place in /components/data-upload/ directory following shadcn/ui patterns." \
    --permission-mode bypassPermissions \
    --max-turns 15
) &

# Agent 3: Backend Firebase Functions
git checkout -b "feature/upload-backend-$TIMESTAMP" "$BASE_BRANCH"
(
  claude -p "Implement Firebase Functions to process uploaded XLSX/CSV files. Create functions to: 1) Handle file uploads to Firebase Storage, 2) Parse XLSX/CSV data, 3) Store processed data in Firestore under client-specific collections, 4) Return processing status and data preview. Follow existing functions structure in /functions/ directory." \
    --permission-mode bypassPermissions \
    --max-turns 15
) &

# Agent 4: Integration & Testing
git checkout -b "feature/upload-integration-$TIMESTAMP" "$BASE_BRANCH"
(
  # Wait a bit for other agents to make progress
  sleep 300
  
  claude -p "Integrate the data upload functionality end-to-end. Add the upload component to client detail pages, connect with Firebase Functions backend, test the complete flow from file upload to data storage. Ensure proper error handling, loading states, and user feedback throughout the process." \
    --permission-mode bypassPermissions \
    --max-turns 20
) &

wait
echo "✅ All database and upload agents complete. Check feature branches: feature/*-$TIMESTAMP"
```

## Step 2: Monitor Progress

While agents are running, monitor progress:

```bash
# Check branch creation and activity
watch -n 10 'git branch | grep feature.*$(date +%Y%m%d)'

# Monitor file changes across agents
watch -n 30 'find . -name "*.tsx" -o -name "*.ts" -newer .git/HEAD | head -20'

# Check for component creation
ls -la components/*/
ls -la functions/
```

## Step 3: Agent Completion Verification

After agents complete, verify each implementation:

```bash
# Check database verification agent
git checkout feature/db-verification-$TIMESTAMP
npm run lint
npm run build

# Check upload component agent  
git checkout feature/data-upload-component-$TIMESTAMP
npm run lint
npm run build

# Check backend functions agent
git checkout feature/upload-backend-$TIMESTAMP
cd functions && npm run lint && npm run build

# Check integration agent
git checkout feature/upload-integration-$TIMESTAMP
npm run lint
npm run build
```

## Step 4: Selective Integration

Review and integrate successful implementations:

```bash
# Return to main branch
git checkout main

# Create final integration branch
git checkout -b "feature/db-upload-final-$TIMESTAMP"

# Cherry-pick or merge successful components
# (Review each branch manually and integrate best solutions)

# Test complete integration
npm run dev
# Manual testing of database connections and upload functionality
```

## Step 5: Cleanup

```bash
# After successful integration and testing
git checkout main
git branch -d feature/db-verification-$TIMESTAMP
git branch -d feature/data-upload-component-$TIMESTAMP  
git branch -d feature/upload-backend-$TIMESTAMP
git branch -d feature/upload-integration-$TIMESTAMP

# Keep final integration branch for potential PR
echo "Final implementation on: feature/db-upload-final-$TIMESTAMP"
```

## Expected Deliverables

1. **Database Connections**: All pages properly connected to Firestore with error handling
2. **Upload Component**: Reusable XLSX/CSV upload component in `/components/data-upload/`
3. **Backend Functions**: Firebase Functions for file processing in `/functions/`
4. **Integration**: Complete end-to-end data upload flow for client-specific data
5. **Testing**: Verified functionality across all components

## Cost Management

- Each agent limited to 15-20 turns maximum
- Parallel execution reduces total time
- Failed agents can be re-run individually if needed
- Set `--max-turns` based on complexity of each task

</detailed_sequence_steps>

</task>