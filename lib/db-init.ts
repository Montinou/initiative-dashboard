import { createClient } from '@/utils/supabase/server';

export async function initializeDatabase() {
  const supabase = await createClient();

  // Check if tables exist by trying to query them
  const tables = ['tenants', 'user_profiles', 'areas', 'initiatives'];
  const missingTables: string[] = [];

  for (const table of tables) {
    const { error } = await supabase
      .from(table)
      .select('id')
      .limit(1);
    
    if (error && error.code === '42P01') { // Table does not exist
      missingTables.push(table);
    }
  }

  // Create missing tables
  if (missingTables.length > 0) {
    console.log('Creating missing tables:', missingTables);
    
    // Note: In production, you should use Supabase migrations
    // These are example table definitions (not currently used - prefer migrations)
    const _tableDefinitions = {
      tenants: `
        CREATE TABLE IF NOT EXISTS tenants (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          subdomain VARCHAR(255) UNIQUE,
          description TEXT,
          industry VARCHAR(100),
          is_active BOOLEAN DEFAULT true,
          settings JSONB DEFAULT '{}',
          created_by_superadmin BOOLEAN DEFAULT false,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `,
      user_profiles: `
        CREATE TABLE IF NOT EXISTS user_profiles (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
          tenant_id UUID REFERENCES tenants(id) ON DELETE RESTRICT,
          email VARCHAR(255) NOT NULL,
          full_name VARCHAR(255),
          role VARCHAR(50) NOT NULL,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(tenant_id, email)
        );
      `,
      areas: `
        CREATE TABLE IF NOT EXISTS areas (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          manager_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(tenant_id, name)
        );
      `,
      initiatives: `
        CREATE TABLE IF NOT EXISTS initiatives (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
          area_id UUID REFERENCES areas(id) ON DELETE SET NULL,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
          status VARCHAR(50) DEFAULT 'planning',
          start_date DATE,
          end_date DATE,
          owner_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    };

    // Note: Direct SQL execution is not available in Supabase client
    // You should create these tables via Supabase dashboard or migrations
    console.warn('Tables need to be created via Supabase dashboard or migrations:', missingTables);
  }

  return { success: true, missingTables };
}

// Helper function to seed sample data for empty tables
export async function seedSampleData(tenantId: string) {
  const supabase = await createClient();

  // Check if areas exist
  const { count: areaCount } = await supabase
    .from('areas')
    .select('*', { count: 'exact', head: true })
    ;

  if (areaCount === 0) {
    // Create sample areas
    const sampleAreas = [
      { name: 'Marketing', description: 'Marketing and communications department' },
      { name: 'Sales', description: 'Sales and business development' },
      { name: 'IT', description: 'Information technology and systems' },
      { name: 'HR', description: 'Human resources and talent management' },
      { name: 'Finance', description: 'Financial planning and accounting' },
      { name: 'Operations', description: 'Business operations and logistics' }
    ];

    const { data: areas, error: areaError } = await supabase
      .from('areas')
      .insert(sampleAreas.map(area => ({
        ...area,
        tenant_id: tenantId,
        is_active: true
      })))
      .select();

    if (areaError) {
      console.error('Error creating sample areas:', areaError);
      return { success: false, error: areaError };
    }

    // Create sample initiatives for each area
    if (areas && areas.length > 0) {
      const sampleInitiatives = areas.flatMap(area => [
        {
          tenant_id: tenantId,
          area_id: area.id,
          name: `${area.name} Digital Transformation`,
          description: `Modernize ${area.name} processes and systems`,
          progress: Math.floor(Math.random() * 100),
          status: ['planning', 'in_progress', 'completed', 'on_hold'][Math.floor(Math.random() * 4)]
        },
        {
          tenant_id: tenantId,
          area_id: area.id,
          name: `${area.name} Performance Improvement`,
          description: `Enhance ${area.name} team productivity and efficiency`,
          progress: Math.floor(Math.random() * 100),
          status: ['planning', 'in_progress', 'completed', 'on_hold'][Math.floor(Math.random() * 4)]
        }
      ]);

      const { error: initiativeError } = await supabase
        .from('initiatives')
        .insert(sampleInitiatives);

      if (initiativeError) {
        console.error('Error creating sample initiatives:', initiativeError);
        return { success: false, error: initiativeError };
      }
    }
  }

  return { success: true };
}