const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function deploySchema() {
  try {
    console.log('🚀 Deploying initiative dashboard schema...')

    // Read and execute the first migration
    const migration1 = fs.readFileSync(
      path.join(__dirname, 'supabase/migrations/20250128000001_create_initiative_tables.sql'),
      'utf8'
    )

    console.log('📝 Creating tables and triggers...')
    const { error: error1 } = await supabase.rpc('exec_sql', { sql: migration1 })
    if (error1) {
      console.error('Error executing migration 1:', error1)
      throw error1
    }

    // Read and execute the second migration
    const migration2 = fs.readFileSync(
      path.join(__dirname, 'supabase/migrations/20250128000002_setup_rls_policies.sql'),
      'utf8'
    )

    console.log('🔒 Setting up Row Level Security policies...')
    const { error: error2 } = await supabase.rpc('exec_sql', { sql: migration2 })
    if (error2) {
      console.error('Error executing migration 2:', error2)
      throw error2
    }

    // Insert some sample company areas
    console.log('🏢 Creating sample company areas...')
    const { error: areasError } = await supabase
      .from('company_areas')
      .insert([
        {
          name: 'Technology',
          description: 'Software development and IT initiatives'
        },
        {
          name: 'Marketing',
          description: 'Marketing campaigns and brand initiatives'
        },
        {
          name: 'Operations',
          description: 'Operational efficiency and process improvements'
        },
        {
          name: 'Human Resources',
          description: 'Employee development and organizational initiatives'
        }
      ])

    if (areasError) {
      console.error('Error creating sample areas:', areasError)
      throw areasError
    }

    // Verify the setup
    console.log('✅ Verifying database setup...')
    const { data: areas, error: verifyError } = await supabase
      .from('company_areas')
      .select('*')

    if (verifyError) {
      console.error('Error verifying setup:', verifyError)
      throw verifyError
    }

    console.log(`✅ Schema deployed successfully!`)
    console.log(`📊 Created ${areas.length} sample company areas`)
    console.log('🎉 Initiative dashboard is ready to use!')

  } catch (error) {
    console.error('❌ Deployment failed:', error.message)
    process.exit(1)
  }
}

