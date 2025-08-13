"use client"

import { useEffect } from 'react'
import { logger } from '@/lib/logger'
import DashboardOverview from './page'

export default function DashboardClient() {
  useEffect(() => {
    logger.info('🚀 DashboardClient: Component mounted');
  }, []);

  logger.info('🎯 DashboardClient: Component rendering...');

  return <DashboardOverview />
}