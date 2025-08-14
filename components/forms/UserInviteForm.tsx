"use client"

import * as React from "react"
import { z } from "zod"
import { FormBuilder, FormFieldConfig } from "@/components/blocks/forms/form-builder"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { X, Plus, Mail, Users, UserPlus, Send } from "lucide-react"
import { Area, UserRole } from "@/lib/database.types"

// Zod schemas for validation
const singleInviteSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  role: z.enum(['CEO', 'Admin', 'Manager']),
  area_id: z.string().optional(),
  custom_message: z.string().optional(),
  expires_in_days: z.number().min(1).max(90).default(7),
})

const bulkInviteSchema = z.object({
  emails: z.array(z.string().email()).min(1, "At least one email is required"),
  role: z.enum(['CEO', 'Admin', 'Manager']),
  area_id: z.string().optional(),
  custom_message: z.string().optional(),
  expires_in_days: z.number().min(1).max(90).default(7),
})

type SingleInviteData = z.infer<typeof singleInviteSchema>
type BulkInviteData = z.infer<typeof bulkInviteSchema>

interface UserInviteFormProps {
  mode: 'single' | 'bulk'
  availableAreas?: Area[]
  onSubmit: (data: SingleInviteData | BulkInviteData) => Promise<void>
  onCancel?: () => void
  loading?: boolean
  currentUserRole?: UserRole
}

