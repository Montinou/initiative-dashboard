"use client"

import { useEffect } from 'react'
import DashboardOverview from './page'

export default function DashboardClient() {
  useEffect(() => {
    console.log('🚀 DashboardClient: Component mounted');
  }, []);

  console.log('🎯 DashboardClient: Component rendering...');

  return <DashboardOverview />
}