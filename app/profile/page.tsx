'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  User, 
  Upload, 
  Save, 
  ArrowLeft, 
  AlertCircle, 
  CheckCircle2, 
  Camera, 
  Loader2,
  Mail,
  Phone,
  Briefcase
} from 'lucide-react'
import { useAuth, useTenantId } from '@/lib/auth-context'
import { useTenantTheme } from '@/lib/tenant-context'
import { generateThemeCSS } from '@/lib/theme-config-simple'
import Link from 'next/link'
import { useTranslations } from 'next-intl'

interface UserProfile {
  id: string
  full_name: string | null
  email: string
  phone?: string | null
  avatar_url?: string | null
  role: string
  tenant_id: string
  area_id?: string | null
  area?: {
    id: string
    name: string
    description: string
  } | null
  is_active: boolean
  is_system_admin: boolean
  last_login: string | null
  created_at: string
  updated_at: string
}

export default function UserProfilePage() {
  const router = useRouter()
  const { session, profile: authProfile, loading: authLoading } = useAuth()
  const tenantId = useTenantId()
  // Use theme from TenantProvider
  const theme = useTenantTheme()
  const t = useTranslations('profile')
  const tCommon = useTranslations('common')
  
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    avatar_url: ''
  })

  // Fetch user profile
  useEffect(() => {
    let timeoutId: NodeJS.Timeout
    
    const fetchProfile = async () => {
      // Wait for auth to be fully initialized
      if (authLoading) return
      
      // If no session and auth finished loading, user is not authenticated
      if (!session) {
        setLoading(false)
        return
      }

      try {
        // Use secure cookie-based authentication (no custom headers needed)
        const response = await fetch('/api/profile/user', {
          credentials: 'include' // Include cookies for authentication
        })

        if (!response.ok) {
          if (response.status === 401) {
            // Authentication failed, clear session
            setMessage({ type: 'error', text: t('messages.sessionExpired') })
            setLoading(false)
            return
          }
          throw new Error('Failed to fetch profile')
        }

        const data = await response.json()
        setProfile(data.profile)
        setFormData({
          full_name: data.profile.full_name || '',
          phone: data.profile.phone || '',
          avatar_url: data.profile.avatar_url || ''
        })
      } catch (error) {
        console.error('Error fetching profile:', error)
        setMessage({ type: 'error', text: t('messages.loadError') })
      } finally {
        setLoading(false)
      }
    }

    // Set a timeout to prevent infinite loading
    timeoutId = setTimeout(() => {
      if (!authLoading) {
        fetchProfile()
      } else {
        // Force stop loading after 10 seconds
        console.warn('Profile loading timeout - forcing load stop')
        setLoading(false)
        setMessage({ type: 'error', text: t('messages.loadTimeout') })
      }
    }, 100)

    return () => {
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [session, authLoading])

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !session?.access_token) return

    setUploading(true)
    setMessage(null)

    try {
      const formData = new FormData()
      formData.append('image', file)
      formData.append('type', 'avatar')

      // Use secure cookie-based authentication (no custom headers needed)
      const response = await fetch('/api/profile/upload-image', {
        method: 'POST',
        credentials: 'include', // Include cookies for authentication
        body: formData
      })

      if (!response.ok) {
        throw new Error('Failed to upload image')
      }

      const data = await response.json()
      setFormData(prev => ({ ...prev, avatar_url: data.imageUrl }))
      setMessage({ type: 'success', text: t('messages.photoUploaded') })
    } catch (error) {
      console.error('Error uploading image:', error)
      setMessage({ type: 'error', text: t('messages.photoUploadError') })
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session?.access_token) return

    setSaving(true)
    setMessage(null)

    try {
      // Use secure cookie-based authentication (no custom headers needed)
      const response = await fetch('/api/profile/user', {
        method: 'PUT',
        credentials: 'include', // Include cookies for authentication
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update profile')
      }

      const data = await response.json()
      setProfile(data.profile)
      setMessage({ type: 'success', text: t('messages.profileUpdated') })
    } catch (error) {
      console.error('Error updating profile:', error)
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : t('messages.profileUpdateError') 
      })
    } finally {
      setSaving(false)
    }
  }

  // Only show loading for our own data fetching, not auth loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">{t('messages.loadingProfile')}</p>
        </div>
      </div>
    )
  }

  // Show authentication required state - check session instead of profile
  if (!session && !authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <Card className="backdrop-blur-xl bg-gray-900/50 border border-white/10 max-w-md">
          <CardContent className="p-8 text-center">
            <User className="h-12 w-12 text-primary mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">{tCommon('authRequired')}</h2>
            <p className="text-gray-400 mb-4">
              {tCommon('pleaseLogin')}
            </p>
            <Button 
              onClick={() => window.location.href = '/auth/login'}
              className="bg-primary hover:bg-primary/90"
            >
              {tCommon('goToLogin')}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: generateThemeCSS(theme) }} />
      
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        {/* Header */}
        <header className="backdrop-blur-xl bg-gray-900/50 border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Link href="/dashboard">
                  <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white hover:bg-white/10">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    {tCommon('backToDashboard')}
                  </Button>
                </Link>
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    {t('title')}
                  </h1>
                  <p className="text-gray-400 text-sm">
                    {t('subtitle')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {message && (
            <Alert className={`mb-6 ${
              message.type === 'success' 
                ? 'bg-green-500/10 border-green-500/20 text-green-200' 
                : 'bg-red-500/10 border-red-500/20 text-red-200'
            }`}>
              {message.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription className="flex items-center justify-between">
                <span>{message.text}</span>
                {message.type === 'error' && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => window.location.reload()}
                    className="ml-4"
                  >
                    {tCommon('reload')}
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Show message if profile not loaded */}
          {!profile && session && !loading && (
            <Card className="backdrop-blur-xl bg-gray-900/50 border border-white/10 mb-6">
              <CardContent className="p-6 text-center">
                <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">{t('messages.failedToLoadProfile')}</h3>
                <p className="text-gray-400 mb-4">
                  {tCommon('tryAgainLater')}
                </p>
                <Button onClick={() => window.location.reload()}>
                  {tCommon('tryAgain')}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Only show profile form if we have profile data */}
          {profile && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Profile Image Card */}
            <Card className="backdrop-blur-xl bg-gray-900/50 border border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Camera className="h-5 w-5 mr-2 text-primary" />
                  {t('profilePhoto.title')}
                </CardTitle>
                <CardDescription className="text-gray-400">
                  {t('profilePhoto.subtitle')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar Display */}
                <div className="flex justify-center">
                  <div className="relative">
                    <div className="w-32 h-32 rounded-full bg-gradient-to-r from-purple-500 to-cyan-400 p-1">
                      <div className="w-full h-full rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center overflow-hidden">
                        {formData.avatar_url ? (
                          <img 
                            src={formData.avatar_url} 
                            alt="Profile" 
                            className="w-full h-full object-cover rounded-full"
                          />
                        ) : (
                          <User className="h-16 w-16 text-white/60" />
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="absolute bottom-0 right-0 p-2 bg-gradient-to-r from-purple-500 to-cyan-400 rounded-full text-white hover:from-purple-600 hover:to-cyan-500 disabled:opacity-50"
                    >
                      {uploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />

                {/* Profile Info */}
                <div className="space-y-2 text-center">
                  <h3 className="text-lg font-semibold text-white">{profile?.full_name || t('placeholders.notProvided')}</h3>
                  <p className="text-white/60">{profile?.role}</p>
                  {profile?.area && (
                    <p className="text-white/50 text-sm">{profile.area.name}</p>
                  )}
                  <div className="flex items-center justify-center text-white/50 text-sm">
                    <Mail className="h-3 w-3 mr-1" />
                    {profile?.email}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Profile Form */}
            <div className="lg:col-span-2">
              <Card className="backdrop-blur-xl bg-white/5 border border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <User className="h-5 w-5 mr-2" />
                    {t('personalInfo.title')}
                  </CardTitle>
                  <CardDescription className="text-white/60">
                    {t('personalInfo.subtitle')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Name */}
                    <div className="space-y-2">
                      <Label htmlFor="full_name" className="text-white font-medium">
                        {t('personalInfo.fullName')} *
                      </Label>
                      <Input
                        id="full_name"
                        type="text"
                        value={formData.full_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40"
                        placeholder={t('placeholders.enterName')}
                        required
                      />
                    </div>

                    {/* Phone */}
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-white font-medium flex items-center">
                        <Phone className="h-4 w-4 mr-2" />
                        {t('personalInfo.phone')}
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40"
                        placeholder={t('placeholders.enterPhone')}
                      />
                    </div>

                    {/* Area Information (Read-only) */}
                    {profile?.area && (
                      <div className="space-y-2">
                        <Label className="text-white font-medium flex items-center">
                          <Briefcase className="h-4 w-4 mr-2" />
                          {t('personalInfo.area')}
                        </Label>
                        <div className="bg-white/5 border border-white/20 rounded-md p-3">
                          <p className="text-white font-medium">{profile.area.name}</p>
                          {profile.area.description && (
                            <p className="text-white/60 text-sm mt-1">{profile.area.description}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Role Information (Read-only) */}
                    <div className="space-y-2">
                      <Label className="text-white font-medium flex items-center">
                        <User className="h-4 w-4 mr-2" />
                        {t('personalInfo.role')}
                      </Label>
                      <div className="bg-white/5 border border-white/20 rounded-md p-3">
                        <p className="text-white font-medium">{profile?.role}</p>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <Button
                      type="submit"
                      disabled={saving}
                      className="w-full bg-gradient-to-r from-purple-500 to-cyan-400 hover:from-purple-600 hover:to-cyan-500 text-white h-12"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                          {t('actions.saving')}
                        </>
                      ) : (
                        <>
                          <Save className="h-5 w-5 mr-2" />
                          {t('actions.save')}
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
          )}
        </div>
      </div>
    </>
  )
}