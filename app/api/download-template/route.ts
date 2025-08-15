import { NextRequest, NextResponse } from 'next/server'
import { getUserProfile } from '@/lib/server-user-profile'
import { TemplateGenerator } from '@/services/templateGenerator'
import { logger } from '@/lib/logger'


export async function GET(request: NextRequest) {
  try {
    // Authenticate user and get profile
    const { user, userProfile } = await getUserProfile(request);
    
    if (!user || !userProfile) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    // Get template type from query params (default to 'okr')
    const { searchParams } = new URL(request.url);
    const templateType = searchParams.get('type') || 'okr';
    const format = searchParams.get('format') || 'xlsx';
    
    // Generate template using the TemplateGenerator service
    const generator = new TemplateGenerator();
    let buffer: Buffer;
    let contentType: string;
    let extension: string;
    
    if (format === 'csv') {
      buffer = generator.generateCSVTemplate(templateType);
      contentType = 'text/csv';
      extension = 'csv';
    } else {
      buffer = generator.generateExcelTemplate(templateType);
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      extension = 'xlsx';
    }
    
    const filename = `${templateType}-template-${userProfile.tenant_id || 'template'}-${new Date().toISOString().split('T')[0]}.${extension}`;
    
    logger.info('Template generated successfully', {
      userId: user.id,
      tenantId: userProfile.tenant_id,
      templateType,
      format
    });
    
    // Return as downloadable file
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    logger.error('Template download error', error);
    return NextResponse.json({ error: 'Failed to download template' }, { status: 500 })
  }
}