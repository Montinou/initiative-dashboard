'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  UserPlus, 
  Building2, 
  Mail,
  Upload,
  FileText,
  CheckCircle,
  AlertTriangle,
  Calendar
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

// Form validation schemas
const singleInviteSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['CEO', 'Admin', 'Manager']),
  area_id: z.string().optional(),
  custom_message: z.string().max(500, 'Message too long').optional(),
  expires_in_days: z.number().min(1).max(30).default(30)
})

const bulkInviteSchema = z.object({
  emails: z.string().min(1, 'At least one email is required'),
  role: z.enum(['CEO', 'Admin', 'Manager']),
  area_id: z.string().optional(),
  custom_message: z.string().max(500, 'Message too long').optional(),
  expires_in_days: z.number().min(1).max(30).default(30)
})

type SingleInviteData = z.infer<typeof singleInviteSchema>
type BulkInviteData = z.infer<typeof bulkInviteSchema>

interface InvitationFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: SingleInviteData | BulkInviteData & { emailList: string[] }) => Promise<void>
  mode: 'single' | 'bulk'
}

// Mock data - will be replaced with real API calls
const mockAreas = [
  { id: '1', name: 'Sales & Marketing', is_active: true },
  { id: '2', name: 'Technology', is_active: true },
  { id: '3', name: 'Finance', is_active: true },
  { id: '4', name: 'Human Resources', is_active: true },
  { id: '5', name: 'Operations', is_active: true }
]

const messageTemplates = {
  welcome: "Welcome to our team! We're excited to have you join us and look forward to working together.",
  role_specific: {
    CEO: "We're thrilled to invite you to join our executive leadership team.",
    Admin: "You're invited to join our administrative team and help shape our organization.",
    Manager: "Join our management team and help drive our initiatives forward."
  },
  area_specific: {
    'Sales & Marketing': "Join our dynamic Sales & Marketing team and help drive growth.",
    'Technology': "Be part of our innovative Technology team building the future.",
    'Finance': "Join our Finance team and help manage our financial success.",
    'Human Resources': "Help us build an amazing workplace culture in our HR team.",
    'Operations': "Join our Operations team and optimize our processes."
  }
}

