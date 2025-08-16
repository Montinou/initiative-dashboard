import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user profile to determine role and available areas
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('role, area_id, tenant_id')
      .eq('user_id', user.id)
      .single();

    if (!userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Get areas for the tenant
    const { data: areas } = await supabase
      .from('areas')
      .select('name')
      .order('name');

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Determine template type based on user role
    if (userProfile.role === 'CEO' || userProfile.role === 'Admin') {
      // Multi-area template for CEO/Admin
      createMultiAreaTemplate(wb, areas || []);
    } else {
      // Single area template for Managers
      createSingleAreaTemplate(wb);
    }

    // Add instructions sheet
    addInstructionsSheet(wb, userProfile.role);

    // Generate buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Return file
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="okr-import-template.xlsx"',
      },
    });

  } catch (error) {
    console.error('Template generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate template' },
      { status: 500 }
    );
  }
}

function createMultiAreaTemplate(wb: XLSX.WorkBook, areas: any[]) {
  // Headers for multi-area import
  const headers = [
    'Área',
    'Objetivo',
    'Iniciativa',
    'Descripción',
    'Progreso',
    'Estado',
    'Prioridad',
    'Responsable',
    'Fecha Inicio',
    'Fecha Fin'
  ];

  // Sample data
  const sampleData = [
    ['Comercial', 'Aumentar ventas 30%', 'Campaña Q1', 'Implementar nueva estrategia de ventas digitales', 75, 'en_progreso', 'alta', 'Juan Pérez', '01/01/2025', '31/03/2025'],
    ['Comercial', 'Aumentar ventas 30%', 'Nuevos clientes', 'Captar 50 nuevos clientes corporativos', 50, 'en_progreso', 'alta', 'María García', '15/01/2025', '30/04/2025'],
    ['Producto', 'Lanzar MVP', 'Desarrollo v1', 'Primera versión del producto', 25, 'planificación', 'media', 'Carlos López', '01/02/2025', '30/05/2025'],
    ['Operaciones', 'Optimizar procesos', 'Automatización', 'Automatizar procesos manuales', 10, 'planificación', 'alta', 'Ana Martín', '01/03/2025', '30/06/2025'],
    ['RRHH', 'Mejorar cultura', 'Programa bienestar', 'Implementar programa de bienestar laboral', 60, 'en_progreso', 'media', 'Luis Torres', '01/01/2025', '31/12/2025'],
  ];

  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);

  // Set column widths
  ws['!cols'] = [
    { wch: 15 }, // Área
    { wch: 25 }, // Objetivo
    { wch: 20 }, // Iniciativa
    { wch: 40 }, // Descripción
    { wch: 10 }, // Progreso
    { wch: 12 }, // Estado
    { wch: 10 }, // Prioridad
    { wch: 20 }, // Responsable
    { wch: 12 }, // Fecha Inicio
    { wch: 12 }, // Fecha Fin
  ];

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Datos Multi-Área');
}

function createSingleAreaTemplate(wb: XLSX.WorkBook) {
  // Headers for single area import (no Area column)
  const headers = [
    'Objetivo',
    'Iniciativa',
    'Descripción',
    'Progreso',
    'Estado',
    'Prioridad',
    'Responsable',
    'Fecha Inicio',
    'Fecha Fin'
  ];

  // Sample data
  const sampleData = [
    ['Aumentar eficiencia 20%', 'Optimización proceso A', 'Rediseñar el proceso de aprobaciones', 80, 'en_progreso', 'alta', 'Juan Pérez', '01/01/2025', '28/02/2025'],
    ['Aumentar eficiencia 20%', 'Capacitación equipo', 'Entrenar al equipo en nuevas herramientas', 60, 'en_progreso', 'media', 'María García', '15/01/2025', '15/03/2025'],
    ['Reducir costos 15%', 'Renegociar contratos', 'Revisar y renegociar contratos con proveedores', 30, 'planificación', 'alta', 'Carlos López', '01/02/2025', '30/04/2025'],
    ['Mejorar calidad', 'Sistema QA', 'Implementar sistema de control de calidad', 10, 'planificación', 'media', 'Ana Martín', '01/03/2025', '30/06/2025'],
  ];

  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);

  // Set column widths
  ws['!cols'] = [
    { wch: 25 }, // Objetivo
    { wch: 20 }, // Iniciativa
    { wch: 40 }, // Descripción
    { wch: 10 }, // Progreso
    { wch: 12 }, // Estado
    { wch: 10 }, // Prioridad
    { wch: 20 }, // Responsable
    { wch: 12 }, // Fecha Inicio
    { wch: 12 }, // Fecha Fin
  ];

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Datos');
}

