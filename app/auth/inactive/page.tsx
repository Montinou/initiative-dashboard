'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'

export default function InactivePage() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
      <Card className="w-full max-w-md bg-gray-900/50 backdrop-blur-sm border border-white/10">
        <CardContent className="p-6">
          <div className="flex flex-col items-center text-center">
            <div className="p-3 bg-red-500/20 rounded-full mb-4">
              <AlertCircle className="h-8 w-8 text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Account Inactive</h1>
            <p className="text-gray-400 mb-6">
              Your account is currently inactive. Please contact your administrator to reactivate your account.
            </p>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => router.push('/auth/login')}
              >
                Back to Login
              </Button>
              <Button onClick={() => router.push('/contact')}>
                Contact Support
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}