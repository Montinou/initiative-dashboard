import * as XLSX from 'xlsx';

export interface TableroData {
  area: string;
  objetivoClave: string;
  avanceQ2: number;
  obstaculos: string;
  potenciadores: string;
  estado: '🟢' | '🟡' | '🔴';
}

// Sample data removed - all data must come from real database
// Template generation now requires actual data from API/database

export async function generateTableroTemplate(data?: TableroData[], tenantId?: string): Promise<ArrayBuffer> {
  // If no data provided and tenantId is available, fetch from API
  let templateData = data;
  
  if (!templateData && tenantId) {
    try {
      // Note: This function is now called from server-side with authenticated tenant
      const response = await fetch(`/api/dashboard/objectives?tenant_id=${tenantId}`);
      if (response.ok) {
        const result = await response.json();
        // Transform API data to template format
        templateData = Object.entries(result.data).flatMap(([areaName, objectives]: [string, any[]]) =>
          objectives.map(obj => ({
            area: areaName,
            objetivoClave: obj.objective,
            avanceQ2: obj.progress / 100, // Convert to decimal for Excel
            obstaculos: obj.obstacles,
            potenciadores: obj.enablers,
            estado: obj.status
          }))
        );
      }
    } catch (error) {
      console.error('Failed to fetch real data for template generation:', error);
      throw new Error('Template generation requires real data from database. No fallback data available.');
    }
  }
  
  // Require real data - no fallbacks allowed
  if (!templateData || templateData.length === 0) {
    throw new Error('No data available for template generation. Please ensure database contains initiatives and areas data.');
  }
  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  
  // Prepare data with headers
  const headers = ['Área', 'Objetivo Clave', '% Avance Q2', 'Obstáculos (Lows)', 'Potenciadores (Highs)', 'Estado'];
  
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
  
  // Set row heights
  ws['!rows'] = [
    { hpt: 25 }, // Header row
    ...templateData.map(() => ({ hpt: 20 }))
  ];
  
  // Apply styling to header row
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:F1');
  
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
    if (!ws[cellRef]) continue;
    
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
    };
  }
  
  // Apply styling to data rows
  for (let row = 1; row <= templateData.length; row++) {
    for (let col = 0; col < headers.length; col++) {
      const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
      if (!ws[cellRef]) continue;
      
      // Percentage column formatting
      if (col === 2) { // % Avance Q2 column
        ws[cellRef].s = {
          numFmt: "0%",
          alignment: { horizontal: "center" },
          border: {
            top: { style: "thin", color: { rgb: "CCCCCC" } },
            bottom: { style: "thin", color: { rgb: "CCCCCC" } },
            left: { style: "thin", color: { rgb: "CCCCCC" } },
            right: { style: "thin", color: { rgb: "CCCCCC" } }
          }
        };
        // Convert percentage to decimal for Excel
        ws[cellRef].v = ws[cellRef].v / 100;
      } else {
        ws[cellRef].s = {
          alignment: { horizontal: col === 5 ? "center" : "left", vertical: "center" },
          border: {
            top: { style: "thin", color: { rgb: "CCCCCC" } },
            bottom: { style: "thin", color: { rgb: "CCCCCC" } },
            left: { style: "thin", color: { rgb: "CCCCCC" } },
            right: { style: "thin", color: { rgb: "CCCCCC" } }
          }
        };
      }
      
      // Alternate row coloring
      if (row % 2 === 0) {
        ws[cellRef].s.fill = { fgColor: { rgb: "F8F9FA" } };
      }
    }
  }
  
  // Add data validation for percentage column
  ws['!dataValidation'] = [
    {
      sqref: `C2:C${templateData.length + 1}`,
      type: 'decimal',
      operator: 'between',
      formula1: '0',
      formula2: '1',
      errorTitle: 'Valor inválido',
      error: 'El porcentaje debe estar entre 0% y 100%'
    }
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
    ['ÁREAS DISPONIBLES (SIGA):'],
    ['• Administración: Procesos internos y operativos'],
    ['• Producto: Desarrollo y mejora de productos/servicios'],
    ['• Capital Humano: Gestión de talento y recursos humanos'],
    ['• Comercial: Iniciativas de ventas y relación con clientes'],
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
  
  // Style instructions header
  if (instructionsWs['A1']) {
    instructionsWs['A1'].s = {
      font: { bold: true, size: 14, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "2563EB" } },
      alignment: { horizontal: "center", vertical: "center" }
    };
  }
  
  XLSX.utils.book_append_sheet(wb, instructionsWs, 'Instrucciones');
  
  // Write to buffer
  return XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
}

// Client-side download function (deprecated - use API instead)
export function downloadTableroTemplate(_filename: string = 'tablero-gestion-seguimiento.xlsx', _data?: TableroData[]) {
  console.warn('downloadTableroTemplate is deprecated. Use /api/download-template instead.');
}