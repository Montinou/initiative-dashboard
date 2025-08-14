# Initiative Dashboard - Documentation

## 📁 Documentation Structure

```
docs/
├── README.md                    # This file - Main documentation index
├── design-system/              # **NEW** Complete Design System Documentation
│   ├── README.md               # Design system overview and philosophy
│   ├── components.md           # Comprehensive component API reference
│   ├── glassmorphism.md        # Glassmorphism implementation guide
│   ├── examples.md             # Real-world usage examples and patterns
│   └── migration.md            # Migration guide from legacy components
├── architecture/               
│   ├── overview.md             # System architecture overview
│   └── multi-tenant.md         # Multi-tenant architecture details
├── database/
│   ├── schema.md              # Database schema documentation
│   ├── migrations.md          # Migration guide and history
│   └── prod-public-schema.sql # Current production schema
├── api/
│   ├── endpoints.md           # API endpoints documentation
│   ├── authentication.md      # Auth flow and session management
│   └── kpi-analytics.md       # KPI and analytics APIs
├── frontend/
│   ├── hooks.md              # Custom hooks documentation
│   └── state-management.md   # State and context management
├── data-import/
│   └── okr-file-processing-and-bot-integration.md # Server file processing + DF bot integration plan
└── deployment/
    ├── setup.md              # Initial setup guide
    ├── environment.md        # Environment variables
    └── production.md         # Production deployment guide
```

## 🚀 Quick Links

### 🎨 Design System (NEW)
- [**Design System Overview**](./design-system/README.md) - Philosophy, architecture, and key features
- [**Component Documentation**](./design-system/components.md) - Complete API reference for all components
- [**Glassmorphism Guide**](./design-system/glassmorphism.md) - Implementation and best practices
- [**Usage Examples**](./design-system/examples.md) - Real-world patterns and tenant implementations
- [**Migration Guide**](./design-system/migration.md) - Step-by-step component migration instructions

### 🏗️ System Documentation
- [Architecture Overview](./architecture/overview.md)
- [Database Schema](./database/schema.md)
- [API Documentation](./api/endpoints.md)
- [Setup Guide](./deployment/setup.md)
- [OKR File Processing & Bot Integration](./data-import/okr-file-processing-and-bot-integration.md)

## 📊 Current System Status

- **Database**: PostgreSQL with Supabase
- **Backend**: Next.js 15 API Routes
- **Frontend**: React with TypeScript
- **Authentication**: Supabase Auth with Row Level Security
- **Multi-tenancy**: Tenant-based isolation

## 🔄 Recent Updates (2025-08-14)

1. **Documentation Cleanup (2025-08-14)**
   - Removed temporary investigation and analysis files
   - Organized documentation structure with archive folder
   - Updated command references to use npm instead of pnpm
   - Corrected Next.js version references to v15

2. **Fixed Authentication Issues**
   - Updated `getUserProfile` to return both user and profile objects
   - Fixed all dashboard API endpoints authentication

3. **Fixed Schema Issues**
   - Resolved `quarterInputSchema.omit()` error by separating base schema
   - Added missing database columns (status, avatar_url, phone, etc.)

4. **Fixed Frontend Display**
   - Updated initiative hooks to properly map data fields
   - Fixed status filtering to match database values
   - Added proper field mappings (title → name, area object → area name)

5. **API Improvements**
   - KPI Analytics API now returns proper metrics
   - Initiative API correctly handles tenant filtering
   - All dashboard endpoints working with production schema

## 📈 Current Data

### Tenants
- **Default** (a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11)
- **MF** (a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12)

### Areas
- Comercial
- Producto
- Operaciones
- Recursos Humanos

### Initiatives (4 total)
- 2 in SIGA tenant (Comercial, Producto)
- 2 in MF tenant (Operaciones, RRHH)
- All showing 50-100% progress

### Users
- CEO, Admin, and Managers for both tenants
- All using password: `demo123456`

## 🛠️ Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run tests
npm run test
```

## 📝 License

Private project - All rights reserved