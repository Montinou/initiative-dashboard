import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { SmartResendManager } from '@/lib/invitation/smart-resend-manager';

// POST - Execute smart resend for single or multiple invitations
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

    // Only CEOs and Admins can use smart resend
    if (!['CEO', 'Admin'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { invitationIds, mode = 'execute' } = body;

    if (!invitationIds || !Array.isArray(invitationIds) || invitationIds.length === 0) {
      return NextResponse.json({ error: 'Invalid invitation IDs' }, { status: 400 });
    }

    const manager = new SmartResendManager();
    const results = {
      total: invitationIds.length,
      processed: 0,
      actions: {
        resent: [] as string[],
        reminded: [] as string[],
        waiting: [] as string[],
        cancelled: [] as string[],
        failed: [] as string[]
      },
      details: [] as any[]
    };

    for (const invitationId of invitationIds) {
      try {
        if (mode === 'analyze') {
          // Just analyze without executing
          const { engagement, strategy } = await manager.analyzeInvitation(invitationId);
          results.details.push({
            invitationId,
            engagement,
            strategy
          });
        } else {
          // Execute smart resend
          const result = await manager.executeSmartResend(invitationId);
          results.processed++;
          
          if (result.success) {
            switch (result.action) {
              case 'resent':
                results.actions.resent.push(invitationId);
                break;
              case 'reminded':
                results.actions.reminded.push(invitationId);
                break;
              case 'wait':
                results.actions.waiting.push(invitationId);
                break;
              case 'recommended_cancellation':
                results.actions.cancelled.push(invitationId);
                break;
            }
          } else {
            results.actions.failed.push(invitationId);
          }
          
          results.details.push({
            invitationId,
            ...result
          });
        }
      } catch (error: any) {
        results.actions.failed.push(invitationId);
        results.details.push({
          invitationId,
          success: false,
          error: error.message
        });
      }
    }

    // Log the operation
    await supabase
      .from('audit_log')
      .insert({
        user_id: userProfile.id,
        action: mode === 'analyze' ? 'analyze_smart_resend' : 'execute_smart_resend',
        table_name: 'invitations',
        new_data: {
          results,
          timestamp: new Date().toISOString()
        }
      });

    return NextResponse.json({
      success: true,
      results,
      message: mode === 'analyze' 
        ? `Analyzed ${results.total} invitations`
        : `Processed ${results.processed} of ${results.total} invitations`
    });

  } catch (error: any) {
    console.error('Smart resend error:', error);
    return NextResponse.json(
      { error: 'Failed to process smart resend', details: error.message },
      { status: 500 }
    );
  }
}

// GET - Get smart resend recommendations for tenant
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

    // Only CEOs and Admins can view recommendations
    if (!['CEO', 'Admin'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const manager = new SmartResendManager();
    const analysis = await manager.bulkAnalyze(userProfile.tenant_id);

    // Get detailed info for each recommendation category
    const getInvitationDetails = async (ids: string[]) => {
      if (ids.length === 0) return [];
      
      const { data } = await supabase
        .from('invitations')
        .select('id, email, role, created_at, reminder_count, email_opened_at, email_clicked_at')
        .in('id', ids);
      
      return data || [];
    };

    const detailedRecommendations = {
      resend: await getInvitationDetails(analysis.recommendations.resend),
      remind: await getInvitationDetails(analysis.recommendations.remind),
      wait: await getInvitationDetails(analysis.recommendations.wait),
      cancel: await getInvitationDetails(analysis.recommendations.cancel)
    };

    return NextResponse.json({
      success: true,
      analysis: {
        total: analysis.total,
        summary: {
          resend: analysis.recommendations.resend.length,
          remind: analysis.recommendations.remind.length,
          wait: analysis.recommendations.wait.length,
          cancel: analysis.recommendations.cancel.length
        },
        recommendations: detailedRecommendations
      }
    });

  } catch (error: any) {
    console.error('Failed to get recommendations:', error);
    return NextResponse.json(
      { error: 'Failed to get recommendations', details: error.message },
      { status: 500 }
    );
  }
}