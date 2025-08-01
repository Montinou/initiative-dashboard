# 🧹 LEGACY AUTH CLEANUP PLAN

## **FILES TO REMOVE** (Safe to delete)

### **1. Legacy Supabase Clients**
```bash
rm lib/supabase.ts                 # ❌ Original legacy client
rm lib/supabase-legacy.ts          # ❌ Temporary compatibility layer  
rm lib/supabase-client.ts          # ❌ Duplicate of utils/supabase/client.ts
```

### **2. Outdated Auth Utilities** (if they exist)
```bash
rm lib/auth-hooks.ts               # ❌ If exists - replaced by auth-context
rm lib/auth-validator.ts           # ❌ If exists - replaced by server actions
rm lib/database.ts                 # ❌ If exists - use utils/supabase/* instead
rm lib/edge-compatible-auth.ts     # ❌ If exists - replaced by SSR clients
rm lib/route-protection.ts         # ❌ If exists - replaced by protected-route.tsx
rm lib/use-auth-redirect.ts        # ❌ If exists - replaced by protected-route.tsx
```

## **PATTERNS TO REPLACE**

### **1. Update Login Page to Use Server Actions**
Current `app/auth/login/page.tsx` uses client-side auth - should be updated to use the new server actions.

### **2. Replace Direct Supabase Imports**
Find and replace any remaining:
```typescript
// ❌ Old pattern
import { supabase } from '@/lib/supabase'

// ✅ New pattern  
import { createClient } from '@/utils/supabase/client'  // Client components
import { createClient } from '@/utils/supabase/server'  // Server components
```

### **3. Update Auth Context Usage**
Replace direct `supabase.auth` calls with the auth context:
```typescript
// ❌ Old pattern
const { data: { session } } = await supabase.auth.getSession()

// ✅ New pattern
const { session } = useAuth()
```

### **4. Consolidate Auth Guards**
Replace custom auth guards with the new `ProtectedRoute` component:
```typescript
// ❌ Old pattern
<AuthGuard>
  <ComponentHere />
</AuthGuard>

// ✅ New pattern
<ProtectedRoute requiredRole={['CEO', 'Admin']}>
  <ComponentHere />
</ProtectedRoute>
```

## **API ROUTES TO REVIEW**

These may still have mixed patterns:
- `app/api/dashboard/status-distribution/route.ts`
- `app/api/dashboard/progress-distribution/route.ts`  
- `app/api/okrs/departments/route.ts`
- `app/api/profile/upload-image/route.ts`
- `app/api/profile/company/route.ts`

## **THEME CONFIG UPDATE**

`lib/theme-config.ts` still uses legacy client - should be updated to work with both server/client contexts or moved to server-only.

## **SUPERADMIN MIDDLEWARE**

Files like `lib/superadmin-middleware.ts` should be reviewed to ensure they use proper SSR patterns.

---

## **CLEANUP BENEFITS**

✅ **Consistency** - Single auth approach across entire app  
✅ **Performance** - Remove unused code and imports  
✅ **Maintainability** - Clear patterns for future development  
✅ **Security** - Proper session handling everywhere  
✅ **Type Safety** - Consistent TypeScript patterns  

---

## **RECOMMENDED CLEANUP ORDER**

1. **Remove legacy files** (safe deletions)
2. **Update login page** to use server actions  
3. **Replace remaining legacy imports** 
4. **Consolidate auth guards**
5. **Update theme config** for SSR compatibility
6. **Test all auth flows** after cleanup

This cleanup will result in a **pure SSR Supabase implementation** with no mixed patterns.