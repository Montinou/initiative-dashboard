import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import QRCode from 'qrcode';

// GET - Generate QR code for invitation
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Only CEOs and Admins can generate QR codes
    if (!['CEO', 'Admin'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const invitationId = searchParams.get('id');
    const format = searchParams.get('format') || 'png'; // png, svg, or dataurl

    if (!invitationId) {
      return NextResponse.json({ error: 'Invitation ID required' }, { status: 400 });
    }

    // Fetch invitation
    const { data: invitation, error: invError } = await supabase
      .from('invitations')
      .select('*')
      .eq('id', invitationId)
      
      .single();

    if (invError || !invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    // Generate invitation URL
    const invitationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/accept-invitation?token=${invitation.token}`;

    // QR Code options
    const qrOptions = {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M' as const
    };

    let qrCodeData: any;

    switch (format) {
      case 'svg':
        qrCodeData = await QRCode.toString(invitationUrl, {
          ...qrOptions,
          type: 'svg'
        });
        return new NextResponse(qrCodeData, {
          headers: {
            'Content-Type': 'image/svg+xml',
            'Content-Disposition': `inline; filename="invitation-${invitationId}.svg"`
          }
        });

      case 'dataurl':
        qrCodeData = await QRCode.toDataURL(invitationUrl, qrOptions);
        return NextResponse.json({ 
          success: true,
          dataUrl: qrCodeData,
          invitation: {
            id: invitation.id,
            email: invitation.email,
            role: invitation.role,
            expiresAt: invitation.expires_at
          }
        });

      case 'png':
      default:
        const buffer = await QRCode.toBuffer(invitationUrl, qrOptions);
        return new NextResponse(buffer, {
          headers: {
            'Content-Type': 'image/png',
            'Content-Disposition': `inline; filename="invitation-${invitationId}.png"`,
            'Cache-Control': 'public, max-age=3600'
          }
        });
    }

  } catch (error: any) {
    console.error('QR code generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate QR code', details: error.message },
      { status: 500 }
    );
  }
}

// POST - Generate bulk QR codes for multiple invitations
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Only CEOs and Admins can generate QR codes
    if (!['CEO', 'Admin'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { invitationIds, includeDetails = false } = body;

    if (!invitationIds || !Array.isArray(invitationIds) || invitationIds.length === 0) {
      return NextResponse.json({ error: 'Invalid invitation IDs' }, { status: 400 });
    }

    // Limit bulk generation to 50 at a time
    if (invitationIds.length > 50) {
      return NextResponse.json({ error: 'Maximum 50 QR codes at a time' }, { status: 400 });
    }

    // Fetch invitations
    const { data: invitations, error: invError } = await supabase
      .from('invitations')
      .select('*')
      .in('id', invitationIds)
      ;

    if (invError || !invitations || invitations.length === 0) {
      return NextResponse.json({ error: 'No valid invitations found' }, { status: 404 });
    }

    // Generate QR codes
    const qrCodes = await Promise.all(
      invitations.map(async (invitation) => {
        const invitationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/accept-invitation?token=${invitation.token}`;
        
        const qrOptions = {
          width: 200,
          margin: 1,
          errorCorrectionLevel: 'M' as const
        };

        const dataUrl = await QRCode.toDataURL(invitationUrl, qrOptions);

        return {
          invitationId: invitation.id,
          email: invitation.email,
          role: invitation.role,
          dataUrl,
          ...(includeDetails && {
            invitationUrl,
            expiresAt: invitation.expires_at,
            status: invitation.status
          })
        };
      })
    );

    // Log the bulk generation
    await supabase
      .from('audit_log')
      .insert({
        user_id: userProfile.id,
        action: 'generate_bulk_qr_codes',
        table_name: 'invitations',
        new_data: {
          count: qrCodes.length,
          invitationIds,
          timestamp: new Date().toISOString()
        }
      });

    return NextResponse.json({
      success: true,
      count: qrCodes.length,
      qrCodes
    });

  } catch (error: any) {
    console.error('Bulk QR code generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate bulk QR codes', details: error.message },
      { status: 500 }
    );
  }
}