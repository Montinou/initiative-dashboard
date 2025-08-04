import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user profile to personalize template
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select(`
        id,
        full_name,
        tenant_id,
        area_id,
        role,
        areas:area_id (
          id,
          name,
          tenant_id
        )
      `)
      .eq('user_id', user.id)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Create OKR template data
    const templateData = [
      // Header row
      [
        'Objetivo',
        'Acción',
        'Descripción',
        'Progreso (%)',
        'Estado',
        'Prioridad',
        'Responsable',
        'Fecha Límite',
        'Resultado Esperado'
      ],
      // Example rows with realistic OKR data
      [
        'Incrementar satisfacción del cliente',
        'Implementar sistema de feedback',
        'Desarrollar e implementar un sistema automatizado de recolección de feedback del cliente',
        85,
        '🟡',
        'Alta',
        'Equipo de Producto',
        '2024-12-31',
        'Alcanzar un puntaje NPS de 70+ y reducir quejas en 50%'
      ],
      [
        'Optimizar procesos internos',
        'Automatizar flujos de trabajo',
        'Identificar y automatizar procesos manuales repetitivos para mejorar la eficiencia',
        60,
        '🟡',
        'Media',
        'Equipo de Operaciones',
        '2024-11-30',
        'Reducir tiempo de procesamiento en 40% y errores en 60%'
      ],
      [
        'Expandir presencia en el mercado',
        'Lanzar campañas digitales',
        'Ejecutar estrategia de marketing digital para aumentar la visibilidad de marca',
        95,
        '🟢',
        'Alta',
        'Equipo de Marketing',
        '2024-10-15',
        'Aumentar tráfico web en 150% y leads cualificados en 80%'
      ],
      [
        'Desarrollar capacidades del equipo',
        'Programa de capacitación',
        'Implementar programa integral de desarrollo profesional para el equipo',
        30,
        '🔴',
        'Media',
        'Recursos Humanos',
        '2024-12-15',
        'Certificar al 90% del equipo en competencias clave'
      ],
      [
        'Mejorar eficiencia operacional',
        'Reducir costos operativos',
        'Implementar medidas de optimización para reducir gastos sin afectar la calidad',
        70,
        '🟡',
        'Alta',
        'Equipo Financiero',
        '2024-11-15',
        'Reducir costos operativos en 15% manteniendo calidad del servicio'
      ]
    ];

    // Instructions sheet data
    const instructionsData = [
      ['INSTRUCCIONES PARA EL TEMPLATE OKR'],
      [''],
      ['Este template está diseñado para facilitar la carga masiva de OKRs (Objectives and Key Results).'],
      [''],
      ['COLUMNAS REQUERIDAS:'],
      [''],
      ['1. Objetivo (REQUERIDO)'],
      ['   - Descripción del objetivo principal que se quiere alcanzar'],
      ['   - Debe ser específico, medible y alcanzable'],
      ['   - Ejemplo: "Incrementar satisfacción del cliente"'],
      [''],
      ['2. Acción (OPCIONAL)'],
      ['   - Acción específica para lograr el objetivo'],
      ['   - Ejemplo: "Implementar sistema de feedback"'],
      [''],
      ['3. Descripción (OPCIONAL)'],
      ['   - Detalles adicionales sobre el objetivo o la acción'],
      ['   - Contexto relevante para entender el alcance'],
      [''],
      ['4. Progreso (%) (OPCIONAL)'],
      ['   - Porcentaje de avance actual (0-100)'],
      ['   - Solo números, el símbolo % es opcional'],
      ['   - Ejemplo: 75 o 75%'],
      [''],
      ['5. Estado (OPCIONAL)'],
      ['   - 🟢: Completado o en buen progreso'],
      ['   - 🟡: En progreso normal'],
      ['   - 🔴: Crítico o con problemas'],
      [''],
      ['6. Prioridad (OPCIONAL)'],
      ['   - Alta, Media, Baja'],
      ['   - Por defecto será "Media"'],
      [''],
      ['7. Responsable (OPCIONAL)'],
      ['   - Persona o equipo responsable del objetivo'],
      ['   - Ejemplo: "Juan Pérez" o "Equipo de Marketing"'],
      [''],
      ['8. Fecha Límite (OPCIONAL)'],
      ['   - Fecha objetivo para completar el OKR'],
      ['   - Formato recomendado: YYYY-MM-DD o DD/MM/YYYY'],
      ['   - Ejemplo: "2024-12-31" o "31/12/2024"'],
      [''],
      ['9. Resultado Esperado (OPCIONAL)'],
      ['   - Descripción del resultado específico que se espera alcanzar'],
      ['   - Métricas concretas cuando sea posible'],
      ['   - Se creará como subtarea automáticamente'],
      [''],
      ['RECOMENDACIONES:'],
      [''],
      ['• Cada fila representa un OKR individual'],
      ['• La primera fila debe contener los encabezados'],
      ['• Evite celdas completamente vacías'],
      ['• Use formatos de fecha consistentes'],
      ['• Mantenga descripciones claras y concisas'],
      ['• Todos los OKRs se asignarán automáticamente a su área'],
      [''],
      ['EJEMPLO DE USO:'],
      [''],
      ['Consulte la hoja "Template_OKR" para ver ejemplos prácticos'],
      ['de cómo llenar correctamente cada columna.'],
      [''],
      ['SOPORTE TÉCNICO:'],
      [''],
      ['Si tiene problemas con la carga, revise:'],
      ['• Formato del archivo (debe ser .xlsx o .xls)'],
      ['• Tamaño del archivo (máximo 10MB)'],
      ['• Que la primera fila contenga los encabezados'],
      ['• Que haya al menos un objetivo por fila'],
      [''],
      ['¿Necesita ayuda? Contacte al administrador del sistema.']
    ];

    // Create a new workbook
    const wb = XLSX.utils.book_new();

    // Create OKR template sheet
    const templateWs = XLSX.utils.aoa_to_sheet(templateData);
    
    // Set column widths
    templateWs['!cols'] = [
      { width: 30 }, // Objetivo
      { width: 25 }, // Acción
      { width: 40 }, // Descripción
      { width: 12 }, // Progreso
      { width: 10 }, // Estado
      { width: 12 }, // Prioridad
      { width: 20 }, // Responsable
      { width: 15 }, // Fecha Límite
      { width: 40 }  // Resultado Esperado
    ];

    // Style the header row
    const headerStyle = {
      fill: { fgColor: { rgb: 'E8F5E8' } },
      font: { bold: true, color: { rgb: '2D5A2D' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: '2D5A2D' } },
        bottom: { style: 'thin', color: { rgb: '2D5A2D' } },
        left: { style: 'thin', color: { rgb: '2D5A2D' } },
        right: { style: 'thin', color: { rgb: '2D5A2D' } }
      }
    };

    // Apply header styling
    for (let col = 0; col < templateData[0].length; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!templateWs[cellAddress]) templateWs[cellAddress] = { t: 's', v: '' };
      templateWs[cellAddress].s = headerStyle;
    }

    // Create instructions sheet
    const instructionsWs = XLSX.utils.aoa_to_sheet(instructionsData);
    instructionsWs['!cols'] = [{ width: 80 }];

    // Add sheets to workbook
    XLSX.utils.book_append_sheet(wb, templateWs, 'Template_OKR');
    XLSX.utils.book_append_sheet(wb, instructionsWs, 'Instrucciones');

    // Generate Excel file buffer
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Create filename with current date and area name
    const currentDate = new Date().toISOString().split('T')[0];
    const areaName = userProfile.areas?.name || 'General';
    const sanitizedAreaName = areaName.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `OKR_Template_${sanitizedAreaName}_${currentDate}.xlsx`;

    // Set response headers for file download
    const headers = new Headers();
    headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    headers.set('Content-Disposition', `attachment; filename="${fileName}"`);
    headers.set('Content-Length', excelBuffer.byteLength.toString());
    headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    headers.set('Pragma', 'no-cache');
    headers.set('Expires', '0');

    return new NextResponse(excelBuffer, {
      status: 200,
      headers
    });

  } catch (error) {
    console.error('Template generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate OKR template' },
      { status: 500 }
    );
  }
}