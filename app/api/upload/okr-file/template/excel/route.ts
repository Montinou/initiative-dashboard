import { NextRequest, NextResponse } from 'next/server';
import { TemplateGenerator } from '@/services/templateGenerator';
import { createClient } from '@/utils/supabase/server';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in to download templates.' },
        { status: 401 }
      );
    }
    
    // Get user profile to check permissions
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, role, tenant_id')
      .eq('user_id', user.id)
      .single();
    
    if (profileError || !userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }
    
    // Generate Excel template with all sheets
    const excelBuffer = TemplateGenerator.generateExcelTemplate();
    
    // Return Excel file
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="okr_import_template.xlsx"',
      },
    });
  } catch (error) {
    logger.error('Error generating Excel template:', error);
    return NextResponse.json(
      { error: 'Failed to generate Excel template' },
      { status: 500 }
    );
  }
}