import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Force local Supabase values for development seeding
const SUPABASE_URL = 'http://127.0.0.1:54321';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

console.log('Using Supabase URL:', SUPABASE_URL);
console.log('Service role key present:', !!SUPABASE_SERVICE_ROLE_KEY);

// Create Supabase admin client with service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Type definitions for better type safety
interface UserMapping {
  originalId: string;
  authId: string;
  email: string;
}

// Data from seed.sql
const seedData = {
  organizations: [
    { id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', name: 'Sega Turismo', description: 'Empresa líder en servicios de viajes y turismo.' },
    { id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', name: 'Fema Iluminación', description: 'Compañía especializada en soluciones de iluminación sostenible.' }
  ],
  tenants: [
    { id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', organization_id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', subdomain: 'sega_turismo' },
    { id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', organization_id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', subdomain: 'fema_iluminacion' }
  ],
  quarters: [
    { id: 'e1eebc99-9c0b-4ef8-bb6d-6bb9bd380b01', tenant_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', quarter_name: 'Q1', start_date: '2025-01-01', end_date: '2025-03-31' },
    { id: 'e1eebc99-9c0b-4ef8-bb6d-6bb9bd380b02', tenant_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', quarter_name: 'Q2', start_date: '2025-04-01', end_date: '2025-06-30' },
    { id: 'e1eebc99-9c0b-4ef8-bb6d-6bb9bd380b03', tenant_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', quarter_name: 'Q1', start_date: '2025-01-01', end_date: '2025-03-31' },
    { id: 'e1eebc99-9c0b-4ef8-bb6d-6bb9bd380b04', tenant_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', quarter_name: 'Q2', start_date: '2025-04-01', end_date: '2025-06-30' }
  ],
  areas: [
    // Sega Turismo areas
    { id: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', tenant_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', name: 'Corporativo', description: 'Area de direccion y gerencia general.', is_active: true },
    { id: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', tenant_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', name: 'Administracion', description: 'Area de contabilidad y finanzas.', is_active: true },
    { id: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', tenant_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', name: 'Capital Humano', description: 'Area de recursos humanos y gestion de talento.', is_active: true },
    { id: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a24', tenant_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', name: 'Comercial', description: 'Area de ventas y marketing.', is_active: true },
    { id: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a27', tenant_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', name: 'Producto', description: 'Area de desarrollo de productos y servicios turisticos.', is_active: true },
    // Fema Iluminación areas
    { id: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a25', tenant_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', name: 'Corporativo', description: 'Area de direccion y gerencia general.', is_active: true },
    { id: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a26', tenant_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', name: 'Administracion', description: 'Area de contabilidad y finanzas.', is_active: true },
    { id: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a28', tenant_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', name: 'Capital Humano', description: 'Area de recursos humanos y gestion de talento.', is_active: true },
    { id: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a29', tenant_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', name: 'Comercial', description: 'Area de ventas y marketing.', is_active: true },
    { id: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a30', tenant_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', name: 'Producto', description: 'Area de diseño y fabricacion de productos de iluminacion.', is_active: true }
  ],
  users: [
    { originalId: 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380b01', email: 'ceo_sega@example.com', password: 'demo123456' },
    { originalId: 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380b03', email: 'admin_sega@example.com', password: 'demo123456' },
    { originalId: 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380b05', email: 'manager_adm@sega.com', password: 'demo123456' },
    { originalId: 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380b06', email: 'manager_ch@sega.com', password: 'demo123456' },
    { originalId: 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380b07', email: 'manager_com@sega.com', password: 'demo123456' },
    { originalId: 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380b09', email: 'manager_prod@sega.com', password: 'demo123456' },
    { originalId: 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380b02', email: 'ceo_fema@example.com', password: 'demo123456' },
    { originalId: 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380b04', email: 'admin_fema@example.com', password: 'demo123456' },
    { originalId: 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380b08', email: 'manager_adm@fema.com', password: 'demo123456' },
    { originalId: 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380b10', email: 'manager_ch@fema.com', password: 'demo123456' },
    { originalId: 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380b11', email: 'manager_com@fema.com', password: 'demo123456' },
    { originalId: 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380b12', email: 'manager_prod@fema.com', password: 'demo123456' }
  ]
};

// Function to create users in auth.users
async function seedUsers(): Promise<UserMapping[]> {
  console.log('🔐 Creating/fetching users in auth.users...');
  const userMappings: UserMapping[] = [];

  for (const user of seedData.users) {
    try {
      // First, try to get existing user
      const { data: listData, error: listError } = await supabase.auth.admin.listUsers();
      
      if (listData && listData.users) {
        const existingUser = listData.users.find(u => u.email === user.email);
        
        if (existingUser) {
          userMappings.push({
            originalId: user.originalId,
            authId: existingUser.id,
            email: user.email
          });
          console.log(`✅ Found existing user: ${user.email}`);
          continue;
        }
      }

      // If user doesn't exist, create them
      const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true
      });

      if (error) {
        console.error(`Error creating user ${user.email}:`, error);
        continue;
      }

      if (data.user) {
        userMappings.push({
          originalId: user.originalId,
          authId: data.user.id,
          email: user.email
        });
        console.log(`✅ Created user: ${user.email}`);
      }
    } catch (error) {
      console.error(`Failed to create user ${user.email}:`, error);
    }
  }

  console.log(`✅ Found/created ${userMappings.length} users successfully`);
  return userMappings;
}

// Function to insert business data
async function seedBusinessData(userMappings: UserMapping[]) {
  console.log('\n📊 Inserting business data...');

  // Create a mapping object for easy lookup
  const userIdMap: Record<string, string> = {};
  userMappings.forEach(mapping => {
    userIdMap[mapping.originalId] = mapping.authId;
  });

  try {
    // 1. Insert organizations
    console.log('Inserting organizations...');
    const { error: orgError } = await supabase
      .from('organizations')
      .upsert(seedData.organizations, { onConflict: 'id' });
    if (orgError) throw orgError;

    // 2. Insert tenants
    console.log('Inserting tenants...');
    const { error: tenantError } = await supabase
      .from('tenants')
      .upsert(seedData.tenants, { onConflict: 'id' });
    if (tenantError) throw tenantError;

    // 3. Insert quarters
    console.log('Inserting quarters...');
    const { error: quarterError } = await supabase
      .from('quarters')
      .upsert(seedData.quarters, { onConflict: 'id' });
    if (quarterError) throw quarterError;

    // 4. Insert areas (without manager_id initially)
    console.log('Inserting areas...');
    const { error: areaError } = await supabase
      .from('areas')
      .upsert(seedData.areas, { onConflict: 'id' });
    if (areaError) throw areaError;

    // 5. Insert user profiles with mapped user IDs and additional fields
    console.log('Inserting user profiles...');
    const userProfiles = [
      // Sega Turismo profiles
      { 
        id: 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a31', 
        tenant_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 
        email: 'ceo_sega@example.com', 
        full_name: 'CEO Sega', 
        role: 'CEO', 
        area_id: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', 
        user_id: userIdMap['d3eebc99-9c0b-4ef8-bb6d-6bb9bd380b01'],
        is_active: true,
        phone: '+1234567890',
        avatar_url: null
      },
      { 
        id: 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 
        tenant_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 
        email: 'admin_sega@example.com', 
        full_name: 'Admin Sega', 
        role: 'Admin', 
        area_id: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', 
        user_id: userIdMap['d3eebc99-9c0b-4ef8-bb6d-6bb9bd380b03'],
        is_active: true,
        phone: '+1234567891',
        avatar_url: null
      },
      { 
        id: 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a35', 
        tenant_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 
        email: 'manager_adm@sega.com', 
        full_name: 'Manager Adm', 
        role: 'Manager', 
        area_id: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 
        user_id: userIdMap['d3eebc99-9c0b-4ef8-bb6d-6bb9bd380b05'],
        is_active: true,
        phone: null,
        avatar_url: null
      },
      { 
        id: 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a36', 
        tenant_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 
        email: 'manager_ch@sega.com', 
        full_name: 'Manager CH', 
        role: 'Manager', 
        area_id: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', 
        user_id: userIdMap['d3eebc99-9c0b-4ef8-bb6d-6bb9bd380b06'],
        is_active: true,
        phone: null,
        avatar_url: null
      },
      { 
        id: 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a37', 
        tenant_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 
        email: 'manager_com@sega.com', 
        full_name: 'Manager Comercial', 
        role: 'Manager', 
        area_id: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a24', 
        user_id: userIdMap['d3eebc99-9c0b-4ef8-bb6d-6bb9bd380b07'],
        is_active: true,
        phone: null,
        avatar_url: null
      },
      { 
        id: 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a39', 
        tenant_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 
        email: 'manager_prod@sega.com', 
        full_name: 'Manager Producto', 
        role: 'Manager', 
        area_id: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a27', 
        user_id: userIdMap['d3eebc99-9c0b-4ef8-bb6d-6bb9bd380b09'],
        is_active: true,
        phone: null,
        avatar_url: null
      },
      // Fema Iluminación profiles
      { 
        id: 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a32', 
        tenant_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 
        email: 'ceo_fema@example.com', 
        full_name: 'CEO Fema', 
        role: 'CEO', 
        area_id: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a25', 
        user_id: userIdMap['d3eebc99-9c0b-4ef8-bb6d-6bb9bd380b02'],
        is_active: true,
        phone: '+1234567892',
        avatar_url: null
      },
      { 
        id: 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a34', 
        tenant_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 
        email: 'admin_fema@example.com', 
        full_name: 'Admin Fema', 
        role: 'Admin', 
        area_id: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a25', 
        user_id: userIdMap['d3eebc99-9c0b-4ef8-bb6d-6bb9bd380b04'],
        is_active: true,
        phone: '+1234567893',
        avatar_url: null
      },
      { 
        id: 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a38', 
        tenant_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 
        email: 'manager_adm@fema.com', 
        full_name: 'Manager Adm', 
        role: 'Manager', 
        area_id: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a26', 
        user_id: userIdMap['d3eebc99-9c0b-4ef8-bb6d-6bb9bd380b08'],
        is_active: true,
        phone: null,
        avatar_url: null
      },
      { 
        id: 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a40', 
        tenant_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 
        email: 'manager_ch@fema.com', 
        full_name: 'Manager CH', 
        role: 'Manager', 
        area_id: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a28', 
        user_id: userIdMap['d3eebc99-9c0b-4ef8-bb6d-6bb9bd380b10'],
        is_active: true,
        phone: null,
        avatar_url: null
      },
      { 
        id: 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a41', 
        tenant_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 
        email: 'manager_com@fema.com', 
        full_name: 'Manager Comercial', 
        role: 'Manager', 
        area_id: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a29', 
        user_id: userIdMap['d3eebc99-9c0b-4ef8-bb6d-6bb9bd380b11'],
        is_active: true,
        phone: null,
        avatar_url: null
      },
      { 
        id: 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a42', 
        tenant_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 
        email: 'manager_prod@fema.com', 
        full_name: 'Manager Producto', 
        role: 'Manager', 
        area_id: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a30', 
        user_id: userIdMap['d3eebc99-9c0b-4ef8-bb6d-6bb9bd380b12'],
        is_active: true,
        phone: null,
        avatar_url: null
      }
    ];

    const { error: profileError } = await supabase
      .from('user_profiles')
      .upsert(userProfiles, { onConflict: 'id' });
    if (profileError) throw profileError;

    // 6. Update areas with manager_id
    console.log('Updating area managers...');
    const areaUpdates = [
      // Sega Turismo
      { id: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', manager_id: 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a35' },
      { id: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', manager_id: 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a36' },
      { id: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a24', manager_id: 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a37' },
      { id: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a27', manager_id: 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a39' },
      // Fema Iluminación
      { id: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a26', manager_id: 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a38' },
      { id: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a28', manager_id: 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a40' },
      { id: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a29', manager_id: 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a41' },
      { id: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a30', manager_id: 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a42' }
    ];

    for (const update of areaUpdates) {
      const { error } = await supabase
        .from('areas')
        .update({ manager_id: update.manager_id })
        .eq('id', update.id);
      if (error) throw error;
    }

    // 7. Insert objectives
    console.log('Inserting objectives...');
    const objectives = [
      { id: 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01', tenant_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', area_id: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a24', title: 'Incrementar visibilidad de destinos', description: 'Objetivo comercial para atraer más turistas mediante publicidad digital.', created_by: 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a37' },
      { id: 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d02', tenant_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', area_id: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a27', title: 'Mejorar experiencia de usuario en la app', description: 'Objetivo de producto para optimizar la plataforma de reservas online.', created_by: 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a39' },
      { id: 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d03', tenant_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', area_id: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a29', title: 'Lanzar nueva línea de eco-iluminación', description: 'Objetivo comercial para diversificar el catálogo de productos sostenibles.', created_by: 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a41' },
      { id: 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d04', tenant_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', area_id: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a30', title: 'Optimizar la cadena de producción', description: 'Objetivo de producción para reducir tiempos y costos de fabricación.', created_by: 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a42' }
    ];

    const { error: objError } = await supabase
      .from('objectives')
      .upsert(objectives, { onConflict: 'id' });
    if (objError) throw objError;

    // 8. Insert objective_quarters
    console.log('Inserting objective quarters...');
    const objectiveQuarters = [
      { objective_id: 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01', quarter_id: 'e1eebc99-9c0b-4ef8-bb6d-6bb9bd380b01' },
      { objective_id: 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d02', quarter_id: 'e1eebc99-9c0b-4ef8-bb6d-6bb9bd380b02' },
      { objective_id: 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d03', quarter_id: 'e1eebc99-9c0b-4ef8-bb6d-6bb9bd380b03' },
      { objective_id: 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d04', quarter_id: 'e1eebc99-9c0b-4ef8-bb6d-6bb9bd380b04' }
    ];

    const { error: oqError } = await supabase
      .from('objective_quarters')
      .upsert(objectiveQuarters, { onConflict: 'objective_id,quarter_id' });
    if (oqError) throw oqError;

    // 9. Insert initiatives
    console.log('Inserting initiatives...');
    const initiatives = [
      { id: 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380e01', tenant_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', area_id: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a24', title: 'Campaña "Verano en el Caribe"', description: 'Lanzar una campaña de marketing digital para promover paquetes de viajes.', created_by: 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a37', progress: 50 },
      { id: 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380e02', tenant_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', area_id: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a27', title: 'Integrar sistema de pago con PayPal', description: 'Desarrollar la integración de pagos en la plataforma web.', created_by: 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a39', progress: 75 },
      { id: 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380e03', tenant_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', area_id: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a29', title: 'Plan de lanzamiento de la Serie Eco', description: 'Estrategia de lanzamiento para la nueva línea de productos ecológicos.', created_by: 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a41', progress: 20 },
      { id: 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380e04', tenant_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', area_id: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a30', title: 'Automatizar línea de ensamblaje', description: 'Automatización de la línea de producción para mayor eficiencia.', created_by: 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a42', progress: 90 }
    ];

    const { error: initError } = await supabase
      .from('initiatives')
      .upsert(initiatives, { onConflict: 'id' });
    if (initError) throw initError;

    // 10. Insert objective_initiatives
    console.log('Inserting objective initiatives...');
    const objectiveInitiatives = [
      { objective_id: 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01', initiative_id: 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380e01' },
      { objective_id: 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d02', initiative_id: 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380e02' },
      { objective_id: 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d03', initiative_id: 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380e03' },
      { objective_id: 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d04', initiative_id: 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380e04' }
    ];

    const { error: oiError } = await supabase
      .from('objective_initiatives')
      .upsert(objectiveInitiatives, { onConflict: 'objective_id,initiative_id' });
    if (oiError) throw oiError;

    // 11. Insert activities
    console.log('Inserting activities...');
    const activities = [
      { id: 'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380f01', initiative_id: 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380e01', title: 'Diseñar creativos para redes sociales', description: 'Crear imágenes y videos de alta calidad para la campaña.', assigned_to: 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a37', is_completed: true },
      { id: 'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380f02', initiative_id: 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380e01', title: 'Negociar con influencers', description: 'Contactar a 5 influencers de viajes para colaboraciones.', assigned_to: 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a37', is_completed: false },
      { id: 'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380f03', initiative_id: 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380e02', title: 'Documentación técnica API PayPal', description: 'Escribir las especificaciones para los desarrolladores.', assigned_to: 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a39', is_completed: true },
      { id: 'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380f04', initiative_id: 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380e02', title: 'Implementar en frontend', description: 'Codificar la interfaz de usuario para el pago.', assigned_to: 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a39', is_completed: false },
      { id: 'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380f05', initiative_id: 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380e03', title: 'Investigar mercado de iluminación sostenible', description: 'Analizar competidores y tendencias del sector.', assigned_to: 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a41', is_completed: true },
      { id: 'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380f06', initiative_id: 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380e03', title: 'Diseñar packaging eco-friendly', description: 'Crear un empaque sostenible para la nueva línea de productos.', assigned_to: 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a41', is_completed: false },
      { id: 'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380f07', initiative_id: 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380e04', title: 'Comprar nueva maquinaria', description: 'Adquirir y programar robots para la línea de producción.', assigned_to: 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a42', is_completed: true },
      { id: 'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380f08', initiative_id: 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380e04', title: 'Capacitar al personal en el uso de los robots', description: 'Entrenar a los operarios en la nueva maquinaria.', assigned_to: 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a42', is_completed: true }
    ];

    const { error: actError } = await supabase
      .from('activities')
      .upsert(activities, { onConflict: 'id' });
    if (actError) throw actError;

    console.log('✅ Business data inserted successfully');
  } catch (error) {
    console.error('Error inserting business data:', error);
    throw error;
  }
}

// Main function to orchestrate the seeding process
async function main() {
  console.log('🌱 Starting database seeding process...\n');

  try {
    // Step 1: Create users in auth.users
    const userMappings = await seedUsers();

    if (userMappings.length === 0) {
      console.error('❌ No users were created. Aborting seeding process.');
      process.exit(1);
    }

    // Step 2: Insert business data with mapped user IDs
    await seedBusinessData(userMappings);

    console.log('\n✨ Database seeding completed successfully!');
    console.log('\n📝 Summary:');
    console.log(`   - Organizations: ${seedData.organizations.length}`);
    console.log(`   - Tenants: ${seedData.tenants.length}`);
    console.log(`   - Users: ${userMappings.length}`);
    console.log(`   - Areas: ${seedData.areas.length}`);
    console.log('\n🔑 Default password for all users: demo123456');
    
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Execute the main function
main();