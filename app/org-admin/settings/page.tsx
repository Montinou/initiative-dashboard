'use client'

import React, { useState } from 'react'
import { useOrganizationSettings } from '@/hooks/useOrganizationSettings'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/use-toast'
import { 
  Settings, 
  Building2, 
  Palette, 
  Bell, 
  Calendar,
  Shield,
  Download,
  Upload,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// Real data from hooks

export default function OrganizationSettingsPage() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('basic')
  const [hasChanges, setHasChanges] = useState(false)
  const [localSettings, setLocalSettings] = useState<any>(null)
  
  // Fetch real organization settings
  const { settings, error, isLoading, updateSettings } = useOrganizationSettings()
  
  // Initialize local settings when data loads
  React.useEffect(() => {
    if (settings && !localSettings) {
      setLocalSettings(settings)
    }
  }, [settings, localSettings])

  const handleSave = async () => {
    if (!localSettings) return
    
    try {
      await updateSettings(localSettings)
      setHasChanges(false)
      toast({
        title: "Settings Saved",
        description: "Your settings have been saved successfully.",
      })
    } catch (error) {
      console.error('Error saving settings:', error)
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleInputChange = (section: string, field: string, value: any) => {
    setLocalSettings((prev: any) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }))
    setHasChanges(true)
  }

  // Quarters management moved to separate page

  const exportSettings = () => {
    if (!localSettings) return
    const dataStr = JSON.stringify(localSettings, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'organization-settings.json'
    link.click()
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mr-4"></div>
          <span className="text-white text-lg">Loading settings...</span>
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center h-64">
          <div className="text-red-400 text-lg mb-4">Error loading settings</div>
          <div className="text-gray-400 mb-4">{error.message}</div>
          <Button onClick={() => window.location.reload()} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    )
  }

  if (!localSettings) {
    return <div className="space-y-6">No settings data available</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Organization Settings</h1>
          <p className="text-gray-400 mt-2">
            Configure your organization's settings, branding, and operational parameters
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportSettings} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export Settings
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!hasChanges}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </div>

      {/* Changes Alert */}
      {hasChanges && (
        <Alert className="bg-yellow-500/10 border-yellow-500/20">
          <AlertTriangle className="h-4 w-4 text-yellow-400" />
          <AlertDescription className="text-yellow-200">
            You have unsaved changes. Don't forget to save your configuration.
          </AlertDescription>
        </Alert>
      )}

      {/* Settings Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 bg-gray-800">
          <TabsTrigger value="basic" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Basic</span>
          </TabsTrigger>
          <TabsTrigger value="branding" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Branding</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Advanced</span>
          </TabsTrigger>
        </TabsList>

        {/* Basic Information */}
        <TabsContent value="basic">
          <Card className="bg-gray-900/50 backdrop-blur-sm border border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Organization Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-white">Organization Name *</Label>
                  <Input
                    value={localSettings.basic?.name || ''}
                    onChange={(e) => handleInputChange('basic', 'name', e.target.value)}
                    className="mt-1 bg-gray-800 border-gray-600 text-white"
                  />
                </div>
                
                <div>
                  <Label className="text-white">Subdomain *</Label>
                  <div className="mt-1 flex">
                    <Input
                      value={localSettings.basic?.subdomain || ''}
                      onChange={(e) => handleInputChange('basic', 'subdomain', e.target.value)}
                      className="bg-gray-800 border-gray-600 text-white rounded-r-none"
                    />
                    <div className="bg-gray-700 border border-l-0 border-gray-600 px-3 py-2 rounded-r-md text-gray-400 text-sm">
                      .company.com
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-white">Website</Label>
                  <Input
                    value={localSettings.basic?.website || ''}
                    onChange={(e) => handleInputChange('basic', 'website', e.target.value)}
                    placeholder="https://yourcompany.com"
                    className="mt-1 bg-gray-800 border-gray-600 text-white"
                  />
                </div>

                <div>
                  <Label className="text-white">Industry</Label>
                  <Select
                    value={localSettings.basic?.industry || ''}
                    onValueChange={(value) => handleInputChange('basic', 'industry', value)}
                  >
                    <SelectTrigger className="mt-1 bg-gray-800 border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      <SelectItem value="Technology">Technology</SelectItem>
                      <SelectItem value="Finance">Finance</SelectItem>
                      <SelectItem value="Healthcare">Healthcare</SelectItem>
                      <SelectItem value="Education">Education</SelectItem>
                      <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-white">Company Size</Label>
                  <Select
                    value={localSettings.basic?.size || ''}
                    onValueChange={(value) => handleInputChange('basic', 'size', value)}
                  >
                    <SelectTrigger className="mt-1 bg-gray-800 border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      <SelectItem value="1-10">1-10 employees</SelectItem>
                      <SelectItem value="11-50">11-50 employees</SelectItem>
                      <SelectItem value="51-200">51-200 employees</SelectItem>
                      <SelectItem value="201-500">201-500 employees</SelectItem>
                      <SelectItem value="500+">500+ employees</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-white">Timezone</Label>
                  <Select
                    value={localSettings.basic?.timezone || ''}
                    onValueChange={(value) => handleInputChange('basic', 'timezone', value)}
                  >
                    <SelectTrigger className="mt-1 bg-gray-800 border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      <SelectItem value="America/New_York">Eastern Time</SelectItem>
                      <SelectItem value="America/Chicago">Central Time</SelectItem>
                      <SelectItem value="America/Denver">Mountain Time</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                      <SelectItem value="Europe/London">London</SelectItem>
                      <SelectItem value="Europe/Berlin">Berlin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-white">Description</Label>
                <Textarea
                  value={localSettings.basic?.description || ''}
                  onChange={(e) => handleInputChange('basic', 'description', e.target.value)}
                  placeholder="Brief description of your organization"
                  className="mt-1 bg-gray-800 border-gray-600 text-white"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Branding */}
        <TabsContent value="branding">
          <Card className="bg-gray-900/50 backdrop-blur-sm border border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Brand Customization
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-white">Primary Color</Label>
                  <div className="mt-1 flex gap-2">
                    <input
                      type="color"
                      value={localSettings.branding?.primary_color || '#3B82F6'}
                      onChange={(e) => handleInputChange('branding', 'primary_color', e.target.value)}
                      className="w-12 h-10 rounded border border-gray-600 bg-gray-800"
                    />
                    <Input
                      value={localSettings.branding?.primary_color || '#3B82F6'}
                      onChange={(e) => handleInputChange('branding', 'primary_color', e.target.value)}
                      className="bg-gray-800 border-gray-600 text-white"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-white">Secondary Color</Label>
                  <div className="mt-1 flex gap-2">
                    <input
                      type="color"
                      value={localSettings.branding?.secondary_color || '#8B5CF6'}
                      onChange={(e) => handleInputChange('branding', 'secondary_color', e.target.value)}
                      className="w-12 h-10 rounded border border-gray-600 bg-gray-800"
                    />
                    <Input
                      value={localSettings.branding?.secondary_color || '#8B5CF6'}
                      onChange={(e) => handleInputChange('branding', 'secondary_color', e.target.value)}
                      className="bg-gray-800 border-gray-600 text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-white">Company Logo</Label>
                  <div className="mt-1 border-2 border-dashed border-gray-600 rounded-lg p-6 text-center">
                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <div className="text-sm text-gray-400 mb-2">
                      Upload your company logo
                    </div>
                    <Button variant="outline" size="sm">
                      Choose File
                    </Button>
                  </div>
                </div>

                <div>
                  <Label className="text-white">Favicon</Label>
                  <div className="mt-1 border-2 border-dashed border-gray-600 rounded-lg p-6 text-center">
                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <div className="text-sm text-gray-400 mb-2">
                      Upload favicon (16x16 or 32x32)
                    </div>
                    <Button variant="outline" size="sm">
                      Choose File
                    </Button>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-white">Custom CSS</Label>
                <p className="text-sm text-gray-400 mb-2">
                  Advanced: Add custom CSS to override default styles
                </p>
                <Textarea
                  value={localSettings.branding?.custom_css || ''}
                  onChange={(e) => handleInputChange('branding', 'custom_css', e.target.value)}
                  placeholder="/* Your custom CSS here */"
                  className="mt-1 bg-gray-800 border-gray-600 text-white font-mono"
                  rows={6}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quarters Management - Removed as requested */}

        {/* Notifications */}
        <TabsContent value="notifications">
          <Card className="bg-gray-900/50 backdrop-blur-sm border border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries(localSettings.notifications || {}).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <div>
                    <div className="text-white font-medium">
                      {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </div>
                    <div className="text-sm text-gray-400">
                      {key === 'email_notifications' && 'Receive email notifications for important updates'}
                      {key === 'weekly_reports' && 'Get weekly progress reports delivered to your inbox'}
                      {key === 'overdue_alerts' && 'Receive alerts when objectives become overdue'}
                      {key === 'milestone_celebrations' && 'Get notified when milestones are achieved'}
                      {key === 'system_updates' && 'Receive notifications about system updates'}
                    </div>
                  </div>
                  <Switch
                    checked={value}
                    onCheckedChange={(checked) => handleInputChange('notifications', key, checked)}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security">
          <Card className="bg-gray-900/50 backdrop-blur-sm border border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-medium">Two-Factor Authentication</div>
                  <div className="text-sm text-gray-400">Require 2FA for all users</div>
                </div>
                <Switch
                  checked={localSettings.security?.two_factor_required || false}
                  onCheckedChange={(checked) => handleInputChange('security', 'two_factor_required', checked)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-white">Session Timeout (minutes)</Label>
                  <Input
                    type="number"
                    value={localSettings.security?.session_timeout || 60}
                    onChange={(e) => handleInputChange('security', 'session_timeout', parseInt(e.target.value))}
                    className="mt-1 bg-gray-800 border-gray-600 text-white"
                  />
                </div>

                <div>
                  <Label className="text-white">Max Login Attempts</Label>
                  <Input
                    type="number"
                    value={localSettings.security?.login_attempts || 5}
                    onChange={(e) => handleInputChange('security', 'login_attempts', parseInt(e.target.value))}
                    className="mt-1 bg-gray-800 border-gray-600 text-white"
                  />
                </div>

                <div>
                  <Label className="text-white">Password Policy</Label>
                  <Select
                    value={localSettings.security?.password_policy || 'basic'}
                    onValueChange={(value) => handleInputChange('security', 'password_policy', value)}
                  >
                    <SelectTrigger className="mt-1 bg-gray-800 border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      <SelectItem value="basic">Basic (8+ characters)</SelectItem>
                      <SelectItem value="strong">Strong (12+ chars, mixed case, numbers)</SelectItem>
                      <SelectItem value="complex">Complex (16+ chars, symbols required)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-white">Data Retention (days)</Label>
                  <Input
                    type="number"
                    value={localSettings.security?.data_retention_days || 90}
                    onChange={(e) => handleInputChange('security', 'data_retention_days', parseInt(e.target.value))}
                    className="mt-1 bg-gray-800 border-gray-600 text-white"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced */}
        <TabsContent value="advanced">
          <Card className="bg-gray-900/50 backdrop-blur-sm border border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Advanced Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-medium">Automatic Backups</div>
                  <div className="text-sm text-gray-400">Enable automatic data backups</div>
                </div>
                <Switch
                  checked={localSettings.advanced?.auto_backup || false}
                  onCheckedChange={(checked) => handleInputChange('advanced', 'auto_backup', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-medium">Audit Logging</div>
                  <div className="text-sm text-gray-400">Log all administrative actions</div>
                </div>
                <Switch
                  checked={localSettings.advanced?.audit_logging || false}
                  onCheckedChange={(checked) => handleInputChange('advanced', 'audit_logging', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-medium">API Access</div>
                  <div className="text-sm text-gray-400">Enable external API access</div>
                </div>
                <Switch
                  checked={localSettings.advanced?.api_access || false}
                  onCheckedChange={(checked) => handleInputChange('advanced', 'api_access', checked)}
                />
              </div>

              <div>
                <Label className="text-white">Backup Frequency</Label>
                <Select
                  value={localSettings.advanced?.backup_frequency || 'daily'}
                  onValueChange={(value) => handleInputChange('advanced', 'backup_frequency', value)}
                  disabled={!localSettings.advanced?.auto_backup}
                >
                  <SelectTrigger className="mt-1 bg-gray-800 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-6 border-t border-gray-700">
                <h4 className="text-white font-medium mb-4">Danger Zone</h4>
                <div className="space-y-4">
                  <Button variant="outline" className="text-red-400 border-red-400 hover:bg-red-500/10">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reset All Settings
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}