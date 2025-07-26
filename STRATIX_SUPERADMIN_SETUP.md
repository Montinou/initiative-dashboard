# 🚀 Stratix Superadmin System - Complete Setup Guide

## ✅ Current Status
- **Platform**: Stratix (updated from Mariana)
- **IP Restrictions**: Disabled (access from any IP)
- **Year**: 2025
- **Credentials**: `agusmontoya@gmail.com` / `btcStn60`

---

## 🔧 Step 1: Run Database Setup

### Option A: Run the Main Setup Script
Copy and paste this into your [Supabase SQL Editor](https://supabase.com/dashboard/project/zkkdnslupqnpioltjpeu/sql):

```sql
-- Copy the entire contents of: run_setup.sql
```

### Option B: Manual Step-by-Step
1. First run: `supabase/migrations/20250126000001_clean_setup.sql`
2. Then run: `supabase/migrations/20250126000002_superadmin_schema.sql`
3. Finally run: `run_setup.sql`

---

## 🔍 Step 2: Verify Setup

Run the verification script in Supabase SQL Editor:
```sql
-- Copy the entire contents of: verify_superadmin.sql
```

**Expected Results:**
- `superadmin_exists` = 1
- `tables_created` = 3
- `functions_created` > 5

---

## 🚀 Step 3: Test Login

1. **Access the login page:**
   ```
   https://your-domain.com/superadmin/login
   ```

2. **Enter credentials:**
   - **Email**: `agusmontoya@gmail.com`
   - **Password**: `btcStn60`

3. **Expected outcome:**
   - Successful redirect to `/superadmin/dashboard`
   - Dashboard shows platform statistics
   - No "Invalid credentials" or IP restriction errors

---

## 🛠️ Troubleshooting

### Issue: "Invalid credentials"

**Possible causes & solutions:**

1. **Superadmin not created:**
   ```sql
   -- Check if superadmin exists
   SELECT * FROM public.superadmins WHERE email = 'agusmontoya@gmail.com';
   ```
   - If no results: Run `run_setup.sql`

2. **Wrong password hash:**
   ```sql
   -- Update with correct hash
   UPDATE public.superadmins 
   SET password_hash = 'X5r82Pe1p8sNuKreBKDPiWBfF/iD6Tn8EE+QdkTeIFBNjoHQds77KhhQzDkkeSX2'
   WHERE email = 'agusmontoya@gmail.com';
   ```

3. **RLS blocking access:**
   ```sql
   -- Check RLS policies
   SELECT * FROM pg_policies WHERE tablename = 'superadmins';
   ```

### Issue: "IP not whitelisted"
- **Fixed**: IP restrictions are now disabled
- All IPs are allowed for superadmin access

### Issue: Network/Database errors
- Verify Supabase connection
- Check environment variables:
  ```env
  NEXT_PUBLIC_SUPABASE_URL=https://zkkdnslupqnpioltjpeu.supabase.co
  SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
  ```

---

## 📋 Features Available

Once logged in, the superadmin can:

### **Dashboard Overview**
- ✅ Real-time platform statistics
- ✅ Tenant count and status
- ✅ User distribution by role
- ✅ Recent activity monitoring

### **Tenant Management**
- ✅ View all tenants (FEMA + SIGA)
- ✅ Create new tenant organizations
- ✅ Edit tenant settings and status
- ✅ Apply organizational templates

### **User Management**
- ✅ View users across all tenants
- ✅ Create users for any organization
- ✅ Assign roles and areas
- ✅ Manage user permissions

### **Audit & Monitoring**
- ✅ Complete audit log access
- ✅ Login/logout tracking
- ✅ Action history across platform
- ✅ Security monitoring

---

## 🔒 Security Features

- **Session Management**: 30-minute timeout
- **Password Security**: PBKDF2 hashing (100k iterations)
- **Audit Logging**: All actions logged
- **Rate Limiting**: Prevents brute force attacks
- **Role-Based Access**: Granular permissions

---

## 📊 Sample Data Included

### **Tenants:**
1. **FEMA Electricidad** (`fema-electricidad`)
   - 6 areas/divisions
   - 12+ sample initiatives

2. **SIGA Automatización** (`siga-automatizacion`)
   - 4 business areas
   - 4 high-priority initiatives

### **Area Templates:**
- Manufacturing Company (10 departments)
- Technology Startup (8 areas)

---

## ✅ Success Checklist

- [ ] Database migrations completed
- [ ] Superadmin created: `agusmontoya@gmail.com`
- [ ] Login successful at `/superadmin/login`
- [ ] Dashboard loads with statistics
- [ ] Can view tenant list (2 tenants)
- [ ] Can navigate between sections
- [ ] No console errors or access issues

---

## 🎯 Final Notes

- **Copyright**: Updated to © 2025 Stratix Platform
- **Branding**: All Mariana references changed to Stratix
- **IP Access**: No restrictions (can access from anywhere)
- **Credentials**: `agusmontoya@gmail.com` / `btcStn60`

**🎉 Your Stratix superadmin system is ready for production use!**