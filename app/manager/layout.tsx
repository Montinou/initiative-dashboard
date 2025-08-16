'use client'

import { useAuth } from '@/lib/auth-context'
import { Loader2, Shield, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useTranslations } from 'next-intl'

export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { profile, loading: authLoading, user } = useAuth()
  const t = useTranslations('common')

  // Show loading while auth is initializing
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">
            Cargando panel de gerencia...
          </p>
        </div>
      </div>
    )
  }

  // Redirect if not authenticated
  if (!user || !profile) {
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/login'
    }
    return null
  }

  // Show unauthorized if not manager or no area assigned
  if (profile.role !== 'Manager' || !profile.area_id || !profile.is_active) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 backdrop-blur-xl bg-card border text-center max-w-md">
          <Shield className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">
            Acceso Restringido
          </h2>
          <p className="text-muted-foreground mb-6">
            Solo gerentes con área asignada pueden acceder a este panel.
          </p>
          <Button 
            onClick={() => window.location.href = '/dashboard'} 
            className="bg-primary hover:bg-primary/90"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('returnToDashboard')}
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto">
        {children}
      </div>
    </div>
  )
}