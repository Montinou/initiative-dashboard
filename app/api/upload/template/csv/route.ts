import { NextRequest, NextResponse } from 'next/server';
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

    // Get user profile to determine role
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

    let csvContent: string;

    // Determine template type based on user role
    if (userProfile.role === 'CEO' || userProfile.role === 'Admin') {
      // Multi-area template
      csvContent = [
        'Área,Objetivo,Iniciativa,Descripción,Progreso,Estado,Prioridad,Responsable,Fecha Inicio,Fecha Fin',
        'Comercial,Aumentar ventas 30%,Campaña Q1,Implementar nueva estrategia de ventas digitales,75,en_progreso,alta,Juan Pérez,01/01/2025,31/03/2025',
        'Comercial,Aumentar ventas 30%,Nuevos clientes,Captar 50 nuevos clientes corporativos,50,en_progreso,alta,María García,15/01/2025,30/04/2025',
        'Producto,Lanzar MVP,Desarrollo v1,Primera versión del producto,25,planificación,media,Carlos López,01/02/2025,30/05/2025',
        'Operaciones,Optimizar procesos,Automatización,Automatizar procesos manuales,10,planificación,alta,Ana Martín,01/03/2025,30/06/2025',
        'RRHH,Mejorar cultura,Programa bienestar,Implementar programa de bienestar laboral,60,en_progreso,media,Luis Torres,01/01/2025,31/12/2025',
      ].join('\n');
    } else {
      // Single area template for Managers
      csvContent = [
        'Objetivo,Iniciativa,Descripción,Progreso,Estado,Prioridad,Responsable,Fecha Inicio,Fecha Fin',
        'Aumentar eficiencia 20%,Optimización proceso A,Rediseñar el proceso de aprobaciones,80,en_progreso,alta,Juan Pérez,01/01/2025,28/02/2025',
        'Aumentar eficiencia 20%,Capacitación equipo,Entrenar al equipo en nuevas herramientas,60,en_progreso,media,María García,15/01/2025,15/03/2025',
        'Reducir costos 15%,Renegociar contratos,Revisar y renegociar contratos con proveedores,30,planificación,alta,Carlos López,01/02/2025,30/04/2025',
        'Mejorar calidad,Sistema QA,Implementar sistema de control de calidad,10,planificación,media,Ana Martín,01/03/2025,30/06/2025',
      ].join('\n');
    }

    // Add BOM for Excel compatibility
    const BOM = '\uFEFF';
    const csvWithBOM = BOM + csvContent;

    // Return CSV file
    return new NextResponse(csvWithBOM, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="okr-import-template.csv"',
      },
    });

  } catch (error) {
    console.error('CSV template generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate CSV template' },
      { status: 500 }
    );
  }
}