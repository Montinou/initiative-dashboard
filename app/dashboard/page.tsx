"use client"
import PremiumDashboard from '@/dashboard/dashboard'
import { ProtectedRoute } from '@/components/protected-route'

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <PremiumDashboard />
    </ProtectedRoute>
  )
}