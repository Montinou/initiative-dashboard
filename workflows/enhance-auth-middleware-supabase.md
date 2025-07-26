<task name="Enhance Auth Middleware with Supabase">

<task_objective>
Enhance the existing Clerk authentication system by integrating Supabase as the primary database for organizations, memberships, and clients data. The system will use Clerk for user authentication only, while all other data (organizations, memberships, clients) will be managed in Supabase with clerk_user_id as the linking key. The middleware will query Supabase to determine user onboarding status and handle appropriate redirects. Output will be enhanced middleware, Supabase database operations, and BigQuery sync functionality.
</task_objective>

<detailed_sequence_steps>
# Enhance Auth Middleware with Supabase - Detailed Sequence of Steps

## 1. Supabase Database Schema Setup

1. **Create Supabase Tables**
   - Create `organizations` table:
     - id (UUID, Primary Key)
     - name (TEXT, NOT NULL)
     - description (TEXT)
     - created_at (TIMESTAMP)
     - updated_at (TIMESTAMP)
   
   - Create `organization_memberships` table:
     - id (UUID, Primary Key)
     - clerk_user_id (TEXT, NOT NULL)
     - organization_id (UUID, Foreign Key to organizations.id)
     - role (TEXT) - e.g., 'owner', 'admin', 'member'
     - created_at (TIMESTAMP)
     - updated_at (TIMESTAMP)
     - UNIQUE constraint on (clerk_user_id, organization_id)
   
   - Create `clients` table:
     - id (UUID, Primary Key)
     - organization_id (UUID, Foreign Key to organizations.id)
     - name (TEXT, NOT NULL)
     - industry (TEXT)
     - business_type (TEXT)
     - created_at (TIMESTAMP)
     - updated_at (TIMESTAMP)

2. **Configure Row Level Security (RLS)**
   - Enable RLS on all tables
   - Create policies for user access based on clerk_user_id through organization_memberships
   - Organizations: Users can access if they have a membership
   - Clients: Users can access if they're members of the client's organization
   - Memberships: Users can only see their own memberships

## 2. Enhance Next.js Middleware

1. **Update Middleware Configuration**
   - Import Supabase client for server-side usage
   - Get clerk_user_id from authenticated session
   - Implement auth status checking logic

2. **Implement Onboarding Status Checks**
   - Query `organization_memberships` using clerk_user_id
   - If no membership found → redirect to `/onboarding/step-1`
   - If membership exists, get organization_id and check for clients
   - If organization has no clients → redirect to `/onboarding/step-2`
   - If organization has clients → allow access to `/dashboard`

3. **Middleware Logic Implementation**
   ```typescript
   // Check user's onboarding status in Supabase
   // Scenario 1: No organization membership
   // Scenario 2: Has organization membership but organization has no clients
   // Scenario 3: Fully onboarded (member of org that has clients)
   ```

## 3. Update Onboarding Pages

1. **Step 1: Organization Creation (/onboarding/step-1)**
   - Update existing page to save to Supabase
   - Create server action for organization creation
   - Insert into both `organizations` and `organization_memberships`
   - Handle transaction to ensure data consistency

2. **Step 2: Client Creation (/onboarding/step-2)**
   - Update existing page to save to Supabase
   - Create server action for client creation
   - Use clerk_user_id to find user's organization_id from memberships
   - Insert client data linked to user's organization
   - All organization members will automatically have access to new client

## 4. Implement Supabase Data Operations

1. **Create Supabase Service Layer**
   - Initialize Supabase client with service role key
   - Create functions for CRUD operations
   - Implement error handling and retries
   - Add TypeScript types for all entities

2. **Server Actions for Data Management**
   - `createOrganization`: Creates org and membership with 'owner' role
   - `createClient`: Creates client for user's organization
   - `getUserOnboardingStatus`: Checks user's membership and org's clients
   - `getUserOrganizations`: Fetches all orgs user is member of
   - `getOrganizationClients`: Lists all clients for an organization
   - `addOrganizationMember`: Adds new member to organization (future feature)
   - `getUserRole`: Gets user's role in organization

## 5. BigQuery Synchronization

1. **Create Sync Mechanism**
   - Implement Vercel Edge Function or Supabase Edge Function
   - Listen for Supabase webhook events (INSERT/UPDATE)
   - Transform data for BigQuery schema
   - Handle batch operations for efficiency

2. **BigQuery Integration**
   - Mirror Supabase schema in BigQuery
   - Create datasets for organizations, memberships, clients
   - Implement idempotent sync to prevent duplicates
   - Add error logging and retry logic

3. **Async Processing Flow**
   - User action → Supabase (immediate) → Response to user
   - Supabase webhook → Edge Function → BigQuery (async)
   - Implement dead letter queue for failed syncs

## 6. Update Context and State Management

1. **Enhance OrganizationContext**
   - Update to fetch from Supabase instead of mock data
   - Add methods to refresh organization/client data
   - Implement caching for performance
   - Handle loading and error states

2. **Update Authentication Flow**
   - Ensure Clerk token is passed to Supabase
   - Configure Supabase to validate Clerk JWTs
   - Update API headers to include auth tokens
   - Implement token refresh logic

## 7. Testing and Validation

1. **Test Auth Flow**
   - New user registration → redirect to onboarding
   - Existing user with no organization membership → redirect to step 1
   - User who is member of org without clients → redirect to step 2
   - User who is member of org with clients → access dashboard
   - Multiple users in same organization → all have access to same clients

2. **Test Data Operations**
   - Verify Supabase writes are successful
   - Confirm BigQuery sync is working
   - Test error scenarios and rollbacks
   - Validate data consistency across systems
   - Test multi-user organization access

## Required Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- BigQuery credentials (already configured)

## Implementation Notes

- All auth checks must be performant (< 100ms)
- Supabase queries should use indexes for speed
- BigQuery sync can be delayed (eventual consistency)
- Implement proper error boundaries and fallbacks
- Consider implementing a status page for sync health

</detailed_sequence_steps>

</task>