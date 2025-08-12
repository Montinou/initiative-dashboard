import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Load environment variables
config()

async function createRealisticSigaData() {
  console.log('🌱 Generando datos realistas para SIGA Turismo...')
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
  
  try {
    // Get SIGA tenant ID - try both 'siga' and existing data
    let tenant = await supabase
      .from('tenants')
      .select('id, subdomain')
      .eq('subdomain', 'siga')
      .single()
    
    // If no 'siga' tenant, check for existing tourism company
    if (!tenant.data) {
      console.log('ℹ️ No "siga" tenant found, checking for existing tourism tenant...')
      const { data: tenants } = await supabase
        .from('tenants')
        .select('*')
      
      console.log('🏢 Available tenants:', tenants?.map(t => t.subdomain))
      
      // Use the first tenant (likely the tourism one)
      if (tenants && tenants.length > 0) {
        tenant = { data: tenants[0] }
        console.log(`📍 Using tenant: ${tenant.data.subdomain} (${tenant.data.id})`)
      } else {
        throw new Error('No tenants found')
      }
    }
    
    const sigaTenantId = tenant.data.id
    console.log(`🏢 SIGA Tenant ID: ${sigaTenantId}`)
    
    // Get CEO user for SIGA
    const { data: ceoUser } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('tenant_id', sigaTenantId)
      .eq('role', 'CEO')
      .single()
    
    if (!ceoUser) {
      throw new Error('CEO user not found for SIGA')
    }
    
    // Clean existing data
    console.log('🧹 Limpiando datos existentes...')
    await supabase.from('activities').delete().eq('initiative_id', 'in (SELECT id FROM initiatives WHERE tenant_id = $1)', sigaTenantId)
    await supabase.from('objective_initiatives').delete().eq('objective_id', 'in (SELECT id FROM objectives WHERE tenant_id = $1)', sigaTenantId)
    await supabase.from('objective_quarters').delete().eq('objective_id', 'in (SELECT id FROM objectives WHERE tenant_id = $1)', sigaTenantId)
    await supabase.from('initiatives').delete().eq('tenant_id', sigaTenantId)
    await supabase.from('objectives').delete().eq('tenant_id', sigaTenantId)
    await supabase.from('quarters').delete().eq('tenant_id', sigaTenantId)
    await supabase.from('areas').delete().eq('tenant_id', sigaTenantId)
    
    // Create quarters for 2025
    console.log('📅 Creando quarters...')
    const { data: quarters } = await supabase
      .from('quarters')
      .insert([
        { tenant_id: sigaTenantId, quarter_name: 'Q1', start_date: '2025-01-01', end_date: '2025-03-31' },
        { tenant_id: sigaTenantId, quarter_name: 'Q2', start_date: '2025-04-01', end_date: '2025-06-30' },
        { tenant_id: sigaTenantId, quarter_name: 'Q3', start_date: '2025-07-01', end_date: '2025-09-30' },
        { tenant_id: sigaTenantId, quarter_name: 'Q4', start_date: '2025-10-01', end_date: '2025-12-31' }
      ])
      .select()
    
    console.log(`✅ ${quarters?.length || 0} quarters creados`)
    
    // Create tourism-specific areas
    console.log('🏢 Creando áreas de turismo...')
    const { data: areas } = await supabase
      .from('areas')
      .insert([
        { tenant_id: sigaTenantId, name: 'Ventas y Reservas', description: 'Gestión de ventas, reservas y atención al cliente' },
        { tenant_id: sigaTenantId, name: 'Productos Turísticos', description: 'Desarrollo y gestión de paquetes y experiencias turísticas' },
        { tenant_id: sigaTenantId, name: 'Marketing Digital', description: 'Promoción digital, redes sociales y campañas publicitarias' },
        { tenant_id: sigaTenantId, name: 'Operaciones', description: 'Logística, proveedores y coordinación de servicios' },
        { tenant_id: sigaTenantId, name: 'Experiencia del Cliente', description: 'Calidad del servicio y satisfacción del cliente' },
        { tenant_id: sigaTenantId, name: 'Tecnología', description: 'Plataformas digitales, apps y sistemas internos' },
        { tenant_id: sigaTenantId, name: 'Alianzas Estratégicas', description: 'Partnerships con hoteles, aerolíneas y operadores' }
      ])
      .select()
    
    console.log(`✅ ${areas?.length || 0} áreas creadas`)
    
    if (!areas || areas.length === 0) {
      throw new Error('No se pudieron crear las áreas')
    }
    
    // Create realistic objectives
    console.log('🎯 Creando objetivos estratégicos...')
    const objectivesToCreate = [
      {
        tenant_id: sigaTenantId,
        area_id: areas.find(a => a.name === 'Ventas y Reservas')?.id,
        title: 'Incrementar Ventas Q1 en 25%',
        description: 'Aumentar las ventas totales del primer trimestre en un 25% comparado con Q1 2024',
        created_by: ceoUser.id,
        status: 'in_progress',
        progress: 78,
        target_date: '2025-03-31'
      },
      {
        tenant_id: sigaTenantId,
        area_id: areas.find(a => a.name === 'Productos Turísticos')?.id,
        title: 'Lanzar 3 Nuevos Paquetes Turísticos',
        description: 'Desarrollar y lanzar 3 nuevos paquetes turísticos enfocados en turismo sostenible',
        created_by: ceoUser.id,
        status: 'in_progress',
        progress: 65,
        target_date: '2025-03-31'
      },
      {
        tenant_id: sigaTenantId,
        area_id: areas.find(a => a.name === 'Marketing Digital')?.id,
        title: 'Alcanzar 50K Seguidores en Redes',
        description: 'Crecer la base de seguidores en redes sociales a 50,000 personas',
        created_by: ceoUser.id,
        status: 'in_progress',
        progress: 82,
        target_date: '2025-03-31'
      },
      {
        tenant_id: sigaTenantId,
        area_id: areas.find(a => a.name === 'Experiencia del Cliente')?.id,
        title: 'Mejorar NPS a 85 puntos',
        description: 'Incrementar el Net Promoter Score de clientes a 85 puntos o más',
        created_by: ceoUser.id,
        status: 'planning',
        progress: 25,
        target_date: '2025-06-30'
      },
      {
        tenant_id: sigaTenantId,
        area_id: areas.find(a => a.name === 'Tecnología')?.id,
        title: 'Implementar Nueva App Móvil',
        description: 'Desarrollar e implementar aplicación móvil para reservas y gestión de viajes',
        created_by: ceoUser.id,
        status: 'planning',
        progress: 15,
        target_date: '2025-06-30'
      },
      {
        tenant_id: sigaTenantId,
        area_id: areas.find(a => a.name === 'Operaciones')?.id,
        title: 'Optimizar Cadena de Suministros',
        description: 'Mejorar eficiencia operativa y reducir costos en 15%',
        created_by: ceoUser.id,
        status: 'planning',
        progress: 8,
        target_date: '2025-06-30'
      },
      {
        tenant_id: sigaTenantId,
        area_id: areas.find(a => a.name === 'Alianzas Estratégicas')?.id,
        title: 'Establecer 10 Alianzas Estratégicas',
        description: 'Crear partnerships con hoteles boutique y aerolíneas regionales',
        created_by: ceoUser.id,
        status: 'planning',
        progress: 12,
        target_date: '2025-09-30'
      },
      {
        tenant_id: sigaTenantId,
        area_id: areas.find(a => a.name === 'Marketing Digital')?.id,
        title: 'Campaña Temporada Alta',
        description: 'Ejecutar campaña integral para temporada alta de turismo',
        created_by: ceoUser.id,
        status: 'planning',
        progress: 5,
        target_date: '2025-09-30'
      }
    ]
    
    const { data: objectives } = await supabase
      .from('objectives')
      .insert(objectivesToCreate)
      .select()
    
    console.log(`✅ ${objectives?.length || 0} objetivos creados`)
    
    if (!objectives || objectives.length === 0) {
      throw new Error('No se pudieron crear los objetivos')
    }
    
    // Create initiatives for each objective
    console.log('🚀 Creando iniciativas...')
    let allInitiatives = []
    
    for (const objective of objectives) {
      const areaName = areas.find(a => a.id === objective.area_id)?.name
      let initiatives = []
      
      switch (areaName) {
        case 'Ventas y Reservas':
          if (objective.title.includes('Incrementar Ventas')) {
            initiatives = [
              { title: 'Campaña Promocional Año Nuevo', progress: 95, status: 'completed' },
              { title: 'Programa de Descuentos Tempranos', progress: 87, status: 'in_progress' },
              { title: 'Capacitación Equipo Ventas', progress: 92, status: 'in_progress' },
              { title: 'CRM Optimization', progress: 74, status: 'in_progress' }
            ]
          }
          break
          
        case 'Productos Turísticos':
          initiatives = [
            { title: 'Paquete Ecoturismo Amazónico', progress: 78, status: 'in_progress' },
            { title: 'Ruta Gastronómica Andina', progress: 65, status: 'in_progress' },
            { title: 'Aventura Costera Sostenible', progress: 52, status: 'in_progress' }
          ]
          break
          
        case 'Marketing Digital':
          if (objective.title.includes('50K Seguidores')) {
            initiatives = [
              { title: 'Contenido Video Destinos', progress: 89, status: 'in_progress' },
              { title: 'Colaboraciones Influencers', progress: 85, status: 'in_progress' },
              { title: 'Campañas Ads Segmentadas', progress: 76, status: 'in_progress' },
              { title: 'Concursos y Sorteos', progress: 92, status: 'in_progress' }
            ]
          } else {
            initiatives = [
              { title: 'Estrategia Omnicanal Verano', progress: 22, status: 'planning' },
              { title: 'Remarketing Inteligente', progress: 18, status: 'planning' }
            ]
          }
          break
          
        case 'Experiencia del Cliente':
          initiatives = [
            { title: 'Sistema Feedback Tiempo Real', progress: 45, status: 'in_progress' },
            { title: 'Capacitación Servicio Excepcional', progress: 38, status: 'in_progress' },
            { title: 'Personalización Experiencias', progress: 28, status: 'planning' }
          ]
          break
          
        case 'Tecnología':
          initiatives = [
            { title: 'Desarrollo App iOS/Android', progress: 32, status: 'in_progress' },
            { title: 'Integración APIs Terceros', progress: 28, status: 'in_progress' },
            { title: 'Portal Self-Service', progress: 24, status: 'planning' }
          ]
          break
          
        case 'Operaciones':
          initiatives = [
            { title: 'Automatización Procesos', progress: 35, status: 'in_progress' },
            { title: 'Optimización Inventario', progress: 28, status: 'in_progress' },
            { title: 'Red Proveedores Estratégicos', progress: 42, status: 'in_progress' }
          ]
          break
          
        case 'Alianzas Estratégicas':
          initiatives = [
            { title: 'Partnership Hoteles Boutique', progress: 22, status: 'planning' },
            { title: 'Acuerdos Aerolíneas Regionales', progress: 18, status: 'planning' },
            { title: 'Red Guías Certificados', progress: 35, status: 'in_progress' }
          ]
          break
      }
      
      for (const initiative of initiatives) {
        allInitiatives.push({
          tenant_id: sigaTenantId,
          area_id: objective.area_id,
          title: initiative.title,
          description: `Iniciativa para: ${objective.title}`,
          progress: initiative.progress,
          status: initiative.status,
          created_by: ceoUser.id,
          start_date: '2024-12-01',
          due_date: objective.target_date
        })
      }
    }
    
    const { data: createdInitiatives } = await supabase
      .from('initiatives')
      .insert(allInitiatives)
      .select()
    
    console.log(`✅ ${createdInitiatives?.length || 0} iniciativas creadas`)
    
    // Link initiatives to objectives
    console.log('🔗 Vinculando iniciativas con objetivos...')
    const objectiveInitiativeLinks = []
    
    for (const initiative of createdInitiatives || []) {
      const relatedObjective = objectives.find(obj => obj.area_id === initiative.area_id)
      if (relatedObjective) {
        objectiveInitiativeLinks.push({
          objective_id: relatedObjective.id,
          initiative_id: initiative.id
        })
      }
    }
    
    if (objectiveInitiativeLinks.length > 0) {
      await supabase
        .from('objective_initiatives')
        .insert(objectiveInitiativeLinks)
    }
    
    console.log(`✅ ${objectiveInitiativeLinks.length} vínculos objetivo-iniciativa creados`)
    
    // Create activities for each initiative
    console.log('✅ Creando actividades...')
    let allActivities = []
    
    for (const initiative of createdInitiatives || []) {
      const activityTemplates = [
        'Planificación inicial y definición de scope',
        'Asignación de recursos y equipo',
        'Desarrollo de estrategia de implementación',
        'Ejecución de fase piloto',
        'Monitoreo de progreso y ajustes',
        'Implementación completa',
        'Evaluación de resultados',
        'Documentación y lessons learned'
      ]
      
      const completionRate = initiative.progress / 100
      
      for (let i = 0; i < activityTemplates.length; i++) {
        allActivities.push({
          initiative_id: initiative.id,
          title: activityTemplates[i],
          description: `Actividad para: ${initiative.title}`,
          is_completed: i < (activityTemplates.length * completionRate),
          assigned_to: ceoUser.id
        })
      }
    }
    
    const { data: createdActivities } = await supabase
      .from('activities')
      .insert(allActivities)
      .select()
    
    console.log(`✅ ${createdActivities?.length || 0} actividades creadas`)
    
    // Link objectives to quarters
    console.log('📅 Vinculando objetivos con quarters...')
    const quarterLinks = []
    
    for (const objective of objectives) {
      const targetDate = new Date(objective.target_date)
      const quarter = quarters?.find(q => {
        const start = new Date(q.start_date)
        const end = new Date(q.end_date)
        return targetDate >= start && targetDate <= end
      })
      
      if (quarter) {
        quarterLinks.push({
          objective_id: objective.id,
          quarter_id: quarter.id
        })
      }
    }
    
    if (quarterLinks.length > 0) {
      await supabase
        .from('objective_quarters')
        .insert(quarterLinks)
    }
    
    console.log(`✅ ${quarterLinks.length} vínculos objetivo-quarter creados`)
    
    // Final summary
    console.log(`
🎯 RESUMEN DATOS SIGA TURISMO CREADOS:
===========================================
📋 Áreas: ${areas?.length || 0}
🎯 Objetivos: ${objectives?.length || 0}  
🚀 Iniciativas: ${createdInitiatives?.length || 0}
✅ Actividades: ${createdActivities?.length || 0}
🔗 Vínculos objetivo-iniciativa: ${objectiveInitiativeLinks.length}
📅 Vínculos objetivo-quarter: ${quarterLinks.length}

💡 DATOS LISTOS PARA GRÁFICOS Y ANÁLISIS!
`)
    
  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  }
}

createRealisticSigaData().catch(console.error)