import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { StratixAssistantClient } from './stratix-assistant-client'

export default async function StratixAssistantPage() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  // Get session on server-side
  const { data: { session }, error } = await supabase.auth.getSession()
  
  if (error) {
    console.error('🚨 Server: Session error:', error);
  }

  // Redirect to login if no session
  if (!session) {
    redirect('/auth/login')
  }

  // Return the client component with session data
  return <StratixAssistantClient />
}