'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
// SessionPersistence removed - SDK handles localStorage automatically
import { LogOut, Loader2, AlertCircle } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'

interface LogoutButtonProps {
  showIcon?: boolean
  showText?: boolean
  confirmLogout?: boolean
  redirectTo?: string
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
  onLogoutComplete?: () => void
}

export function LogoutButton({
  showIcon = true,
  showText = true,
  confirmLogout = true,
  redirectTo = '/auth/login',
  variant = 'ghost',
  size = 'default',
  className = '',
  onLogoutComplete
}: LogoutButtonProps) {
  const router = useRouter()
  const { signOut, user } = useAuth()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  const handleLogout = async () => {
    if (isLoggingOut) return
    
    setIsLoggingOut(true)
    
    try {
      console.log('🚪 LogoutButton: Starting logout process...')
      
      // Perform logout (SDK handles clearing localStorage)
      await signOut()
      
      // Show success toast
      toast({
        title: "Sesión cerrada",
        description: "Has cerrado sesión exitosamente.",
        // @ts-ignore
        icon: <LogOut className="w-4 h-4" />
      })
      
      // Call callback if provided
      onLogoutComplete?.()
      
      // Redirect to login (signOut already does this, but ensure it happens)
      setTimeout(() => {
        router.push(redirectTo)
      }, 100)
      
    } catch (error) {
      console.error('❌ LogoutButton: Error during logout:', error)
      
      // Show error toast
      toast({
        title: "Error al cerrar sesión",
        description: "Ocurrió un error al cerrar sesión. Por favor, intenta de nuevo.",
        variant: "destructive",
        // @ts-ignore
        icon: <AlertCircle className="w-4 h-4" />
      })
      
      // Force redirect anyway for security
      setTimeout(() => {
        window.location.href = redirectTo
      }, 1000)
    } finally {
      setIsLoggingOut(false)
      setShowConfirmDialog(false)
    }
  }

  const handleLogoutClick = () => {
    if (confirmLogout) {
      setShowConfirmDialog(true)
    } else {
      handleLogout()
    }
  }

  const buttonContent = (
    <>
      {isLoggingOut ? (
        <Loader2 className={`${showText ? 'mr-2' : ''} h-4 w-4 animate-spin`} />
      ) : showIcon ? (
        <LogOut className={`${showText ? 'mr-2' : ''} h-4 w-4`} />
      ) : null}
      {showText && (isLoggingOut ? 'Cerrando sesión...' : 'Cerrar Sesión')}
    </>
  )

  if (confirmLogout) {
    return (
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogTrigger asChild>
          <Button
            variant={variant}
            size={size}
            className={className}
            disabled={isLoggingOut}
          >
            {buttonContent}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent className="glassmorphic-card border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              ¿Cerrar sesión?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-white/70">
              {user?.email ? (
                <>Estás a punto de cerrar la sesión de <strong className="text-white">{user.email}</strong>.</>
              ) : (
                'Estás a punto de cerrar tu sesión actual.'
              )}
              <br />
              Tendrás que iniciar sesión nuevamente para acceder al sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              disabled={isLoggingOut}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogout}
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={isLoggingOut}
            >
              {isLoggingOut ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cerrando sesión...
                </>
              ) : (
                'Cerrar Sesión'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleLogoutClick}
      disabled={isLoggingOut}
    >
      {buttonContent}
    </Button>
  )
}

/**
 * Quick logout button for use in navigation/headers
 */
export function QuickLogoutButton({ className = '' }: { className?: string }) {
  return (
    <LogoutButton
      showIcon={true}
      showText={false}
      confirmLogout={false}
      size="icon"
      variant="ghost"
      className={`text-white/70 hover:text-white hover:bg-white/10 ${className}`}
    />
  )
}

/**
 * Logout menu item for dropdown menus
 */
export function LogoutMenuItem({ onSelect }: { onSelect?: () => void }) {
  const router = useRouter()
  const { signOut } = useAuth()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    if (isLoggingOut) return
    
    setIsLoggingOut(true)
    onSelect?.()
    
    try {
      await signOut() // SDK handles clearing localStorage
      router.push('/auth/login')
    } catch (error) {
      console.error('Error during logout:', error)
      window.location.href = '/auth/login'
    }
  }

  return (
    <button
      onClick={handleLogout}
      disabled={isLoggingOut}
      className="flex w-full items-center px-2 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-sm transition-colors"
    >
      {isLoggingOut ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <LogOut className="mr-2 h-4 w-4" />
      )}
      {isLoggingOut ? 'Cerrando sesión...' : 'Cerrar Sesión'}
    </button>
  )
}

/**
 * Floating logout button for development/testing
 */
export function DevLogoutButton() {
  if (process.env.NODE_ENV !== 'development') return null
  
  return (
    <div className="fixed bottom-20 right-4 z-50">
      <LogoutButton
        showIcon={true}
        showText={false}
        confirmLogout={false}
        size="icon"
        variant="destructive"
        className="shadow-lg"
      />
    </div>
  )
}