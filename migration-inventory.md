# Master Branch Integration Inventory

## Analysis Date: 2025-07-27

### Current State
- **Current Branch**: main
- **Target Branch**: master
- **Integration Strategy**: Cherry-pick valuable features while maintaining main branch architecture

## Primary Migration Targets - Dashboards

### Dashboard Files to Migrate
1. `app/dashboard/page.tsx` - Main dashboard page
2. `app/superadmin/dashboard/page.tsx` - Superadmin dashboard
3. `dashboard.tsx` - Core dashboard component (root level)
4. `components/okr-dashboard.tsx` - OKR dashboard component

### Dashboard API Routes
1. `app/api/dashboard/area-comparison/route.ts`
2. `app/api/dashboard/objectives/route.ts`
3. `app/api/dashboard/progress-distribution/route.ts`
4. `app/api/dashboard/status-distribution/route.ts`

## Secondary Migration Targets

### Chart Components (NEW - Not in main)
1. `components/charts/area-comparison.tsx`
2. `components/charts/objective-tracking.tsx`
3. `components/charts/progress-distribution.tsx`
4. `components/charts/status-donut.tsx`
5. `components/charts/index.ts`
6. Area-specific charts:
   - `components/charts/areas/administracion-objectives.tsx`
   - `components/charts/areas/comercial-objectives.tsx`
   - `components/charts/areas/producto-objectives.tsx`
   - `components/charts/areas/rrhh-objectives.tsx`

### Other Valuable Features
1. **Analytics Page**: `app/analytics/page.tsx`
2. **Admin Features**:
   - `app/admin/page.tsx`
   - Superadmin routes and functionality
3. **Profile Management**:
   - `app/profile/page.tsx`
   - `app/api/profile/company/route.ts`
   - `app/api/profile/user/route.ts`
4. **OKR Management**:
   - `app/api/okrs/departments/route.ts`
5. **File Operations**:
   - `app/api/upload/route.ts`
   - `app/api/download-template/route.ts`

### UI/UX Improvements
1. **Areas Page**: `app/areas/page.tsx`
2. **Users Page**: `app/users/page.tsx`
3. **Auth Pages**: `app/auth/login/page.tsx`

## Dependencies Analysis

### Potential New Dependencies
- Chart libraries (need to check package.json from master)
- Additional UI components or libraries
- API/Backend service dependencies

## Identified Conflicts/Concerns

1. **Existing Components**: Some components exist in both branches (okr-dashboard.tsx, dynamic-theme.tsx)
2. **Missing Directory**: `components/charts/` doesn't exist in main
3. **Database/Backend**: Need to check if master has different database setup
4. **Authentication**: Superadmin auth system appears more developed in master

## Next Steps Priority

1. **High Priority**:
   - Migrate all dashboard components and pages
   - Set up charts directory and components
   - Integrate dashboard API routes

2. **Medium Priority**:
   - Analytics and admin pages
   - Profile management features
   - OKR department routes

3. **Low Priority**:
   - Documentation files
   - Test files if any
   - Additional UI enhancements

## Questions to Resolve

1. Are there database schema differences between branches?
2. What authentication/authorization changes exist?
3. Are there any breaking changes in the API structure?
4. What mock data needs to be replaced with production data?