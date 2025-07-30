import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import * as fs from 'fs'
import * as path from 'path'
import { authenticateUser } from '@/lib/auth-utils'

interface TableroData {
  area: string
  objetivoClave: string
  avanceQ2: number
  obstaculos: string
  potenciadores: string
  estado: '🟢' | '🟡' | '🔴'
}

const sampleData: TableroData[] = [
  {
    area: 'Comercial',
    objetivoClave: 'Implementar CRM',
    avanceQ2: 50,
    obstaculos: 'Falta de tiempo',
    potenciadores: 'Capacitación previa',
    estado: '🟢'
  },
  {
    area: 'Comercial',
    objetivoClave: 'Forecast comercial',
    avanceQ2: 60,
    obstaculos: 'Datos inconsistentes',
    potenciadores: 'Sistema de control',
    estado: '🟡'
  },
  {
    area: 'Administración',
    objetivoClave: 'Reducir tiempos de facturación',
    avanceQ2: 45,
    obstaculos: 'Procesos manuales',
    potenciadores: 'Automatización parcial',
    estado: '🟡'
  },
  {
    area: 'Administración',
    objetivoClave: 'Control de gastos',
    avanceQ2: 30,
    obstaculos: 'Demoras en reportes',
    potenciadores: 'Apoyo de gerencia',
    estado: '🔴'
  },
  {
    area: 'Producto',
    objetivoClave: 'Nueva funcionalidad',
    avanceQ2: 70,
    obstaculos: 'Recursos limitados',
    potenciadores: 'Clientes aliados',
    estado: '🟡'
  },
  {
    area: 'Producto',
    objetivoClave: 'Reducir bugs críticos',
    avanceQ2: 40,
    obstaculos: 'Errores de integración',
    potenciadores: 'Equipo técnico comprometido',
    estado: '🔴'
  },
  {
    area: 'RRHH',
    objetivoClave: 'Retención de talento',
    avanceQ2: 30,
    obstaculos: 'Altas rotaciones',
    potenciadores: 'Nuevo líder comprometido',
    estado: '🔴'
  },
  {
    area: 'RRHH',
    objetivoClave: 'Digitalización legajos',
    avanceQ2: 90,
    obstaculos: 'Falta de histórico',
    potenciadores: 'Buena predisposición',
    estado: '🟢'
  }
]

function generateTableroTemplate(data?: TableroData[]): ArrayBuffer {
  const templateData = data || sampleData.map(item => ({
    ...item,
    avanceQ2: item.avanceQ2 / 100 // Convert to decimal for Excel
  }))

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new()
  
  // Prepare data with headers
  const headers = ['Área', 'Objetivo Clave', '% Avance Q2', 'Obstáculos (Lows)', 'Potenciadores (Highs)', 'Estado']
  
  const wsData = [
    headers,
    ...templateData.map(row => [
      row.area,
      row.objetivoClave,
      row.avanceQ2,
      row.obstaculos,
      row.potenciadores,
      row.estado
    ])
  ]
  
  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(wsData)
  
  // Set column widths
  ws['!cols'] = [
    { wch: 15 }, // Área
    { wch: 25 }, // Objetivo Clave
    { wch: 12 }, // % Avance Q2
    { wch: 20 }, // Obstáculos
    { wch: 20 }, // Potenciadores
    { wch: 8 }   // Estado
  ]
  
  // Apply styling to header row
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:F1')
  
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: col })
    if (!ws[cellRef]) continue
    
    ws[cellRef].s = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "4F46E5" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } }
      }
    }
  }
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Tablero Gestión')
  
  // Add instructions sheet
  const instructionsData = [
    ['INSTRUCCIONES DE USO - TABLERO DE GESTIÓN Y SEGUIMIENTO'],
    [''],
    ['Este archivo Excel está diseñado para el seguimiento trimestral de objetivos organizacionales.'],
    [''],
    ['COLUMNAS:'],
    ['• Área: División o departamento responsable del objetivo'],
    ['• Objetivo Clave: Descripción específica del objetivo a alcanzar'],
    ['• % Avance Q2: Porcentaje de progreso (0% a 100%)'],
    ['• Obstáculos (Lows): Factores que dificultan el avance'],
    ['• Potenciadores (Highs): Factores que facilitan el avance'],
    ['• Estado: Indicador visual del estado (🟢 Bien, 🟡 Atención, 🔴 Crítico)'],
    [''],
    ['ÁREAS DISPONIBLES:'],
    ['• Comercial: Iniciativas de ventas y relación con clientes'],
    ['• Administración: Procesos internos y operativos'],
    ['• Producto: Desarrollo y mejora de productos/servicios'],
    ['• RRHH: Gestión de talento y recursos humanos'],
    ['• División Iluminación: Específico para organizaciones con múltiples divisiones'],
    ['• División Electricidad: Específico para organizaciones con múltiples divisiones'],
    ['• División Industria: Específico para organizaciones con múltiples divisiones'],
    [''],
    ['RECOMENDACIONES:'],
    ['• Actualizar el progreso semanalmente'],
    ['• Ser específico en obstáculos y potenciadores'],
    ['• Usar el estado visual para identificación rápida'],
    ['• Mantener objetivos SMART (Específicos, Medibles, Alcanzables, Relevantes, Temporales)'],
    [''],
    ['Para más información, consultar la documentación del sistema.']
  ]
  
  const instructionsWs = XLSX.utils.aoa_to_sheet(instructionsData)
  instructionsWs['!cols'] = [{ wch: 80 }]
  
  // Style instructions header
  if (instructionsWs['A1']) {
    instructionsWs['A1'].s = {
      font: { bold: true, size: 14, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "2563EB" } },
      alignment: { horizontal: "center", vertical: "center" }
    }
  }
  
  XLSX.utils.book_append_sheet(wb, instructionsWs, 'Instrucciones')
  
  // Write to buffer
  return XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.statusCode });
    }

    const currentUser = authResult.user!;
    
    // Serve the static SIGA template file
    const templatePath = path.join(process.cwd(), 'public', 'Copia de 01-OKRs Plan de Acción Siga.xlsx');
    
    if (!fs.existsSync(templatePath)) {
      return NextResponse.json({ error: 'SIGA template file not found' }, { status: 404 });
    }
    
    const buffer = fs.readFileSync(templatePath);
    const filename = `siga-okrs-plan-accion-${currentUser.tenant_id || 'template'}-${new Date().toISOString().split('T')[0]}.xlsx`;
    
    // Return as downloadable file
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Template download error:', error)
    return NextResponse.json({ error: 'Failed to download template' }, { status: 500 })
  }
}