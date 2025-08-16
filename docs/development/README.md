# Development Documentation

Welcome to the Initiative Dashboard development documentation. This comprehensive guide covers everything you need to know to develop, test, and contribute to the project.

## 📚 Documentation Structure

```
docs/development/
├── README.md              # This file - Development documentation index
├── setup-guide.md         # Local development setup and configuration
├── coding-standards.md    # Code style, conventions, and best practices
├── contribution-guide.md  # How to contribute to the project
├── hooks-guide.md         # Custom React hooks documentation
├── state-management.md    # State management patterns and strategies
└── performance-guide.md   # Performance optimization techniques
```

## 🚀 Quick Start

1. **[Setup Guide](./setup-guide.md)** - Get your development environment running
2. **[Coding Standards](./coding-standards.md)** - Learn our code conventions
3. **[State Management](./state-management.md)** - Understand data flow
4. **[Hooks Guide](./hooks-guide.md)** - Use our custom hooks
5. **[Performance Guide](./performance-guide.md)** - Optimize your code
6. **[Contribution Guide](./contribution-guide.md)** - Submit your changes

## 🏗️ Project Overview

### Technology Stack

| Category | Technology | Purpose |
|----------|------------|---------|
| **Frontend Framework** | Next.js 15 | React framework with SSR/SSG |
| **UI Library** | React 19 | Component library |
| **Language** | TypeScript 5.9 | Type-safe JavaScript |
| **Styling** | Tailwind CSS | Utility-first CSS |
| **UI Components** | Radix UI + shadcn/ui | Accessible component primitives |
| **Database** | PostgreSQL (Supabase) | Relational database with RLS |
| **Authentication** | Supabase Auth | JWT-based authentication |
| **State Management** | SWR + React Context | Server and client state |
| **Forms** | React Hook Form + Zod | Form handling and validation |
| **Testing** | Vitest + Playwright | Unit and E2E testing |
| **Package Manager** | npm | Dependency management |
| **Node Version** | 22.x | JavaScript runtime |

### Architecture Overview

```
┌─────────────────────────────────────────────┐
│            Next.js Application              │
├─────────────────────────────────────────────┤
│  App Router │ API Routes │ Middleware       │
├─────────────────────────────────────────────┤
│  Components │ Hooks │ Utils │ Services      │
├─────────────────────────────────────────────┤
│         Supabase (Database + Auth)          │
└─────────────────────────────────────────────┘
```

## 📁 Project Structure

```
initiative-dashboard/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── (auth)/            # Auth pages
│   ├── dashboard/         # Dashboard pages
│   ├── manager/           # Manager portal
│   ├── ceo/               # CEO dashboard
│   └── org-admin/         # Organization admin
├── components/            # React components
│   ├── ui/               # Base UI components
│   ├── dashboard/        # Dashboard components
│   ├── forms/            # Form components
│   └── charts/           # Chart components
├── hooks/                # Custom React hooks
├── lib/                  # Utilities and helpers
│   ├── types/           # TypeScript types
│   ├── validation/      # Validation schemas
│   └── utils/           # Utility functions
├── utils/               # Framework utilities
│   └── supabase/       # Supabase clients
├── locales/            # i18n translations
├── public/             # Static assets
└── supabase/           # Database migrations
```

## 🔑 Key Concepts

### Multi-Tenancy
- **Tenant Isolation**: Row Level Security (RLS) ensures data separation
- **Subdomain Detection**: Each tenant has a unique subdomain
- **Automatic Filtering**: All queries automatically filtered by tenant_id

### Role-Based Access Control (RBAC)
- **CEO**: Full access to all tenant data
- **Admin**: Administrative functions and user management
- **Manager**: Area-specific access and team management

### Data Flow
```
User Action → Hook → API Route → Supabase → RLS → Database
     ↑                                               ↓
     └──────────── Response with Data ←─────────────┘
```

## 🛠️ Development Workflow

### 1. Feature Development

```bash
# Create feature branch
git checkout -b feature/new-feature

# Develop your feature
npm run dev

# Run tests
npm run test

# Commit changes
git commit -m "feat: Add new feature"
```

