# Local Development Setup Guide

## Prerequisites

### System Requirements
- **Node.js**: Version 22.x (required)
- **npm**: Version 10.x or higher
- **Git**: Latest version
- **PostgreSQL**: Via Supabase (cloud or local)

### Required Accounts
- **Supabase**: For database and authentication
- **Google Cloud**: For storage and AI services (optional)
- **Vercel**: For deployment (optional)

## Initial Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd initiative-dashboard
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env.local` file in the root directory:

```bash
# Supabase Configuration (Required)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Database URL (Required for migrations)
DATABASE_URL=postgresql://postgres:[password]@[host]:[port]/postgres

# Google Cloud (Optional - for file storage)
GCP_PROJECT_ID=your_project_id
GCP_BUCKET_NAME=your_bucket_name
GCP_SERVICE_ACCOUNT_KEY=your_service_account_key

# Redis Configuration (Optional - for caching)
REDIS_URL=redis://localhost:6379
UPSTASH_REDIS_REST_URL=your_upstash_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_token

# AI Services (Optional)
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_key
VERTEX_AI_PROJECT=your_vertex_project
VERTEX_AI_LOCATION=us-central1

# Application Settings
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

### 4. Database Setup

#### Option A: Using Supabase Cloud
1. Create a new project at [supabase.com](https://supabase.com)
2. Copy the project URL and anon key to `.env.local`
3. Run migrations:

```bash
npm run db:migrate
```

#### Option B: Using Local Supabase
1. Install Supabase CLI:
```bash
brew install supabase/tap/supabase
```

2. Initialize and start local Supabase:
```bash
supabase init
supabase start
```

3. Apply migrations:
```bash
supabase db push
```

### 5. Seed the Database (Development Only)

```bash
npm run db:seed
```

This creates test data including:
- 3 tenants (SIGA, FEMA, Stratix)
- Sample users with different roles
- Test objectives, initiatives, and activities

**Default Test Credentials:**
- CEO: `ceo@siga.com` / `demo123456`
- Admin: `admin@siga.com` / `demo123456`
- Manager: `manager@siga.com` / `demo123456`

## Development Workflow

### 1. Start Development Server

```bash
npm run dev
```

Access the application at:
- Main: http://localhost:3000
- SIGA tenant: http://siga.localhost:3000
- FEMA tenant: http://fema.localhost:3000
- Stratix tenant: http://stratix.localhost:3000

### 2. Development Commands

```bash
# Start development server
npm run dev

# Run linting
npm run lint

# Build for production
npm run build

# Start production server
npm run start
```

### 3. Testing Commands

```bash
# Run all tests
npm run test:all

# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Visual regression tests
npm run test:visual

# Test with coverage
npm run test:coverage
```

### 4. Database Commands

```bash
# Run migrations
npm run db:migrate

# Seed database
npm run db:seed

# Reset cache
npm run db:reset-cache
```

## Multi-Tenant Development

### Tenant Isolation
The application uses Row Level Security (RLS) to isolate tenant data:

1. **Subdomain Detection**: Tenants are identified by subdomain
2. **Automatic Filtering**: All queries are filtered by `tenant_id`
3. **RLS Policies**: Database-level security enforces isolation

### Testing Different Tenants

1. **Modify hosts file** (optional for local subdomain testing):
```bash
# /etc/hosts
127.0.0.1 siga.localhost
127.0.0.1 fema.localhost
127.0.0.1 stratix.localhost
```

2. **Use tenant query parameter**:
```
http://localhost:3000?tenant=siga
http://localhost:3000?tenant=fema
```

## Troubleshooting

### Common Issues

#### 1. Authentication Errors
```bash
# Clear Supabase auth cookies
localStorage.clear()
# Restart development server
npm run dev
```

#### 2. Database Connection Issues
```bash
# Check Supabase status
supabase status

# Verify environment variables
echo $NEXT_PUBLIC_SUPABASE_URL
```

#### 3. Port Already in Use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Use different port
PORT=3001 npm run dev
```

#### 4. Module Not Found Errors
```bash
# Clear cache and reinstall
rm -rf node_modules .next
npm install
npm run dev
```

#### 5. TypeScript Errors
```bash
# Regenerate types
npm run build
# Check for type issues
npx tsc --noEmit
```

## IDE Setup

### VS Code Extensions
Recommended extensions for optimal development experience:

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "prisma.prisma",
    "ms-vscode.vscode-typescript-next",
    "christian-kohler.path-intellisense",
    "formulahendry.auto-rename-tag",
    "csstools.postcss",
    "mikestead.dotenv"
  ]
}
```

### VS Code Settings
`.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "tailwindCSS.experimental.classRegex": [
    ["cn\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"]
  ]
}
```

## Performance Monitoring

### Development Tools

1. **Bundle Analysis**:
```bash
npm run perf:analyze
```

2. **Performance Monitoring**:
```bash
npm run perf:monitor
```

3. **React DevTools**:
- Install browser extension
- Monitor component renders
- Profile performance

## Security Considerations

### Development Best Practices

1. **Never commit sensitive data**:
   - Use `.env.local` for secrets
   - Add to `.gitignore`

2. **Use development credentials**:
   - Separate development/production databases
   - Use test API keys

3. **Enable security headers**:
   - Configure in `next.config.mjs`
   - Test with security tools

## Next Steps

1. Review [Coding Standards](./coding-standards.md)
2. Understand [State Management](./state-management.md)
3. Learn about [Custom Hooks](./hooks-guide.md)
4. Check [Performance Guide](./performance-guide.md)
5. Read [Contribution Guide](./contribution-guide.md)