export function UserInviteForm({
  mode,
  availableAreas = [],
  onSubmit,
  onCancel,
  loading = false,
  currentUserRole = 'Manager',
}: UserInviteFormProps) {
  const [bulkEmails, setBulkEmails] = React.useState<string[]>([''])
  const [emailInput, setEmailInput] = React.useState('')

  // Role options based on current user's role
  const getRoleOptions = () => {
    const baseOptions = [
      { value: 'Manager', label: 'Manager - Can manage their assigned area' },
    ]

    if (currentUserRole === 'CEO') {
      baseOptions.unshift(
        { value: 'CEO', label: 'CEO - Full system access' },
        { value: 'Admin', label: 'Admin - Organization-wide management' }
      )
    } else if (currentUserRole === 'Admin') {
      baseOptions.unshift(
        { value: 'Admin', label: 'Admin - Organization-wide management' }
      )
    }

    return baseOptions
  }

  const commonFields: FormFieldConfig[] = [
    {
      name: "role",
      label: "Role",
      type: "select",
      placeholder: "Select role",
      description: "The role determines what the user can access and modify",
      required: true,
      options: getRoleOptions(),
    },
    {
      name: "area_id",
      label: "Assign to Area",
      type: "select",
      placeholder: "Select area (optional)",
      description: "The area this user will be assigned to manage or work in",
      options: [
        { value: '', label: 'No area assignment' },
        ...availableAreas.map(area => ({
          value: area.id,
          label: area.name,
        })),
      ],
    },
    {
      name: "custom_message",
      label: "Custom Message",
      type: "textarea",
      placeholder: "Welcome to our team! We're excited to have you join us...",
      description: "Personal message to include in the invitation email (optional)",
    },
    {
      name: "expires_in_days",
      label: "Invitation Expires In (Days)",
      type: "number",
      placeholder: "7",
      description: "How many days the invitation link will remain valid",
    },
  ]

  const singleInviteFields: FormFieldConfig[] = [
    {
      name: "email",
      label: "Email Address",
      type: "email",
      placeholder: "user@example.com",
      description: "Email address of the person you want to invite",
      required: true,
    },
    ...commonFields,
  ]

  const addBulkEmail = () => {
    if (emailInput.trim()) {
      setBulkEmails(prev => [...prev, emailInput.trim()])
      setEmailInput('')
    }
  }

  const removeBulkEmail = (index: number) => {
    setBulkEmails(prev => prev.filter((_, i) => i !== index))
  }

  const parseBulkEmails = (text: string) => {
    const emails = text
      .split(/[,;\n\r\t]/)
      .map(email => email.trim())
      .filter(email => email.length > 0)
    
    setBulkEmails(emails)
  }

  const handleSingleSubmit = async (data: SingleInviteData) => {
    await onSubmit(data)
  }

  const handleBulkSubmit = async (data: Omit<BulkInviteData, 'emails'>) => {
    const validEmails = bulkEmails.filter(email => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      return emailRegex.test(email)
    })

    if (validEmails.length === 0) {
      throw new Error("Please add at least one valid email address")
    }

    await onSubmit({
      ...data,
      emails: validEmails,
    })
  }

  const defaultValues = {
    role: 'Manager' as UserRole,
    expires_in_days: 7,
  }

  if (mode === 'single') {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <UserPlus className="h-5 w-5" />
              <span>Invite Team Member</span>
            </CardTitle>
            <CardDescription>
              Send an invitation to join your organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormBuilder
              fields={singleInviteFields}
              schema={singleInviteSchema}
              onSubmit={handleSingleSubmit}
              defaultValues={defaultValues}
              submitLabel={loading ? "Sending Invitation..." : "Send Invitation"}
              isLoading={loading}
            />
          </CardContent>
        </Card>

        <div className="flex items-center justify-end space-x-4">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            form="invite-form"
            disabled={loading}
            className="flex items-center space-x-2"
          >
            <Send className="h-4 w-4" />
            <span>{loading ? "Sending..." : "Send Invitation"}</span>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Bulk Invite Team Members</span>
          </CardTitle>
          <CardDescription>
            Send invitations to multiple team members at once
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Email Collection */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="bulk-emails">Email Addresses</Label>
              <div className="mt-2 space-y-3">
                <div className="flex space-x-2">
                  <Input
                    id="bulk-emails"
                    placeholder="Enter email address"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addBulkEmail()
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addBulkEmail}
                    disabled={!emailInput.trim()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="text-sm text-muted-foreground">
                  Or paste multiple emails separated by commas, semicolons, or new lines:
                </div>
                
                <Textarea
                  placeholder="user1@example.com, user2@example.com&#10;user3@example.com"
                  onChange={(e) => parseBulkEmails(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            {/* Email List */}
            {bulkEmails.length > 0 && (
              <div className="space-y-2">
                <Label>Email List ({bulkEmails.length})</Label>
                <div className="max-h-40 overflow-y-auto space-y-1 p-3 border rounded-md bg-muted/30">
                  {bulkEmails.map((email, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-background rounded border">
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{email}</span>
                        {!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && (
                          <Badge variant="destructive" className="text-xs">Invalid</Badge>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeBulkEmail(index)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Common Settings */}
          <div className="pt-6 border-t">
            <FormBuilder
              fields={commonFields}
              schema={bulkInviteSchema.omit({ emails: true })}
              onSubmit={handleBulkSubmit}
              defaultValues={defaultValues}
              submitLabel={loading ? "Sending Invitations..." : `Send ${bulkEmails.length} Invitations`}
              isLoading={loading}
            />
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      {bulkEmails.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Invitation Preview</CardTitle>
            <CardDescription>
              Summary of invitations that will be sent
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{bulkEmails.length}</p>
                <p className="text-sm text-muted-foreground">Total Invitations</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">
                  {bulkEmails.filter(email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)).length}
                </p>
                <p className="text-sm text-muted-foreground">Valid Emails</p>
              </div>
              <div className="p-4 bg-red-50 rounded-lg">
                <p className="text-2xl font-bold text-red-600">
                  {bulkEmails.filter(email => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)).length}
                </p>
                <p className="text-sm text-muted-foreground">Invalid Emails</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-end space-x-4">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          form="bulk-invite-form"
          disabled={loading || bulkEmails.length === 0}
          className="flex items-center space-x-2"
        >
          <Send className="h-4 w-4" />
          <span>
            {loading 
              ? "Sending..." 
              : `Send ${bulkEmails.filter(email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)).length} Invitations`
            }
          </span>
        </Button>
      </div>
    </div>
  )
}