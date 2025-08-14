'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { 
  Building2, 
  Upload, 
  Save, 
  ArrowLeft, 
  AlertCircle, 
  CheckCircle2, 
  Camera, 
  Loader2,
  Globe,
  Phone,
  Mail,
  MapPin,
  FileText,
  Target,
  Eye,
  Heart,
  Plus,
  X,
  Image as ImageIcon
} from 'lucide-react'
import { useAuth, useUserRole, useTenantId } from '@/lib/auth-context'
import { getThemeFromTenant, generateThemeCSS } from '@/lib/theme-config-simple'
import { ProtectedRoute } from '@/components/protected-route'
import Link from 'next/link'

interface CompanyProfile {
  id?: string
  tenant_id: string
  company_name: string
  industry?: string
  website?: string
  phone?: string
  email?: string
  address?: string
  description?: string
  logo_url?: string
  cover_image_url?: string
  mission?: string
  vision?: string
  values?: string[]
  social_media?: Record<string, string>
}

export default function CompanyProfilePage() {
  const router = useRouter()
  const { profile: authProfile } = useAuth()
  const userRole = useUserRole()
  const tenantId = useTenantId()
  
  const [profile, setProfile] = useState<CompanyProfile | null>(null)
  const [theme, setTheme] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadType, setUploadType] = useState<'logo' | 'cover'>('logo')
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [newValue, setNewValue] = useState('')
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [formData, setFormData] = useState<CompanyProfile>({
    tenant_id: '',
    company_name: '',
    industry: '',
    website: '',
    phone: '',
    email: '',
    address: '',
    description: '',
    logo_url: '',
    cover_image_url: '',
    mission: '',
    vision: '',
    values: [],
    social_media: {}
  })

  // Check permissions
  useEffect(() => {
    if (userRole && !['CEO', 'Admin'].includes(userRole)) {
      router.push('/')
    }
  }, [userRole, router])

  // Get theme
  useEffect(() => {
    if (tenantId) {
      const currentTheme = getThemeFromTenant(tenantId)
      setTheme(currentTheme)
    }
  }, [tenantId])

  // Fetch company profile
  useEffect(() => {
    const fetchProfile = async () => {
      if (!authProfile?.id) return

      try {
        // Fetch from organizations API endpoint
        const response = await fetch('/api/organizations', {
          credentials: 'include' // Include cookies for authentication
        })

        if (!response.ok) {
          if (response.status === 404) {
            // No profile exists yet, that's okay
            setLoading(false)
            return
          }
          throw new Error('Failed to fetch company profile')
        }

        const data = await response.json()
        setProfile(data)
        setFormData({
          ...data,
          values: data.values || [],
          social_media: data.social_media || {}
        })
      } catch (error) {
        console.error('Error fetching profile:', error)
        setMessage({ type: 'error', text: 'Failed to load company profile' })
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [authProfile])

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !authProfile?.id) return

    setUploading(true)
    setMessage(null)

    try {
      const formDataUpload = new FormData()
      formDataUpload.append('image', file)
      formDataUpload.append('type', uploadType)

      // Use secure cookie-based authentication (no custom headers needed)
      const response = await fetch('/api/profile/upload-image', {
        method: 'POST',
        credentials: 'include', // Include cookies for authentication
        body: formDataUpload
      })

      if (!response.ok) {
        throw new Error('Failed to upload image')
      }

      const data = await response.json()
      
      setFormData(prev => ({ 
        ...prev, 
        [uploadType === 'logo' ? 'logo_url' : 'cover_image_url']: data.imageUrl 
      }))
      
      setMessage({ type: 'success', text: `${uploadType === 'logo' ? 'Logo' : 'Cover image'} uploaded successfully` })
    } catch (error) {
      console.error('Error uploading image:', error)
      setMessage({ type: 'error', text: 'Failed to upload image' })
    } finally {
      setUploading(false)
    }
  }

  const addValue = () => {
    if (newValue.trim() && !formData.values?.includes(newValue.trim())) {
      setFormData(prev => ({
        ...prev,
        values: [...(prev.values || []), newValue.trim()]
      }))
      setNewValue('')
    }
  }

  const removeValue = (index: number) => {
    setFormData(prev => ({
      ...prev,
      values: prev.values?.filter((_, i) => i !== index) || []
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!authProfile?.id) return

    setSaving(true)
    setMessage(null)

    try {
      // Use organizations API endpoint
      const response = await fetch('/api/organizations', {
        method: 'PATCH',
        credentials: 'include', // Include cookies for authentication
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update company profile')
      }

      const data = await response.json()
      setProfile(data)
      setMessage({ type: 'success', text: 'Company profile updated successfully' })
    } catch (error) {
      console.error('Error updating profile:', error)
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Failed to update company profile' 
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading company profile...</p>
        </div>
      </div>
    )
  }

  if (!['CEO', 'Admin'].includes(userRole || '')) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <Card className="bg-gray-900/50 backdrop-blur-sm border border-white/10 max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
            <p className="text-gray-400 mb-4">Only CEO and Admin can access company profile settings.</p>
            <Link href="/dashboard">
              <Button className="bg-primary hover:bg-primary/80 transition-colors">
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
    <ProtectedRoute requiredRole={['CEO', 'Admin']}>
      <>
        <style dangerouslySetInnerHTML={{ __html: theme ? generateThemeCSS(theme) : '' }} />
        
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        {/* Header */}
        <header className="bg-gray-900/50 backdrop-blur-sm border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Link href="/dashboard">
                  <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white hover:bg-white/10">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                </Link>
                <div>
                  <h1 className="text-3xl font-bold text-white">
                    Company Profile
                  </h1>
                  <p className="text-gray-400 mt-1">
                    Manage your organization's information and settings
                  </p>
                </div>
              </div>
              <Badge className="bg-primary/20 border-primary/30 text-primary">
                {userRole} Access
              </Badge>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {message && (
            <Alert className={`mb-6 backdrop-blur-sm ${
              message.type === 'success' 
                ? 'bg-green-500/10 border-green-500/30 text-green-400' 
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}>
              {message.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Company Branding */}
            <Card className="bg-gray-900/50 backdrop-blur-sm border border-white/10">
              <CardHeader>
                <CardTitle className="text-xl text-white flex items-center">
                  <ImageIcon className="h-5 w-5 mr-2 text-primary" />
                  Company Branding
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Upload your company logo and cover image
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Logo Upload */}
                  <div className="space-y-4">
                    <Label className="text-gray-300">Company Logo</Label>
                    <div className="flex justify-center">
                      <div className="relative">
                        <div className="w-32 h-32 rounded-lg bg-gray-800/50 flex items-center justify-center overflow-hidden border border-gray-700">
                          {formData.logo_url ? (
                            <img 
                              src={formData.logo_url} 
                              alt="Company Logo" 
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <Building2 className="h-16 w-16 text-gray-500" />
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setUploadType('logo')
                            fileInputRef.current?.click()
                          }}
                          disabled={uploading}
                          className="absolute bottom-0 right-0 p-2 bg-primary rounded-full text-white hover:bg-primary/80 transition-colors disabled:opacity-50"
                        >
                          {uploading && uploadType === 'logo' ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Cover Image Upload */}
                  <div className="space-y-4">
                    <Label className="text-gray-300">Cover Image</Label>
                    <div className="relative">
                      <div className="w-full h-32 rounded-lg bg-gray-800/50 flex items-center justify-center overflow-hidden border border-gray-700">
                        {formData.cover_image_url ? (
                          <img 
                            src={formData.cover_image_url} 
                            alt="Cover Image" 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Camera className="h-16 w-16 text-gray-500" />
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setUploadType('cover')
                          fileInputRef.current?.click()
                        }}
                        disabled={uploading}
                        className="absolute bottom-2 right-2 p-2 bg-primary rounded-full text-white hover:bg-primary/80 transition-colors disabled:opacity-50"
                      >
                        {uploading && uploadType === 'cover' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </CardContent>
            </Card>

            {/* Basic Information */}
            <Card className="bg-gray-900/50 backdrop-blur-sm border border-white/10">
              <CardHeader>
                <CardTitle className="text-xl text-white flex items-center">
                  <Building2 className="h-5 w-5 mr-2 text-primary" />
                  Basic Information
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Essential company details and contact information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Company Name */}
                  <div className="space-y-2">
                    <Label htmlFor="company_name" className="text-gray-300">
                      Company Name *
                    </Label>
                    <Input
                      id="company_name"
                      type="text"
                      value={formData.company_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                      className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-primary/50"
                      placeholder="Enter company name"
                      required
                    />
                  </div>

                  {/* Industry */}
                  <div className="space-y-2">
                    <Label htmlFor="industry" className="text-gray-300">
                      Industry
                    </Label>
                    <Input
                      id="industry"
                      type="text"
                      value={formData.industry}
                      onChange={(e) => setFormData(prev => ({ ...prev, industry: e.target.value }))}
                      className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-primary/50"
                      placeholder="Enter industry"
                    />
                  </div>

                  {/* Website */}
                  <div className="space-y-2">
                    <Label htmlFor="website" className="text-gray-300 flex items-center">
                      <Globe className="h-4 w-4 mr-2" />
                      Website
                    </Label>
                    <Input
                      id="website"
                      type="url"
                      value={formData.website}
                      onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                      className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-primary/50"
                      placeholder="https://company.com"
                    />
                  </div>

                  {/* Phone */}
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-gray-300 flex items-center">
                      <Phone className="h-4 w-4 mr-2" />
                      Phone
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-primary/50"
                      placeholder="Enter phone number"
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-gray-300 flex items-center">
                      <Mail className="h-4 w-4 mr-2" />
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-primary/50"
                      placeholder="contact@company.com"
                    />
                  </div>

                  {/* Address */}
                  <div className="space-y-2">
                    <Label htmlFor="address" className="text-gray-300 flex items-center">
                      <MapPin className="h-4 w-4 mr-2" />
                      Address
                    </Label>
                    <Input
                      id="address"
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                      className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-primary/50"
                      placeholder="Enter company address"
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-gray-300 flex items-center">
                    <FileText className="h-4 w-4 mr-2" />
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-primary/50 min-h-[100px]"
                    placeholder="Describe your company..."
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Mission, Vision & Values */}
            <Card className="bg-gray-900/50 backdrop-blur-sm border border-white/10">
              <CardHeader>
                <CardTitle className="text-xl text-white flex items-center">
                  <Target className="h-5 w-5 mr-2 text-primary" />
                  Mission, Vision & Values
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Define your company's purpose and core principles
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Mission */}
                <div className="space-y-2">
                  <Label htmlFor="mission" className="text-gray-300 flex items-center">
                    <Target className="h-4 w-4 mr-2" />
                    Mission Statement
                  </Label>
                  <Textarea
                    id="mission"
                    value={formData.mission}
                    onChange={(e) => setFormData(prev => ({ ...prev, mission: e.target.value }))}
                    className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-primary/50"
                    placeholder="What is your company's mission?"
                    rows={3}
                  />
                </div>

                {/* Vision */}
                <div className="space-y-2">
                  <Label htmlFor="vision" className="text-gray-300 flex items-center">
                    <Eye className="h-4 w-4 mr-2" />
                    Vision Statement
                  </Label>
                  <Textarea
                    id="vision"
                    value={formData.vision}
                    onChange={(e) => setFormData(prev => ({ ...prev, vision: e.target.value }))}
                    className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-primary/50"
                    placeholder="What is your company's vision for the future?"
                    rows={3}
                  />
                </div>

                {/* Values */}
                <div className="space-y-4">
                  <Label className="text-gray-300 flex items-center">
                    <Heart className="h-4 w-4 mr-2" />
                    Company Values
                  </Label>
                  
                  {/* Values List */}
                  <div className="flex flex-wrap gap-2">
                    {formData.values?.map((value, index) => (
                      <Badge 
                        key={index}
                        className="bg-primary/20 border-primary/30 text-primary flex items-center gap-2"
                      >
                        {value}
                        <button
                          type="button"
                          onClick={() => removeValue(index)}
                          className="hover:text-red-400 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>

                  {/* Add Value */}
                  <div className="flex gap-2">
                    <Input
                      value={newValue}
                      onChange={(e) => setNewValue(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addValue())}
                      className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-primary/50"
                      placeholder="Enter a company value"
                    />
                    <Button
                      type="button"
                      onClick={addValue}
                      disabled={!newValue.trim()}
                      variant="outline"
                      className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white shrink-0 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={saving}
                className="bg-primary hover:bg-primary/80 text-white px-8 py-3 transition-colors"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Saving Changes...
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5 mr-2" />
                    Save Company Profile
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
      </>
    </ProtectedRoute>
  )
}