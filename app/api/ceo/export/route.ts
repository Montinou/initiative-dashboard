import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { getUserProfile } from "@/lib/server-user-profile"

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'pdf'
    
    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user profile
    const userProfile = await getUserProfile(supabase, user.id)
    
    if (!userProfile || (userProfile.role !== 'CEO' && userProfile.role !== 'Admin')) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    // Fetch data for export
    const { data: initiatives } = await supabase
      .from('initiatives')
      .select(`
        *,
        area:areas(name),
        activities(*)
      `)
      .eq('tenant_id', userProfile.tenant_id)

    const { data: objectives } = await supabase
      .from('objectives')
      .select(`
        *,
        area:areas(name)
      `)
      .eq('tenant_id', userProfile.tenant_id)

    // For demo purposes, return a simple JSON response
    // In production, you would generate actual PDF/Excel files
    if (format === 'pdf') {
      // Generate PDF (using a library like pdfkit or puppeteer)
      const pdfContent = {
        title: 'CEO Dashboard Report',
        generated: new Date().toISOString(),
        tenant: userProfile.tenant_id,
        summary: {
          total_initiatives: initiatives?.length || 0,
          total_objectives: objectives?.length || 0,
          completed_initiatives: initiatives?.filter(i => i.status === 'completed').length || 0,
          average_progress: initiatives?.reduce((acc, i) => acc + (i.progress || 0), 0) / (initiatives?.length || 1)
        },
        initiatives: initiatives || [],
        objectives: objectives || []
      }
      
      return new Response(JSON.stringify(pdfContent), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="ceo-dashboard-${new Date().toISOString().split('T')[0]}.json"`
        }
      })
    } else if (format === 'excel') {
      // Generate Excel (using a library like exceljs)
      const excelContent = {
        sheets: [
          {
            name: 'Summary',
            data: [
              ['Metric', 'Value'],
              ['Total Initiatives', initiatives?.length || 0],
              ['Total Objectives', objectives?.length || 0],
              ['Completed Initiatives', initiatives?.filter(i => i.status === 'completed').length || 0],
              ['Average Progress', Math.round(initiatives?.reduce((acc, i) => acc + (i.progress || 0), 0) / (initiatives?.length || 1)) + '%']
            ]
          },
          {
            name: 'Initiatives',
            data: initiatives?.map(i => [i.title, i.progress, i.status, i.area?.name]) || []
          },
          {
            name: 'Objectives',
            data: objectives?.map(o => [o.title, o.status, o.priority, o.area?.name]) || []
          }
        ]
      }
      
      return new Response(JSON.stringify(excelContent), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="ceo-dashboard-${new Date().toISOString().split('T')[0]}.json"`
        }
      })
    }

    return NextResponse.json({ error: "Invalid format" }, { status: 400 })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: "Failed to generate export" },
      { status: 500 }
    )
  }
}