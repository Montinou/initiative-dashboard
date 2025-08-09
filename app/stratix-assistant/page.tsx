import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { StratixAssistantGemini } from './stratix-assistant-gemini'

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

  // Return the new Gemini-powered client component
  return <StratixAssistantGemini />
}