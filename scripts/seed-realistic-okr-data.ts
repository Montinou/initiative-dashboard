/**
 * Seed Realistic OKR Data Script
 * 
 * Purpose: Populate realistic objectives, initiatives, and activities
 * for the core areas:
 *   - Producto
 *   - Capital Humano
 *   - Administración
 *   - Comercial
 *   - Corporativo
 * 
 * Uses start_date and end_date instead of quarters for better flexibility
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

// Load environment variables
config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Helper function to generate dates
function getDateRange(monthsFromNow: number, duration: number): { start: string; end: string } {
  const start = new Date()
  start.setMonth(start.getMonth() + monthsFromNow)
  
  const end = new Date(start)
  end.setMonth(end.getMonth() + duration)
  
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0]
  }
}

// Helper function to calculate progress based on completion
function calculateProgress(startDate: string, endDate: string, baseProgress: number = 0): number {
  const now = new Date()
  const start = new Date(startDate)
  const end = new Date(endDate)
  
  if (now < start) return 0
  if (now > end) return 100
  
  const total = end.getTime() - start.getTime()
  const elapsed = now.getTime() - start.getTime()
  const timeProgress = Math.floor((elapsed / total) * 100)
  
  // Mix time progress with base progress for more realistic values
  return Math.min(100, Math.floor((timeProgress + baseProgress) / 2))
}

// OKR Data Structure
interface OKRData {
  area: string
  objectives: Array<{
    title: string
    description: string
    priority: 'high' | 'medium' | 'low'
    dateRange: { start: string; end: string }
    initiatives: Array<{
      title: string
      description: string
      status: 'planning' | 'in_progress' | 'completed' | 'on_hold'
      activities: Array<{
        title: string
        description: string
        is_completed: boolean
      }>
    }>
  }>
}

// Realistic OKR data for each area
const okrData: OKRData[] = [
  {
    area: 'Producto',
    objectives: [
      {
        title: 'Lanzar nueva plataforma digital v2.0',
        description: 'Desarrollar y desplegar la nueva versión de la plataforma con mejoras en UX/UI y performance',
        priority: 'high',
        dateRange: getDateRange(-2, 6),
        initiatives: [
          {
            title: 'Rediseño de interfaz de usuario',
            description: 'Implementar nuevo sistema de diseño basado en research de usuarios',
            status: 'in_progress',
            activities: [
              { title: 'Research de usuarios y análisis de competencia', description: 'Realizar entrevistas con 50 usuarios', is_completed: true },
              { title: 'Crear sistema de diseño en Figma', description: 'Definir componentes y patrones visuales', is_completed: true },
              { title: 'Implementar componentes en React', description: 'Desarrollar biblioteca de componentes', is_completed: false },
              { title: 'Testing de usabilidad', description: 'Validar nuevos diseños con usuarios', is_completed: false }
            ]
          },
          {
            title: 'Optimización de performance',
            description: 'Mejorar tiempos de carga y respuesta del sistema',
            status: 'in_progress',
            activities: [
              { title: 'Auditoría de performance actual', description: 'Medir métricas base con Lighthouse', is_completed: true },
              { title: 'Implementar lazy loading', description: 'Optimizar carga de imágenes y componentes', is_completed: true },
              { title: 'Configurar CDN y caché', description: 'Implementar CloudFlare y Redis', is_completed: false },
              { title: 'Optimizar queries de base de datos', description: 'Añadir índices y mejorar consultas', is_completed: false }
            ]
          },
          {
            title: 'Migración a microservicios',
            description: 'Refactorizar arquitectura monolítica a microservicios',
            status: 'planning',
            activities: [
              { title: 'Definir arquitectura de microservicios', description: 'Diseñar división de servicios', is_completed: false },
              { title: 'Implementar API Gateway', description: 'Configurar Kong o similar', is_completed: false },
              { title: 'Migrar módulo de autenticación', description: 'Primer microservicio independiente', is_completed: false },
              { title: 'Configurar orquestación con Kubernetes', description: 'Deploy con contenedores', is_completed: false }
            ]
          }
        ]
      },
      {
        title: 'Implementar IA y Machine Learning',
        description: 'Integrar capacidades de inteligencia artificial para mejorar la experiencia del usuario',
        priority: 'medium',
        dateRange: getDateRange(0, 8),
        initiatives: [
          {
            title: 'Chatbot inteligente con IA',
            description: 'Desarrollar asistente virtual para soporte al cliente',
            status: 'in_progress',
            activities: [
              { title: 'Entrenar modelo de NLP', description: 'Usar GPT para entender consultas', is_completed: false },
              { title: 'Integrar con plataforma de mensajería', description: 'Conectar con WhatsApp Business API', is_completed: false },
              { title: 'Crear base de conocimientos', description: 'Documentar FAQs y respuestas', is_completed: false },
              { title: 'Implementar escalamiento a agente humano', description: 'Handoff cuando sea necesario', is_completed: false }
            ]
          }
        ]
      }
    ]
  },
  {
    area: 'Capital Humano',
    objectives: [
      {
        title: 'Fortalecer cultura organizacional y engagement',
        description: 'Mejorar el clima laboral y aumentar la retención de talento clave',
        priority: 'high',
        dateRange: getDateRange(-1, 12),
        initiatives: [
          {
            title: 'Programa de bienestar integral',
            description: 'Implementar beneficios y actividades para el bienestar físico y mental',
            status: 'in_progress',
            activities: [
              { title: 'Contratar seguro médico premium', description: 'Negociar con proveedores de salud', is_completed: true },
              { title: 'Implementar días de trabajo remoto', description: 'Política de trabajo híbrido', is_completed: true },
              { title: 'Crear programa de gimnasio corporativo', description: 'Convenios con centros deportivos', is_completed: false },
              { title: 'Sesiones de mindfulness y manejo del estrés', description: 'Talleres mensuales', is_completed: false }
            ]
          },
          {
            title: 'Plan de desarrollo y capacitación',
            description: 'Programa continuo de formación y desarrollo profesional',
            status: 'in_progress',
            activities: [
              { title: 'Mapeo de competencias', description: 'Identificar gaps de habilidades', is_completed: true },
              { title: 'Plataforma de e-learning', description: 'Implementar Coursera for Business', is_completed: false },
              { title: 'Programa de mentoring', description: 'Emparejar seniors con juniors', is_completed: false },
              { title: 'Budget para certificaciones', description: 'Apoyo económico para formación', is_completed: false }
            ]
          },
          {
            title: 'Sistema de evaluación 360°',
            description: 'Implementar evaluaciones de desempeño integrales',
            status: 'planning',
            activities: [
              { title: 'Diseñar modelo de competencias', description: 'Definir comportamientos esperados', is_completed: false },
              { title: 'Seleccionar plataforma de evaluación', description: 'Evaluar opciones de software', is_completed: false },
              { title: 'Capacitar a líderes en feedback', description: 'Workshops de comunicación efectiva', is_completed: false },
              { title: 'Piloto con área de tecnología', description: 'Prueba inicial del sistema', is_completed: false }
            ]
          }
        ]
      },
      {
        title: 'Atraer y retener talento tech especializado',
        description: 'Construir un equipo de ingeniería de clase mundial',
        priority: 'high',
        dateRange: getDateRange(0, 6),
        initiatives: [
          {
            title: 'Employer branding en tech',
            description: 'Posicionar la empresa como empleador atractivo para developers',
            status: 'in_progress',
            activities: [
              { title: 'Participar en eventos tech', description: 'Sponsorear hackathons y conferencias', is_completed: false },
              { title: 'Blog técnico corporativo', description: 'Publicar artículos de engineering', is_completed: false },
              { title: 'Programa de referidos', description: 'Bonos por referir talento', is_completed: false },
              { title: 'Open source contributions', description: 'Tiempo para contribuir a OSS', is_completed: false }
            ]
          }
        ]
      }
    ]
  },
  {
    area: 'Administración',
    objectives: [
      {
        title: 'Optimizar procesos administrativos y financieros',
        description: 'Digitalizar y automatizar procesos para mayor eficiencia operativa',
        priority: 'high',
        dateRange: getDateRange(-3, 9),
        initiatives: [
          {
            title: 'Implementación de ERP integrado',
            description: 'Sistema unificado para gestión administrativa',
            status: 'in_progress',
            activities: [
              { title: 'Selección de proveedor ERP', description: 'Evaluar SAP vs Oracle vs Odoo', is_completed: true },
              { title: 'Mapeo de procesos actuales', description: 'Documentar flujos AS-IS', is_completed: true },
              { title: 'Configuración y personalización', description: 'Adaptar ERP a necesidades', is_completed: false },
              { title: 'Migración de datos históricos', description: 'Transferir información legacy', is_completed: false },
              { title: 'Capacitación de usuarios', description: 'Training para todo el personal', is_completed: false }
            ]
          },
          {
            title: 'Automatización de facturación',
            description: 'Sistema automático de facturación electrónica',
            status: 'in_progress',
            activities: [
              { title: 'Integración con SAT/AFIP', description: 'Conexión con sistema tributario', is_completed: true },
              { title: 'Desarrollo de API de facturación', description: 'Endpoints para generar facturas', is_completed: false },
              { title: 'Portal de autoservicio para clientes', description: 'Descarga de facturas online', is_completed: false },
              { title: 'Automatización de cobros recurrentes', description: 'Billing automático mensual', is_completed: false }
            ]
          },
          {
            title: 'Dashboard financiero en tiempo real',
            description: 'Visualización de KPIs financieros y administrativos',
            status: 'planning',
            activities: [
              { title: 'Definir KPIs críticos', description: 'Métricas clave del negocio', is_completed: false },
              { title: 'Implementar data warehouse', description: 'Consolidar fuentes de datos', is_completed: false },
              { title: 'Desarrollar dashboards en Power BI', description: 'Visualizaciones interactivas', is_completed: false },
              { title: 'Alertas automáticas', description: 'Notificaciones de desvíos', is_completed: false }
            ]
          }
        ]
      },
      {
        title: 'Asegurar compliance y gestión de riesgos',
        description: 'Mantener cumplimiento regulatorio y minimizar riesgos operacionales',
        priority: 'medium',
        dateRange: getDateRange(1, 12),
        initiatives: [
          {
            title: 'Programa de compliance integral',
            description: 'Sistema de gestión de cumplimiento normativo',
            status: 'planning',
            activities: [
              { title: 'Auditoría de compliance actual', description: 'Identificar gaps regulatorios', is_completed: false },
              { title: 'Implementar ISO 27001', description: 'Certificación de seguridad', is_completed: false },
              { title: 'Políticas anti-lavado de dinero', description: 'Procedimientos AML/KYC', is_completed: false },
              { title: 'Training de compliance', description: 'Capacitación obligatoria anual', is_completed: false }
            ]
          }
        ]
      }
    ]
  },
  {
    area: 'Comercial',
    objectives: [
      {
        title: 'Incrementar ventas 40% año sobre año',
        description: 'Expandir base de clientes y aumentar ticket promedio',
        priority: 'high',
        dateRange: getDateRange(-2, 12),
        initiatives: [
          {
            title: 'Expansión a nuevos mercados',
            description: 'Entrada a 3 nuevos países en Latinoamérica',
            status: 'in_progress',
            activities: [
              { title: 'Estudio de mercado regional', description: 'Análisis de Colombia, Chile y Perú', is_completed: true },
              { title: 'Establecer partnerships locales', description: 'Alianzas con distribuidores', is_completed: false },
              { title: 'Adaptación de producto al mercado', description: 'Localización y compliance', is_completed: false },
              { title: 'Campaña de lanzamiento', description: 'Marketing y PR en cada país', is_completed: false },
              { title: 'Contratar equipo comercial local', description: 'Sales reps en cada región', is_completed: false }
            ]
          },
          {
            title: 'Programa de account management',
            description: 'Maximizar valor de clientes existentes',
            status: 'in_progress',
            activities: [
              { title: 'Segmentación de clientes', description: 'Clasificar por valor y potencial', is_completed: true },
              { title: 'Playbook de upselling', description: 'Estrategias por segmento', is_completed: false },
              { title: 'Customer Success Manager dedicado', description: 'Para cuentas enterprise', is_completed: false },
              { title: 'Programa de fidelización', description: 'Beneficios para clientes VIP', is_completed: false }
            ]
          },
          {
            title: 'Transformación digital de ventas',
            description: 'Modernizar proceso comercial con tecnología',
            status: 'in_progress',
            activities: [
              { title: 'Implementar CRM Salesforce', description: 'Migrar de Excel a CRM', is_completed: true },
              { title: 'Lead scoring con IA', description: 'Priorización automática de leads', is_completed: false },
              { title: 'Automatización de propuestas', description: 'CPQ para cotizaciones', is_completed: false },
              { title: 'Portal de partners', description: 'Plataforma B2B2C', is_completed: false }
            ]
          }
        ]
      },
      {
        title: 'Mejorar satisfacción del cliente a 90% NPS',
        description: 'Excelencia en experiencia del cliente en todo el journey',
        priority: 'high',
        dateRange: getDateRange(0, 8),
        initiatives: [
          {
            title: 'Centro de experiencia del cliente',
            description: 'Unificar todos los puntos de contacto',
            status: 'planning',
            activities: [
              { title: 'Mapear customer journey completo', description: 'Identificar pain points', is_completed: false },
              { title: 'Implementar omnicanalidad', description: 'Integrar todos los canales', is_completed: false },
              { title: 'Sistema de tickets unificado', description: 'Zendesk para soporte', is_completed: false },
              { title: 'Programa Voice of Customer', description: 'Feedback continuo', is_completed: false }
            ]
          }
        ]
      }
    ]
  },
  {
    area: 'Corporativo',
    objectives: [
      {
        title: 'Definir estrategia corporativa 2024-2027',
        description: 'Establecer visión, misión y plan estratégico a 3 años',
        priority: 'high',
        dateRange: getDateRange(-1, 4),
        initiatives: [
          {
            title: 'Planificación estratégica',
            description: 'Proceso de definición de estrategia corporativa',
            status: 'in_progress',
            activities: [
              { title: 'Análisis FODA corporativo', description: 'Evaluación interna y externa', is_completed: true },
              { title: 'Benchmarking competitivo', description: 'Análisis de mejores prácticas', is_completed: true },
              { title: 'Definir OKRs corporativos', description: 'Objetivos a 3 años', is_completed: false },
              { title: 'Roadmap de transformación', description: 'Plan de implementación', is_completed: false },
              { title: 'Comunicación de estrategia', description: 'Cascadeo a toda la organización', is_completed: false }
            ]
          },
          {
            title: 'Gobierno corporativo',
            description: 'Fortalecer estructura de gobernanza',
            status: 'planning',
            activities: [
              { title: 'Conformar comités ejecutivos', description: 'Comités de estrategia y riesgos', is_completed: false },
              { title: 'Políticas corporativas', description: 'Framework de gobierno', is_completed: false },
              { title: 'Código de ética actualizado', description: 'Valores y principios', is_completed: false },
              { title: 'Reporte de sostenibilidad', description: 'ESG reporting', is_completed: false }
            ]
          }
        ]
      },
      {
        title: 'M&A y alianzas estratégicas',
        description: 'Crecimiento inorgánico mediante adquisiciones y partnerships',
        priority: 'medium',
        dateRange: getDateRange(2, 10),
        initiatives: [
          {
            title: 'Pipeline de M&A',
            description: 'Identificar y evaluar targets de adquisición',
            status: 'planning',
            activities: [
              { title: 'Mapeo de targets potenciales', description: 'Empresas complementarias', is_completed: false },
              { title: 'Due diligence financiero', description: 'Evaluación de candidatos', is_completed: false },
              { title: 'Valuación y negociación', description: 'Términos de adquisición', is_completed: false },
              { title: 'Plan de integración post-merger', description: 'PMI roadmap', is_completed: false }
            ]
          }
        ]
      },
      {
        title: 'Transformación digital corporativa',
        description: 'Digitalización integral de la organización',
        priority: 'high',
        dateRange: getDateRange(0, 18),
        initiatives: [
          {
            title: 'Digital workplace',
            description: 'Modernizar herramientas de trabajo',
            status: 'in_progress',
            activities: [
              { title: 'Migración a Microsoft 365', description: 'Suite de productividad cloud', is_completed: false },
              { title: 'Intranet corporativa', description: 'Portal interno de comunicación', is_completed: false },
              { title: 'Automatización con RPA', description: 'Bots para tareas repetitivas', is_completed: false },
              { title: 'Analytics y BI para todos', description: 'Democratizar datos', is_completed: false }
            ]
          }
        ]
      }
    ]
  }
]

// Main execution
async function seedOKRData() {
  console.log('🚀 Starting OKR data seeding...\n')

  try {
    // Get tenant ID (using SIGA as default)
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id, subdomain')
      .eq('subdomain', 'siga')
      .single()

    if (!tenant) {
      console.error('❌ SIGA tenant not found')
      return
    }

    console.log(`✅ Found tenant: ${tenant.subdomain} (${tenant.id})\n`)

    // Get or create a default user for created_by field
    const { data: users } = await supabase
      .from('user_profiles')
      .select('id, full_name, role')
      .eq('tenant_id', tenant.id)
      .in('role', ['CEO', 'Admin'])
      .limit(1)

    const creatorUser = users?.[0]
    if (!creatorUser) {
      console.error('❌ No CEO or Admin user found to create objectives')
      return
    }

    console.log(`👤 Using ${creatorUser.full_name} (${creatorUser.role}) as creator\n`)

    // Process each area
    for (const areaData of okrData) {
      console.log(`\n📁 Processing area: ${areaData.area}`)
      console.log('━'.repeat(50))

      // Get area ID
      const { data: area } = await supabase
        .from('areas')
        .select('id, name')
        .eq('tenant_id', tenant.id)
        .ilike('name', areaData.area)
        .single()

      if (!area) {
        console.log(`⚠️  Area "${areaData.area}" not found, skipping...`)
        continue
      }

      console.log(`✅ Found area: ${area.name} (${area.id})`)

      // Process objectives for this area
      for (const objectiveData of areaData.objectives) {
        console.log(`\n  📎 Creating objective: ${objectiveData.title}`)
        
        // Calculate objective progress based on its initiatives
        const objectiveProgress = calculateProgress(
          objectiveData.dateRange.start,
          objectiveData.dateRange.end,
          30 // base progress
        )

        // Create objective
        const { data: objective, error: objError } = await supabase
          .from('objectives')
          .insert({
            tenant_id: tenant.id,
            area_id: area.id,
            title: objectiveData.title,
            description: objectiveData.description,
            priority: objectiveData.priority,
            status: objectiveProgress === 100 ? 'completed' : 
                   objectiveProgress > 0 ? 'in_progress' : 'planning',
            progress: objectiveProgress,
            start_date: objectiveData.dateRange.start,
            end_date: objectiveData.dateRange.end,
            target_date: objectiveData.dateRange.end,
            created_by: creatorUser.id,
            created_at: new Date(objectiveData.dateRange.start).toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single()

        if (objError) {
          console.error(`    ❌ Error creating objective: ${objError.message}`)
          continue
        }

        console.log(`    ✅ Created objective (Progress: ${objectiveProgress}%)`)

        // Process initiatives for this objective
        for (const initiativeData of objectiveData.initiatives) {
          console.log(`\n    🎯 Creating initiative: ${initiativeData.title}`)
          
          // Calculate initiative dates (within objective timeframe)
          const initiativeStart = new Date(objectiveData.dateRange.start)
          initiativeStart.setMonth(initiativeStart.getMonth() + Math.floor(Math.random() * 2))
          
          const initiativeDue = new Date(initiativeStart)
          initiativeDue.setMonth(initiativeDue.getMonth() + 3 + Math.floor(Math.random() * 3))
          
          // Ensure due date doesn't exceed objective end date
          if (initiativeDue > new Date(objectiveData.dateRange.end)) {
            initiativeDue.setTime(new Date(objectiveData.dateRange.end).getTime())
          }

          // Calculate progress based on completed activities
          const completedActivities = initiativeData.activities.filter(a => a.is_completed).length
          const totalActivities = initiativeData.activities.length
          const activityProgress = totalActivities > 0 
            ? Math.floor((completedActivities / totalActivities) * 100)
            : 0

          const timeProgress = calculateProgress(
            initiativeStart.toISOString(),
            initiativeDue.toISOString(),
            20
          )

          const initiativeProgress = Math.floor((activityProgress + timeProgress) / 2)

          // Create initiative
          const { data: initiative, error: initError } = await supabase
            .from('initiatives')
            .insert({
              tenant_id: tenant.id,
              area_id: area.id,
              title: initiativeData.title,
              description: initiativeData.description,
              status: initiativeData.status,
              progress: initiativeProgress,
              start_date: initiativeStart.toISOString().split('T')[0],
              due_date: initiativeDue.toISOString().split('T')[0],
              completion_date: initiativeProgress === 100 
                ? initiativeDue.toISOString().split('T')[0] 
                : null,
              created_by: creatorUser.id,
              created_at: initiativeStart.toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single()

          if (initError) {
            console.error(`      ❌ Error creating initiative: ${initError.message}`)
            continue
          }

          console.log(`      ✅ Created initiative (Progress: ${initiativeProgress}%)`)

          // Link initiative to objective
          await supabase
            .from('objective_initiatives')
            .insert({
              objective_id: objective.id,
              initiative_id: initiative.id
            })

          // Create activities for this initiative
          for (const activityData of initiativeData.activities) {
            const { error: actError } = await supabase
              .from('activities')
              .insert({
                initiative_id: initiative.id,
                title: activityData.title,
                description: activityData.description,
                is_completed: activityData.is_completed,
                created_at: initiativeStart.toISOString(),
                updated_at: new Date().toISOString()
              })

            if (actError) {
              console.error(`        ❌ Error creating activity: ${actError.message}`)
            }
          }

          console.log(`      ✅ Created ${initiativeData.activities.length} activities`)
        }
      }
    }

    console.log('\n' + '='.repeat(60))
    console.log('✅ OKR data seeding completed successfully!')
    console.log('='.repeat(60))

    // Show summary
    const { count: objCount } = await supabase
      .from('objectives')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenant.id)

    const { count: initCount } = await supabase
      .from('initiatives')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenant.id)

    const { count: actCount } = await supabase
      .from('activities')
      .select('*', { count: 'exact', head: true })

    console.log('\n📊 Final Summary:')
    console.log(`   Total Objectives: ${objCount}`)
    console.log(`   Total Initiatives: ${initCount}`)
    console.log(`   Total Activities: ${actCount}`)

  } catch (error) {
    console.error('\n❌ Error seeding data:', error)
  }
}

// Run the seeding
seedOKRData()

/*
USAGE:
======
1. Ensure environment variables are set
2. Run: npx tsx scripts/seed-realistic-okr-data.ts
3. Check your dashboard to see the populated data
*/