// Alternative method using direct SQL execution
async function deploySchemaDirectSQL() {
  try {
    console.log('🚀 Deploying initiative dashboard schema using direct SQL...')

    // Create tables
    const createTablesSQL = `
      -- Create company_areas table
      CREATE TABLE IF NOT EXISTS company_areas (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Create initiatives table
      CREATE TABLE IF NOT EXISTS initiatives (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT,
          progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
          area_id UUID REFERENCES company_areas(id) ON DELETE SET NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Create subtasks table
      CREATE TABLE IF NOT EXISTS subtasks (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT,
          completed BOOLEAN DEFAULT FALSE,
          initiative_id UUID NOT NULL REFERENCES initiatives(id) ON DELETE CASCADE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `

    console.log('📝 Creating tables...')
    const { error: tablesError } = await supabase.rpc('exec_sql', { sql: createTablesSQL })
    if (tablesError) {
      console.error('Error creating tables:', tablesError)
      throw tablesError
    }

    // Create indexes
    const indexesSQL = `
      CREATE INDEX IF NOT EXISTS idx_initiatives_area_id ON initiatives(area_id);
      CREATE INDEX IF NOT EXISTS idx_subtasks_initiative_id ON subtasks(initiative_id);
      CREATE INDEX IF NOT EXISTS idx_initiatives_created_at ON initiatives(created_at);
      CREATE INDEX IF NOT EXISTS idx_subtasks_completed ON subtasks(completed);
    `

    console.log('🔍 Creating indexes...')
    const { error: indexError } = await supabase.rpc('exec_sql', { sql: indexesSQL })
    if (indexError) {
      console.error('Error creating indexes:', indexError)
      throw indexError
    }

    // Create functions and triggers
    const triggersSQL = `
      -- Create function to update updated_at timestamp
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ language 'plpgsql';

      -- Create triggers to automatically update updated_at
      DROP TRIGGER IF EXISTS update_company_areas_updated_at ON company_areas;
      CREATE TRIGGER update_company_areas_updated_at BEFORE UPDATE ON company_areas FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
      
      DROP TRIGGER IF EXISTS update_initiatives_updated_at ON initiatives;
      CREATE TRIGGER update_initiatives_updated_at BEFORE UPDATE ON initiatives FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
      
      DROP TRIGGER IF EXISTS update_subtasks_updated_at ON subtasks;
      CREATE TRIGGER update_subtasks_updated_at BEFORE UPDATE ON subtasks FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

      -- Function to automatically update initiative progress when subtasks change
      CREATE OR REPLACE FUNCTION update_initiative_progress()
      RETURNS TRIGGER AS $$
      DECLARE
          total_subtasks INTEGER;
          completed_subtasks INTEGER;
          new_progress INTEGER;
          target_initiative_id UUID;
      BEGIN
          -- Determine which initiative to update
          IF TG_OP = 'DELETE' THEN
              target_initiative_id := OLD.initiative_id;
          ELSE
              target_initiative_id := NEW.initiative_id;
          END IF;

          -- Count total and completed subtasks for the initiative
          SELECT 
              COUNT(*),
              COUNT(*) FILTER (WHERE completed = TRUE)
          INTO total_subtasks, completed_subtasks
          FROM subtasks 
          WHERE initiative_id = target_initiative_id;

          -- Calculate new progress percentage
          IF total_subtasks = 0 THEN
              new_progress := 0;
          ELSE
              new_progress := ROUND((completed_subtasks::DECIMAL / total_subtasks::DECIMAL) * 100);
          END IF;

          -- Update the initiative progress
          UPDATE initiatives 
          SET progress = new_progress
          WHERE id = target_initiative_id;

          -- Return appropriate record
          IF TG_OP = 'DELETE' THEN
              RETURN OLD;
          ELSE
              RETURN NEW;
          END IF;
      END;
      $$ language 'plpgsql';

      -- Create trigger to update initiative progress when subtasks change
      DROP TRIGGER IF EXISTS update_initiative_progress_trigger ON subtasks;
      CREATE TRIGGER update_initiative_progress_trigger 
          AFTER INSERT OR UPDATE OR DELETE ON subtasks
          FOR EACH ROW 
          EXECUTE PROCEDURE update_initiative_progress();
    `

    console.log('⚡ Creating functions and triggers...')
    const { error: triggerError } = await supabase.rpc('exec_sql', { sql: triggersSQL })
    if (triggerError) {
      console.error('Error creating triggers:', triggerError)
      throw triggerError
    }

    // Setup RLS policies
    const rlsSQL = `
      -- Enable RLS on all tables
      ALTER TABLE company_areas ENABLE ROW LEVEL SECURITY;
      ALTER TABLE initiatives ENABLE ROW LEVEL SECURITY;
      ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;

      -- Drop existing policies if they exist
      DROP POLICY IF EXISTS "Allow authenticated users to read company areas" ON company_areas;
      DROP POLICY IF EXISTS "Allow authenticated users to insert company areas" ON company_areas;
      DROP POLICY IF EXISTS "Allow authenticated users to update company areas" ON company_areas;
      DROP POLICY IF EXISTS "Allow authenticated users to delete company areas" ON company_areas;

      DROP POLICY IF EXISTS "Allow authenticated users to read initiatives" ON initiatives;
      DROP POLICY IF EXISTS "Allow authenticated users to insert initiatives" ON initiatives;
      DROP POLICY IF EXISTS "Allow authenticated users to update initiatives" ON initiatives;
      DROP POLICY IF EXISTS "Allow authenticated users to delete initiatives" ON initiatives;

      DROP POLICY IF EXISTS "Allow authenticated users to read subtasks" ON subtasks;
      DROP POLICY IF EXISTS "Allow authenticated users to insert subtasks" ON subtasks;
      DROP POLICY IF EXISTS "Allow authenticated users to update subtasks" ON subtasks;
      DROP POLICY IF EXISTS "Allow authenticated users to delete subtasks" ON subtasks;

      -- Company Areas Policies
      CREATE POLICY "Allow authenticated users to read company areas" 
      ON company_areas FOR SELECT 
      TO authenticated 
      USING (true);

      CREATE POLICY "Allow authenticated users to insert company areas" 
      ON company_areas FOR INSERT 
      TO authenticated 
      WITH CHECK (true);

      CREATE POLICY "Allow authenticated users to update company areas" 
      ON company_areas FOR UPDATE 
      TO authenticated 
      USING (true) 
      WITH CHECK (true);

      CREATE POLICY "Allow authenticated users to delete company areas" 
      ON company_areas FOR DELETE 
      TO authenticated 
      USING (true);

      -- Initiatives Policies
      CREATE POLICY "Allow authenticated users to read initiatives" 
      ON initiatives FOR SELECT 
      TO authenticated 
      USING (true);

      CREATE POLICY "Allow authenticated users to insert initiatives" 
      ON initiatives FOR INSERT 
      TO authenticated 
      WITH CHECK (true);

      CREATE POLICY "Allow authenticated users to update initiatives" 
      ON initiatives FOR UPDATE 
      TO authenticated 
      USING (true) 
      WITH CHECK (true);

      CREATE POLICY "Allow authenticated users to delete initiatives" 
      ON initiatives FOR DELETE 
      TO authenticated 
      USING (true);

      -- Subtasks Policies
      CREATE POLICY "Allow authenticated users to read subtasks" 
      ON subtasks FOR SELECT 
      TO authenticated 
      USING (true);

      CREATE POLICY "Allow authenticated users to insert subtasks" 
      ON subtasks FOR INSERT 
      TO authenticated 
      WITH CHECK (true);

      CREATE POLICY "Allow authenticated users to update subtasks" 
      ON subtasks FOR UPDATE 
      TO authenticated 
      USING (true) 
      WITH CHECK (true);

      CREATE POLICY "Allow authenticated users to delete subtasks" 
      ON subtasks FOR DELETE 
      TO authenticated 
      USING (true);
    `

    console.log('🔒 Setting up Row Level Security policies...')
    const { error: rlsError } = await supabase.rpc('exec_sql', { sql: rlsSQL })
    if (rlsError) {
      console.error('Error setting up RLS:', rlsError)
      throw rlsError
    }

    // Insert sample data
    console.log('🏢 Creating sample company areas...')
    const { error: areasError } = await supabase
      .from('company_areas')
      .upsert([
        {
          name: 'Technology',
          description: 'Software development and IT initiatives'
        },
        {
          name: 'Marketing', 
          description: 'Marketing campaigns and brand initiatives'
        },
        {
          name: 'Operations',
          description: 'Operational efficiency and process improvements'
        },
        {
          name: 'Human Resources',
          description: 'Employee development and organizational initiatives'
        }
      ], { onConflict: 'name' })

    if (areasError) {
      console.error('Error creating sample areas:', areasError)
      throw areasError
    }

    // Verify the setup
    console.log('✅ Verifying database setup...')
    const { data: areas, error: verifyError } = await supabase
      .from('company_areas')
      .select('*')

    if (verifyError) {
      console.error('Error verifying setup:', verifyError)
      throw verifyError
    }

    console.log(`✅ Schema deployed successfully!`)
    console.log(`📊 Created ${areas.length} company areas`)
    console.log('🎉 Initiative dashboard is ready to use!')

  } catch (error) {
    console.error('❌ Deployment failed:', error.message)
    process.exit(1)
  }
}

// Try the direct SQL method first
deploySchemaDirectSQL()