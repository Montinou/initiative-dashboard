"use client"
import { useEffect } from 'react'
import PremiumDashboard from '@/dashboard/dashboard'
import { ProtectedRoute } from '@/components/protected-route'

export default function DashboardPage() {
  useEffect(() => {
    console.log('🚀 DashboardPage: Component mounted and useEffect running!');
    console.log('🌍 Current URL:', window.location.href);
    console.log('🕒 Timestamp:', new Date().toISOString());
  }, []);

  console.log('🎯 DashboardPage: Component rendering...');

  return (
    <ProtectedRoute>
      <PremiumDashboard />
    </ProtectedRoute>
  )
}