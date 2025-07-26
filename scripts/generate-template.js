const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// Sample data for the template
const sampleData = [
  {
    area: 'Comercial',
    objetivoClave: 'Implementar CRM',
    avanceQ2: 0.50,
    obstaculos: 'Falta de tiempo',
    potenciadores: 'Capacitación previa',
    estado: '🟢'
  },
  {
    area: 'Comercial',
    objetivoClave: 'Forecast comercial',
    avanceQ2: 0.60,
    obstaculos: 'Datos inconsistentes',
    potenciadores: 'Sistema de control',
    estado: '🟡'
  },
  {
    area: 'Administración',
    objetivoClave: 'Reducir tiempos de facturación',
    avanceQ2: 0.45,
    obstaculos: 'Procesos manuales',
    potenciadores: 'Automatización parcial',
    estado: '🟡'
  },
  {
    area: 'Administración',
    objetivoClave: 'Control de gastos',
    avanceQ2: 0.30,
    obstaculos: 'Demoras en reportes',
    potenciadores: 'Apoyo de gerencia',
    estado: '🔴'
  },
  {
    area: 'Producto',
    objetivoClave: 'Nueva funcionalidad',
    avanceQ2: 0.70,
    obstaculos: 'Recursos limitados',
    potenciadores: 'Clientes aliados',
    estado: '🟡'
  },
  {
    area: 'Producto',
    objetivoClave: 'Reducir bugs críticos',
    avanceQ2: 0.40,
    obstaculos: 'Errores de integración',
    potenciadores: 'Equipo técnico comprometido',
    estado: '🔴'
  },
  {
    area: 'RRHH',
    objetivoClave: 'Retención de talento',
    avanceQ2: 0.30,
    obstaculos: 'Altas rotaciones',
    potenciadores: 'Nuevo líder comprometido',
    estado: '🔴'
  },
  {
    area: 'RRHH',
    objetivoClave: 'Digitalización legajos',
    avanceQ2: 0.90,
    obstaculos: 'Falta de histórico',
    potenciadores: 'Buena predisposición',
    estado: '🟢'
  }
];

function generateTemplate() {
  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  
  // Prepare data with headers
  const headers = ['Área', 'Objetivo Clave', '% Avance Q2', 'Obstáculos (Lows)', 'Potenciadores (Highs)', 'Estado'];
  
  const wsData = [
    headers,
    ...sampleData.map(row => [
      row.area,
      row.objetivoClave,
      row.avanceQ2,
      row.obstaculos,
      row.potenciadores,
      row.estado
    ])
  ];
  
  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  
  // Set column widths
  ws['!cols'] = [
    { wch: 15 }, // Área
    { wch: 25 }, // Objetivo Clave
    { wch: 12 }, // % Avance Q2
    { wch: 20 }, // Obstáculos
    { wch: 20 }, // Potenciadores
    { wch: 8 }   // Estado
  ];
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Tablero Gestión');
  
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
    ['• División Iluminación: Específico para Fema'],
    ['• División Electricidad: Específico para Fema'],
    ['• División Industria: Específico para Fema'],
    [''],
    ['RECOMENDACIONES:'],
    ['• Actualizar el progreso semanalmente'],
    ['• Ser específico en obstáculos y potenciadores'],
    ['• Usar el estado visual para identificación rápida'],
    ['• Mantener objetivos SMART (Específicos, Medibles, Alcanzables, Relevantes, Temporales)'],
    [''],
    ['Para más información, consultar la documentación del sistema.']
  ];
  
  const instructionsWs = XLSX.utils.aoa_to_sheet(instructionsData);
  instructionsWs['!cols'] = [{ wch: 80 }];
  
  XLSX.utils.book_append_sheet(wb, instructionsWs, 'Instrucciones');
  
  // Save file
  const outputPath = path.join(__dirname, '..', 'mvp-role-configuration-package', 'templates', 'tablero-gestion-seguimiento.xlsx');
  XLSX.writeFile(wb, outputPath);
  
  console.log('✅ Excel template generated successfully at:', outputPath);
}

// Generate the template
generateTemplate();