import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { StratixAssistantClient } from './stratix-assistant-client'

export default async function StratixAssistantPage() {
  const supabase = await createClient()

  // Get user on server-side (more secure than getSession)
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error) {
    console.error('🚨 Server: Auth error:', error);
  }

  // Redirect to login if no user
  if (!user) {
    redirect('/auth/login')
  }

  // Return the client component with session data
  return <StratixAssistantClient />
}