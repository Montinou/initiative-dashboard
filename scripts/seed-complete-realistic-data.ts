/**
 * Complete Realistic Data Seeding Script
 * 
 * Populates ALL necessary tables (except quarters) with realistic data:
 * - Areas with managers
 * - Objectives with metrics
 * - Initiatives with progress history
 * - Activities with assignments
 * - Audit log entries
 * - Progress tracking over time
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

// Helper functions
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

function getRandomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
}

function calculateProgress(startDate: string, endDate: string, baseProgress: number = 0): number {
  const now = new Date()
  const start = new Date(startDate)
  const end = new Date(endDate)
  
  if (now < start) return 0
  if (now > end) return 100
  
  const total = end.getTime() - start.getTime()
  const elapsed = now.getTime() - start.getTime()
  const timeProgress = Math.floor((elapsed / total) * 100)
  
  return Math.min(100, Math.floor((timeProgress + baseProgress) / 2))
}

// Team members data for each area
const teamMembers = {
  'Producto': [
    { name: 'Carlos Rodríguez', email: 'carlos.rodriguez@siga.com', role: 'Manager' },
    { name: 'Ana Martínez', email: 'ana.martinez@siga.com', role: 'Manager' },
    { name: 'Luis García', email: 'luis.garcia@siga.com', role: 'Manager' }
  ],
  'Capital Humano': [
    { name: 'María López', email: 'maria.lopez@siga.com', role: 'Manager' },
    { name: 'Roberto Sánchez', email: 'roberto.sanchez@siga.com', role: 'Manager' }
  ],
  'Administración': [
    { name: 'Patricia Hernández', email: 'patricia.hernandez@siga.com', role: 'Manager' },
    { name: 'Jorge Díaz', email: 'jorge.diaz@siga.com', role: 'Manager' }
  ],
  'Comercial': [
    { name: 'Alejandra Pérez', email: 'alejandra.perez@siga.com', role: 'Manager' },
    { name: 'Fernando Torres', email: 'fernando.torres@siga.com', role: 'Manager' },
    { name: 'Sofía Ramírez', email: 'sofia.ramirez@siga.com', role: 'Manager' }
  ],
  'Corporativo': [
    { name: 'Ricardo Mendoza', email: 'ricardo.mendoza@siga.com', role: 'Admin' },
    { name: 'Elena Vargas', email: 'elena.vargas@siga.com', role: 'CEO' }
  ]
}

// Comprehensive OKR data
interface OKRData {
  area: string
  objectives: Array<{
    title: string
    description: string
    priority: 'high' | 'medium' | 'low'
    dateRange: { start: string; end: string }
    metrics: Array<{
      name: string
      target: number
      unit: string
      current?: number
    }>
    initiatives: Array<{
      title: string
      description: string
      status: 'planning' | 'in_progress' | 'completed' | 'on_hold'
      activities: Array<{
        title: string
        description: string
        is_completed: boolean
        estimatedHours?: number
      }>
    }>
  }>
}

const okrData: OKRData[] = [
  {
    area: 'Producto',
    objectives: [
      {
        title: 'Lanzar plataforma digital v2.0 con 99.9% uptime',
        description: 'Nueva versión con arquitectura escalable y alta disponibilidad',
        priority: 'high',
        dateRange: getDateRange(-2, 6),
        metrics: [
          { name: 'Uptime SLA', target: 99.9, unit: '%', current: 98.5 },
          { name: 'Tiempo de respuesta API', target: 200, unit: 'ms', current: 350 },
          { name: 'Usuarios activos mensuales', target: 50000, unit: 'usuarios', current: 35000 },
          { name: 'Satisfacción del usuario', target: 4.5, unit: 'rating', current: 4.1 }
        ],
        initiatives: [
          {
            title: 'Migración a arquitectura cloud-native',
            description: 'Implementar microservicios en Kubernetes con auto-scaling',
            status: 'in_progress',
            activities: [
              { 
                title: 'Containerizar aplicaciones existentes', 
                description: 'Crear Dockerfiles y configuraciones para cada servicio', 
                is_completed: true,
                estimatedHours: 40 
              },
              { 
                title: 'Configurar cluster Kubernetes en AWS EKS', 
                description: 'Setup de infraestructura con Terraform', 
                is_completed: true,
                estimatedHours: 60 
              },
              { 
                title: 'Implementar CI/CD con GitOps', 
                description: 'Pipeline con GitHub Actions y ArgoCD', 
                is_completed: false,
                estimatedHours: 80 
              },
              { 
                title: 'Configurar monitoreo con Prometheus y Grafana', 
                description: 'Dashboards y alertas de infraestructura', 
                is_completed: false,
                estimatedHours: 40 
              },
              { 
                title: 'Implementar service mesh con Istio', 
                description: 'Gestión de tráfico y seguridad entre microservicios', 
                is_completed: false,
                estimatedHours: 60 
              }
            ]
          },
          {
            title: 'Optimización de base de datos',
            description: 'Mejorar performance y escalabilidad de PostgreSQL',
            status: 'in_progress',
            activities: [
              { 
                title: 'Análisis de queries lentas con pg_stat_statements', 
                description: 'Identificar y documentar bottlenecks', 
                is_completed: true,
                estimatedHours: 20 
              },
              { 
                title: 'Crear índices optimizados', 
                description: 'Añadir índices basados en análisis de EXPLAIN', 
                is_completed: true,
                estimatedHours: 30 
              },
              { 
                title: 'Implementar particionamiento de tablas grandes', 
                description: 'Particionar por fecha tablas históricas', 
                is_completed: false,
                estimatedHours: 40 
              },
              { 
                title: 'Configurar read replicas', 
                description: 'Separar lecturas de escrituras', 
                is_completed: false,
                estimatedHours: 30 
              }
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
        title: 'Reducir rotación de personal al 8% anual',
        description: 'Mejorar retención de talento clave mediante programas de engagement',
        priority: 'high',
        dateRange: getDateRange(-1, 12),
        metrics: [
          { name: 'Tasa de rotación', target: 8, unit: '%', current: 15 },
          { name: 'Employee NPS', target: 50, unit: 'puntos', current: 35 },
          { name: 'Tiempo promedio de contratación', target: 30, unit: 'días', current: 45 },
          { name: 'Índice de clima laboral', target: 85, unit: '%', current: 72 }
        ],
        initiatives: [
          {
            title: 'Programa de desarrollo profesional personalizado',
            description: 'Plan de carrera individual para cada colaborador',
            status: 'in_progress',
            activities: [
              { 
                title: 'Evaluación de competencias 360°', 
                description: 'Assessment completo de habilidades técnicas y blandas', 
                is_completed: true,
                estimatedHours: 120 
              },
              { 
                title: 'Diseño de matrices de desarrollo', 
                description: 'Mapeo de rutas de crecimiento por rol', 
                is_completed: false,
                estimatedHours: 80 
              },
              { 
                title: 'Implementar plataforma de e-learning', 
                description: 'Coursera for Business con tracks personalizados', 
                is_completed: false,
                estimatedHours: 40 
              },
              { 
                title: 'Programa de mentoring cruzado', 
                description: 'Matching de mentores y mentees entre áreas', 
                is_completed: false,
                estimatedHours: 60 
              }
            ]
          },
          {
            title: 'Mejora de beneficios y compensaciones',
            description: 'Paquete competitivo de compensación total',
            status: 'in_progress',
            activities: [
              { 
                title: 'Benchmark salarial del mercado', 
                description: 'Estudio con Mercer de compensaciones', 
                is_completed: true,
                estimatedHours: 40 
              },
              { 
                title: 'Implementar bonos por desempeño', 
                description: 'Sistema variable basado en OKRs', 
                is_completed: false,
                estimatedHours: 60 
              },
              { 
                title: 'Plan de stock options', 
                description: 'Programa de participación accionaria', 
                is_completed: false,
                estimatedHours: 80 
              }
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
        title: 'Reducir costos operativos en 20%',
        description: 'Optimización de procesos y automatización administrativa',
        priority: 'high',
        dateRange: getDateRange(-3, 9),
        metrics: [
          { name: 'Reducción de costos', target: 20, unit: '%', current: 12 },
          { name: 'Procesos automatizados', target: 80, unit: '%', current: 45 },
          { name: 'Tiempo de cierre contable', target: 3, unit: 'días', current: 7 },
          { name: 'Accuracy de reportes', target: 99.5, unit: '%', current: 96 }
        ],
        initiatives: [
          {
            title: 'Automatización robótica de procesos (RPA)',
            description: 'Bots para tareas administrativas repetitivas',
            status: 'in_progress',
            activities: [
              { 
                title: 'Mapeo de procesos candidatos para RPA', 
                description: 'Identificar tareas de alto volumen y repetitivas', 
                is_completed: true,
                estimatedHours: 60 
              },
              { 
                title: 'Implementar bot de conciliación bancaria', 
                description: 'Automatizar matching de transacciones', 
                is_completed: true,
                estimatedHours: 100 
              },
              { 
                title: 'Bot de procesamiento de facturas', 
                description: 'OCR y registro automático en ERP', 
                is_completed: false,
                estimatedHours: 120 
              },
              { 
                title: 'Automatización de reportes gerenciales', 
                description: 'Generación y distribución automática', 
                is_completed: false,
                estimatedHours: 80 
              }
            ]
          },
          {
            title: 'Implementación de centro de servicios compartidos',
            description: 'Centralizar funciones administrativas transversales',
            status: 'planning',
            activities: [
              { 
                title: 'Diseño del modelo operativo', 
                description: 'Definir alcance y estructura del CSC', 
                is_completed: false,
                estimatedHours: 80 
              },
              { 
                title: 'Migración de procesos de contabilidad', 
                description: 'Centralizar contabilidad de todas las unidades', 
                is_completed: false,
                estimatedHours: 160 
              },
              { 
                title: 'Centralización de compras', 
                description: 'Unificar procurement y negociación con proveedores', 
                is_completed: false,
                estimatedHours: 120 
              }
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
        title: 'Incrementar revenue 40% YoY alcanzando $10M ARR',
        description: 'Crecimiento agresivo mediante expansión de mercado y nuevos productos',
        priority: 'high',
        dateRange: getDateRange(-2, 12),
        metrics: [
          { name: 'Annual Recurring Revenue', target: 10000000, unit: 'USD', current: 7000000 },
          { name: 'Customer Acquisition Cost', target: 500, unit: 'USD', current: 750 },
          { name: 'Customer Lifetime Value', target: 5000, unit: 'USD', current: 3500 },
          { name: 'Win Rate', target: 30, unit: '%', current: 22 },
          { name: 'Net Revenue Retention', target: 120, unit: '%', current: 105 }
        ],
        initiatives: [
          {
            title: 'Expansión internacional LATAM',
            description: 'Entrada a México, Colombia y Chile',
            status: 'in_progress',
            activities: [
              { 
                title: 'Estudio de mercado y regulatorio', 
                description: 'Análisis de TAM y requisitos legales por país', 
                is_completed: true,
                estimatedHours: 120 
              },
              { 
                title: 'Establecer entidad legal en México', 
                description: 'Constitución de empresa y permisos operativos', 
                is_completed: true,
                estimatedHours: 80 
              },
              { 
                title: 'Contratar country managers', 
                description: 'Líderes locales para cada mercado', 
                is_completed: false,
                estimatedHours: 160 
              },
              { 
                title: 'Adaptar producto para mercado local', 
                description: 'Localización, moneda, integraciones fiscales', 
                is_completed: false,
                estimatedHours: 200 
              },
              { 
                title: 'Campaña go-to-market', 
                description: 'Lanzamiento con PR y marketing digital', 
                is_completed: false,
                estimatedHours: 120 
              }
            ]
          },
          {
            title: 'Programa de customer success proactivo',
            description: 'Maximizar retención y expansión de cuentas',
            status: 'in_progress',
            activities: [
              { 
                title: 'Implementar health score de clientes', 
                description: 'Modelo predictivo de churn con ML', 
                is_completed: true,
                estimatedHours: 80 
              },
              { 
                title: 'Playbooks de onboarding por segmento', 
                description: 'Procesos específicos por tipo de cliente', 
                is_completed: false,
                estimatedHours: 60 
              },
              { 
                title: 'Quarterly Business Reviews', 
                description: 'Reuniones estratégicas con key accounts', 
                is_completed: false,
                estimatedHours: 40 
              },
              { 
                title: 'Programa de advocacy y referencias', 
                description: 'Convertir clientes en promotores', 
                is_completed: false,
                estimatedHours: 60 
              }
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
        title: 'Completar Serie A de $15M en Q2 2024',
        description: 'Levantar capital para acelerar crecimiento y expansión',
        priority: 'high',
        dateRange: getDateRange(-1, 5),
        metrics: [
          { name: 'Monto a levantar', target: 15000000, unit: 'USD', current: 0 },
          { name: 'Valoración pre-money', target: 60000000, unit: 'USD', current: 45000000 },
          { name: 'Investors contactados', target: 100, unit: 'VCs', current: 45 },
          { name: 'Term sheets recibidos', target: 3, unit: 'ofertas', current: 1 }
        ],
        initiatives: [
          {
            title: 'Preparación de due diligence',
            description: 'Data room y documentación para inversionistas',
            status: 'in_progress',
            activities: [
              { 
                title: 'Crear data room virtual', 
                description: 'Organizar documentación legal y financiera', 
                is_completed: true,
                estimatedHours: 60 
              },
              { 
                title: 'Auditoría financiera últimos 3 años', 
                description: 'Estados financieros auditados por Big 4', 
                is_completed: true,
                estimatedHours: 120 
              },
              { 
                title: 'Deck de inversión y modelo financiero', 
                description: 'Presentación y proyecciones a 5 años', 
                is_completed: false,
                estimatedHours: 80 
              },
              { 
                title: 'Legal cleanup', 
                description: 'Resolver contingencias y actualizar contratos', 
                is_completed: false,
                estimatedHours: 100 
              }
            ]
          },
          {
            title: 'Roadshow con inversionistas',
            description: 'Presentaciones a VCs tier 1',
            status: 'planning',
            activities: [
              { 
                title: 'Identificar y contactar 100 VCs target', 
                description: 'Funds con tesis en B2B SaaS LATAM', 
                is_completed: false,
                estimatedHours: 40 
              },
              { 
                title: 'Meetings con partners', 
                description: 'Presentaciones presenciales y virtuales', 
                is_completed: false,
                estimatedHours: 160 
              },
              { 
                title: 'Negociación de term sheets', 
                description: 'Términos y condiciones de inversión', 
                is_completed: false,
                estimatedHours: 80 
              }
            ]
          }
        ]
      }
    ]
  }
]

// Helper to create progress history entries
async function createProgressHistory(
  initiativeId: string, 
  userId: string,
  startDate: Date,
  endDate: Date,
  finalProgress: number
) {
  const entries = []
  const totalDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  const updateFrequency = Math.max(7, Math.floor(totalDays / 10)) // Update every 7-30 days
  
  let currentDate = new Date(startDate)
  let currentProgress = 0
  let completedCount = 0
  const totalActivities = Math.floor(Math.random() * 8) + 3
  
  while (currentDate < endDate && currentDate < new Date()) {
    // Simulate progress increment
    const increment = Math.min(
      Math.floor(Math.random() * 15) + 5,
      finalProgress - currentProgress
    )
    currentProgress = Math.min(currentProgress + increment, finalProgress)
    
    // Update completed activities count
    completedCount = Math.floor((currentProgress / 100) * totalActivities)
    
    entries.push({
      initiative_id: initiativeId,
      completed_activities_count: completedCount,
      total_activities_count: totalActivities,
      notes: getProgressNote(currentProgress),
      updated_by: userId,
      created_at: currentDate.toISOString()
    })
    
    currentDate.setDate(currentDate.getDate() + updateFrequency)
  }
  
  return entries
}

function getProgressNote(progress: number): string {
  const notes = [
    'Avance según lo planificado',
    'Reunión de seguimiento completada',
    'Hitos alcanzados esta semana',
    'Actualización de estado del equipo',
    'Revisión quincenal de progreso',
    'Sprint completado exitosamente',
    'Entregables parciales completados',
    'Checkpoint de proyecto alcanzado'
  ]
  
  if (progress < 25) return 'Fase inicial en progreso'
  if (progress < 50) return notes[Math.floor(Math.random() * notes.length)]
  if (progress < 75) return 'Avanzando hacia objetivo final'
  if (progress < 100) return 'Fase final de implementación'
  return 'Objetivo completado satisfactoriamente'
}

// Create audit log entries
async function createAuditLogEntry(
  userId: string,
  action: string,
  tableName: string,
  recordId: string,
  newData: any,
  createdAt?: Date
) {
  return {
    user_id: userId,
    action,
    table_name: tableName,
    record_id: recordId,
    old_data: null,
    new_data: newData,
    created_at: createdAt?.toISOString() || new Date().toISOString()
  }
}

// Main execution
async function seedCompleteData() {
  console.log('🚀 Starting complete data seeding...\n')

  try {
    // Get SIGA tenant
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

    // Create users for each area if they don't exist
    console.log('👥 Creating team members...')
    const areaUsers: Record<string, any[]> = {}
    
    for (const [areaName, members] of Object.entries(teamMembers)) {
      areaUsers[areaName] = []
      
      for (const member of members) {
        // Check if user exists
        let { data: existingUser } = await supabase
          .from('user_profiles')
          .select('id, full_name, role')
          .eq('email', member.email)
          .eq('tenant_id', tenant.id)
          .single()
        
        if (!existingUser) {
          // Create auth user first
          const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
            email: member.email,
            password: 'Demo2024!',
            email_confirm: true
          })
          
          if (authError) {
            console.log(`   ⚠️  Could not create auth user for ${member.email}`)
            continue
          }
          
          // Create user profile
          const { data: newUser } = await supabase
            .from('user_profiles')
            .insert({
              tenant_id: tenant.id,
              user_id: authUser.user.id,
              email: member.email,
              full_name: member.name,
              role: member.role,
              is_active: true,
              avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=random`,
              created_at: new Date().toISOString()
            })
            .select()
            .single()
          
          if (newUser) {
            existingUser = newUser
            console.log(`   ✅ Created user: ${member.name} (${member.role})`)
          }
        }
        
        if (existingUser) {
          areaUsers[areaName].push(existingUser)
        }
      }
    }

    // Get a CEO/Admin user for creating objectives
    const { data: creatorUser } = await supabase
      .from('user_profiles')
      .select('id, full_name, role')
      .eq('tenant_id', tenant.id)
      .in('role', ['CEO', 'Admin'])
      .limit(1)
      .single()

    if (!creatorUser) {
      console.error('❌ No CEO/Admin user found')
      return
    }

    console.log(`\n👤 Using ${creatorUser.full_name} as creator\n`)

    // Store all audit log entries to insert at the end
    const auditLogEntries: any[] = []

    // Process each area
    for (const areaData of okrData) {
      console.log(`\n📁 Processing area: ${areaData.area}`)
      console.log('━'.repeat(60))

      // Get or update area
      let { data: area } = await supabase
        .from('areas')
        .select('id, name, manager_id')
        .eq('tenant_id', tenant.id)
        .ilike('name', areaData.area)
        .single()

      if (!area) {
        console.log(`⚠️  Area "${areaData.area}" not found, skipping...`)
        continue
      }

      // Assign a manager to the area if not already assigned
      if (!area.manager_id && areaUsers[areaData.area]?.length > 0) {
        const manager = areaUsers[areaData.area].find(u => u.role === 'Manager') || areaUsers[areaData.area][0]
        
        await supabase
          .from('areas')
          .update({ 
            manager_id: manager.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', area.id)
        
        // Also update the user's area_id
        await supabase
          .from('user_profiles')
          .update({ area_id: area.id })
          .eq('id', manager.id)
        
        console.log(`   ✅ Assigned manager: ${manager.full_name}`)
      }

      // Assign all team members to this area
      if (areaUsers[areaData.area]) {
        for (const user of areaUsers[areaData.area]) {
          await supabase
            .from('user_profiles')
            .update({ area_id: area.id })
            .eq('id', user.id)
        }
      }

      // Process objectives
      for (const objectiveData of areaData.objectives) {
        console.log(`\n  📎 Creating objective: ${objectiveData.title}`)
        
        const objectiveProgress = calculateProgress(
          objectiveData.dateRange.start,
          objectiveData.dateRange.end,
          30
        )

        // Create objective with metrics
        const { data: objective, error: objError } = await supabase
          .from('objectives')
          .insert({
            tenant_id: tenant.id,
            area_id: area.id,
            title: objectiveData.title,
            description: objectiveData.description,
            priority: objectiveData.priority,
            status: objectiveProgress === 100 ? 'completed' : 
                   objectiveProgress > 70 ? 'in_progress' : 
                   objectiveProgress > 0 ? 'in_progress' : 'planning',
            progress: objectiveProgress,
            start_date: objectiveData.dateRange.start,
            end_date: objectiveData.dateRange.end,
            target_date: objectiveData.dateRange.end,
            metrics: objectiveData.metrics || [],
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

        console.log(`    ✅ Created objective with ${objectiveData.metrics.length} metrics`)

        // Add audit log entry
        auditLogEntries.push(await createAuditLogEntry(
          creatorUser.id,
          'create',
          'objectives',
          objective.id,
          objective,
          new Date(objectiveData.dateRange.start)
        ))

        // Process initiatives
        for (const initiativeData of objectiveData.initiatives) {
          console.log(`\n    🎯 Creating initiative: ${initiativeData.title}`)
          
          const initiativeStart = new Date(objectiveData.dateRange.start)
          initiativeStart.setMonth(initiativeStart.getMonth() + Math.floor(Math.random() * 2))
          
          const initiativeDue = new Date(initiativeStart)
          initiativeDue.setMonth(initiativeDue.getMonth() + 3 + Math.floor(Math.random() * 3))
          
          if (initiativeDue > new Date(objectiveData.dateRange.end)) {
            initiativeDue.setTime(new Date(objectiveData.dateRange.end).getTime())
          }

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

          // Add audit log entry
          auditLogEntries.push(await createAuditLogEntry(
            creatorUser.id,
            'create',
            'initiatives',
            initiative.id,
            initiative,
            initiativeStart
          ))

          // Link initiative to objective
          await supabase
            .from('objective_initiatives')
            .insert({
              objective_id: objective.id,
              initiative_id: initiative.id
            })

          // Create progress history for the initiative
          const progressEntries = await createProgressHistory(
            initiative.id,
            creatorUser.id,
            initiativeStart,
            initiativeDue,
            initiativeProgress
          )

          if (progressEntries.length > 0) {
            const { error: progressError } = await supabase
              .from('progress_history')
              .insert(progressEntries)
            
            if (!progressError) {
              console.log(`      ✅ Created ${progressEntries.length} progress history entries`)
            }
          }

          // Create activities with assignments
          const teamMembers = areaUsers[areaData.area] || []
          let activityIndex = 0

          for (const activityData of initiativeData.activities) {
            // Assign to team members in round-robin fashion
            const assignedTo = teamMembers.length > 0 
              ? teamMembers[activityIndex % teamMembers.length].id 
              : null

            const { data: activity, error: actError } = await supabase
              .from('activities')
              .insert({
                initiative_id: initiative.id,
                title: activityData.title,
                description: activityData.description,
                is_completed: activityData.is_completed,
                assigned_to: assignedTo,
                created_at: initiativeStart.toISOString(),
                updated_at: activityData.is_completed 
                  ? getRandomDate(initiativeStart, new Date()).toISOString()
                  : new Date().toISOString()
              })
              .select()
              .single()

            if (!actError && activity) {
              // Add audit log for activity creation
              auditLogEntries.push(await createAuditLogEntry(
                creatorUser.id,
                'create',
                'activities',
                activity.id,
                activity,
                initiativeStart
              ))

              // If activity is completed, add an update audit log
              if (activityData.is_completed) {
                const completionDate = getRandomDate(initiativeStart, new Date())
                auditLogEntries.push(await createAuditLogEntry(
                  assignedTo || creatorUser.id,
                  'update',
                  'activities',
                  activity.id,
                  { ...activity, is_completed: true },
                  completionDate
                ))
              }
            }

            activityIndex++
          }

          console.log(`      ✅ Created ${initiativeData.activities.length} activities with assignments`)
        }
      }
    }

    // Insert all audit log entries
    if (auditLogEntries.length > 0) {
      console.log(`\n📝 Creating audit log entries...`)
      
      // Insert in batches of 100
      const batchSize = 100
      for (let i = 0; i < auditLogEntries.length; i += batchSize) {
        const batch = auditLogEntries.slice(i, i + batchSize)
        await supabase.from('audit_log').insert(batch)
      }
      
      console.log(`✅ Created ${auditLogEntries.length} audit log entries`)
    }

    console.log('\n' + '='.repeat(60))
    console.log('✅ Complete data seeding finished successfully!')
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

    const { count: progressCount } = await supabase
      .from('progress_history')
      .select('*', { count: 'exact', head: true })

    const { count: auditCount } = await supabase
      .from('audit_log')
      .select('*', { count: 'exact', head: true })

    const { count: userCount } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenant.id)

    console.log('\n📊 Final Summary:')
    console.log(`   Total Users: ${userCount}`)
    console.log(`   Total Objectives: ${objCount}`)
    console.log(`   Total Initiatives: ${initCount}`)
    console.log(`   Total Activities: ${actCount}`)
    console.log(`   Progress History Entries: ${progressCount}`)
    console.log(`   Audit Log Entries: ${auditCount}`)
    
    console.log('\n📋 Per Area Breakdown:')
    for (const areaName of Object.keys(teamMembers)) {
      const { data: area } = await supabase
        .from('areas')
        .select('id')
        .eq('tenant_id', tenant.id)
        .ilike('name', areaName)
        .single()
      
      if (area) {
        const { count: areaUsers } = await supabase
          .from('user_profiles')
          .select('*', { count: 'exact', head: true })
          .eq('area_id', area.id)
        
        const { count: areaObjectives } = await supabase
          .from('objectives')
          .select('*', { count: 'exact', head: true })
          .eq('area_id', area.id)
        
        const { count: areaInitiatives } = await supabase
          .from('initiatives')
          .select('*', { count: 'exact', head: true })
          .eq('area_id', area.id)
        
        console.log(`   ${areaName}: ${areaUsers} users, ${areaObjectives} objectives, ${areaInitiatives} initiatives`)
      }
    }

    console.log('\n✨ Data seeding complete! Your dashboard should now show realistic data.')

  } catch (error) {
    console.error('\n❌ Error seeding data:', error)
  }
}

// Run the seeding
seedCompleteData()

/*
USAGE:
======
1. Ensure environment variables are set:
   - NEXT_PUBLIC_SUPABASE_URL
   - SUPABASE_SERVICE_ROLE_KEY

2. Run: npx tsx scripts/seed-complete-realistic-data.ts

3. The script will:
   - Create team members for each area
   - Assign managers to areas
   - Create objectives with KPI metrics
   - Create initiatives with realistic progress
   - Assign activities to team members
   - Generate progress history over time
   - Create audit log entries for all actions
   - Populate ALL necessary tables

4. Check your dashboard to see the fully populated data
*/