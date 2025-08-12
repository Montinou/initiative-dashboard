import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config()

async function moveDataToExistingTenant() {
  console.log('🔄 Moviendo datos de SIGA al tenant existente...')
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
  
  try {
    // Identificar tenants
    const existingTenantId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' // El tenant que ya estaba funcionando
    const newTenantId = '4930ed6e-3569-4f8f-a5bb-b6e3d4937421' // El nuevo tenant que creamos
    
    console.log(`📍 Tenant existente: ${existingTenantId}`)
    console.log(`📍 Nuevo tenant: ${newTenantId}`)
    
    // 1. Verificar que el nuevo tenant tiene datos
    const { data: newData } = await supabase
      .from('areas')
      .select('*')
      .eq('tenant_id', newTenantId)
    
    console.log(`📊 Áreas en nuevo tenant: ${newData?.length || 0}`)
    
    if (!newData || newData.length === 0) {
      throw new Error('No hay datos en el nuevo tenant para mover')
    }
    
    // 2. Limpiar datos del tenant existente
    console.log('🧹 Limpiando datos del tenant existente...')
    
    // Eliminar en orden correcto (respetando FK)
    await supabase.from('activities').delete().in('initiative_id', 
      supabase.from('initiatives').select('id').eq('tenant_id', existingTenantId)
    )
    await supabase.from('progress_history').delete().in('initiative_id',
      supabase.from('initiatives').select('id').eq('tenant_id', existingTenantId)
    )
    await supabase.from('objective_initiatives').delete().in('objective_id',
      supabase.from('objectives').select('id').eq('tenant_id', existingTenantId)
    )
    await supabase.from('objective_quarters').delete().in('objective_id',
      supabase.from('objectives').select('id').eq('tenant_id', existingTenantId)
    )
    await supabase.from('initiatives').delete().eq('tenant_id', existingTenantId)
    await supabase.from('objectives').delete().eq('tenant_id', existingTenantId)
    await supabase.from('quarters').delete().eq('tenant_id', existingTenantId)
    await supabase.from('areas').delete().eq('tenant_id', existingTenantId)
    
    console.log('✅ Datos del tenant existente eliminados')
    
    // 3. Obtener todos los datos del nuevo tenant
    console.log('📋 Obteniendo datos del nuevo tenant...')
    
    const { data: areas } = await supabase
      .from('areas')
      .select('*')
      .eq('tenant_id', newTenantId)
    
    const { data: quarters } = await supabase
      .from('quarters')
      .select('*')
      .eq('tenant_id', newTenantId)
    
    const { data: objectives } = await supabase
      .from('objectives')
      .select('*')
      .eq('tenant_id', newTenantId)
    
    const { data: initiatives } = await supabase
      .from('initiatives')
      .select('*')
      .eq('tenant_id', newTenantId)
    
    // 4. Copiar datos cambiando el tenant_id
    console.log('📋 Copiando áreas...')
    const areaIdMap = new Map()
    
    for (const area of areas || []) {
      const { data: newArea } = await supabase
        .from('areas')
        .insert({
          ...area,
          id: undefined, // Let it generate new ID
          tenant_id: existingTenantId
        })
        .select()
        .single()
      
      areaIdMap.set(area.id, newArea.id)
    }
    
    console.log('📅 Copiando quarters...')
    const quarterIdMap = new Map()
    
    for (const quarter of quarters || []) {
      const { data: newQuarter } = await supabase
        .from('quarters')
        .insert({
          ...quarter,
          id: undefined,
          tenant_id: existingTenantId
        })
        .select()
        .single()
      
      quarterIdMap.set(quarter.id, newQuarter.id)
    }
    
    console.log('🎯 Copiando objetivos...')
    const objectiveIdMap = new Map()
    
    for (const objective of objectives || []) {
      const { data: newObjective } = await supabase
        .from('objectives')
        .insert({
          ...objective,
          id: undefined,
          tenant_id: existingTenantId,
          area_id: areaIdMap.get(objective.area_id)
        })
        .select()
        .single()
      
      objectiveIdMap.set(objective.id, newObjective.id)
    }
    
    console.log('🚀 Copiando iniciativas...')
    const initiativeIdMap = new Map()
    
    for (const initiative of initiatives || []) {
      const { data: newInitiative } = await supabase
        .from('initiatives')
        .insert({
          ...initiative,
          id: undefined,
          tenant_id: existingTenantId,
          area_id: areaIdMap.get(initiative.area_id)
        })
        .select()
        .single()
      
      initiativeIdMap.set(initiative.id, newInitiative.id)
    }
    
    // 5. Copiar relaciones
    console.log('🔗 Copiando vínculos objetivo-iniciativa...')
    const { data: objectiveInitiatives } = await supabase
      .from('objective_initiatives')
      .select('*')
      .in('objective_id', objectives?.map(o => o.id) || [])
    
    for (const link of objectiveInitiatives || []) {
      await supabase
        .from('objective_initiatives')
        .insert({
          objective_id: objectiveIdMap.get(link.objective_id),
          initiative_id: initiativeIdMap.get(link.initiative_id)
        })
    }
    
    console.log('📅 Copiando vínculos objetivo-quarter...')
    const { data: objectiveQuarters } = await supabase
      .from('objective_quarters')
      .select('*')
      .in('objective_id', objectives?.map(o => o.id) || [])
    
    for (const link of objectiveQuarters || []) {
      await supabase
        .from('objective_quarters')
        .insert({
          objective_id: objectiveIdMap.get(link.objective_id),
          quarter_id: quarterIdMap.get(link.quarter_id)
        })
    }
    
    // 6. Copiar actividades
    console.log('✅ Copiando actividades...')
    const { data: activities } = await supabase
      .from('activities')
      .select('*')
      .in('initiative_id', initiatives?.map(i => i.id) || [])
    
    for (const activity of activities || []) {
      await supabase
        .from('activities')
        .insert({
          ...activity,
          id: undefined,
          initiative_id: initiativeIdMap.get(activity.initiative_id)
        })
    }
    
    // 7. Limpiar el tenant temporal
    console.log('🧹 Limpiando tenant temporal...')
    await supabase.from('activities').delete().in('initiative_id',
      supabase.from('initiatives').select('id').eq('tenant_id', newTenantId)
    )
    await supabase.from('objective_initiatives').delete().in('objective_id',
      supabase.from('objectives').select('id').eq('tenant_id', newTenantId)
    )
    await supabase.from('objective_quarters').delete().in('objective_id',
      supabase.from('objectives').select('id').eq('tenant_id', newTenantId)
    )
    await supabase.from('initiatives').delete().eq('tenant_id', newTenantId)
    await supabase.from('objectives').delete().eq('tenant_id', newTenantId)
    await supabase.from('quarters').delete().eq('tenant_id', newTenantId)
    await supabase.from('areas').delete().eq('tenant_id', newTenantId)
    
    await supabase.from('user_profiles').delete().eq('tenant_id', newTenantId)
    await supabase.from('tenants').delete().eq('id', newTenantId)
    
    // 8. Verificar resultado
    console.log('🔍 Verificando datos migrados...')
    const { data: finalAreas } = await supabase
      .from('areas')
      .select('*')
      .eq('tenant_id', existingTenantId)
    
    const { data: finalObjectives } = await supabase
      .from('objectives')
      .select('*')
      .eq('tenant_id', existingTenantId)
    
    const { data: finalInitiatives } = await supabase
      .from('initiatives')
      .select('*')
      .eq('tenant_id', existingTenantId)
    
    console.log(`
✅ MIGRACIÓN COMPLETADA:
========================
📋 Áreas: ${finalAreas?.length || 0}
🎯 Objetivos: ${finalObjectives?.length || 0}
🚀 Iniciativas: ${finalInitiatives?.length || 0}

🌐 Los datos ahora están disponibles en el tenant existente (${existingTenantId})
🎉 La aplicación debería funcionar correctamente!
`)
    
  } catch (error) {
    console.error('❌ Error en migración:', error)
    throw error
  }
}

moveDataToExistingTenant().catch(console.error)