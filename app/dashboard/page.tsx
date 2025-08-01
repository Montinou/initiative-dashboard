import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import PremiumDashboard from '@/dashboard/dashboard'

export default async function DashboardPage() {
  console.log('🎯 DashboardPage: Server component rendering...');

  // TEMPORARY: Skip authentication for development 
  // TODO: Re-enable authentication for production
  console.log('⚠️ Development mode: Skipping authentication check');
  console.log('✅ Server: Rendering dashboard in development mode');

  // Return the dashboard directly for development
  return <PremiumDashboard />
}