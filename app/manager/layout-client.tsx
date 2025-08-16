'use client'

import { useTranslations } from 'next-intl'

interface ManagerLayoutClientProps {
  children: React.ReactNode
  profile: {
    id: string
    full_name: string | null
    role: string
    area_id: string | null
  }
  area: {
    id: string
    name: string
  } | null
}

export default function ManagerLayoutClient({
  children,
  profile,
  area
}: ManagerLayoutClientProps) {
  const t = useTranslations('manager')
  const tCommon = useTranslations('common')

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="container mx-auto">
        {children}
      </div>
    </div>
  )
}