"use client"
import PremiumDashboard from '@/dashboard'
import { AuthGuard } from '@/lib/auth-guard'

export default function DashboardPage() {
  return (
    <AuthGuard>
      <PremiumDashboard />
    </AuthGuard>
  )
}