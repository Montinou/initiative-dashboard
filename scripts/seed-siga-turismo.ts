import { config } from 'dotenv'
import { readFileSync } from 'fs'
import { join } from 'path'
import { createClient } from '@supabase/supabase-js'

// Load environment variables
config()

async function seedSigaTurismo() {
  console.log('🌱 Iniciando generación de datos realistas para SIGA Turismo...')
  
  // Create Supabase client with service role key
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  
  if (!supabaseUrl || !serviceKey) {
    console.error('❌ Missing required environment variables')
    process.exit(1)
  }
  
  console.log(`Using Supabase URL: ${supabaseUrl}`)
  console.log(`Service role key present: ${!!serviceKey}`)
  
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
  
  try {
    // Read the SQL file
    const sqlPath = join(process.cwd(), 'supabase', 'seed-siga-turismo-realistic-data.sql')
    const sqlContent = readFileSync(sqlPath, 'utf-8')
    
    console.log('📄 Archivo SQL leído correctamente')
    console.log(`📊 Ejecutando script de ${sqlContent.length} caracteres...`)
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql_query: sqlContent 
    })
    
    if (error) {
      console.error('❌ Error ejecutando SQL:', error)
      
      // Try alternative approach - execute via raw SQL
      console.log('🔄 Intentando método alternativo...')
      
      // Split SQL into individual statements and execute them
      const statements = sqlContent
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
      
      console.log(`📝 Ejecutando ${statements.length} declaraciones SQL...`)
      
      let successCount = 0
      let errorCount = 0
      
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i]
        if (statement.trim().length === 0) continue
        
        try {
          const { error: stmtError } = await supabase
            .from('dummy') // This will fail but we're using it to execute raw SQL
            .select('*')
            .limit(0)
          
          // Alternative: try to execute via a custom function
          const { error: execError } = await supabase.rpc('execute_sql', {
            query: statement
          })
          
          if (!execError) {
            successCount++
            if (i % 10 === 0) {
              console.log(`✅ Progreso: ${i + 1}/${statements.length} declaraciones`)
            }
          } else {
            errorCount++
            console.warn(`⚠️ Error en declaración ${i + 1}:`, execError.message)
          }
        } catch (err) {
          errorCount++
          console.warn(`⚠️ Error ejecutando declaración ${i + 1}:`, err)
        }
      }
      
      console.log(`📊 Resultados: ${successCount} exitosas, ${errorCount} errores`)
      
    } else {
      console.log('✅ Script SQL ejecutado exitosamente')
      console.log('📊 Datos:', data)
    }
    
    // Verify the data was created
    console.log('🔍 Verificando datos creados...')
    
    const { data: areasData, error: areasError } = await supabase
      .from('areas')
      .select('*')
      .eq('tenant_id', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11') // SIGA tenant
    
    const { data: objectivesData, error: objectivesError } = await supabase
      .from('objectives')
      .select('*')
      .eq('tenant_id', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
    
    const { data: initiativesData, error: initiativesError } = await supabase
      .from('initiatives')
      .select('*')
      .eq('tenant_id', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
    
    if (!areasError && !objectivesError && !initiativesError) {
      console.log(`📋 Áreas creadas: ${areasData?.length || 0}`)
      console.log(`🎯 Objetivos creados: ${objectivesData?.length || 0}`)
      console.log(`🚀 Iniciativas creadas: ${initiativesData?.length || 0}`)
      
      if (areasData && areasData.length > 0) {
        console.log('📝 Áreas:', areasData.map(area => area.name).join(', '))
      }
    } else {
      console.error('❌ Errores verificando datos:')
      if (areasError) console.error('Areas:', areasError)
      if (objectivesError) console.error('Objectives:', objectivesError)
      if (initiativesError) console.error('Initiatives:', initiativesError)
    }
    
    console.log('✨ Proceso completado!')
    
  } catch (error) {
    console.error('❌ Error general:', error)
    process.exit(1)
  }
}

// Run the seeding
seedSigaTurismo().catch(console.error)