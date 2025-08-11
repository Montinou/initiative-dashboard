'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
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

// Mock organization data
const defaultOrgSettings = {
  basic: {
    name: 'TechCorp Inc.',
    description: 'Leading technology solutions provider',
    website: 'https://techcorp.com',
    subdomain: 'techcorp',
    industry: 'Technology',
    size: '50-200',
    timezone: 'America/New_York',
    logo_url: null
  },
  branding: {
    primary_color: '#3B82F6',
    secondary_color: '#8B5CF6',
    logo_url: null,
    favicon_url: null,
    custom_css: ''
  },
  quarters: [
    { id: 'q1-2024', name: 'Q1 2024', start_date: '2024-01-01', end_date: '2024-03-31', is_active: true },
    { id: 'q2-2024', name: 'Q2 2024', start_date: '2024-04-01', end_date: '2024-06-30', is_active: false },
    { id: 'q3-2024', name: 'Q3 2024', start_date: '2024-07-01', end_date: '2024-09-30', is_active: false },
    { id: 'q4-2024', name: 'Q4 2024', start_date: '2024-10-01', end_date: '2024-12-31', is_active: false }
  ],
  notifications: {
    email_notifications: true,
    weekly_reports: true,
    overdue_alerts: true,
    milestone_celebrations: true,
    system_updates: false
  },
  security: {
    two_factor_required: false,
    session_timeout: 480, // minutes
    password_policy: 'strong',
    login_attempts: 5,
    data_retention_days: 365
  },
  advanced: {
    auto_backup: true,
    backup_frequency: 'daily',
    audit_logging: true,
    api_access: false,
    custom_integrations: false
  }
}

