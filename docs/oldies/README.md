# Stratix Application Documentation

## Quick Start
- [Setup Guide](guides/setup.md)
- [Development Workflow](guides/development.md)
- [Deployment Guide](guides/deployment.md)

## Architecture
- [System Overview](architecture/overview.md)
- [Component Architecture](architecture/components.md)
- [Data Flow](architecture/data-flow.md)
- [Theme System](architecture/theme-system.md)

## API Reference
- [Authentication APIs](api/auth.md)
- [Profile Management](api/profile.md)
- [Superadmin APIs](api/superadmin.md)
- [File Operations](api/files.md)

## Components

### Business Components
- [OKR Dashboard](components/okr-dashboard.md)
- [Profile Dropdown](components/profile-dropdown.md)
- [Dynamic Theme](components/dynamic-theme.md)
- [File Upload](components/file-upload.md)
- [Template Download](components/template-download.md)

### UI Components
- [Button](components/ui/button.md)
- [Card](components/ui/card.md)
- [Chart](components/ui/chart.md)
- [Avatar](components/ui/avatar.md)
- [Badge](components/ui/badge.md)
- [Calendar](components/ui/calendar.md)
- [Complete UI Library](components/ui/index.md)

## Custom Hooks
- [useChartData](hooks/useChartData.md)
- [useOKRData](hooks/useOKRData.md)
- [useUserProfile](hooks/useUserProfile.md)
- [useMobile](hooks/use-mobile.md)
- [useToast](hooks/use-toast.md)

## Utilities & Libraries
- [Authentication System](lib/auth.md)
- [Database Operations](lib/database.md)
- [Supabase Integration](lib/supabase.md)
- [Role Management](lib/roles.md)
- [Excel Template Generator](lib/excel.md)

## @sync Dependencies and Relations

### Component Dependencies
- **OKR Dashboard** → useChartData, useOKRData, Chart components
- **Profile Dropdown** → useUserProfile, Avatar, Button
- **Dynamic Theme** → Theme Provider, Tailwind config
- **File Upload** → Database operations, Toast notifications

### Hook Dependencies
- **useChartData** → Chart data processing, API calls
- **useOKRData** → OKR data management, real-time updates
- **useUserProfile** → Authentication context, profile APIs

### Utility Dependencies
- **Authentication** → Supabase, role permissions, middleware
- **Database** → Supabase client, type definitions
- **Theme System** → Tailwind config, CSS variables, glassmorphism

### External Dependencies
- **Next.js 15.2.4** - App Router, SSR, API routes
- **React 19** - Component library, hooks, context
- **TypeScript** - Type safety, interfaces, generics
- **Tailwind CSS** - Utility-first styling, custom theme
- **Radix UI** - Accessible component primitives
- **Recharts** - Data visualization library
- **Supabase** - Database, authentication, real-time

## Development Tools & Scripts

### Documentation Generation
```bash
npm run docs:build      # Generate all documentation
npm run docs:watch      # Watch files and auto-update docs
npm run docs:serve      # Serve documentation locally
npm run docs:validate   # Validate documentation completeness
```

### Analysis Commands
```bash
npm run deps:analyze    # Generate dependency graphs
npm run deps:circular   # Find circular dependencies
npm run deps:unused     # Find unused dependencies
```

## Maintenance

### Automatic Updates
- File watchers monitor source code changes
- Git hooks update documentation on commits
- CI/CD pipeline regenerates docs on releases

### Manual Updates
- Run `npm run docs:build` after major changes
- Update this README when adding new sections
- Review and update architectural diagrams quarterly

## Documentation Standards

### File Naming
- Use kebab-case for file names
- Include component/hook/utility name in filename
- Add appropriate file extension (.md for markdown)

### Content Structure
1. **Purpose** - What the component/hook/utility does
2. **Usage** - How to use it with examples
3. **Props/Parameters** - Detailed parameter documentation
4. **Dependencies** - What it depends on and what depends on it
5. **Examples** - Real-world usage examples
6. **Notes** - Important considerations or gotchas

### Code Examples
- Include TypeScript types in examples
- Show both basic and advanced usage
- Include error handling examples
- Demonstrate integration patterns

## Contributing to Documentation

1. Follow the established template structure
2. Include code examples for all features
3. Update dependency maps when adding new relationships
4. Run validation before committing changes
5. Keep documentation in sync with code changes

---

*This documentation is automatically synchronized with the codebase. Last updated: $(date)*