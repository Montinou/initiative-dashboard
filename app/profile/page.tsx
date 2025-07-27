'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  Briefcase,
  FileText
} from 'lucide-react'
import { useAuth, useTenantId } from '@/lib/auth-context'
import { getThemeFromTenant, generateThemeCSS } from '@/lib/theme-config'
import { RoleNavigation } from '@/components/role-navigation'
import Link from 'next/link'

interface UserProfile {
  id: string
  name: string
  email: string
  phone?: string
  title?: string
  bio?: string
  avatar_url?: string
  role: string
  tenant_id: string
}

export default function UserProfilePage() {
  const router = useRouter()
  const { profile: authProfile } = useAuth()
  const tenantId = useTenantId()
  
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [theme, setTheme] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    title: '',
    bio: '',
    avatar_url: ''
  })

  // Get theme
  useEffect(() => {
    if (tenantId) {
      const currentTheme = getThemeFromTenant(tenantId)
      setTheme(currentTheme)
    }
  }, [tenantId])

  // Fetch user profile
  useEffect(() => {
    const fetchProfile = async () => {
      if (!authProfile?.access_token) return

      try {
        const response = await fetch('/api/profile/user', {
          headers: {
            'Authorization': `Bearer ${authProfile.access_token}`
          }
        })

        if (!response.ok) {
          throw new Error('Failed to fetch profile')
        }

        const data = await response.json()
        setProfile(data.profile)
        setFormData({
          name: data.profile.name || '',
          phone: data.profile.phone || '',
          title: data.profile.title || '',
          bio: data.profile.bio || '',
          avatar_url: data.profile.avatar_url || ''
        })
      } catch (error) {
        console.error('Error fetching profile:', error)
        setMessage({ type: 'error', text: 'Failed to load profile' })
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [authProfile])

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !authProfile?.access_token) return

    setUploading(true)
    setMessage(null)

    try {
      const formData = new FormData()
      formData.append('image', file)
      formData.append('type', 'avatar')

      const response = await fetch('/api/profile/upload-image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authProfile.access_token}`
        },
        body: formData
      })

      if (!response.ok) {
        throw new Error('Failed to upload image')
      }

      const data = await response.json()
      setFormData(prev => ({ ...prev, avatar_url: data.imageUrl }))
      setMessage({ type: 'success', text: 'Image uploaded successfully' })
    } catch (error) {
      console.error('Error uploading image:', error)
      setMessage({ type: 'error', text: 'Failed to upload image' })
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!authProfile?.access_token) return

    setSaving(true)
    setMessage(null)

    try {
      const response = await fetch('/api/profile/user', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authProfile.access_token}`
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update profile')
      }

      const data = await response.json()
      setProfile(data.profile)
      setMessage({ type: 'success', text: 'Profile updated successfully' })
    } catch (error) {
      console.error('Error updating profile:', error)
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Failed to update profile' 
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/70">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Card className="backdrop-blur-xl bg-white/5 border border-white/10 max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Profile Not Found</h2>
            <p className="text-red-200/80 mb-4">Unable to load your profile information.</p>
            <Link href="/dashboard">
              <Button className="bg-gradient-to-r from-purple-500 to-cyan-400 hover:from-purple-600 hover:to-cyan-500">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: theme ? generateThemeCSS(theme) : '' }} />
      
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        {/* Header */}
        <header className="bg-black/20 backdrop-blur-md border-b border-white/10 p-4">
          <RoleNavigation />
        </header>
        
        {/* Page Title */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                User Profile
              </h1>
              <p className="text-white/60 text-sm">
                Manage your personal information and preferences
              </p>
            </div>
          </div>
        </div>

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
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Profile Image Card */}
            <Card className="backdrop-blur-xl bg-white/5 border border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Camera className="h-5 w-5 mr-2" />
                  Profile Picture
                </CardTitle>
                <CardDescription className="text-white/60">
                  Upload your profile photo
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
                  <h3 className="text-lg font-semibold text-white">{profile.name}</h3>
                  <p className="text-white/60">{profile.role}</p>
                  <div className="flex items-center justify-center text-white/50 text-sm">
                    <Mail className="h-3 w-3 mr-1" />
                    {profile.email}
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
                    Personal Information
                  </CardTitle>
                  <CardDescription className="text-white/60">
                    Update your personal details and contact information
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Name */}
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-white font-medium">
                        Full Name *
                      </Label>
                      <Input
                        id="name"
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40"
                        placeholder="Enter your full name"
                        required
                      />
                    </div>

                    {/* Phone */}
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-white font-medium flex items-center">
                        <Phone className="h-4 w-4 mr-2" />
                        Phone Number
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40"
                        placeholder="Enter your phone number"
                      />
                    </div>

                    {/* Job Title */}
                    <div className="space-y-2">
                      <Label htmlFor="title" className="text-white font-medium flex items-center">
                        <Briefcase className="h-4 w-4 mr-2" />
                        Job Title
                      </Label>
                      <Input
                        id="title"
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40"
                        placeholder="Enter your job title"
                      />
                    </div>

                    {/* Bio */}
                    <div className="space-y-2">
                      <Label htmlFor="bio" className="text-white font-medium flex items-center">
                        <FileText className="h-4 w-4 mr-2" />
                        Bio
                      </Label>
                      <Textarea
                        id="bio"
                        value={formData.bio}
                        onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40 min-h-[100px]"
                        placeholder="Tell us about yourself..."
                        rows={4}
                      />
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
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-5 w-5 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}