### 2. Code Quality

```bash
# Lint code
npm run lint

# Type check
npx tsc --noEmit

# Format code
npx prettier --write .
```

### 3. Testing

```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Coverage report
npm run test:coverage
```

## 📊 Common Development Tasks

### Creating a New Component

1. Create component file in appropriate directory
2. Add TypeScript interfaces
3. Implement component logic
4. Add tests
5. Document props and usage

Example:
```typescript
// components/features/MyFeature.tsx
interface MyFeatureProps {
  title: string;
  onAction?: () => void;
}

export function MyFeature({ title, onAction }: MyFeatureProps) {
  return (
    <div>
      <h2>{title}</h2>
      <Button onClick={onAction}>Action</Button>
    </div>
  );
}
```

### Adding an API Endpoint

1. Create route file in `app/api/`
2. Implement authentication
3. Add validation
4. Handle business logic
5. Return appropriate response

Example:
```typescript
// app/api/my-endpoint/route.ts
export async function GET(request: NextRequest) {
  const { user, error } = await authenticateRequest(request);
  if (error) return NextResponse.json({ error }, { status: 401 });
  
  // Business logic
  const data = await fetchData();
  
  return NextResponse.json({ data });
}
```

### Creating a Custom Hook

1. Create hook file in `hooks/`
2. Define state and logic
3. Handle loading and errors
4. Export typed return value

Example:
```typescript
// hooks/useMyData.ts
export function useMyData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Fetch logic
  
  return { data, loading, error };
}
```

## 🧪 Testing Strategy

### Test Pyramid

```
        /\
       /E2E\      (10%) - Critical user journeys
      /──────\
     /Integration\ (30%) - API and service tests
    /────────────\
   /   Unit Tests  \ (60%) - Components and utilities
  /────────────────\
```

### Testing Guidelines

- Write tests alongside code
- Aim for 70% coverage minimum
- Test edge cases and error scenarios
- Use meaningful test descriptions
- Keep tests focused and isolated

## 🔒 Security Best Practices

1. **Always validate input** - Use Zod schemas
2. **Authenticate API routes** - Check user session
3. **Use RLS policies** - Database-level security
4. **Sanitize output** - Prevent XSS attacks
5. **Keep dependencies updated** - Regular security updates
6. **Never expose secrets** - Use environment variables
7. **Implement rate limiting** - Prevent abuse

## 📈 Performance Considerations

1. **Use Server Components** - When possible
2. **Implement lazy loading** - For heavy components
3. **Optimize images** - Use Next.js Image component
4. **Cache API responses** - With SWR
5. **Minimize bundle size** - Tree shake imports
6. **Use pagination** - For large datasets
7. **Profile regularly** - Monitor performance

## 🚀 Deployment

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm run start
```

### Environment Variables
Required for all environments:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Production only:
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`

## 📚 Additional Resources

### Internal Documentation
- [API Reference](../API_REFERENCE.md)
- [Technical Documentation](../TECHNICAL_DOCUMENTATION.md)
- [Database Schema](../database/schema.md)
- [Deployment Guide](../deployment/production.md)

### External Resources
- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Supabase Documentation](https://supabase.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)

## 💡 Tips & Tricks

### Development Efficiency

1. **Use VS Code snippets** for common patterns
2. **Enable hot reload** for faster development
3. **Use React DevTools** for debugging
4. **Monitor network tab** for API calls
5. **Use console groups** for organized logging

### Common Pitfalls to Avoid

1. **Don't bypass RLS** - Always respect tenant isolation
2. **Avoid any types** - Use proper TypeScript types
3. **Don't fetch in loops** - Batch operations
4. **Avoid inline styles** - Use Tailwind classes
5. **Don't ignore errors** - Handle all edge cases

## 🤝 Getting Help

If you need assistance:

1. Check this documentation
2. Search existing issues on GitHub
3. Ask in team discussions
4. Contact the maintainers

## 📝 License

This project is proprietary and confidential. All rights reserved.

---

**Last Updated:** 2025-08-16  
**Maintained by:** Development Team