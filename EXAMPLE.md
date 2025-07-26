# Stratix Platform

# Multi-Tenant Initiative Management Platform

## Overview

A sophisticated **multi-tenant dashboard application** designed for organizational strategic management and initiative tracking. The platform serves as a comprehensive solution for companies to monitor, analyze, and execute their strategic initiatives across different business areas.

## Business Characteristics

### <� **Core Value Proposition**
- **Strategic Initiative Tracking**: Real-time monitoring of organizational goals and projects
- **Multi-Tenant Architecture**: Secure, isolated environments for different companies
- **Corporate Branding**: Fully customizable themes matching each organization's brand identity
- **Analytics & Insights**: Data-driven decision making with comprehensive reporting

### <� **Target Industries**
The platform currently serves three distinct sectors:

1. **Enterprise Management** (Stratix Platform)
   - Comprehensive organizational management suite
   - Cross-industry applicable solutions
   - Demo environment for showcasing capabilities

2. **Electrical & Energy** (FEMA Electricidad)
   - Industrial electrical solutions
   - Product lifecycle management
   - E-commerce integration

3. **Tourism & Travel** (SIGA Turismo)
   - Tour operations management
   - Customer experience optimization
   - Digital marketing coordination

### =� **Business Features**
- **Role-Based Access Control**: CEO, Admin, Manager, and Analyst permissions
- **Area-Based Organization**: Departmental structure with hierarchical management
- **Progress Tracking**: Real-time initiative and activity monitoring
- **Obstacle & Enabler Management**: Structured problem identification and solution tracking
- **Corporate Theming**: Brand-specific visual identity for each tenant

### =� **Key Performance Indicators**
- Initiative completion rates and timeline adherence
- Area-wise performance metrics
- Resource allocation efficiency
- User engagement and adoption metrics

## Technical Characteristics

### <� **Architecture & Framework**
- **Next.js 15.2.4** with App Router architecture
- **React 19** with TypeScript for type-safe development
- **Multi-tenant SaaS** architecture with domain-based routing
- **Responsive Design** with mobile-first approach

### <� **Design System**
- **Glassmorphism UI**: Modern glass-effect design with backdrop blur
- **Tailwind CSS**: Utility-first styling with custom theme extensions
- **Radix UI Components**: 40+ accessible, unstyled UI primitives
- **Corporate Branding**: Dynamic theming based on tenant configuration

### =� **Database & Backend**
- **Supabase**: PostgreSQL database with real-time capabilities
- **Row Level Security (RLS)**: Tenant isolation and data security
- **UUID-based Architecture**: Scalable identifier system
- **Automated User Management**: Domain-based tenant assignment

### = **Security & Authentication**
- **Supabase Auth**: Secure authentication with JWT tokens
- **Multi-Tenant Isolation**: Complete data segregation between organizations
- **Role-Based Permissions**: Granular access control system
- **Domain Restrictions**: Tenant-specific access controls

### =� **User Interface**
- **Dynamic Theming**: Real-time theme switching based on domain
- **Interactive Dashboards**: Rich data visualization with Recharts
- **Responsive Components**: Mobile and desktop optimized layouts
- **Accessibility**: WCAG compliant with screen reader support

### =� **Development & Deployment**
- **Vercel Deployment**: Automated CI/CD with Git integration
- **TypeScript**: End-to-end type safety
- **ESLint & Prettier**: Code quality and consistency
- **Hot Reloading**: Rapid development feedback loop

### =� **Data Visualization**
- **Recharts Integration**: Interactive charts and graphs
- **Real-time Updates**: Live data synchronization
- **Custom Analytics**: Tailored metrics for each industry
- **Export Capabilities**: Data export in multiple formats

### =' **Key Technical Features**

#### Multi-Tenant Architecture
```typescript
// Domain-based tenant resolution
export function getThemeFromDomain(hostname: string): CompanyTheme {
  if (hostname.includes('fema-electricidad')) return COMPANY_THEMES['fema-electricidad'];
  if (hostname.includes('siga-turismo')) return COMPANY_THEMES['siga-turismo'];
  return COMPANY_THEMES['stratix-platform']; // Default
}
```

#### Database Schema
- **Tenants**: Organization management with industry-specific configuration
- **Areas**: Departmental structure with hierarchical relationships
- **Users**: Role-based user management with tenant isolation
- **Initiatives**: Strategic project tracking with progress monitoring
- **Activities**: Task-level granularity with assignment and deadlines

#### Corporate Theming
- **FEMA Electricidad**: FEMA Blue (#00539F) with Accent Yellow (#FFC72C)
- **SIGA Turismo**: Vibrant Green (#00A651) with Action Yellow (#FDC300)
- **Stratix Platform**: Indigo-Purple gradient theme for enterprise appeal

## Development Commands

```bash
# Development server
npm run dev

# Production build
npm run build

# Start production server
npm run start

# Code linting
npm run lint
```

## Database Management

The platform includes comprehensive database management scripts:

- **`reset-database.sql`**: Complete database reset with tenant setup
- **`populate-demo-data.sql`**: Sample data for development and demonstrations
- **`setup-fresh-database.mjs`**: Automated user account creation

## Deployment Architecture

### Production Domains
- **Stratix Platform**: `stratix-platform.vercel.app`
- **FEMA Electricidad**: `fema-electricidad.vercel.app`
- **SIGA Turismo**: `siga-turismo.vercel.app`

### Environment Configuration
- **Next.js Config**: Optimized for production deployment
- **Vercel Integration**: Automatic deployments from Git
- **Environment Variables**: Secure configuration management
- **Custom Domain Support**: Brand-specific domain routing

## Competitive Advantages

1. **Industry Agnostic**: Adaptable to any business sector
2. **White-Label Ready**: Complete brand customization
3. **Scalable Architecture**: Supports unlimited tenants
4. **Modern Tech Stack**: Built with latest web technologies
5. **Security First**: Enterprise-grade security implementation
6. **Mobile Optimized**: Full functionality across all devices

## Future Roadmap

- **API Integration**: Third-party service connections
- **Advanced Analytics**: Machine learning insights
- **Mobile Applications**: Native iOS and Android apps
- **Workflow Automation**: Business process automation
- **Integration Hub**: Popular business tool integrations

---

**Built with modern web technologies for scalable, secure, and beautiful business management.**