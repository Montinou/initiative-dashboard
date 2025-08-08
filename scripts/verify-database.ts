import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing required environment variables');
  process.exit(1);
}

// Create Supabase admin client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function verifyDatabase() {
  console.log('🔍 Verifying Database Data...\n');
  console.log('Database URL:', SUPABASE_URL);
  console.log('=====================================\n');

  try {
    // 1. Check Organizations
    console.log('📦 ORGANIZATIONS:');
    const { data: orgs, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .order('name');
    
    if (orgError) {
      console.error('Error fetching organizations:', orgError);
    } else {
      console.log(`Found ${orgs?.length || 0} organizations:`);
      orgs?.forEach(org => {
        console.log(`  - ${org.name} (ID: ${org.id})`);
      });
    }
    console.log();

    // 2. Check Tenants
    console.log('🏢 TENANTS:');
    const { data: tenants, error: tenantError } = await supabase
      .from('tenants')
      .select('*, organizations(name)')
      .order('subdomain');
    
    if (tenantError) {
      console.error('Error fetching tenants:', tenantError);
    } else {
      console.log(`Found ${tenants?.length || 0} tenants:`);
      tenants?.forEach(tenant => {
        console.log(`  - ${tenant.subdomain} (Org: ${tenant.organizations?.name}, ID: ${tenant.id})`);
      });
    }
    console.log();

    // 3. Check User Profiles with roles
    console.log('👥 USER PROFILES:');
    const { data: profiles, error: profileError } = await supabase
      .from('user_profiles')
      .select('*, tenants(subdomain)')
      .order('role', { ascending: false });
    
    if (profileError) {
      console.error('Error fetching profiles:', profileError);
    } else {
      console.log(`Found ${profiles?.length || 0} user profiles:`);
      
      // Group by role
      const byRole = profiles?.reduce((acc, profile) => {
        const role = profile.role || 'Unknown';
        if (!acc[role]) acc[role] = [];
        acc[role].push(profile);
        return acc;
      }, {} as Record<string, any[]>);

      Object.entries(byRole || {}).forEach(([role, users]) => {
        console.log(`\n  ${role}s (${users.length}):`);
        users.forEach(user => {
          console.log(`    - ${user.full_name || 'No name'} <${user.email}>`);
          console.log(`      Tenant: ${user.tenants?.subdomain || 'No tenant'}, Active: ${user.is_active}`);
        });
      });
    }
    console.log();

    // 4. Check Areas
    console.log('🏗️ AREAS:');
    const { data: areas, error: areaError } = await supabase
      .from('areas')
      .select('*, tenants(subdomain)')
      .order('tenant_id, name');
    
    if (areaError) {
      console.error('Error fetching areas:', areaError);
    } else {
      console.log(`Found ${areas?.length || 0} areas:`);
      
      // Group by tenant
      const byTenant = areas?.reduce((acc, area) => {
        const tenant = area.tenants?.subdomain || 'Unknown';
        if (!acc[tenant]) acc[tenant] = [];
        acc[tenant].push(area);
        return acc;
      }, {} as Record<string, any[]>);

      Object.entries(byTenant || {}).forEach(([tenant, tenantAreas]) => {
        console.log(`\n  ${tenant} (${tenantAreas.length} areas):`);
        tenantAreas.forEach(area => {
          console.log(`    - ${area.name}: ${area.description || 'No description'}`);
        });
      });
    }
    console.log();

    // 5. Check Auth Users (if we have access)
    console.log('🔐 AUTH USERS:');
    try {
      const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
      
      if (authError) {
        console.error('Error fetching auth users:', authError);
      } else {
        console.log(`Found ${users?.length || 0} auth users:`);
        
        // Match with profiles
        const emailToProfile = profiles?.reduce((acc, p) => {
          acc[p.email] = p;
          return acc;
        }, {} as Record<string, any>) || {};

        users?.forEach(user => {
          const profile = emailToProfile[user.email || ''];
          console.log(`  - ${user.email} (Auth ID: ${user.id.substring(0, 8)}...)`);
          if (profile) {
            console.log(`    ✅ Has profile: ${profile.role} at ${profile.tenants?.subdomain || 'No tenant'}`);
          } else {
            console.log(`    ⚠️  No profile found`);
          }
        });
      }
    } catch (e) {
      console.log('  ⚠️  Cannot access auth.users (may need service role key for production)');
    }
    console.log();

    // 6. Check Initiatives
    console.log('🎯 INITIATIVES:');
    const { data: initiatives, error: initError } = await supabase
      .from('initiatives')
      .select('*, areas(name), tenants(subdomain)')
      .order('tenant_id, name');
    
    if (initError) {
      console.error('Error fetching initiatives:', initError);
    } else {
      console.log(`Found ${initiatives?.length || 0} initiatives:`);
      initiatives?.forEach(init => {
        console.log(`  - ${init.name} (${init.areas?.name || 'No area'} at ${init.tenants?.subdomain || 'No tenant'})`);
        console.log(`    Status: ${init.status}, Progress: ${init.progress}%`);
      });
    }
    console.log();

    // 7. Summary
    console.log('=====================================');
    console.log('📊 SUMMARY:');
    console.log(`  Organizations: ${orgs?.length || 0}`);
    console.log(`  Tenants: ${tenants?.length || 0}`);
    console.log(`  User Profiles: ${profiles?.length || 0}`);
    console.log(`  Areas: ${areas?.length || 0}`);
    console.log(`  Initiatives: ${initiatives?.length || 0}`);
    
    // Check for CEO/Admin users
    const ceoAdmins = profiles?.filter(p => ['CEO', 'Admin'].includes(p.role));
    console.log(`\n  CEO/Admin users: ${ceoAdmins?.length || 0}`);
    ceoAdmins?.forEach(user => {
      console.log(`    - ${user.email} (${user.role})`);
    });

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run verification
verifyDatabase().then(() => {
  console.log('\n✅ Database verification complete');
}).catch(error => {
  console.error('❌ Verification failed:', error);
  process.exit(1);
});