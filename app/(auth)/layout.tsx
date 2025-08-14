import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Authentication - Initiative Dashboard',
  description: 'Sign in to your OKR management dashboard',
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen">
      {children}
    </div>
  )
}