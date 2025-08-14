'use client'

import { useEffect } from 'react'
import SigaColorShowcase from '@/components/siga/SigaColorShowcase'

export default function SigaThemePage() {
  useEffect(() => {
    // Aplicar el tema SIGA al body
    document.body.setAttribute('data-theme', 'siga')
    
    // Cleanup al desmontar
    return () => {
      document.body.removeAttribute('data-theme')
    }
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <SigaColorShowcase />
    </div>
  )
}