export function InvitationFormModal({ isOpen, onClose, onSave, mode }: InvitationFormModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [emailList, setEmailList] = useState<string[]>([])
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [previewData, setPreviewData] = useState<any>(null)

  const schema = mode === 'single' ? singleInviteSchema : bulkInviteSchema

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
    getValues
  } = useForm<SingleInviteData | BulkInviteData>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
      emails: '',
      role: 'Manager',
      area_id: '',
      custom_message: '',
      expires_in_days: 30
    }
  })

  const watchedRole = watch('role')
  const watchedAreaId = watch('area_id')
  const watchedEmails = mode === 'bulk' ? watch('emails' as keyof BulkInviteData) : ''

  // Parse email list for bulk mode
  useEffect(() => {
    if (mode === 'bulk' && watchedEmails) {
      const emails = (watchedEmails as string)
        .split(/[,\n]/)
        .map(email => email.trim())
        .filter(email => email && email.includes('@'))
      setEmailList(emails)
    }
  }, [mode, watchedEmails])

  // Auto-populate message template
  const handleUseTemplate = (templateType: string) => {
    let message = ''
    
    if (templateType === 'welcome') {
      message = messageTemplates.welcome
    } else if (templateType === 'role' && watchedRole) {
      message = messageTemplates.role_specific[watchedRole]
    } else if (templateType === 'area' && watchedAreaId) {
      const area = mockAreas.find(a => a.id === watchedAreaId)
      if (area) {
        message = messageTemplates.area_specific[area.name as keyof typeof messageTemplates.area_specific] || ''
      }
    }
    
    setValue('custom_message' as any, message)
  }

  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type === 'text/csv') {
      setCsvFile(file)
      
      // Parse CSV file
      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target?.result as string
        const lines = text.split('\n').filter(line => line.trim())
        const emails = lines
          .map(line => line.split(',')[0]?.trim())
          .filter(email => email && email.includes('@'))
        
        setValue('emails' as keyof BulkInviteData, emails.join('\n'))
        setPreviewData({
          totalEmails: emails.length,
          validEmails: emails.filter(email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)).length
        })
      }
      reader.readAsText(file)
    }
  }

  const onSubmit = async (data: SingleInviteData | BulkInviteData) => {
    try {
      setIsSubmitting(true)
      
      if (mode === 'bulk') {
        await onSave({ ...data, emailList } as BulkInviteData & { emailList: string[] })
      } else {
        await onSave(data as SingleInviteData)
      }
      
      onClose()
      reset()
      setEmailList([])
      setCsvFile(null)
      setPreviewData(null)
    } catch (error) {
      console.error('Error sending invitation:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      onClose()
      reset()
      setEmailList([])
      setCsvFile(null)
      setPreviewData(null)
    }
  }

  const selectedArea = mockAreas.find(a => a.id === watchedAreaId)
  const expiryDate = new Date()
  expiryDate.setDate(expiryDate.getDate() + (getValues('expires_in_days') || 30))

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-3xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            {mode === 'single' ? 'Send Invitation' : 'Bulk Invite Users'}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {mode === 'single' 
              ? 'Invite a new user to join your organization'
              : 'Send invitations to multiple users at once'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 overflow-y-auto max-h-[60vh]">
          {mode === 'single' ? (
            /* Single Invitation Form */
            <div className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-white">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email' as keyof SingleInviteData)}
                  placeholder="user@example.com"
                  className="mt-1 bg-gray-800 border-gray-600 text-white"
                />
                {errors.email && (
                  <p className="text-red-400 text-sm mt-1">{errors.email.message}</p>
                )}
              </div>
            </div>
          ) : (
            /* Bulk Invitation Form */
            <Tabs defaultValue="manual" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-gray-800">
                <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                <TabsTrigger value="csv">CSV Upload</TabsTrigger>
              </TabsList>
              
              <TabsContent value="manual" className="space-y-4">
                <div>
                  <Label htmlFor="emails" className="text-white">Email Addresses *</Label>
                  <p className="text-sm text-gray-400 mb-2">
                    Enter email addresses separated by commas or new lines
                  </p>
                  <Textarea
                    id="emails"
                    {...register('emails' as keyof BulkInviteData)}
                    placeholder="user1@example.com&#10;user2@example.com&#10;user3@example.com"
                    className="mt-1 bg-gray-800 border-gray-600 text-white h-32"
                  />
                  {errors.emails && (
                    <p className="text-red-400 text-sm mt-1">{errors.emails.message}</p>
                  )}
                  {emailList.length > 0 && (
                    <div className="mt-2 p-2 bg-blue-500/10 border border-blue-500/20 rounded">
                      <p className="text-sm text-blue-400">
                        {emailList.length} valid email{emailList.length !== 1 ? 's' : ''} detected
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="csv" className="space-y-4">
                <div>
                  <Label className="text-white">Upload CSV File</Label>
                  <p className="text-sm text-gray-400 mb-2">
                    Upload a CSV file with email addresses in the first column
                  </p>
                  <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center">
                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <div className="text-sm text-gray-400 mb-2">
                      Drag and drop your CSV file here, or click to browse
                    </div>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleCsvUpload}
                      className="hidden"
                      id="csv-upload"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('csv-upload')?.click()}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Choose File
                    </Button>
                  </div>
                  
                  {csvFile && previewData && (
                    <div className="mt-2 p-3 bg-green-500/10 border border-green-500/20 rounded">
                      <div className="flex items-center gap-2 text-green-400 mb-1">
                        <CheckCircle className="h-4 w-4" />
                        <span className="font-medium">File processed: {csvFile.name}</span>
                      </div>
                      <p className="text-sm text-gray-400">
                        Found {previewData.validEmails} valid emails out of {previewData.totalEmails} entries
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}

          {/* Common Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-white">Role *</Label>
              <Select 
                value={getValues('role')} 
                onValueChange={(value) => setValue('role', value as any)}
              >
                <SelectTrigger className="mt-1 bg-gray-800 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="Manager" className="text-white">Manager</SelectItem>
                  <SelectItem value="Admin" className="text-white">Admin</SelectItem>
                  <SelectItem value="CEO" className="text-white">CEO</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-white">Area Assignment</Label>
              <Select 
                value={getValues('area_id') || ''} 
                onValueChange={(value) => setValue('area_id', value)}
              >
                <SelectTrigger className="mt-1 bg-gray-800 border-gray-600 text-white">
                  <SelectValue placeholder="Select area (optional)" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="" className="text-white">No area assigned</SelectItem>
                  {mockAreas.filter(a => a.is_active).map((area) => (
                    <SelectItem key={area.id} value={area.id} className="text-white">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        {area.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Expiration */}
          <div>
            <Label className="text-white">Invitation Expires</Label>
            <div className="flex items-center gap-4 mt-2">
              <Select 
                value={getValues('expires_in_days')?.toString() || '30'} 
                onValueChange={(value) => setValue('expires_in_days', parseInt(value))}
              >
                <SelectTrigger className="w-32 bg-gray-800 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                </SelectContent>
              </Select>
              <div className="text-sm text-gray-400 flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Expires on {expiryDate.toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* Custom Message */}
          <div>
            <Label className="text-white">Custom Message</Label>
            <div className="flex gap-2 mt-1 mb-2">
              <Button 
                type="button" 
                size="sm" 
                variant="outline"
                onClick={() => handleUseTemplate('welcome')}
              >
                Welcome
              </Button>
              <Button 
                type="button" 
                size="sm" 
                variant="outline"
                onClick={() => handleUseTemplate('role')}
                disabled={!watchedRole}
              >
                Role-based
              </Button>
              <Button 
                type="button" 
                size="sm" 
                variant="outline"
                onClick={() => handleUseTemplate('area')}
                disabled={!watchedAreaId}
              >
                Area-based
              </Button>
            </div>
            <Textarea
              {...register('custom_message')}
              placeholder="Add a personal message to your invitation (optional)"
              className="bg-gray-800 border-gray-600 text-white"
              rows={4}
            />
            {errors.custom_message && (
              <p className="text-red-400 text-sm mt-1">{errors.custom_message.message}</p>
            )}
          </div>

          {/* Preview */}
          {selectedArea && (
            <Alert className="bg-blue-500/10 border-blue-500/20">
              <Building2 className="h-4 w-4 text-blue-400" />
              <AlertDescription className="text-blue-200">
                {mode === 'single' ? 'User' : 'Users'} will be assigned to <strong>{selectedArea.name}</strong> upon accepting the invitation.
              </AlertDescription>
            </Alert>
          )}

          {mode === 'bulk' && emailList.length > 0 && (
            <Alert className="bg-green-500/10 border-green-500/20">
              <CheckCircle className="h-4 w-4 text-green-400" />
              <AlertDescription className="text-green-200">
                Ready to send {emailList.length} invitation{emailList.length !== 1 ? 's' : ''} 
                {watchedRole && ` as ${watchedRole}`}
                {selectedArea && ` to ${selectedArea.name}`}.
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || (mode === 'bulk' && emailList.length === 0)}
              className="min-w-[140px]"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Sending...
                </div>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  {mode === 'single' ? 'Send Invitation' : `Send ${emailList.length} Invitations`}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}