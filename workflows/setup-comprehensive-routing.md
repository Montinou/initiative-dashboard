<task name="Setup Comprehensive Routing">

<task_objective>
Implement a comprehensive role-based routing system for the Mariana app that authenticates users and redirects them appropriately. The workflow will analyze the existing Supabase setup, document all user roles (Superadmin, CEO, Admin, and others), create authentication guards, implement role-based route protection, and build the core routing structure. Unauthenticated users will be redirected to /login, and authenticated users will be taken to /dashboard with proper role-based navigation throughout the app.
</task_objective>

<detailed_sequence_steps>
# Setup Comprehensive Routing - Detailed Sequence of Steps

## 1. Validate Supabase Setup

1. Check `package.json` and `package-lock.json` for existing Supabase dependencies and versions
   - Verify `@supabase/supabase-js` is installed and up to date
   - Check for any additional Supabase auth packages

2. Examine existing Supabase configuration files
   - Read `/lib/supabase.ts` or similar configuration files
   - Check `/lib/auth.ts` or authentication utility files
   - Review environment variables for Supabase URL and keys

3. Analyze current authentication implementation
   - Check `/middleware.ts` for existing auth middleware
   - Review `/lib/auth-*.ts` files for current auth patterns
   - Examine existing login/logout functionality in `/app/auth/` routes

4. Test current Supabase auth methods and user role structure
   - Check database schema for user roles and permissions
   - Review existing user management in `/app/superadmin/` routes
   - Document current role-based access patterns

## 2. Document All User Roles

1. Identify all user roles from existing codebase
   - Search for role definitions in TypeScript types and interfaces
   - Check database schema for role tables or user metadata
   - Review existing role-based components and pages

2. Document role hierarchy and permissions
   - **Superadmin**: Full system access, tenant management, user administration
   - **CEO**: Executive dashboard access, high-level analytics, strategic overview
   - **Admin**: Administrative functions, user management within tenant, configuration
   - **User**: Standard dashboard access, personal profile, basic functionality
   - **Guest**: Limited access, possible demo or trial functionality

3. Map roles to existing routes and components
   - `/app/superadmin/` - Superadmin exclusive routes
   - `/app/dashboard/` - General authenticated user access
   - `/app/profile/` - User profile management
   - `/app/demo/` - Demo or guest access

4. Create role permissions matrix
   - Define which roles can access which routes
   - Document role-based UI component visibility
   - Establish role hierarchy and inheritance rules

## 3. Implement Authentication Guard

1. Create or enhance authentication middleware
   - Build on existing `/middleware.ts` if present
   - Implement `withAuth` higher-order component for route protection
   - Create session validation using Supabase auth methods

2. Implement redirect logic for unauthenticated users
   - Redirect all protected routes to `/login` when not authenticated
   - Preserve intended destination for post-login redirect
   - Handle edge cases like API routes and public pages

3. Create login page enhancements
   - Ensure `/app/auth/login/page.tsx` handles role-based login
   - Implement proper error handling and user feedback
   - Add loading states and form validation

4. Set up authentication context and hooks
   - Enhance `/lib/auth-context.tsx` for global auth state
   - Create custom hooks in `/lib/auth-hooks.ts` for auth operations
   - Implement proper session management and token refresh

## 4. Create Role-Based Route Protection

1. Implement role-based middleware
   - Create middleware that checks user roles against route requirements
   - Use Supabase user metadata or custom user tables for role verification
   - Implement fallback routes for insufficient permissions

2. Create role-based route guards
   - Develop `withRole` higher-order component for specific role requirements
   - Implement route-level permission checking
   - Create unauthorized access handling and redirect logic

3. Protect existing routes with appropriate role requirements
   - `/app/superadmin/*` - Require Superadmin role
   - `/app/dashboard/*` - Require any authenticated user
   - `/app/profile/*` - Require authenticated user (own profile only)
   - API routes - Implement corresponding permission checks

4. Create role-based navigation components
   - Enhance navigation to show/hide menu items based on user role
   - Implement dynamic sidebar content based on permissions
   - Create role-specific dashboard layouts

## 5. Build Core Routes Structure

1. Audit and organize existing route structure
   - Review current `/app/` directory structure
   - Identify missing routes for complete user flow
   - Plan route hierarchy for scalability

2. Implement missing core routes
   - Ensure `/app/auth/login/page.tsx` is complete and functional
   - Create `/app/auth/logout/` route if not present
   - Implement `/app/unauthorized/page.tsx` for access denied scenarios

3. Enhance dashboard routing
   - Ensure `/app/dashboard/page.tsx` serves as main authenticated landing
   - Create role-specific dashboard variants if needed
   - Implement proper loading and error states

4. Create route configuration
   - Define route permissions in configuration file
   - Create route metadata for navigation generation
   - Implement route validation and testing utilities

## 6. Implement Navigation Flow

1. Create post-login redirect logic
   - Implement redirect to `/dashboard` after successful login
   - Handle role-based initial route selection
   - Preserve and redirect to originally requested protected routes

2. Implement role-based navigation menus
   - Create dynamic navigation that adapts to user role
   - Hide/show navigation items based on permissions
   - Implement breadcrumb navigation with role context

3. Create seamless role-based user experience
   - Implement smooth transitions between role-specific areas
   - Create intuitive role-based landing pages
   - Ensure consistent UI/UX across different role contexts

4. Handle role changes and session updates
   - Implement real-time role change detection
   - Update navigation and available routes dynamically
   - Handle session expiration and re-authentication gracefully

## 7. Test Authentication & Routing

1. Create test scenarios for each user role
   - Test Superadmin access to all routes and functionality
   - Verify CEO access to appropriate executive features
   - Test Admin access to administrative functions
   - Validate standard User access and restrictions

2. Test authentication flow edge cases
   - Verify proper handling of expired sessions
   - Test direct URL access to protected routes
   - Validate logout and session cleanup
   - Test concurrent sessions and role changes

3. Perform cross-browser and device testing
   - Test routing on different browsers and devices
   - Verify mobile navigation and responsive design
   - Test bookmark and deep-link functionality

4. Validate security and performance
   - Ensure no client-side role bypass possibilities
   - Test server-side route protection
   - Validate proper error handling and user feedback
   - Check routing performance and loading times

</detailed_sequence_steps>

</task>