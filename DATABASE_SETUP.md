# Database Setup Guide

## Quick Reset & Setup

To completely reset the database with fresh demo data for all three organizations:

### Option 1: Run the Node.js Script (Recommended)

```bash
node scripts/setup-fresh-database.mjs
```

This script will:
1. Drop and recreate all tables
2. Set up proper RLS policies  
3. Create demo users in Supabase Auth
4. Populate with realistic demo data

### Option 2: Manual SQL Execution

1. **Go to Supabase Dashboard → SQL Editor**
2. **Run the reset script:**
   ```sql
   -- Copy and paste contents of scripts/reset-database.sql
   ```
3. **Run the population script:**
   ```sql
   -- Copy and paste contents of scripts/populate-demo-data.sql
   ```
4. **Manually create user accounts in Supabase Auth** (see credentials below)

## Demo Organizations & Users

### 🏢 **Stratix Platform** (Demo/Corporate)
- **Domain**: `stratix-platform.vercel.app`
- **Theme**: Indigo/Pink/Teal
- **Users**:
  - CEO: `ceo@stratix-demo.com` / `password123`
  - Admin: `admin@stratix-demo.com` / `password123`
  - Manager: `manager@stratix-demo.com` / `password123`
  - Analyst: `analyst@stratix-demo.com` / `password123`

### ⚡ **FEMA Electricidad** (Client)
- **Domain**: `fema-electricidad.vercel.app` 
- **Theme**: Purple/Cyan/Blue
- **Users**:
  - CEO: `ceo@fema-electricidad.com` / `password123`
  - Admin: `admin@fema-electricidad.com` / `password123`
  - Manager: `jefe.electricidad@fema-electricidad.com` / `password123`
  - Manager: `jefe.iluminacion@fema-electricidad.com` / `password123`
  - Manager: `jefe.industria@fema-electricidad.com` / `password123`
  - Manager: `gerente.ecommerce@fema-electricidad.com` / `password123`
  - Analyst: `analista.gestion@fema-electricidad.com` / `password123`

### 🗺️ **SIGA Turismo** (Client)
- **Domain**: `siga-turismo.vercel.app`
- **Theme**: Emerald/Amber/Teal
- **Users**:
  - CEO: `ceo@siga-turismo.com` / `password123`
  - Admin: `admin@siga-turismo.com` / `password123`
  - Manager: `manager.operaciones@siga-turismo.com` / `password123`
  - Manager: `manager.reservas@siga-turismo.com` / `password123`
  - Analyst: `analista.marketing@siga-turismo.com` / `password123`

## Database Structure

### Tables Created:
- **tenants**: Organizations (stratix-demo, fema-electricidad, siga-turismo)
- **areas**: Organizational departments
- **users**: User profiles linked to Supabase Auth
- **initiatives**: Projects and initiatives per organization
- **activities**: Tasks within initiatives

### Security:
- Row Level Security (RLS) enabled on all tables
- Users can only access data from their tenant
- Proper foreign key relationships maintained

## Sample Data Included

Each organization has:
- **Realistic organizational areas** (6-9 areas per org)
- **Demo initiatives** (5-7 initiatives per org)
- **Proper progress tracking** (various statuses and progress percentages)
- **Obstacles and enablers** for each initiative
- **Target dates** for realistic project planning

## Verification

After setup, verify by:
1. Logging into each domain with demo credentials
2. Checking that each organization shows its own data
3. Confirming role-based access controls work
4. Testing the multi-domain theming

## Troubleshooting

If the script fails:
1. Check Supabase service role key is correct
2. Verify database connection in `.env.local`
3. Run SQL scripts manually in Supabase Dashboard
4. Check Supabase Auth for user creation issues