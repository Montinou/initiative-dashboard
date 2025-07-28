"use client"

import { useEffect } from 'react'
import PremiumDashboard from '@/dashboard/dashboard'

export default function DashboardClient() {
  useEffect(() => {
    console.log('🚀 DashboardClient: Component mounted');
  }, []);

  console.log('🎯 DashboardClient: Component rendering...');

  return <PremiumDashboard />
}