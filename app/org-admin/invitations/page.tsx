'use client'

import { useState, useEffect } from 'react'
import { useInvitations, createInvitation, updateInvitation, cancelInvitation, resendInvitation } from '@/hooks/useInvitations'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { 
  UserPlus, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Building2, 
  Clock,
  MoreVertical,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Mail,
  Calendar,
  Send,
  Copy,
  Download,
  RefreshCw
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { InvitationFormModal } from '@/components/org-admin/invitation-form-modal'

// Real data from hooks

const statusColors = {
  sent: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  accepted: 'bg-green-500/20 text-green-400 border-green-500/30',
  expired: 'bg-red-500/20 text-red-400 border-red-500/30',
  cancelled: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
}

const roleColors = {
  CEO: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  Admin: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  Manager: 'bg-green-500/20 text-green-400 border-green-500/30'
}

export default function InvitationsPage() {
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [roleFilter, setRoleFilter] = useState('all')
  const [selectedInvitations, setSelectedInvitations] = useState<string[]>([])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showBulkForm, setShowBulkForm] = useState(false)
  const [locale, setLocale] = useState('es')

  useEffect(() => {
    const cookieLocale = document.cookie
      .split('; ')
      .find(row => row.startsWith('NEXT_LOCALE='))
      ?.split('=')[1]
    if (cookieLocale) {
      setLocale(cookieLocale)
    }
  }, [])

  // Fetch real data
  const { invitations, statistics, isLoading, error, mutate } = useInvitations({
    search: searchQuery,
    status: statusFilter !== 'all' ? statusFilter : undefined
  })

  // Filter invitations (additional client-side filtering)
  const filteredInvitations = invitations.filter(invitation => {
    const matchesRole = roleFilter === 'all' || invitation.role === roleFilter
    return matchesRole
  })

  const handleSendReminder = async (invitationId: string) => {
    try {
      await resendInvitation(invitationId)
      mutate() // Refresh data
      toast({
        title: "Reminder Sent",
        description: "The invitation reminder has been sent successfully.",
      })
    } catch (error) {
      console.error('Error sending reminder:', error)
      toast({
        title: "Error",
        description: "Failed to send reminder. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleCancelInvitation = async (invitationId: string) => {
    if (!confirm('Are you sure you want to cancel this invitation?')) return
    
    try {
      await cancelInvitation(invitationId)
      mutate() // Refresh data
      toast({
        title: "Invitation Cancelled",
        description: "The invitation has been cancelled successfully.",
      })
    } catch (error) {
      console.error('Error canceling invitation:', error)
      toast({
        title: "Error",
        description: "Failed to cancel invitation. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleResendInvitation = async (invitationId: string) => {
    try {
      await resendInvitation(invitationId)
      mutate() // Refresh data
      toast({
        title: "Invitation Resent",
        description: "The invitation has been resent successfully.",
      })
    } catch (error) {
      console.error('Error resending invitation:', error)
      toast({
        title: "Error",
        description: "Failed to resend invitation. Please try again.",
        variant: "destructive",
      })
    }
  }

  const toggleInvitationSelection = (invitationId: string) => {
    setSelectedInvitations(prev => 
      prev.includes(invitationId) 
        ? prev.filter(id => id !== invitationId)
        : [...prev, invitationId]
    )
  }

  const handleBulkAction = (action: string) => {
    console.log('Bulk action:', action, 'for invitations:', selectedInvitations)
    setSelectedInvitations([])
  }

  const handleCreateInvitation = async (data: any) => {
    try {
      await createInvitation(data)
      mutate() // Refresh data
      setShowCreateForm(false)
    } catch (error) {
      console.error('Error creating invitation:', error)
      throw error
    }
  }

  const handleBulkInvite = async (data: any) => {
    try {
      // Parse CSV or process multiple emails
      const emails = data.emails?.split(',').map((e: string) => e.trim()) || []
      const results = []
      
      for (const email of emails) {
        if (email) {
          try {
            await createInvitation({
              email,
              role: data.role,
              area_id: data.area_id,
              custom_message: data.custom_message
            })
            results.push({ email, success: true })
          } catch (error) {
            results.push({ email, success: false, error })
          }
        }
      }
      
      mutate() // Refresh data
      return results
    } catch (error) {
      console.error('Error in bulk invite:', error)
      throw error
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return '1 day ago'
    return `${diffDays} days ago`
  }

  const isExpiringSoon = (expiresAt: string) => {
    const expiry = new Date(expiresAt)
    const now = new Date()
    const diffMs = expiry.getTime() - now.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    return diffDays <= 3 && diffDays >= 0
  }

  // Use real statistics from the hook
  const totalInvitations = statistics.total
  const pendingInvitations = statistics.sent + statistics.pending
  const acceptedInvitations = statistics.accepted
  const expiredInvitations = statistics.expired
  const conversionRate = totalInvitations > 0 ? Math.round((acceptedInvitations / totalInvitations) * 100) : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="space-y-6 backdrop-blur-xl">
        {/* Header */}
        <div className="backdrop-blur-xl bg-gray-900/50 border border-white/10 rounded-lg p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white">
                {locale === 'es' ? 'Gestión de Invitaciones' : 'Invitations Management'}
              </h1>
              <p className="text-gray-400 mt-2">
                {locale === 'es' 
                  ? 'Envía invitaciones a nuevos miembros del equipo y rastrea su estado'
                  : 'Send invitations to new team members and track their status'
                }
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowBulkForm(true)} className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700">
                <Download className="h-4 w-4" />
                {locale === 'es' ? 'Invitación Masiva' : 'Bulk Invite'}
              </Button>
              <Button onClick={() => setShowCreateForm(true)} className="flex items-center gap-2 bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4" />
                {locale === 'es' ? 'Enviar Invitación' : 'Send Invitation'}
              </Button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="backdrop-blur-xl bg-gray-900/50 border border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">{locale === 'es' ? 'Total Enviadas' : 'Total Sent'}</p>
                  <p className="text-2xl font-bold text-white">{totalInvitations}</p>
                  <p className="text-xs text-blue-400">{locale === 'es' ? 'Todo el tiempo' : 'All time'}</p>
                </div>
                <div className="p-3 bg-purple-500/20 rounded-lg">
                  <Send className="h-6 w-6 text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-xl bg-gray-900/50 border border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">{locale === 'es' ? 'Pendientes' : 'Pending'}</p>
                  <p className="text-2xl font-bold text-yellow-400">{pendingInvitations}</p>
                  <p className="text-xs text-gray-400">{locale === 'es' ? 'Esperando respuesta' : 'Awaiting response'}</p>
                </div>
                <div className="p-3 bg-yellow-500/20 rounded-lg">
                  <Clock className="h-6 w-6 text-yellow-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-xl bg-gray-900/50 border border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">{locale === 'es' ? 'Aceptadas' : 'Accepted'}</p>
                  <p className="text-2xl font-bold text-green-400">{acceptedInvitations}</p>
                  <p className="text-xs text-green-400">{locale === 'es' ? 'Se unieron exitosamente' : 'Successfully joined'}</p>
                </div>
                <div className="p-3 bg-green-500/20 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-xl bg-gray-900/50 border border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">{locale === 'es' ? 'Conversión' : 'Conversion'}</p>
                  <p className="text-2xl font-bold text-white">{conversionRate}%</p>
                  <p className="text-xs text-green-400">{locale === 'es' ? 'Tasa de éxito' : 'Success rate'}</p>
                </div>
                <div className="p-3 bg-cyan-500/20 rounded-lg">
                  <UserPlus className="h-6 w-6 text-cyan-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="backdrop-blur-xl bg-gray-900/50 border border-white/10">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder={locale === 'es' 
                  ? 'Buscar por email, área o remitente...'
                  : 'Search by email, area, or sender...'
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white/5 border-white/10"
              />
            </div>
            
            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32 bg-white/5 border-white/10">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="all">{locale === 'es' ? 'Todos los Estados' : 'All Status'}</SelectItem>
                  <SelectItem value="sent">{locale === 'es' ? 'Enviada' : 'Sent'}</SelectItem>
                  <SelectItem value="accepted">{locale === 'es' ? 'Aceptada' : 'Accepted'}</SelectItem>
                  <SelectItem value="expired">{locale === 'es' ? 'Expirada' : 'Expired'}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-32 bg-white/5 border-white/10">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="all">{locale === 'es' ? 'Todos los Roles' : 'All Roles'}</SelectItem>
                  <SelectItem value="CEO">CEO</SelectItem>
                  <SelectItem value="Admin">Admin</SelectItem>
                  <SelectItem value="Manager">Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedInvitations.length > 0 && (
            <div className="mt-4 p-3 bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-between">
              <span className="text-primary font-medium">
                {selectedInvitations.length} invitación{selectedInvitations.length !== 1 ? 'es' : ''} {locale === 'es' ? 'seleccionada' : 'selected'}{selectedInvitations.length !== 1 ? 's' : ''}
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => handleBulkAction('send-reminder')}>
                  {locale === 'es' ? 'Enviar Recordatorios' : 'Send Reminders'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleBulkAction('cancel')}>
                  {locale === 'es' ? 'Cancelar Seleccionadas' : 'Cancel Selected'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setSelectedInvitations([])}>
                  {locale === 'es' ? 'Limpiar Selección' : 'Clear Selection'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

        {/* Error State */}
        {error && (
          <Card className="backdrop-blur-xl bg-red-500/10 border border-red-500/20">
            <CardContent className="p-6">
              <div className="text-red-200">
                {locale === 'es' ? 'Error al cargar invitaciones' : 'Error loading invitations'}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Invitations Table */}
        <Card className="backdrop-blur-xl bg-gray-900/50 border border-white/10">
          <CardHeader>
            <CardTitle className="text-white">
              {locale === 'es' ? 'Invitaciones' : 'Invitations'} ({filteredInvitations.length})
            </CardTitle>
          </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 text-gray-300 font-medium">
                    <input
                      type="checkbox"
                      checked={selectedInvitations.length === filteredInvitations.length && filteredInvitations.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedInvitations(filteredInvitations.map(i => i.id))
                        } else {
                          setSelectedInvitations([])
                        }
                      }}
                      className="rounded border-gray-600 bg-gray-700"
                    />
                  </th>
                  <th className="text-left py-3 text-gray-300 font-medium">{locale === 'es' ? 'Invitado' : 'Invitee'}</th>
                  <th className="text-left py-3 text-gray-300 font-medium">{locale === 'es' ? 'Rol' : 'Role'}</th>
                  <th className="text-left py-3 text-gray-300 font-medium">{locale === 'es' ? 'Área' : 'Area'}</th>
                  <th className="text-left py-3 text-gray-300 font-medium">{locale === 'es' ? 'Estado' : 'Status'}</th>
                  <th className="text-left py-3 text-gray-300 font-medium">{locale === 'es' ? 'Enviada' : 'Sent'}</th>
                  <th className="text-left py-3 text-gray-300 font-medium">{locale === 'es' ? 'Expira' : 'Expires'}</th>
                  <th className="text-center py-3 text-gray-300 font-medium">{locale === 'es' ? 'Acciones' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mr-2"></div>
                        <span className="text-gray-400">{locale === 'es' ? 'Cargando invitaciones...' : 'Loading invitations...'}</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredInvitations.map((invitation) => {
                  const isSelected = selectedInvitations.includes(invitation.id)
                  const isExpiring = isExpiringSoon(invitation.expires_at)
                  const isExpired = invitation.status === 'expired'
                  
                  return (
                    <tr key={invitation.id} className="border-b border-white/5">
                      <td className="py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleInvitationSelection(invitation.id)}
                          className="rounded border-gray-600 bg-gray-700"
                        />
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-cyan-400 rounded-full flex items-center justify-center">
                            <Mail className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <div className="font-medium text-white">{invitation.email}</div>
                            <div className="text-sm text-gray-400">
                              {locale === 'es' ? 'Enviada por:' : 'Sent by:'} {invitation.sender?.full_name || invitation.sent_by}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3">
                        <Badge className={roleColors[invitation.role]}>
                          {invitation.role}
                        </Badge>
                      </td>
                      <td className="py-3">
                        {invitation.area ? (
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-blue-400" />
                            <span className="text-white">{invitation.area.name}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">{locale === 'es' ? 'Sin asignar' : 'Unassigned'}</span>
                        )}
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <Badge className={statusColors[invitation.status]}>
                            {invitation.status === 'sent' ? (
                              <>
                                <Clock className="h-3 w-3 mr-1" />
                                {locale === 'es' ? 'Pendiente' : 'Pending'}
                              </>
                            ) : invitation.status === 'accepted' ? (
                              <>
                                <CheckCircle className="h-3 w-3 mr-1" />
                                {locale === 'es' ? 'Aceptada' : 'Accepted'}
                              </>
                            ) : invitation.status === 'expired' ? (
                              <>
                                <XCircle className="h-3 w-3 mr-1" />
                                {locale === 'es' ? 'Expirada' : 'Expired'}
                              </>
                            ) : (
                              invitation.status
                            )}
                          </Badge>
                          {isExpiring && !isExpired && (
                            <Badge variant="outline" className="text-yellow-400 border-yellow-400/50">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              {locale === 'es' ? 'Expira Pronto' : 'Expiring Soon'}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="text-sm text-gray-400">
                          {formatTimeAgo(invitation.created_at)}
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="text-sm text-gray-400">
                          {new Date(invitation.expires_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="py-3 text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700">
                            {invitation.status === 'sent' && (
                              <>
                                <DropdownMenuItem 
                                  className="text-white hover:bg-gray-700"
                                  onClick={() => handleSendReminder(invitation.id)}
                                >
                                  <Send className="h-4 w-4 mr-2" />
                                  Send Reminder
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="text-white hover:bg-gray-700"
                                  onClick={() => handleResendInvitation(invitation.id)}
                                >
                                  <RefreshCw className="h-4 w-4 mr-2" />
                                  Resend
                                </DropdownMenuItem>
                              </>
                            )}
                            {invitation.status === 'expired' && (
                              <DropdownMenuItem 
                                className="text-white hover:bg-gray-700"
                                onClick={() => handleResendInvitation(invitation.id)}
                              >
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Send New
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem className="text-white hover:bg-gray-700">
                              <Copy className="h-4 w-4 mr-2" />
                              Copy Link
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-white hover:bg-gray-700">
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Invitation
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-gray-700" />
                            <DropdownMenuItem 
                              className="text-red-400 hover:bg-red-500/10"
                              onClick={() => handleCancelInvitation(invitation.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Cancel
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

            {/* Empty State */}
            {filteredInvitations.length === 0 && (
              <div className="text-center py-12">
                <UserPlus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">
                  {locale === 'es' ? 'No se encontraron invitaciones' : 'No invitations found'}
                </h3>
                <p className="text-gray-400 mb-6">
                  {searchQuery || statusFilter !== 'all' || roleFilter !== 'all'
                    ? (locale === 'es' ? 'No hay invitaciones que coincidan con tus criterios de búsqueda' : 'No invitations match your search criteria')
                    : (locale === 'es' ? 'Envía tu primera invitación para comenzar a construir tu equipo' : 'Send your first invitation to start building your team')
                  }
                </p>
                {(!searchQuery && statusFilter === 'all' && roleFilter === 'all') && (
                  <Button onClick={() => setShowCreateForm(true)} className="bg-primary hover:bg-primary/90">
                    <Plus className="h-4 w-4 mr-2" />
                    {locale === 'es' ? 'Enviar Primera Invitación' : 'Send First Invitation'}
                  </Button>
                )}
              </div>
            )}
        </CardContent>
      </Card>

        {/* Modals */}
        <InvitationFormModal
          isOpen={showCreateForm}
          onClose={() => setShowCreateForm(false)}
          onSave={handleCreateInvitation}
          mode="single"
        />

        <InvitationFormModal
          isOpen={showBulkForm}
          onClose={() => setShowBulkForm(false)}
          onSave={handleBulkInvite}
          mode="bulk"
        />
      </div>
    </div>
  )
}