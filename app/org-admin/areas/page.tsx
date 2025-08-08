'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AreaFormModal } from '@/components/org-admin/area-form-modal'
import { AreaUsersModal } from '@/components/org-admin/area-users-modal'
import { 
  Building2, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Users, 
  Target,
  UserCog,
  MoreVertical,
  CheckCircle,
  XCircle
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'

// Mock data - will be replaced with real API calls
const mockAreas = [
  {
    id: '1',
    name: 'Sales & Marketing',
    description: 'Revenue generation and customer acquisition',
    manager: {
      id: 'mgr1',
      full_name: 'John Smith',
      email: 'john@company.com'
    },
    users_count: 8,
    objectives_count: 5,
    is_active: true,
    created_at: '2024-01-15T10:30:00Z'
  },
  {
    id: '2', 
    name: 'Technology',
    description: 'Product development and technical infrastructure',
    manager: {
      id: 'mgr2',
      full_name: 'Sarah Johnson',
      email: 'sarah@company.com'
    },
    users_count: 12,
    objectives_count: 8,
    is_active: true,
    created_at: '2024-01-10T09:15:00Z'
  },
  {
    id: '3',
    name: 'Human Resources',
    description: 'People operations and talent management',
    manager: null,
    users_count: 3,
    objectives_count: 2,
    is_active: true,
    created_at: '2024-01-20T14:45:00Z'
  },
  {
    id: '4',
    name: 'Finance',
    description: 'Financial operations and planning',
    manager: {
      id: 'mgr4',
      full_name: 'Michael Brown',
      email: 'michael@company.com'
    },
    users_count: 4,
    objectives_count: 3,
    is_active: false,
    created_at: '2024-01-05T11:20:00Z'
  }
]

export default function AreasManagementPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingArea, setEditingArea] = useState<any>(null)
  const [managingUsersArea, setManagingUsersArea] = useState<any>(null)

  // Filter areas based on search query
  const filteredAreas = mockAreas.filter(area =>
    area.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    area.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    area.manager?.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSaveArea = async (data: any) => {
    console.log('Save area:', data)
    // TODO: Implement actual API call
    // await saveAreaAPI(data)
    return Promise.resolve()
  }

  const handleSaveUserAssignments = async (assignments: { userId: string; newAreaId: string | null }[]) => {
    console.log('Save user assignments:', assignments)
    // TODO: Implement actual API call
    // await saveUserAssignmentsAPI(assignments)
    return Promise.resolve()
  }

  const handleEditArea = (area: any) => {
    setEditingArea({
      id: area.id,
      name: area.name,
      description: area.description,
      manager_id: area.manager?.id,
      is_active: area.is_active
    })
  }

  const handleManageUsers = (area: any) => {
    setManagingUsersArea({
      id: area.id,
      name: area.name,
      is_active: area.is_active
    })
  }

  const handleDeleteArea = (areaId: string) => {
    console.log('Delete area:', areaId)
    // TODO: Implement delete functionality with confirmation
  }

  const handleToggleStatus = (areaId: string) => {
    console.log('Toggle status for area:', areaId)
    // TODO: Implement status toggle
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Areas Management</h1>
          <p className="text-gray-400 mt-2">
            Manage organizational areas, assign managers, and control structure
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New Area
        </Button>
      </div>

      {/* Search and Filters */}
      <Card className="bg-gray-900/50 backdrop-blur-sm border border-white/10">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search areas by name, description, or manager..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white/5 border-white/10"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                All Areas ({mockAreas.length})
              </Button>
              <Button variant="outline" size="sm">
                Active ({mockAreas.filter(a => a.is_active).length})
              </Button>
              <Button variant="outline" size="sm">
                No Manager ({mockAreas.filter(a => !a.manager).length})
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Areas Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredAreas.map((area) => (
          <Card key={area.id} className="bg-gray-900/50 backdrop-blur-sm border border-white/10">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <Building2 className="h-5 w-5 text-purple-400" />
                  </div>
                  <div>
                    <CardTitle className="text-white text-lg">{area.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={area.is_active ? "default" : "secondary"} className="text-xs">
                        {area.is_active ? (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Active
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3 mr-1" />
                            Inactive
                          </>
                        )}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700">
                    <DropdownMenuItem 
                      className="text-white hover:bg-gray-700"
                      onClick={() => handleEditArea(area)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Area
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="text-white hover:bg-gray-700"
                      onClick={() => handleManageUsers(area)}
                    >
                      <UserCog className="h-4 w-4 mr-2" />
                      Manage Users
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="text-white hover:bg-gray-700"
                      onClick={() => handleToggleStatus(area.id)}
                    >
                      {area.is_active ? (
                        <>
                          <XCircle className="h-4 w-4 mr-2" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Activate
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-gray-700" />
                    <DropdownMenuItem 
                      className="text-red-400 hover:bg-red-500/10"
                      onClick={() => handleDeleteArea(area.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            
            <CardContent>
              <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                {area.description}
              </p>
              
              {/* Manager Info */}
              <div className="mb-4">
                <h4 className="text-white text-sm font-medium mb-2">Manager</h4>
                {area.manager ? (
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-cyan-400 rounded-full flex items-center justify-center">
                      <span className="text-xs text-white font-medium">
                        {area.manager.full_name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div>
                      <div className="text-white text-sm">{area.manager.full_name}</div>
                      <div className="text-gray-400 text-xs">{area.manager.email}</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-400 text-sm">No manager assigned</div>
                )}
              </div>

              {/* Stats */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4 text-blue-400" />
                    <span className="text-sm text-white">{area.users_count}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Target className="h-4 w-4 text-green-400" />
                    <span className="text-sm text-white">{area.objectives_count}</span>
                  </div>
                </div>
                
                <div className="text-xs text-gray-400">
                  Created {new Date(area.created_at).toLocaleDateString()}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredAreas.length === 0 && (
        <Card className="bg-gray-900/50 backdrop-blur-sm border border-white/10">
          <CardContent className="p-12 text-center">
            <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No areas found</h3>
            <p className="text-gray-400 mb-6">
              {searchQuery 
                ? `No areas match your search for "${searchQuery}"`
                : "Get started by creating your first organizational area"
              }
            </p>
            {!searchQuery && (
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Area
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      <AreaFormModal
        isOpen={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        area={null}
        onSave={handleSaveArea}
      />

      <AreaFormModal
        isOpen={!!editingArea}
        onClose={() => setEditingArea(null)}
        area={editingArea}
        onSave={handleSaveArea}
      />

      <AreaUsersModal
        isOpen={!!managingUsersArea}
        onClose={() => setManagingUsersArea(null)}
        area={managingUsersArea}
        onSave={handleSaveUserAssignments}
      />
    </div>
  )
}