export default function OrganizationSettingsPage() {
  const [activeTab, setActiveTab] = useState('basic')
  const [hasChanges, setHasChanges] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [orgSettings, setOrgSettings] = useState(defaultOrgSettings)

  const handleSave = async () => {
    setIsLoading(true)
    try {
      // TODO: Implement actual API call
      console.log('Saving organization settings:', orgSettings)
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API call
      setHasChanges(false)
    } catch (error) {
      console.error('Error saving settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (section: string, field: string, value: any) => {
    setOrgSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof typeof prev],
        [field]: value
      }
    }))
    setHasChanges(true)
  }

  const handleQuarterChange = (quarterId: string, field: string, value: any) => {
    setOrgSettings(prev => ({
      ...prev,
      quarters: prev.quarters.map(q => 
        q.id === quarterId ? { ...q, [field]: value } : q
      )
    }))
    setHasChanges(true)
  }

  const addNewQuarter = () => {
    const newQuarter = {
      id: `q${orgSettings.quarters.length + 1}-2024`,
      name: `Q${orgSettings.quarters.length + 1} 2024`,
      start_date: '',
      end_date: '',
      is_active: false
    }
    setOrgSettings(prev => ({
      ...prev,
      quarters: [...prev.quarters, newQuarter]
    }))
    setHasChanges(true)
  }

  const exportSettings = () => {
    const dataStr = JSON.stringify(orgSettings, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'organization-settings.json'
    link.click()
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
            disabled={!hasChanges || isLoading}
            className="flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
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
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 bg-gray-800">
          <TabsTrigger value="basic" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Basic</span>
          </TabsTrigger>
          <TabsTrigger value="branding" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Branding</span>
          </TabsTrigger>
          <TabsTrigger value="quarters" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Quarters</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notifications</span>
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
                    value={orgSettings.basic.name}
                    onChange={(e) => handleInputChange('basic', 'name', e.target.value)}
                    className="mt-1 bg-gray-800 border-gray-600 text-white"
                  />
                </div>
                
                <div>
                  <Label className="text-white">Subdomain *</Label>
                  <div className="mt-1 flex">
                    <Input
                      value={orgSettings.basic.subdomain}
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
                    value={orgSettings.basic.website}
                    onChange={(e) => handleInputChange('basic', 'website', e.target.value)}
                    placeholder="https://yourcompany.com"
                    className="mt-1 bg-gray-800 border-gray-600 text-white"
                  />
                </div>

                <div>
                  <Label className="text-white">Industry</Label>
                  <Select
                    value={orgSettings.basic.industry}
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
                    value={orgSettings.basic.size}
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
                    value={orgSettings.basic.timezone}
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
                  value={orgSettings.basic.description}
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
                      value={orgSettings.branding.primary_color}
                      onChange={(e) => handleInputChange('branding', 'primary_color', e.target.value)}
                      className="w-12 h-10 rounded border border-gray-600 bg-gray-800"
                    />
                    <Input
                      value={orgSettings.branding.primary_color}
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
                      value={orgSettings.branding.secondary_color}
                      onChange={(e) => handleInputChange('branding', 'secondary_color', e.target.value)}
                      className="w-12 h-10 rounded border border-gray-600 bg-gray-800"
                    />
                    <Input
                      value={orgSettings.branding.secondary_color}
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
                  value={orgSettings.branding.custom_css}
                  onChange={(e) => handleInputChange('branding', 'custom_css', e.target.value)}
                  placeholder="/* Your custom CSS here */"
                  className="mt-1 bg-gray-800 border-gray-600 text-white font-mono"
                  rows={6}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quarters Management */}
        <TabsContent value="quarters">
          <Card className="bg-gray-900/50 backdrop-blur-sm border border-white/10">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Quarters & Periods
                </CardTitle>
                <Button onClick={addNewQuarter} size="sm" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Add Quarter
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {orgSettings.quarters.map((quarter) => (
                  <div key={quarter.id} className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                      <div>
                        <Label className="text-white">Quarter Name</Label>
                        <Input
                          value={quarter.name}
                          onChange={(e) => handleQuarterChange(quarter.id, 'name', e.target.value)}
                          className="mt-1 bg-gray-700 border-gray-600 text-white"
                        />
                      </div>
                      
                      <div>
                        <Label className="text-white">Start Date</Label>
                        <Input
                          type="date"
                          value={quarter.start_date}
                          onChange={(e) => handleQuarterChange(quarter.id, 'start_date', e.target.value)}
                          className="mt-1 bg-gray-700 border-gray-600 text-white"
                        />
                      </div>
                      
                      <div>
                        <Label className="text-white">End Date</Label>
                        <Input
                          type="date"
                          value={quarter.end_date}
                          onChange={(e) => handleQuarterChange(quarter.id, 'end_date', e.target.value)}
                          className="mt-1 bg-gray-700 border-gray-600 text-white"
                        />
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={quarter.is_active}
                            onCheckedChange={(checked) => handleQuarterChange(quarter.id, 'is_active', checked)}
                          />
                          <Label className="text-white text-sm">Active</Label>
                        </div>
                        <Button variant="outline" size="sm" className="text-red-400">
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

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
              {Object.entries(orgSettings.notifications).map(([key, value]) => (
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
                  checked={orgSettings.security.two_factor_required}
                  onCheckedChange={(checked) => handleInputChange('security', 'two_factor_required', checked)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-white">Session Timeout (minutes)</Label>
                  <Input
                    type="number"
                    value={orgSettings.security.session_timeout}
                    onChange={(e) => handleInputChange('security', 'session_timeout', parseInt(e.target.value))}
                    className="mt-1 bg-gray-800 border-gray-600 text-white"
                  />
                </div>

                <div>
                  <Label className="text-white">Max Login Attempts</Label>
                  <Input
                    type="number"
                    value={orgSettings.security.login_attempts}
                    onChange={(e) => handleInputChange('security', 'login_attempts', parseInt(e.target.value))}
                    className="mt-1 bg-gray-800 border-gray-600 text-white"
                  />
                </div>

                <div>
                  <Label className="text-white">Password Policy</Label>
                  <Select
                    value={orgSettings.security.password_policy}
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
                    value={orgSettings.security.data_retention_days}
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
                  checked={orgSettings.advanced.auto_backup}
                  onCheckedChange={(checked) => handleInputChange('advanced', 'auto_backup', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-medium">Audit Logging</div>
                  <div className="text-sm text-gray-400">Log all administrative actions</div>
                </div>
                <Switch
                  checked={orgSettings.advanced.audit_logging}
                  onCheckedChange={(checked) => handleInputChange('advanced', 'audit_logging', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-medium">API Access</div>
                  <div className="text-sm text-gray-400">Enable external API access</div>
                </div>
                <Switch
                  checked={orgSettings.advanced.api_access}
                  onCheckedChange={(checked) => handleInputChange('advanced', 'api_access', checked)}
                />
              </div>

              <div>
                <Label className="text-white">Backup Frequency</Label>
                <Select
                  value={orgSettings.advanced.backup_frequency}
                  onValueChange={(value) => handleInputChange('advanced', 'backup_frequency', value)}
                  disabled={!orgSettings.advanced.auto_backup}
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