function addInstructionsSheet(wb: XLSX.WorkBook, role: string) {
  const instructions = [
    ['INSTRUCCIONES DE USO'],
    [''],
    ['1. FORMATO DE DATOS'],
    ['   - Use los encabezados exactamente como aparecen en la plantilla'],
    ['   - No deje filas vacías entre los datos'],
    ['   - No modifique el orden de las columnas'],
    [''],
    ['2. VALORES VÁLIDOS'],
    [''],
    ['   PROGRESO:'],
    ['   - Número entre 0 y 100'],
    ['   - Puede usar decimales (ej: 75.5)'],
    ['   - Puede incluir % (ej: 75%)'],
    [''],
    ['   ESTADO:'],
    ['   - planificación / planning'],
    ['   - en_progreso / in_progress'],
    ['   - completado / completed'],
    ['   - en_espera / on_hold'],
    [''],
    ['   PRIORIDAD:'],
    ['   - alta / high'],
    ['   - media / medium'],
    ['   - baja / low'],
    [''],
    ['   FECHAS:'],
    ['   - Formato: DD/MM/YYYY'],
    ['   - También acepta: YYYY-MM-DD'],
    ['   - Ejemplo: 31/12/2025'],
    [''],
    ['3. VALIDACIONES'],
    ['   - Objetivo: Obligatorio'],
    ['   - Iniciativa: Obligatorio'],
    ['   - Progreso: Obligatorio (0-100)'],
    role === 'CEO' || role === 'Admin' ? 
      ['   - Área: Debe existir en el sistema'] : 
      ['   - Área: Se asignará automáticamente a su área'],
    [''],
    ['4. LÍMITES'],
    ['   - Máximo 10,000 filas por archivo'],
    ['   - Tamaño máximo: 10 MB'],
    [''],
    ['5. CONSEJOS'],
    ['   - Pruebe primero con pocas filas'],
    ['   - Revise la vista previa antes de confirmar'],
    ['   - Mantenga un respaldo de sus datos'],
    ['   - Use nombres consistentes para objetivos relacionados'],
    [''],
    ['Para más información, consulte la documentación completa del sistema.'],
  ];

  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(instructions);

  // Set column width
  ws['!cols'] = [{ wch: 80 }];

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Instrucciones');
}

// Template for activities import
export async function createActivitiesTemplate(wb: XLSX.WorkBook) {
  const headers = [
    'Área',
    'Objetivo',
    'Iniciativa',
    'Actividad',
    'Descripción Actividad',
    'Completada',
    'Asignado A',
    'Fecha Vencimiento'
  ];

  const sampleData = [
    ['Marketing', 'Brand awareness', 'Social media', 'Crear calendario contenido', 'Planificar posts del mes', 'No', 'Ana Martín', '15/01/2025'],
    ['Marketing', 'Brand awareness', 'Social media', 'Diseñar creativos', 'Crear imágenes y videos', 'No', 'Luis Torres', '20/01/2025'],
    ['Marketing', 'Brand awareness', 'Social media', 'Publicar contenido', 'Publicación diaria en redes', 'Sí', 'Ana Martín', '10/01/2025'],
    ['Marketing', 'Brand awareness', 'Email marketing', 'Diseñar newsletter', 'Crear plantilla mensual', 'No', 'Carlos López', '25/01/2025'],
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);

  ws['!cols'] = [
    { wch: 15 }, // Área
    { wch: 20 }, // Objetivo
    { wch: 20 }, // Iniciativa
    { wch: 25 }, // Actividad
    { wch: 35 }, // Descripción
    { wch: 10 }, // Completada
    { wch: 20 }, // Asignado A
    { wch: 15 }, // Fecha Vencimiento
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Actividades');
}