# Initiative Dashboard - Deployment Guide

## Prerequisites

### Environment Requirements
- Node.js 18+ 
- npm or pnpm package manager
- Supabase project with database access
- Next.js 15.2.4 (already in project)

### Dependencies Verification
Ensure the following dependencies are installed (already in package.json):
```json
{
  "@supabase/supabase-js": "^2.52.1",
  "@supabase/ssr": "^0.6.1",
  "react-hook-form": "^7.54.1",
  "zod": "^3.24.1",
  "@hookform/resolvers": "^3.9.1",
  "recharts": "latest"
}
```

## Database Setup

### 1. Apply Migrations
Run the Supabase migrations to create the required tables:

```bash
# If using Supabase CLI locally
supabase migration up

# Or apply manually via Supabase dashboard
# Execute the SQL files in order:
# - 20250128000001_create_initiative_tables.sql
# - 20250128000002_setup_rls_policies.sql
```

### 2. Verify Database Schema
Check that the following tables were created:
- `company_areas` (with RLS enabled)
- `initiatives` (with RLS enabled) 
- `subtasks` (with RLS enabled)

### 3. Test Database Functions
Verify that the automatic progress calculation trigger works:
```sql
-- Insert test data to verify triggers
INSERT INTO company_areas (name) VALUES ('Test Area');
INSERT INTO initiatives (title, area_id) VALUES ('Test Initiative', (SELECT id FROM company_areas LIMIT 1));
INSERT INTO subtasks (title, initiative_id, completed) VALUES 
  ('Task 1', (SELECT id FROM initiatives LIMIT 1), true),
  ('Task 2', (SELECT id FROM initiatives LIMIT 1), false);

-- Check that initiative progress was automatically calculated (should be 50%)
SELECT title, progress FROM initiatives;
```

## Environment Variables

### Required Variables
Add these to your `.env.local` file:

```bash
# Supabase Configuration (already configured)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Verification
Test Supabase connection:
```bash
# Run this in your terminal to test connection
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
supabase.from('company_areas').select('*').limit(1).then(({data, error}) => {
  console.log('Connection test:', error ? 'FAILED - ' + error.message : 'SUCCESS');
});
"
```

## CSS Configuration

### Add Glassmorphism Classes
Add the following CSS classes to your `app/globals.css` file:

```css
/* Initiative Dashboard Glassmorphism Classes */
.glassmorphic-card {
  @apply bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl;
}

.glassmorphic-input {
  @apply bg-white/5 backdrop-blur-xl border border-white/20 rounded-lg text-white placeholder-white/50 focus:border-purple-400/50 focus:ring-2 focus:ring-purple-400/20;
}

.glassmorphic-button {
  @apply bg-gradient-to-r from-purple-500/20 to-cyan-500/20 backdrop-blur-xl border border-white/20 rounded-lg text-white hover:from-purple-500/30 hover:to-cyan-500/30 transition-all duration-200 shadow-lg;
}

.glassmorphic-button-ghost {
  @apply bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition-all duration-200;
}

.glassmorphic-badge {
  @apply bg-white/10 backdrop-blur-xl border border-white/20 rounded-full text-white/90 text-xs px-2 py-1;
}

.glassmorphic-dropdown {
  @apply bg-black/80 backdrop-blur-xl border border-white/20 rounded-lg shadow-2xl;
}

.glassmorphic-modal {
  @apply bg-black/90 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-2xl;
}
```

## Component Integration

### 1. Add to Main Dashboard
Integrate the InitiativeDashboard into your existing dashboard:

```tsx
// In your main dashboard component (app/dashboard/page.tsx or similar)
import { InitiativeDashboard } from '@/components/InitiativeDashboard'

export default function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Your existing dashboard content */}
      
      {/* Add Initiative Dashboard */}
      <section>
        <InitiativeDashboard />
      </section>
    </div>
  )
}
```

### 2. Navigation Updates
Add initiative dashboard to your navigation menu:

```tsx
// In your navigation component
const navigationItems = [
  // ... existing items
  {
    name: 'Initiatives',
    href: '/dashboard#initiatives',
    icon: Target,
  },
]
```

### 3. Route Configuration (Optional)
Create a dedicated route for initiatives:

```tsx
// app/initiatives/page.tsx
import { InitiativeDashboard } from '@/components/InitiativeDashboard'

