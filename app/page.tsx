"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getThemeFromDomain, generateThemeCSS, type CompanyTheme } from "@/lib/theme-config"

export default function Page() {
  const router = useRouter()
  const [theme, setTheme] = useState<CompanyTheme | null>(null)
  
  useEffect(() => {
    // Get theme based on domain first, then redirect
    if (typeof window !== 'undefined') {
      try {
        const currentTheme = getThemeFromDomain(window.location.hostname)
        setTheme(currentTheme)
        
        // Update document title
        document.title = `${currentTheme.companyName} - Redirecting`
        
        // Redirect after a short delay to show themed loading
        setTimeout(() => {
          router.replace('/dashboard')
        }, 800)
      } catch (error) {
        console.error('Theme loading error:', error)
        // Fallback redirect if theme fails
        router.replace('/dashboard')
      }
    }
  }, [router])

  // Show themed loading while redirecting
  if (!theme) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/70">Loading...</p>
        </div>
      </div>
    )
  }
  
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: generateThemeCSS(theme) }} />
      <div className={`min-h-screen bg-gradient-to-br ${theme.colors.gradientFrom} ${theme.colors.gradientVia} ${theme.colors.gradientTo} flex items-center justify-center`}>
        <div className="text-center">
          {/* Themed loading spinner */}
          <div className="relative">
            <div 
              className="w-16 h-16 border-4 rounded-full animate-spin mx-auto mb-4"
              style={{
                borderColor: `${theme.colors.primary}30`,
                borderTopColor: theme.colors.primary
              }}
            ></div>
            {/* Inner glow effect */}
            <div 
              className="absolute inset-0 w-16 h-16 border-2 rounded-full mx-auto opacity-20 animate-pulse"
              style={{
                borderColor: theme.colors.secondary
              }}
            ></div>
          </div>
          
          {/* Company branding */}
          <div className="glassmorphic-card p-6 max-w-sm mx-auto">
            <div className="flex items-center justify-center mb-4">
              <div 
                className="w-12 h-12 rounded-lg flex items-center justify-center shadow-lg"
                style={{
                  background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.secondary})`
                }}
              >
                <span className="text-white font-bold text-lg">
                  {theme.logo?.text || theme.companyName.charAt(0)}
                </span>
              </div>
            </div>
            
            <h1 className="text-xl font-bold text-white mb-2">
              {theme.companyName}
            </h1>
            <p className="text-white/70 text-sm mb-4">
              {theme.description}
            </p>
            <p className="text-white/60 text-sm">
              Redirecting to dashboard...
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
