# Multi-Domain Theme Configuration Summary

## 🎨 Current Theme Colors & Routing

### 1. **Stratix Platform** (Demo/Landing)
- **Domain**: `stratix-platform.vercel.app`
- **Tenant ID**: `stratix-demo`
- **Theme Colors**:
  - Primary: `#6366f1` (indigo-500)
  - Secondary: `#ec4899` (pink-500)
  - Accent: `#14b8a6` (teal-500)
  - Background: `#0f172a` (slate-900)
  - Gradient: `from-indigo-950 via-purple-950 to-pink-950`
- **Icon**: Building (corporate)
- **Industry**: Enterprise Management Platform
- **Routing**: 
  - `/` → `/demo` (landing page)
  - `/auth/login` → Allows access to any tenant (demo purposes)
  - Full demo functionality with client showcases

### 2. **FEMA Electricidad** (Client)
- **Domain**: `fema-electricidad.vercel.app`
- **Tenant ID**: `fema-electricidad`
- **Theme Colors**:
  - Primary: `#8b5cf6` (purple-500)
  - Secondary: `#06b6d4` (cyan-500)
  - Accent: `#3b82f6` (blue-500)
  - Background: `#1e1b4b` (indigo-900)
  - Gradient: `from-purple-900 via-blue-900 to-cyan-900`
- **Icon**: Zap (electrical/power)
- **Industry**: Electricidad y Energía
- **Routing**:
  - `/` → `/auth/login` (direct to login)
  - `/demo` → `/auth/login` (blocked)
  - Login restricted to FEMA tenant only

### 3. **SIGA Turismo** (Client)
- **Domain**: `siga-turismo.vercel.app`
- **Tenant ID**: `siga-turismo`
- **Theme Colors**:
  - Primary: `#10b981` (emerald-500)
  - Secondary: `#f59e0b` (amber-500)
  - Accent: `#06b6d4` (cyan-500)
  - Background: `#064e3b` (emerald-900)
  - Gradient: `from-emerald-900 via-teal-900 to-amber-900`
- **Icon**: Map (travel/tourism)
- **Industry**: Turismo y Viajes
- **Routing**:
  - `/` → `/auth/login` (direct to login)
  - `/demo` → `/auth/login` (blocked)
  - Login restricted to SIGA tenant only

## 🚀 Theming Strategy

### Domain-Based Theming (Login Pages)
- Initial theme determined by domain for login pages
- Shows appropriate company branding on login
- Validates user belongs to domain's tenant during authentication

### Organization-Based Theming (After Login)
- Dashboard theme switches to user's organization (tenant_id)
- Allows for consistent branding regardless of access domain
- User's organization data drives theme selection

### Localhost Behavior
- Defaults to Stratix Platform theme
- Routes to demo page by default
- Allows access to all features for development

## 🔐 Security & Access Control

### Domain Restrictions
- **FEMA domain**: Only FEMA tenant users can log in
- **SIGA domain**: Only SIGA tenant users can log in  
- **Stratix domain**: All tenants allowed (demo purposes)

### Middleware Enforcement
- Domain-based routing enforced at middleware level
- Authentication validation per domain restrictions
- Automatic sign-out if user doesn't belong to domain's tenant

## 📱 Features by Domain

### All Domains Support
- ✅ Role-based access control (CEO, Admin, Manager, Analyst)
- ✅ OKR department tracking (Admin/CEO only)
- ✅ File upload and Excel processing
- ✅ Real-time analytics and visualizations
- ✅ Multi-sheet Excel support
- ✅ Authentication with Supabase

### Stratix Platform Exclusive
- ✅ Beautiful demo/landing page
- ✅ Client success stories showcase
- ✅ Feature highlights and marketing content
- ✅ "Try Demo" links to client domains

## 🎯 User Experience Flow

1. **User visits domain** → Middleware routes based on domain
2. **Domain shows login** → Theme applied based on domain
3. **User logs in** → Validation against domain tenant restriction
4. **Dashboard loads** → Theme switches to user's organization
5. **Features available** → Based on user role and organization

This creates a seamless multi-tenant experience with proper branding and security isolation between organizations.