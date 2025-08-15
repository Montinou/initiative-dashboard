/**
 * Seed Historical and Future OKR Data (2 Years Back + 6 Months Forward)
 * 
 * Creates objectives, initiatives, and activities for existing areas
 * covering the last 2 years and next 6 months with realistic progress
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

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

// Time period: 2 years back + 6 months forward
const START_DATE = new Date()
START_DATE.setFullYear(START_DATE.getFullYear() - 2) // 2 years ago

const END_DATE = new Date()
END_DATE.setMonth(END_DATE.getMonth() + 6) // 6 months from now

// Helper to generate realistic date ranges
function generateDateRange(periodStart: Date, periodEnd: Date, minMonths: number, maxMonths: number) {
  const start = new Date(
    periodStart.getTime() + Math.random() * (periodEnd.getTime() - periodStart.getTime() - (maxMonths * 30 * 24 * 60 * 60 * 1000))
  )
  
  const durationMonths = minMonths + Math.random() * (maxMonths - minMonths)
  const end = new Date(start)
  end.setMonth(end.getMonth() + durationMonths)
  
  if (end > periodEnd) {
    end.setTime(periodEnd.getTime())
  }
  
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0]
  }
}

// Calculate realistic progress based on dates and status
function calculateRealisticProgress(startDate: string, endDate: string, createdDate: Date): number {
  const now = new Date()
  const start = new Date(startDate)
  const end = new Date(endDate)
  
  // If it's a future objective
  if (start > now) return 0
  
  // If it's a past objective that should be completed
  if (end < now) {
    // 85% chance of being completed if ended more than 3 months ago
    const monthsSinceEnd = (now.getTime() - end.getTime()) / (1000 * 60 * 60 * 24 * 30)
    if (monthsSinceEnd > 3) {
      return Math.random() > 0.15 ? 100 : Math.floor(Math.random() * 20) + 75
    }
    // Recently ended, likely completed or very close
    return Math.random() > 0.3 ? 100 : Math.floor(Math.random() * 15) + 80
  }
  
  // Ongoing objective - calculate based on time elapsed
  const total = end.getTime() - start.getTime()
  const elapsed = now.getTime() - start.getTime()
  const timeProgress = (elapsed / total) * 100
  
  // Add some realistic variance
  const variance = (Math.random() - 0.5) * 30
  const progress = Math.max(0, Math.min(100, timeProgress + variance))
  
  return Math.floor(progress)
}

// Comprehensive historical OKR templates by time period and area
const historicalObjectives = {
  'Producto': [
    // 2023 Objectives (2 years ago)
    {
      period: 'Y-2',
      objectives: [
        {
          title: 'Migración a arquitectura de microservicios fase 1',
          description: 'Descomponer monolito en servicios independientes',
          initiatives: [
            'Separar módulo de autenticación',
            'Extraer servicio de notificaciones',
            'Implementar API Gateway',
            'Configurar service discovery'
          ]
        },
        {
          title: 'Mejorar performance del sistema 50%',
          description: 'Optimización de queries y caching',
          initiatives: [
            'Implementar Redis para cache',
            'Optimizar queries N+1',
            'Añadir índices en base de datos',
            'Implementar CDN para assets'
          ]
        },
        {
          title: 'Lanzamiento de aplicación móvil MVP',
          description: 'Primera versión de app iOS y Android',
          initiatives: [
            'Desarrollo de app con React Native',
            'Integración con API backend',
            'Implementar push notifications',
            'Publicación en App Store y Play Store'
          ]
        }
      ]
    },
    // 2024 Objectives (1 year ago to present)
    {
      period: 'Y-1',
      objectives: [
        {
          title: 'Implementación de CI/CD completo',
          description: 'Pipeline automatizado de desarrollo a producción',
          initiatives: [
            'Configurar GitHub Actions',
            'Implementar testing automatizado',
            'Deploy automático a staging',
            'Blue-green deployment en producción'
          ]
        },
        {
          title: 'Adopción de Kubernetes para orquestación',
          description: 'Migrar infraestructura a K8s',
          initiatives: [
            'Containerizar todas las aplicaciones',
            'Configurar cluster en AWS EKS',
            'Implementar Helm charts',
            'Monitoreo con Prometheus y Grafana'
          ]
        },
        {
          title: 'Plataforma de analytics en tiempo real',
          description: 'Sistema de métricas y dashboards',
          initiatives: [
            'Implementar event streaming con Kafka',
            'Data pipeline con Apache Spark',
            'Dashboards en Tableau',
            'Alertas automáticas de anomalías'
          ]
        }
      ]
    },
    // 2025 Objectives (current and future)
    {
      period: 'Y0',
      objectives: [
        {
          title: 'Inteligencia Artificial generativa integrada',
          description: 'Capacidades de IA en toda la plataforma',
          initiatives: [
            'Chatbot con GPT-4 para soporte',
            'Generación automática de reportes',
            'Análisis predictivo con ML',
            'Personalización con recommendation engine'
          ]
        },
        {
          title: 'Expansión a edge computing',
          description: 'Procesamiento distribuido en el edge',
          initiatives: [
            'Deploy de funciones en Cloudflare Workers',
            'Cache distribuido global',
            'Procesamiento de datos en origen',
            'Reducir latencia a <50ms global'
          ]
        }
      ]
    }
  ],
  'Capital Humano': [
    {
      period: 'Y-2',
      objectives: [
        {
          title: 'Implementar modelo de trabajo híbrido',
          description: 'Transición post-pandemia a modalidad flexible',
          initiatives: [
            'Política de trabajo remoto 3 días',
            'Equipamiento home office',
            'Rediseño de oficinas para colaboración',
            'Herramientas de colaboración digital'
          ]
        },
        {
          title: 'Programa de upskilling técnico',
          description: 'Capacitación en nuevas tecnologías',
          initiatives: [
            'Certificaciones cloud para IT',
            'Bootcamp de data science interno',
            'Programa de mentoring técnico',
            'Partnerships con universidades'
          ]
        }
      ]
    },
    {
      period: 'Y-1',
      objectives: [
        {
          title: 'Reducir turnover de 25% a 10%',
          description: 'Retención de talento clave',
          initiatives: [
            'Encuestas de clima laboral mensuales',
            'Plan de carrera personalizado',
            'Mejora de beneficios y compensaciones',
            'Programa de reconocimiento peer-to-peer'
          ]
        },
        {
          title: 'Diversidad e inclusión 40% mujeres en tech',
          description: 'Aumentar representación femenina en tecnología',
          initiatives: [
            'Partnership con Women in Tech',
            'Programa de mentoría para mujeres',
            'Revisión de procesos de hiring',
            'Talleres de sesgos inconscientes'
          ]
        },
        {
          title: 'Transformación cultural ágil',
          description: 'Adopción de metodologías ágiles en toda la empresa',
          initiatives: [
            'Training de Scrum para todos',
            'Coaches ágiles por equipo',
            'OKRs en toda la organización',
            'Retrospectivas y mejora continua'
          ]
        }
      ]
    },
    {
      period: 'Y0',
      objectives: [
        {
          title: 'Great Place to Work certification',
          description: 'Obtener certificación GPTW',
          initiatives: [
            'Assessment inicial GPTW',
            'Plan de acción por dimensión',
            'Implementar mejoras identificadas',
            'Aplicación para certificación'
          ]
        },
        {
          title: 'Universidad corporativa digital',
          description: 'Plataforma de aprendizaje interno',
          initiatives: [
            'LMS con contenido personalizado',
            'Programa de instructores internos',
            'Certificaciones y badges digitales',
            'Learning paths por rol'
          ]
        }
      ]
    }
  ],
  'Administración': [
    {
      period: 'Y-2',
      objectives: [
        {
          title: 'Implementación de ERP SAP',
          description: 'Sistema integrado de gestión empresarial',
          initiatives: [
            'Selección y compra de SAP S/4HANA',
            'Migración de datos legacy',
            'Capacitación de usuarios clave',
            'Go-live por módulos'
          ]
        },
        {
          title: 'Digitalización de procesos administrativos',
          description: 'Paperless office initiative',
          initiatives: [
            'Firma electrónica para contratos',
            'Digitalización de archivo histórico',
            'Workflows automáticos de aprobación',
            'Portal de autoservicio empleados'
          ]
        }
      ]
    },
    {
      period: 'Y-1',
      objectives: [
        {
          title: 'Centro de servicios compartidos',
          description: 'Centralización de funciones administrativas',
          initiatives: [
            'Consolidación de contabilidad',
            'Centralización de compras',
            'Mesa de ayuda unificada',
            'KPIs y SLAs por servicio'
          ]
        },
        {
          title: 'Automatización con RPA 50 procesos',
          description: 'Bots para tareas repetitivas',
          initiatives: [
            'Identificación de procesos candidatos',
            'Implementación de UiPath',
            'Bot de conciliación bancaria',
            'Bot de procesamiento de facturas'
          ]
        },
        {
          title: 'Compliance SOX y auditoría',
          description: 'Preparación para salida a bolsa',
          initiatives: [
            'Documentación de controles SOX',
            'Testing de controles internos',
            'Remediación de deficiencias',
            'Auditoría por Big 4'
          ]
        }
      ]
    },
    {
      period: 'Y0',
      objectives: [
        {
          title: 'Finance transformation con IA',
          description: 'Finanzas predictivas y automatizadas',
          initiatives: [
            'Forecasting con machine learning',
            'Cierre contable en 2 días',
            'Analytics predictivo de cash flow',
            'Detección automática de fraudes'
          ]
        },
        {
          title: 'ESG reporting y sostenibilidad',
          description: 'Reportes de impacto ambiental y social',
          initiatives: [
            'Medición de huella de carbono',
            'Reporte GRI Standards',
            'Certificación B Corp',
            'Programa de economía circular'
          ]
        }
      ]
    }
  ],
  'Comercial': [
    {
      period: 'Y-2',
      objectives: [
        {
          title: 'CRM Salesforce implementation',
          description: 'Sistema completo de gestión comercial',
          initiatives: [
            'Migración desde Excel a Salesforce',
            'Integración con marketing automation',
            'Configuración de pipeline y forecasting',
            'Training del equipo comercial'
          ]
        },
        {
          title: 'Expansión a 5 nuevos mercados',
          description: 'Crecimiento geográfico LATAM',
          initiatives: [
            'Entrada a México y Colombia',
            'Partnerships con distribuidores',
            'Adaptación de producto local',
            'Contratación de equipos locales'
          ]
        }
      ]
    },
    {
      period: 'Y-1',
      objectives: [
        {
          title: 'Duplicar revenue a $20M ARR',
          description: 'Crecimiento agresivo de ventas',
          initiatives: [
            'Nuevo modelo de pricing',
            'Programa de channel partners',
            'Account-based marketing',
            'Expansión de equipo de ventas 2x'
          ]
        },
        {
          title: 'Customer Success y NPS > 70',
          description: 'Excelencia en experiencia del cliente',
          initiatives: [
            'Implementar Customer Success team',
            'Programa de onboarding estructurado',
            'QBRs con clientes estratégicos',
            'Sistema de health scores'
          ]
        },
        {
          title: 'Digital selling y e-commerce',
          description: 'Ventas online self-service',
          initiatives: [
            'Plataforma e-commerce B2B',
            'Self-service para SMBs',
            'Chatbot de ventas 24/7',
            'Product-led growth motion'
          ]
        }
      ]
    },
    {
      period: 'Y0',
      objectives: [
        {
          title: 'Expansión internacional USA y Europa',
          description: 'Entrada a mercados desarrollados',
          initiatives: [
            'Incorporación en Delaware',
            'Cumplimiento GDPR para Europa',
            'Equipo de ventas en Miami',
            'Localización multi-idioma'
          ]
        },
        {
          title: 'Revenue operations y predictibilidad',
          description: 'Operaciones de revenue optimizadas',
          initiatives: [
            'Revenue intelligence con Gong',
            'Automatización de propuestas con CPQ',
            'Lead scoring con IA',
            'Forecasting accuracy > 90%'
          ]
        }
      ]
    }
  ],
  'Corporativo': [
    {
      period: 'Y-2',
      objectives: [
        {
          title: 'Reestructuración organizacional',
          description: 'Nueva estructura para escalar',
          initiatives: [
            'Definición de nueva estructura',
            'Creación de C-suite completo',
            'Comités de dirección',
            'Comunicación del cambio'
          ]
        },
        {
          title: 'Serie A funding $10M',
          description: 'Primera ronda institucional',
          initiatives: [
            'Preparación de data room',
            'Roadshow con 50 VCs',
            'Due diligence legal y financiero',
            'Cierre y anuncio de ronda'
          ]
        }
      ]
    },
    {
      period: 'Y-1',
      objectives: [
        {
          title: 'M&A - adquisición de competidor',
          description: 'Crecimiento inorgánico estratégico',
          initiatives: [
            'Identificación de targets',
            'Valuación y negociación',
            'Due diligence completo',
            'Integración post-merger'
          ]
        },
        {
          title: 'Gobierno corporativo y board',
          description: 'Profesionalización del gobierno',
          initiatives: [
            'Incorporación de directores independientes',
            'Comités de auditoría y compensación',
            'Políticas de gobierno corporativo',
            'Reportes trimestrales al board'
          ]
        },
        {
          title: 'Transformación digital enterprise',
          description: 'Digitalización de toda la empresa',
          initiatives: [
            'Microsoft 365 para todos',
            'Intranet corporativa moderna',
            'Digital workplace tools',
            'Change management program'
          ]
        }
      ]
    },
    {
      period: 'Y0',
      objectives: [
        {
          title: 'Preparación para IPO',
          description: 'Salida a bolsa en 18 meses',
          initiatives: [
            'Auditoría de estados financieros 3 años',
            'Implementación de controles SOX',
            'Selección de bancos de inversión',
            'Preparación de prospecto S-1'
          ]
        },
        {
          title: 'Expansión via franquicias',
          description: 'Modelo de crecimiento escalable',
          initiatives: [
            'Diseño de modelo de franquicia',
            'Manual de operaciones',
            'Programa de entrenamiento',
            'Lanzamiento con 10 franquicias piloto'
          ]
        }
      ]
    }
  ]
}

// Generate activities for initiatives
function generateActivities(initiativeTitle: string, isCompleted: boolean): Array<{title: string, is_completed: boolean}> {
  const activitiesTemplates: Record<string, string[]> = {
    default: [
      'Análisis de requerimientos y alcance',
      'Diseño de solución técnica',
      'Desarrollo e implementación',
      'Testing y control de calidad',
      'Documentación y capacitación',
      'Despliegue a producción',
      'Monitoreo post-implementación'
    ],
    tech: [
      'Investigación de tecnologías disponibles',
      'Proof of concept inicial',
      'Arquitectura de solución',
      'Desarrollo de MVP',
      'Testing de integración',
      'Testing de performance',
      'Security testing',
      'Deployment y configuración',
      'Monitoreo y observabilidad'
    ],
    process: [
      'Mapeo de proceso actual (AS-IS)',
      'Identificación de mejoras',
      'Diseño de proceso futuro (TO-BE)',
      'Validación con stakeholders',
      'Plan de implementación',
      'Piloto con grupo control',
      'Rollout completo',
      'Medición de KPIs'
    ],
    people: [
      'Definición de perfiles y competencias',
      'Búsqueda y selección',
      'Entrevistas y evaluaciones',
      'Onboarding y capacitación',
      'Seguimiento y feedback',
      'Evaluación de desempeño'
    ]
  }

  // Select template based on initiative keywords
  let template = activitiesTemplates.default
  if (initiativeTitle.toLowerCase().includes('implement') || 
      initiativeTitle.toLowerCase().includes('desarrollo') ||
      initiativeTitle.toLowerCase().includes('api') ||
      initiativeTitle.toLowerCase().includes('sistema')) {
    template = activitiesTemplates.tech
  } else if (initiativeTitle.toLowerCase().includes('proceso') ||
             initiativeTitle.toLowerCase().includes('workflow')) {
    template = activitiesTemplates.process
  } else if (initiativeTitle.toLowerCase().includes('contratar') ||
             initiativeTitle.toLowerCase().includes('equipo')) {
    template = activitiesTemplates.people
  }

  // Select random subset of activities
  const numActivities = Math.floor(Math.random() * 3) + 4 // 4-6 activities
  const selectedActivities = [...template]
    .sort(() => Math.random() - 0.5)
    .slice(0, numActivities)

  // If initiative is completed, most activities should be completed
  return selectedActivities.map((title, index) => ({
    title: `${title} - ${initiativeTitle.substring(0, 30)}...`,
    is_completed: isCompleted ? 
      (index < selectedActivities.length - 1 || Math.random() > 0.2) : 
      (index < selectedActivities.length / 2 && Math.random() > 0.5)
  }))
}

// Generate progress history entries
async function createProgressHistory(
  initiativeId: string,
  userId: string,
  startDate: Date,
  endDate: Date,
  finalProgress: number
) {
  const entries = []
  const now = new Date()
  const actualEnd = endDate > now ? now : endDate
  
  // Calculate update frequency based on initiative duration
  const durationDays = Math.floor((actualEnd.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  const numUpdates = Math.min(Math.max(Math.floor(durationDays / 30), 3), 20) // 3-20 updates
  
  let currentProgress = 0
  const progressIncrement = finalProgress / numUpdates
  
  for (let i = 0; i < numUpdates; i++) {
    const updateDate = new Date(
      startDate.getTime() + 
      (i / numUpdates) * (actualEnd.getTime() - startDate.getTime())
    )
    
    if (updateDate > now) break
    
    currentProgress = Math.min(
      Math.floor(currentProgress + progressIncrement + (Math.random() - 0.5) * 10),
      finalProgress
    )
    
    entries.push({
      initiative_id: initiativeId,
      completed_activities_count: Math.floor((currentProgress / 100) * 8),
      total_activities_count: 8,
      notes: getProgressNoteByProgress(currentProgress),
      updated_by: userId,
      created_at: updateDate.toISOString()
    })
  }
  
  return entries
}

function getProgressNoteByProgress(progress: number): string {
  if (progress < 10) return 'Kickoff del proyecto realizado'
  if (progress < 25) return 'Fase de planificación en progreso'
  if (progress < 40) return 'Desarrollo inicial comenzado'
  if (progress < 60) return 'Avance significativo logrado'
  if (progress < 75) return 'Fase final de implementación'
  if (progress < 90) return 'Testing y ajustes finales'
  if (progress < 100) return 'Preparando para lanzamiento'
  return 'Proyecto completado exitosamente'
}

// Main execution
async function seedHistoricalData() {
  console.log('🚀 Starting historical data seeding (2 years back + 6 months forward)...\n')

  try {
    // Get SIGA tenant
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id, subdomain')
      .eq('subdomain', 'siga_turismo')
      .single()

    if (!tenant) {
      console.error('❌ SIGA tenant not found')
      return
    }

    console.log(`✅ Found tenant: ${tenant.subdomain}\n`)

    // Get all areas
    const { data: areas } = await supabase
      .from('areas')
      .select('id, name, manager_id')
      .eq('tenant_id', tenant.id)
      .in('name', ['Producto', 'Capital Humano', 'Administración', 'Comercial', 'Corporativo'])

    if (!areas || areas.length === 0) {
      console.error('❌ No areas found')
      return
    }

    console.log(`✅ Found ${areas.length} areas\n`)

    // Get users for creating objectives
    const { data: users } = await supabase
      .from('user_profiles')
      .select('id, full_name, role, area_id')
      .eq('tenant_id', tenant.id)

    const creatorsByCEOs = users?.filter(u => u.role === 'CEO' || u.role === 'Admin') || []
    const managersByArea: Record<string, any[]> = {}
    
    areas.forEach(area => {
      managersByArea[area.id] = users?.filter(u => u.area_id === area.id) || []
    })

    // Audit log entries to batch insert
    const auditLogEntries: any[] = []
    
    // Statistics
    let totalObjectives = 0
    let totalInitiatives = 0
    let totalActivities = 0
    let totalProgressEntries = 0

    // Process each area
    for (const area of areas) {
      console.log(`\n📁 Processing area: ${area.name}`)
      console.log('━'.repeat(60))

      const areaObjectives = historicalObjectives[area.name as keyof typeof historicalObjectives]
      if (!areaObjectives) {
        console.log(`⚠️  No historical data defined for ${area.name}`)
        continue
      }

      // Get creator for this area (manager or CEO)
      const creator = area.manager_id ? 
        users?.find(u => u.id === area.manager_id) :
        creatorsByCEOs[Math.floor(Math.random() * creatorsByCEOs.length)]

      if (!creator) {
        console.log(`⚠️  No creator found for ${area.name}`)
        continue
      }

      // Process each time period
      for (const periodData of areaObjectives) {
        const periodStart = new Date()
        const periodEnd = new Date()

        if (periodData.period === 'Y-2') {
          // 2 years ago
          periodStart.setFullYear(periodStart.getFullYear() - 2)
          periodEnd.setFullYear(periodEnd.getFullYear() - 1)
          periodEnd.setMonth(periodEnd.getMonth() - 6)
        } else if (periodData.period === 'Y-1') {
          // 1 year ago to recent
          periodStart.setFullYear(periodStart.getFullYear() - 1)
          periodStart.setMonth(periodStart.getMonth() - 3)
          periodEnd.setMonth(periodEnd.getMonth() - 1)
        } else {
          // Current and future
          periodStart.setMonth(periodStart.getMonth() - 3)
          periodEnd.setMonth(periodEnd.getMonth() + 6)
        }

        // Process objectives for this period
        for (const objTemplate of periodData.objectives) {
          const dateRange = generateDateRange(periodStart, periodEnd, 3, 9)
          const createdDate = new Date(dateRange.start)
          createdDate.setDate(createdDate.getDate() - Math.floor(Math.random() * 30)) // Created before start
          
          const progress = calculateRealisticProgress(dateRange.start, dateRange.end, createdDate)
          
          // Determine status based on progress and dates
          const now = new Date()
          const endDate = new Date(dateRange.end)
          let status = 'in_progress'
          if (progress === 100) {
            status = 'completed'
          } else if (progress === 0) {
            status = 'planning'
          } else if (endDate < now && progress < 100) {
            status = 'overdue'
          }

          // Create objective
          const { data: objective, error: objError } = await supabase
            .from('objectives')
            .insert({
              tenant_id: tenant.id,
              area_id: area.id,
              title: objTemplate.title,
              description: objTemplate.description,
              priority: Math.random() > 0.6 ? 'high' : Math.random() > 0.3 ? 'medium' : 'low',
              status,
              progress,
              start_date: dateRange.start,
              end_date: dateRange.end,
              target_date: dateRange.end,
              metrics: [
                { name: 'Completion Rate', target: 100, unit: '%', current: progress },
                { name: 'On-Time Delivery', target: 100, unit: '%', current: status === 'overdue' ? 0 : 100 },
                { name: 'Quality Score', target: 90, unit: 'points', current: Math.floor(Math.random() * 20) + 75 }
              ],
              created_by: creator.id,
              created_at: createdDate.toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single()

          if (objError) {
            console.error(`  ❌ Error creating objective: ${objError.message}`)
            continue
          }

          totalObjectives++
          console.log(`  ✅ Created: ${objTemplate.title} (${status}, ${progress}%)`)

          // Add audit log
          auditLogEntries.push({
            user_id: creator.id,
            action: 'create',
            table_name: 'objectives',
            record_id: objective.id,
            new_data: objective,
            created_at: createdDate.toISOString()
          })

          // Create initiatives for this objective
          for (const initiativeTitle of objTemplate.initiatives) {
            // Initiative dates within objective timeframe
            const initDateRange = generateDateRange(
              new Date(dateRange.start),
              new Date(dateRange.end),
              2, 4
            )
            
            const initProgress = calculateRealisticProgress(
              initDateRange.start,
              initDateRange.end,
              new Date(initDateRange.start)
            )
            
            const initStatus = initProgress === 100 ? 'completed' :
                             initProgress === 0 ? 'planning' :
                             Math.random() > 0.9 ? 'on_hold' : 'in_progress'

            // Create initiative
            const { data: initiative, error: initError } = await supabase
              .from('initiatives')
              .insert({
                tenant_id: tenant.id,
                area_id: area.id,
                title: initiativeTitle,
                description: `Implementation of ${initiativeTitle} as part of ${objTemplate.title}`,
                status: initStatus,
                progress: initProgress,
                start_date: initDateRange.start,
                due_date: initDateRange.end,
                completion_date: initProgress === 100 ? initDateRange.end : null,
                created_by: creator.id,
                created_at: new Date(initDateRange.start).toISOString(),
                updated_at: new Date().toISOString()
              })
              .select()
              .single()

            if (initError) {
              console.error(`    ❌ Error creating initiative: ${initError.message}`)
              continue
            }

            totalInitiatives++

            // Link to objective
            await supabase
              .from('objective_initiatives')
              .insert({
                objective_id: objective.id,
                initiative_id: initiative.id
              })

            // Create progress history
            if (initProgress > 0) {
              const progressEntries = await createProgressHistory(
                initiative.id,
                creator.id,
                new Date(initDateRange.start),
                new Date(initDateRange.end),
                initProgress
              )

              if (progressEntries.length > 0) {
                await supabase
                  .from('progress_history')
                  .insert(progressEntries)
                
                totalProgressEntries += progressEntries.length
              }
            }

            // Create activities
            const activities = generateActivities(initiativeTitle, initProgress === 100)
            const areaUsers = managersByArea[area.id] || [creator]
            
            for (let i = 0; i < activities.length; i++) {
              const activity = activities[i]
              const assignedTo = areaUsers[i % areaUsers.length]
              
              const { error: actError } = await supabase
                .from('activities')
                .insert({
                  initiative_id: initiative.id,
                  title: activity.title,
                  description: `Task for ${initiativeTitle}`,
                  is_completed: activity.is_completed,
                  assigned_to: assignedTo?.id || null,
                  created_at: new Date(initDateRange.start).toISOString(),
                  updated_at: activity.is_completed ? 
                    new Date(
                      new Date(initDateRange.start).getTime() + 
                      Math.random() * (new Date().getTime() - new Date(initDateRange.start).getTime())
                    ).toISOString() : 
                    new Date().toISOString()
                })

              if (!actError) {
                totalActivities++
              }
            }
          }
        }
      }
    }

    // Insert audit log entries in batches
    if (auditLogEntries.length > 0) {
      console.log(`\n📝 Creating ${auditLogEntries.length} audit log entries...`)
      const batchSize = 100
      for (let i = 0; i < auditLogEntries.length; i += batchSize) {
        const batch = auditLogEntries.slice(i, i + batchSize)
        await supabase.from('audit_log').insert(batch)
      }
    }

    console.log('\n' + '='.repeat(60))
    console.log('✅ Historical data seeding completed!')
    console.log('='.repeat(60))
    console.log('\n📊 Summary:')
    console.log(`   Time Period: ${START_DATE.toLocaleDateString()} to ${END_DATE.toLocaleDateString()}`)
    console.log(`   Total Objectives: ${totalObjectives}`)
    console.log(`   Total Initiatives: ${totalInitiatives}`)
    console.log(`   Total Activities: ${totalActivities}`)
    console.log(`   Progress History Entries: ${totalProgressEntries}`)
    console.log(`   Audit Log Entries: ${auditLogEntries.length}`)

    // Show breakdown by area
    console.log('\n📈 Breakdown by Area:')
    for (const area of areas) {
      const { count: objCount } = await supabase
        .from('objectives')
        .select('*', { count: 'exact', head: true })
        .eq('area_id', area.id)
      
      const { count: initCount } = await supabase
        .from('initiatives')
        .select('*', { count: 'exact', head: true })
        .eq('area_id', area.id)
      
      console.log(`   ${area.name}: ${objCount} objectives, ${initCount} initiatives`)
    }

    console.log('\n✨ Your dashboard now shows 2.5 years of realistic historical data!')

  } catch (error) {
    console.error('\n❌ Error:', error)
  }
}

// Run the script
seedHistoricalData()

/*
USAGE:
======
1. Ensure you have existing areas and users set up
2. Run: npx tsx scripts/seed-objectives-2year-history.ts
3. The script will create:
   - Objectives spanning the last 2 years and next 6 months
   - Realistic progress based on time periods
   - Complete initiatives and activities
   - Progress history tracking
   - Audit log entries
*/