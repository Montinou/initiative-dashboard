'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function UnauthorizedPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white/10 backdrop-blur-md border-white/20">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <AlertTriangle className="h-16 w-16 text-amber-400" />
          </div>
          <CardTitle className="text-white text-2xl">Acceso Denegado</CardTitle>
          <CardDescription className="text-gray-300">
            No tienes permiso para acceder a esta página.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-300 text-center">
            Contacta a tu administrador si crees que esto es un error.
          </p>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="flex-1 bg-white/10 border-white/20 text-white hover:bg-white/20"
              onClick={() => router.back()}
            >
              Volver
            </Button>
            <Button asChild className="flex-1">
              <Link href="/dashboard">Panel de Control</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}