"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export default function Page() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  
  useEffect(() => {
    // Simple redirect to dashboard
    if (typeof window !== 'undefined') {
      try {
        // Redirect after a short delay to show loading
        setTimeout(() => {
          router.replace('/dashboard')
        }, 500)
      } catch (error) {
        console.error('Redirect error:', error)
        // Fallback redirect if anything fails
        router.replace('/dashboard')
      }
    }
  }, [router])

  // Show simple loading state
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-slate-500/30 border-t-slate-400 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-white/70">Loading...</p>
      </div>
    </div>
  )
}