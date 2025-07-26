# System Architecture Overview

## Application Structure

The Stratix application is built using Next.js 15 with a modern, type-safe architecture following the App Router pattern.

```
┌─────────────────────────────────────────────┐
│                Frontend                     │
├─────────────────────────────────────────────┤
│  Next.js App Router (React 19)            │
│  ├── Components (UI + Business Logic)      │
│  ├── Hooks (Data Fetching & State)        │
│  ├── Pages (App Router)                   │
│  └── Middleware (Auth & Routing)          │
├─────────────────────────────────────────────┤
│                Backend                      │
├─────────────────────────────────────────────┤
│  API Routes (/app/api)                    │
│  ├── Authentication                        │
│  ├── Profile Management                    │
│  ├── File Operations                       │
│  └── Superadmin                           │
├─────────────────────────────────────────────┤
│               Database                      │
├─────────────────────────────────────────────┤
│  Supabase (PostgreSQL)                    │
│  ├── User Management                       │
│  ├── Organizations                         │
│  ├── Role-Based Access Control            │
│  └── Real-time Subscriptions              │
└─────────────────────────────────────────────┘
```

## Core Technologies

### Frontend Stack
- **Next.js 15.2.4** - React framework with App Router
- **React 19** - UI library with latest features
- **TypeScript** - Type safety and developer experience
- **Tailwind CSS** - Utility-first styling with glassmorphism theme
- **Radix UI** - Accessible component primitives

### Backend Stack
- **Next.js API Routes** - Serverless API endpoints
- **Supabase** - Database, authentication, and real-time features
- **Edge Runtime** - Fast, globally distributed API responses

### Development Tools
- **ESLint** - Code quality and consistency
- **TypeScript** - Static type checking
- **Tailwind CSS** - Responsive design system

## @sync Dependency Map

### Component Dependencies

```
OKR Dashboard
├── useOKRDepartments() hook
├── UI Components (Card, Button, Badge, Progress)
├── Lucide React Icons
└── Theme Provider (glassmorphism styles)

Profile Management
├── useUserProfile() hook
├── Profile API (/api/profile/user)
├── File Upload Component
└── Form Validation (react-hook-form)

Authentication System
├── Supabase Auth
├── Middleware (auth validation)
├── Role-based permissions
└── Session management
```

### Data Flow Architecture

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│   Browser   │◄──►│  Next.js App │◄──►│   Supabase  │
│             │    │              │    │   Database  │
│ Components  │    │ API Routes   │    │             │
│ + Hooks     │    │ + Middleware │    │ Auth + RLS  │
└─────────────┘    └──────────────┘    └─────────────┘
       ▲                   ▲                   ▲
       │                   │                   │
   Real-time          Server-side         Row Level
   Updates            Validation          Security
```

### Hook Ecosystem

```
useAuth (Context)
├── Provides: user session, role, permissions
├── Used by: All protected components
└── Connects to: Supabase Auth

useOKRDepartments()
├── Depends on: useAuth for token
├── Fetches: OKR data from /api/okrs/departments
└── Used by: OKR Dashboard, Department views

useUserProfile()
├── Depends on: useAuth for authentication
├── Manages: User profile CRUD operations
└── Used by: Profile components, settings

useChartData()
├── Processes: Chart data for visualizations
├── Used by: Dashboard analytics, reporting
└── Integrates with: Recharts library
```

## Security Architecture

### Authentication Flow
```
1. User Login → Supabase Auth
2. JWT Token ← Supabase
3. Token Storage → Browser (httpOnly cookies)
4. API Requests → Include Bearer token
5. Token Validation → Middleware + API routes
6. Database Access → Row Level Security (RLS)
```

### Authorization Layers
- **Middleware**: Route-level access control
- **API Routes**: Endpoint-level validation
- **Database RLS**: Row-level data security
- **Component Guards**: UI-level permission checks

## Theme System Architecture

### Glassmorphism Design System
```
Tailwind Config
├── Custom Colors (purple-cyan gradient)
├── Glassmorphism Utilities
├── Chart Color Palette
├── Responsive Breakpoints
└── Animation Presets

Component Styling
├── Glass Effects (backdrop-blur, transparency)
├── Gradient Backgrounds
├── Custom Scrollbars
└── Responsive Design Patterns
```

### CSS Architecture
- **Global Styles**: `/app/globals.css` with glassmorphism base
- **Component Styles**: Tailwind utility classes
- **Custom Properties**: CSS variables for theming
- **Responsive Design**: Mobile-first approach

## File Structure

```
app/
├── globals.css              # Global styles + glassmorphism
├── layout.tsx               # Root layout with providers
├── page.tsx                 # Main application entry
├── api/                     # API routes
│   ├── profile/             # User profile management
│   ├── superadmin/          # Admin functionality
│   └── upload/              # File operations
└── auth/                    # Authentication pages

components/
├── ui/                      # Radix UI components (40+ components)
├── okr-dashboard.tsx        # Business logic component
├── profile-dropdown.tsx     # User profile UI
├── dynamic-theme.tsx        # Theme switching
└── theme-provider.tsx       # Theme context

hooks/
├── useOKRData.ts           # OKR data management
├── useUserProfile.ts       # Profile operations
├── useChartData.ts         # Chart data processing
├── use-mobile.tsx          # Responsive utilities
└── use-toast.ts            # Notification system

lib/
├── auth-context.tsx        # Authentication provider
├── auth-hooks.ts           # Auth utility hooks
├── database.ts             # Database operations
├── supabase.ts             # Supabase client config
├── role-permissions.ts     # RBAC system
├── role-utils.ts           # Role helper functions
└── utils.ts                # General utilities
```

## Performance Considerations

### Optimization Strategies
- **Code Splitting**: Automatic with Next.js App Router
- **Image Optimization**: Next.js Image component (disabled in config)
- **Bundle Analysis**: Available through Next.js analyzer
- **Caching**: API route caching, Supabase query caching

### Loading Strategies
- **Skeleton Loading**: Animated placeholders during data fetch
- **Progressive Enhancement**: Components work without JavaScript
- **Error Boundaries**: Graceful error handling
- **Retry Logic**: Automatic retry for failed requests

## Deployment Architecture

### Build Process
```
1. TypeScript Compilation
2. Tailwind CSS Generation
3. Next.js Build (Static + Server)
4. Asset Optimization
5. Deployment to Platform
```

### Environment Configuration
- **Development**: Local development with hot reload
- **Staging**: Preview deployments for testing
- **Production**: Optimized build with CDN distribution

### Database Migrations
- **Supabase Migrations**: Version-controlled schema changes
- **Seed Data**: Development and testing data setup
- **Backup Strategy**: Automated database backups

## Monitoring & Maintenance

### Health Checks
- API endpoint monitoring
- Database connection health
- Authentication service status
- Real-time subscription health

### Error Tracking
- Client-side error logging
- Server-side error monitoring
- Performance metrics collection
- User experience analytics

### Update Strategy
- **Dependencies**: Regular security updates
- **Database Schema**: Controlled migrations
- **Documentation**: Automatic sync with code changes
- **API Versioning**: Backward compatibility maintenance

---

*This architecture overview is automatically synchronized with the codebase.*
*Last updated: Auto-generated from source analysis*