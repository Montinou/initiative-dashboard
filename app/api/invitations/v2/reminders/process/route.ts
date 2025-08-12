import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { InvitationReminderScheduler } from '@/lib/invitation/reminder-scheduler';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile to check permissions
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Only CEOs and Admins can process reminders
    if (!['CEO', 'Admin'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Check for API key if this is a cron job call
    const apiKey = request.headers.get('x-api-key');
    const isCronJob = apiKey === process.env.CRON_API_KEY;

    // Initialize reminder scheduler
    const scheduler = new InvitationReminderScheduler();

    // Process reminders
    const results = await scheduler.processReminders();

    // Log the processing results
    await supabase
      .from('audit_log')
      .insert({
        user_id: isCronJob ? null : userProfile.id,
        action: 'process_reminders',
        table_name: 'invitations',
        new_data: {
          results,
          triggered_by: isCronJob ? 'cron' : 'manual',
          timestamp: new Date().toISOString()
        }
      });

    return NextResponse.json({
      success: true,
      results,
      message: `Processed ${results.processed} invitations, sent ${results.sent} reminders`
    });

  } catch (error: any) {
    console.error('Reminder processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process reminders', details: error.message },
      { status: 500 }
    );
  }
}

// GET endpoint to check upcoming reminders
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Only CEOs and Admins can view reminders
    if (!['CEO', 'Admin'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get upcoming reminders
    const scheduler = new InvitationReminderScheduler();
    const upcoming = await scheduler.getUpcomingReminders(userProfile.tenant_id);

    return NextResponse.json({
      success: true,
      upcoming,
      nextProcessingTime: getNextProcessingTime()
    });

  } catch (error: any) {
    console.error('Failed to fetch upcoming reminders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch upcoming reminders', details: error.message },
      { status: 500 }
    );
  }
}

// Helper function to determine next processing time
function getNextProcessingTime(): string {
  const now = new Date();
  const next = new Date();
  
  // Process reminders at 9 AM and 2 PM on weekdays
  if (now.getDay() === 0 || now.getDay() === 6) {
    // Weekend - next processing is Monday 9 AM
    const daysUntilMonday = now.getDay() === 0 ? 1 : 2;
    next.setDate(now.getDate() + daysUntilMonday);
    next.setHours(9, 0, 0, 0);
  } else {
    // Weekday
    if (now.getHours() < 9) {
      // Before 9 AM - process at 9 AM today
      next.setHours(9, 0, 0, 0);
    } else if (now.getHours() < 14) {
      // Between 9 AM and 2 PM - process at 2 PM today
      next.setHours(14, 0, 0, 0);
    } else {
      // After 2 PM - process at 9 AM tomorrow
      next.setDate(now.getDate() + 1);
      if (next.getDay() === 0 || next.getDay() === 6) {
        // Tomorrow is weekend, skip to Monday
        const daysToAdd = next.getDay() === 0 ? 1 : 2;
        next.setDate(next.getDate() + daysToAdd);
      }
      next.setHours(9, 0, 0, 0);
    }
  }
  
  return next.toISOString();
}