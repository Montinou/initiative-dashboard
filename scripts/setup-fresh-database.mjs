#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zkkdnslupqnpioltjpeu.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpra2Ruc2x1cHFucGlvbHRqcGV1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDk3Mjg0OCwiZXhwIjoyMDY2NTQ4ODQ4fQ.rqDCmmp95O3VLnVogVCIMUe-vN7WYB8gXZ4p0a0mxpw'

// Initialize Supabase client with service role
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

console.log('🚀 Starting fresh database setup...')

// Demo user accounts to create in Supabase Auth
const demoUsers = [
  // Stratix Demo Users
  { email: 'ceo@stratix-demo.com', password: 'password123', id: '11111111-1111-1111-1111-111111111111' },
  { email: 'admin@stratix-demo.com', password: 'password123', id: '11111111-1111-1111-1111-111111111112' },
  { email: 'manager@stratix-demo.com', password: 'password123', id: '11111111-1111-1111-1111-111111111113' },
  { email: 'analyst@stratix-demo.com', password: 'password123', id: '11111111-1111-1111-1111-111111111114' },
  
  // FEMA Electricidad Users
  { email: 'ceo@fema-electricidad.com', password: 'password123', id: '22222222-2222-2222-2222-222222222221' },
  { email: 'admin@fema-electricidad.com', password: 'password123', id: '22222222-2222-2222-2222-222222222222' },
  { email: 'jefe.electricidad@fema-electricidad.com', password: 'password123', id: '22222222-2222-2222-2222-222222222223' },
  { email: 'jefe.iluminacion@fema-electricidad.com', password: 'password123', id: '22222222-2222-2222-2222-222222222224' },
  { email: 'jefe.industria@fema-electricidad.com', password: 'password123', id: '22222222-2222-2222-2222-222222222225' },
  { email: 'gerente.ecommerce@fema-electricidad.com', password: 'password123', id: '22222222-2222-2222-2222-222222222226' },
  { email: 'analista.gestion@fema-electricidad.com', password: 'password123', id: '22222222-2222-2222-2222-222222222227' },
  
  // SIGA Turismo Users
  { email: 'ceo@siga-turismo.com', password: 'password123', id: '33333333-3333-3333-3333-333333333331' },
  { email: 'admin@siga-turismo.com', password: 'password123', id: '33333333-3333-3333-3333-333333333332' },
  { email: 'manager.operaciones@siga-turismo.com', password: 'password123', id: '33333333-3333-3333-3333-333333333333' },
  { email: 'manager.reservas@siga-turismo.com', password: 'password123', id: '33333333-3333-3333-3333-333333333334' },
  { email: 'analista.marketing@siga-turismo.com', password: 'password123', id: '33333333-3333-3333-3333-333333333335' }
]

async function executeSQL(sqlContent, description) {
  console.log(`📝 ${description}...`)
  
  try {
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql_query: sqlContent 
    })
    
    if (error) {
      console.error(`❌ Error in ${description}:`, error)
      return false
    }
    
    console.log(`✅ ${description} completed successfully`)
    return true
  } catch (err) {
    console.error(`❌ Exception in ${description}:`, err.message)
    return false
  }
}

async function createDemoUsers() {
  console.log('👥 Creating demo user accounts...')
  
  for (const user of demoUsers) {
    try {
      const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        user_id: user.id,
        email_confirm: true
      })
      
      if (error) {
        console.warn(`⚠️  User ${user.email} might already exist:`, error.message)
      } else {
        console.log(`✅ Created user: ${user.email}`)
      }
    } catch (err) {
      console.warn(`⚠️  Error creating ${user.email}:`, err.message)
    }
  }
}

async function main() {
  try {
    // Step 1: Read and execute database reset script
    const resetSQL = fs.readFileSync(
      path.join(__dirname, 'reset-database.sql'), 
      'utf8'
    )
    
    // Split SQL into individual statements and execute them
    const resetStatements = resetSQL.split(';').filter(stmt => stmt.trim())
    
    for (const statement of resetStatements) {
      if (statement.trim()) {
        const success = await executeSQL(statement + ';', 'Executing reset statement')
        if (!success) {
          console.log('⚠️  Continuing despite error...')
        }
      }
    }
    
    // Step 2: Create demo users in Supabase Auth
    await createDemoUsers()
    
    // Step 3: Read and execute demo data population
    const populateSQL = fs.readFileSync(
      path.join(__dirname, 'populate-demo-data.sql'), 
      'utf8'
    )
    
    // Split SQL into individual statements and execute them
    const populateStatements = populateSQL.split(';').filter(stmt => stmt.trim())
    
    for (const statement of populateStatements) {
      if (statement.trim()) {
        const success = await executeSQL(statement + ';', 'Populating demo data')
        if (!success) {
          console.log('⚠️  Continuing despite error...')
        }
      }
    }
    
    console.log('🎉 Database setup completed!')
    console.log('')
    console.log('📋 Demo Accounts Created:')
    console.log('')
    console.log('🏢 STRATIX DEMO:')
    console.log('  CEO: ceo@stratix-demo.com / password123')
    console.log('  Admin: admin@stratix-demo.com / password123')
    console.log('  Manager: manager@stratix-demo.com / password123')
    console.log('  Analyst: analyst@stratix-demo.com / password123')
    console.log('')
    console.log('⚡ FEMA ELECTRICIDAD:')
    console.log('  CEO: ceo@fema-electricidad.com / password123')
    console.log('  Admin: admin@fema-electricidad.com / password123')
    console.log('  Manager: jefe.electricidad@fema-electricidad.com / password123')
    console.log('  Manager: jefe.iluminacion@fema-electricidad.com / password123')
    console.log('  Analyst: analista.gestion@fema-electricidad.com / password123')
    console.log('')
    console.log('🗺️  SIGA TURISMO:')
    console.log('  CEO: ceo@siga-turismo.com / password123')
    console.log('  Admin: admin@siga-turismo.com / password123')
    console.log('  Manager: manager.operaciones@siga-turismo.com / password123')
    console.log('  Manager: manager.reservas@siga-turismo.com / password123')
    console.log('  Analyst: analista.marketing@siga-turismo.com / password123')
    
  } catch (error) {
    console.error('❌ Setup failed:', error)
    process.exit(1)
  }
}

main()