export default function InitiativesPage() {
  return (
    <div className="container mx-auto p-6">
      <InitiativeDashboard />
    </div>
  )
}
```

## Build and Deployment

### 1. Type Checking
Ensure TypeScript compilation passes:
```bash
npm run typecheck
# or
npx tsc --noEmit
```

### 2. Linting
Run ESLint to check for code quality issues:
```bash
npm run lint
```

### 3. Build Test
Test the production build:
```bash
npm run build
```

### 4. Development Server
Start the development server to test locally:
```bash
npm run dev
```

Navigate to your dashboard and verify the initiative dashboard loads correctly.

## Production Deployment

### Vercel Deployment (Recommended)
1. Ensure environment variables are set in Vercel dashboard
2. Deploy using Vercel CLI or GitHub integration
3. Verify Supabase connection in production

### Other Platforms
For other hosting platforms:
1. Ensure Node.js 18+ runtime
2. Set environment variables in hosting platform
3. Configure build command: `npm run build`
4. Configure start command: `npm run start`

## Testing Procedures

### 1. Database Operations
Test all CRUD operations:
- [ ] Create company area
- [ ] Create initiative with area assignment
- [ ] Add subtasks to initiative
- [ ] Mark subtasks as completed
- [ ] Verify progress auto-calculation
- [ ] Edit initiative details
- [ ] Delete subtasks and initiatives

### 2. Real-time Updates
Test Supabase real-time functionality:
- [ ] Open dashboard in two browser tabs
- [ ] Create initiative in one tab
- [ ] Verify it appears in the other tab
- [ ] Test subtask completion updates

### 3. Responsive Design
Test on different screen sizes:
- [ ] Mobile portrait (320px-768px)
- [ ] Mobile landscape (568px-1024px)
- [ ] Tablet (768px-1024px)
- [ ] Desktop (1024px+)

### 4. Error Handling
Test error scenarios:
- [ ] Network disconnection
- [ ] Invalid form submissions
- [ ] Database connection errors
- [ ] Authentication issues

## Monitoring and Maintenance

### Performance Monitoring
Monitor these metrics in production:
- Page load times
- Supabase query performance
- Real-time subscription performance
- Error rates and types

### Database Monitoring
Track database usage:
- Table size growth
- Query performance
- Connection pool usage
- RLS policy effectiveness

### User Experience Monitoring
Monitor user interactions:
- Feature usage statistics
- Error reporting
- User feedback
- Mobile vs desktop usage

## Troubleshooting

### Common Issues

#### Database Connection Failed
1. Verify environment variables are correct
2. Check Supabase project status
3. Verify RLS policies allow authenticated users
4. Test connection with Supabase CLI

#### Real-time Updates Not Working
1. Check browser console for WebSocket errors
2. Verify Supabase real-time is enabled
3. Check authentication status
4. Test with fresh browser session

#### Glassmorphism Styles Not Applied
1. Verify CSS classes are added to globals.css
2. Check if Tailwind CSS is processing the classes
3. Inspect elements in browser dev tools
4. Verify backdrop-filter browser support

#### Form Validation Errors
1. Check Zod schema definitions
2. Verify form field names match schema
3. Test with various input combinations
4. Check server action responses

### Debug Commands

```bash
# Check Supabase connection
supabase status

# Test database queries
supabase db reset --debug

# Analyze bundle size
npm run build --analyze

# Check TypeScript errors
npx tsc --noEmit --strict
```

## Security Checklist

### Production Security
- [ ] RLS policies are enabled and tested
- [ ] Environment variables are secure
- [ ] Input validation is working
- [ ] Authentication is required for all operations
- [ ] HTTPS is enforced
- [ ] CSRF protection is enabled

### Database Security
- [ ] No sensitive data in client-side code
- [ ] All queries use parameterized statements
- [ ] User permissions are properly restricted
- [ ] Audit logging is configured
- [ ] Backup strategy is in place

## Support and Maintenance

### Regular Maintenance Tasks
- Weekly: Monitor error logs and performance
- Monthly: Update dependencies and review security
- Quarterly: Performance optimization and feature review

### Getting Help
- Check the TODO items document for known issues
- Review Supabase documentation for database issues
- Check Next.js documentation for framework issues
- Review component documentation in the features guide