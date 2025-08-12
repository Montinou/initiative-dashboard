import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config()

async function simplyMigrateData() {
  console.log('🔄 Migración simple de datos SIGA...')
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
  
  try {
    const existingTenantId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
    const newTenantId = '4930ed6e-3569-4f8f-a5bb-b6e3d4937421'
    
    console.log('📊 Verificando datos en nuevo tenant...')
    const { data: newAreas } = await supabase
      .from('areas')
      .select('*')
      .eq('tenant_id', newTenantId)
    
    console.log(`✅ Encontradas ${newAreas?.length || 0} áreas en nuevo tenant`)
    
    if (!newAreas || newAreas.length === 0) {
      throw new Error('No hay datos para migrar')
    }
    
    // Método simple: UPDATE en lugar de DELETE + INSERT
    console.log('🔄 Actualizando tenant_id de áreas...')
    await supabase
      .from('areas')
      .update({ tenant_id: existingTenantId })
      .eq('tenant_id', newTenantId)
    
    console.log('🔄 Actualizando tenant_id de quarters...')
    await supabase
      .from('quarters')
      .update({ tenant_id: existingTenantId })
      .eq('tenant_id', newTenantId)
    
    console.log('🔄 Actualizando tenant_id de objetivos...')
    await supabase
      .from('objectives')
      .update({ tenant_id: existingTenantId })
      .eq('tenant_id', newTenantId)
    
    console.log('🔄 Actualizando tenant_id de iniciativas...')
    await supabase
      .from('initiatives')
      .update({ tenant_id: existingTenantId })
      .eq('tenant_id', newTenantId)
    
    // Actualizar user profiles si es necesario
    console.log('🔄 Actualizando user_profiles...')
    await supabase
      .from('user_profiles')
      .update({ tenant_id: existingTenantId })
      .eq('tenant_id', newTenantId)
    
    // Limpiar tenant temporal
    console.log('🧹 Limpiando tenant temporal...')
    await supabase
      .from('tenants')
      .delete()
      .eq('id', newTenantId)
    
    // Verificar resultado
    console.log('🔍 Verificando migración...')
    const { data: migratedAreas } = await supabase
      .from('areas')
      .select('*')
      .eq('tenant_id', existingTenantId)
    
    const { data: migratedObjectives } = await supabase
      .from('objectives')
      .select('*')
      .eq('tenant_id', existingTenantId)
    
    const { data: migratedInitiatives } = await supabase
      .from('initiatives')
      .select('*')
      .eq('tenant_id', existingTenantId)
    
    console.log(`
✅ MIGRACIÓN EXITOSA:
====================
📋 Áreas: ${migratedAreas?.length || 0}
🎯 Objetivos: ${migratedObjectives?.length || 0}
🚀 Iniciativas: ${migratedInitiatives?.length || 0}

🎉 Los datos de SIGA Turismo ahora están en el tenant correcto!
🌐 La aplicación debería funcionar en: siga-turismo.vercel.app
`)
    
    return true
    
  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  }
}

simplyMigrateData().catch(console.error)